import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { 
  Fuel, Droplet, Wallet, ArrowRight, ArrowLeft, Save, 
  Settings, Search, History, X, CheckCircle, BarChart3,
  UserCircle, ShieldCheck, Zap, LayoutDashboard, Share2, Printer, MessageCircle, Loader2
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { FuelType, NozzleReading, Financials, Prices, HistoryEntry } from './types';
import { NumberInput } from './components/NumberInput';
import { generateShiftAnalysis } from './services/geminiService';

// --- Constants ---
const INITIAL_NOZZLES: NozzleReading[] = [
  { id: 1, name: 'Nozzle 1', type: FuelType.PETROL, opening: 0, closing: 0 },
  { id: 2, name: 'Nozzle 2', type: FuelType.PETROL, opening: 0, closing: 0 },
  { id: 3, name: 'Nozzle 3', type: FuelType.DIESEL, opening: 0, closing: 0 },
  { id: 4, name: 'Nozzle 4', type: FuelType.DIESEL, opening: 0, closing: 0 },
];

const INITIAL_FINANCIALS: Financials = {
  expenses: 0, credits: 0, recoveries: 0, bankCash: 0, testLitersPetrol: 0, testLitersDiesel: 0,
};

const DEFAULT_PRICES: Prices = { petrol: 280.00, diesel: 290.00 };

enum Step { HOME = 0, PETROL = 1, DIESEL = 2, TESTS = 3, FINANCIALS = 4, SUMMARY = 5 }
type ReportPeriod = 'ALL' | 'WEEK' | 'MONTH';

// --- FOOTER COMPONENT ---
const DeveloperFooter = memo(({ white = false }: { white?: boolean }) => (
  <div className="mt-8 text-center pb-6">
    <a 
      href="https://wa.me/923168432329" 
      target="_blank" 
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 transition-all hover:scale-105 ${white ? 'bg-black/5' : 'bg-white/50'} px-4 py-2 rounded-full border border-white/20`}
    >
      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Powered by Umar Ali</span>
      <MessageCircle className="w-3 h-3 text-green-500 fill-green-500" />
    </a>
  </div>
));

// --- MEMOIZED SUB-COMPONENTS ---

const Header = memo(({ 
  currentTime, 
  onHome, 
  onHistory, 
  onSettings 
}: { 
  currentTime: Date, 
  onHome: () => void, 
  onHistory: () => void, 
  onSettings: () => void 
}) => (
  <header className="fixed top-0 left-0 right-0 z-50 glass-panel shadow-sm transition-all duration-300">
    <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
      <div className="flex items-center gap-3 cursor-pointer active:scale-95 transition-transform" onClick={onHome}>
         <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center shadow-lg">
           <Fuel className="text-white w-5 h-5" />
         </div>
         <div>
            <h1 className="text-base font-bold text-slate-900 leading-none">Motorway</h1>
            <p className="text-[9px] text-slate-500 font-bold tracking-wider uppercase mt-0.5">Petroleum</p>
         </div>
      </div>
      
      <div className="flex items-center gap-2">
         <div className="hidden sm:flex flex-col items-end mr-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">{currentTime.toDateString()}</span>
            <span className="text-xs text-slate-800 font-mono font-bold">{currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
         </div>
         <button onClick={onHistory} className="p-2 bg-white rounded-full shadow-3d border border-slate-100 text-slate-700 active:scale-90 transition-transform">
           <BarChart3 className="w-5 h-5" />
         </button>
         <button onClick={onSettings} className="p-2 bg-black text-white rounded-full shadow-lg active:scale-90 transition-transform">
           <Settings className="w-5 h-5" />
         </button>
      </div>
    </div>
  </header>
));

const SettingsModal = memo(({ 
  show, 
  onClose, 
  prices, 
  onPriceChange 
}: { 
  show: boolean, 
  onClose: () => void, 
  prices: Prices, 
  onPriceChange: (p: Prices) => void 
}) => (
  <div className={`fixed inset-0 z-[60] flex items-center justify-center p-4 transition-all duration-300 ${show ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose}></div>
    <div className={`bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-6 relative z-10 transform transition-all duration-300 ${show ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-5 h-5" /> Fuel Rates
        </h2>
        <button onClick={onClose} className="p-1.5 bg-slate-100 rounded-full hover:bg-slate-200"><X className="w-4 h-4 text-slate-500" /></button>
      </div>
      <div className="space-y-4">
        <NumberInput label="Petrol Rate" value={prices.petrol} onChange={(v) => onPriceChange({...prices, petrol: v})} prefix="Rs" />
        <NumberInput label="Diesel Rate" value={prices.diesel} onChange={(v) => onPriceChange({...prices, diesel: v})} prefix="Rs" />
      </div>
      <button onClick={onClose} className="mt-8 w-full py-3.5 bg-black text-white rounded-xl font-bold text-sm shadow-lg active:scale-[0.98] transition-all">Save Rates</button>
      <DeveloperFooter />
    </div>
  </div>
));

const HistoryModal = memo(({ 
  show, 
  onClose, 
  history, 
  onFilterChange 
}: { 
  show: boolean, 
  onClose: () => void, 
  history: HistoryEntry[], 
  onFilterChange: (period: ReportPeriod) => void 
}) => {
  const [localSearch, setLocalSearch] = useState("");
  const [period, setPeriod] = useState<ReportPeriod>('ALL');

  useEffect(() => {
    onFilterChange(period);
  }, [period, onFilterChange]);

  const filtered = useMemo(() => {
    if (!localSearch) return history;
    return history.filter(h => 
      h.salesmanName.toLowerCase().includes(localSearch.toLowerCase()) || 
      h.date.includes(localSearch)
    );
  }, [history, localSearch]);

  const totals = useMemo(() => {
    return filtered.reduce((acc, curr) => ({
      rev: acc.rev + curr.totalRevenue,
      diff: acc.diff + curr.shortageExcess
    }), { rev: 0, diff: 0 });
  }, [filtered]);

  return (
    <div className={`fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-6 transition-all duration-300 ${show ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose}></div>
      <div className={`bg-white rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl w-full max-w-xl h-[92vh] sm:h-[85vh] flex flex-col relative z-10 transform transition-all duration-300 ${show ? 'translate-y-0' : 'translate-y-full sm:translate-y-20'}`}>
        <div className="p-6 border-b border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-900">Reports</h2>
            <button onClick={onClose} className="p-2 bg-slate-100 rounded-full"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
            {(['ALL', 'WEEK', 'MONTH'] as ReportPeriod[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${period === p ? 'bg-white shadow-sm text-black' : 'text-slate-400'}`}>
                {p === 'ALL' ? 'All' : p === 'WEEK' ? 'Week' : 'Month'}
              </button>
            ))}
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search Salesman..." className="bg-transparent text-sm font-semibold outline-none w-full" value={localSearch} onChange={e => setLocalSearch(e.target.value)} />
          </div>
        </div>
        
        {filtered.length > 0 && (
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
             <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase">Total Revenue</span>
                <span className="text-sm font-bold text-slate-900">Rs {totals.rev.toLocaleString()}</span>
             </div>
             <div className="flex justify-between items-center mt-1">
                <span className="text-xs font-bold text-slate-400 uppercase">Net Diff</span>
                <span className={`text-sm font-bold ${totals.diff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {totals.diff >= 0 ? '+' : ''}Rs {totals.diff.toLocaleString()}
                </span>
             </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
           {filtered.length === 0 ? (
             <div className="text-center py-10 text-slate-400 text-sm">No records found.</div>
           ) : (
             filtered.map(entry => (
               <div key={entry.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500"><UserCircle className="w-4 h-4" /></div>
                       <div>
                          <div className="font-bold text-slate-900 text-sm">{entry.salesmanName}</div>
                          <div className="text-[10px] text-slate-400 font-bold">{entry.date}</div>
                       </div>
                    </div>
                    <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${entry.shortageExcess >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {entry.shortageExcess >= 0 ? 'EXCESS' : 'SHORT'}
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                     <span className="text-xs font-bold text-slate-400">Net: Rs {entry.netAmount.toLocaleString()}</span>
                     <span className={`text-xs font-bold ${entry.shortageExcess >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {entry.shortageExcess >= 0 ? '+' : ''}{Math.abs(entry.shortageExcess).toLocaleString()}
                     </span>
                  </div>
               </div>
             ))
           )}
        </div>
      </div>
    </div>
  );
});

const HomeView = memo(({ 
  greeting, 
  salesmanName, 
  onNameChange, 
  onStart, 
  onHistory 
}: { 
  greeting: string, 
  salesmanName: string, 
  onNameChange: (val: string) => void, 
  onStart: () => void, 
  onHistory: () => void 
}) => (
  <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 animate-in zoom-in duration-300">
     <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-3d-float max-w-sm w-full border border-white">
        <div className="text-center mb-8">
           <div className="w-20 h-20 bg-black rounded-3xl mx-auto flex items-center justify-center shadow-2xl mb-4 transform -rotate-3">
             <LayoutDashboard className="w-10 h-10 text-white" />
           </div>
           <h1 className="text-2xl font-extrabold text-slate-900">{greeting}</h1>
           <p className="text-slate-500 text-sm font-medium mt-1">Ready for a new shift?</p>
        </div>

        <div className="space-y-4">
           <div className="bg-slate-50 p-1 rounded-2xl border border-slate-100">
             <div className="flex items-center bg-white rounded-xl px-3 py-1 shadow-sm">
                <UserCircle className="w-5 h-5 text-slate-400 mr-2" />
                <input 
                  type="text"
                  value={salesmanName}
                  onChange={(e) => onNameChange(e.target.value)}
                  placeholder="Enter Salesman ID"
                  className="w-full py-3 bg-transparent font-bold text-slate-800 text-sm placeholder:text-slate-300 focus:outline-none"
                />
             </div>
           </div>

           <button onClick={onStart} className="w-full py-4 bg-black text-white rounded-2xl font-bold text-base shadow-lg hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2">
              Start Shift <ArrowRight className="w-4 h-4" />
            </button>
           
           <button onClick={onHistory} className="w-full py-4 bg-white text-slate-800 rounded-2xl font-bold text-base border border-slate-100 shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2">
             <History className="w-4 h-4 text-slate-400" /> History
           </button>
        </div>

        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
             <ShieldCheck className="w-3 h-3 text-green-500" />
             <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Secure System</span>
          </div>
          <DeveloperFooter white />
        </div>
     </div>
  </div>
));

const StepWizard = memo(({ 
  step, 
  nozzles, 
  financials, 
  calculations, 
  aiReport, 
  isGeneratingReport, 
  onNozzleChange, 
  onFinancialChange, 
  onGenerateReport, 
  onSave, 
  onNext, 
  onBack,
  salesmanName,
  currentTime
}: any) => {

  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    setIsSharing(true);
    const element = document.getElementById('printable-receipt');
    
    if (element) {
      try {
        // Temporarily reveal the element for capture
        element.classList.remove('hidden');
        element.classList.add('fixed', 'top-0', 'left-0', 'z-[-50]', 'w-full', 'max-w-[500px]', 'bg-white');

        // Wait a moment for rendering
        await new Promise(resolve => setTimeout(resolve, 100));

        const canvas = await html2canvas(element, {
          scale: 2, // High resolution
          backgroundColor: '#ffffff',
          logging: false
        });

        // Hide element again
        element.classList.remove('fixed', 'top-0', 'left-0', 'z-[-50]', 'w-full', 'max-w-[500px]', 'bg-white');
        element.classList.add('hidden');

        canvas.toBlob(async (blob) => {
          if (!blob) {
            setIsSharing(false);
            return;
          }

          const file = new File([blob], `receipt-${Date.now()}.png`, { type: 'image/png' });

          // Try native sharing first
          if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
             try {
                await navigator.share({
                  files: [file],
                  title: 'Shift Receipt',
                  text: `Shift Report for ${salesmanName}`
                });
             } catch (err) {
                console.log("Share cancelled or failed", err);
             }
          } else {
             // Fallback: Download image
             const link = document.createElement('a');
             link.href = URL.createObjectURL(blob);
             link.download = `receipt-${Date.now()}.png`;
             document.body.appendChild(link);
             link.click();
             document.body.removeChild(link);
             alert("Image downloaded! You can now share it on WhatsApp.");
          }
          setIsSharing(false);
        }, 'image/png');

      } catch (e) {
        console.error("Screenshot failed", e);
        setIsSharing(false);
        // Ensure element is hidden in case of error
        element.classList.remove('fixed', 'top-0', 'left-0', 'z-[-50]', 'w-full', 'max-w-[500px]', 'bg-white');
        element.classList.add('hidden');
        alert("Could not generate image. Please try 'Print Receipt' instead.");
      }
    } else {
      setIsSharing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-xl mx-auto pb-24 pt-24 px-4">
      {/* Printable Receipt (Hidden by default, used for Print & Image Generation) */}
      <div id="printable-receipt" className="hidden print:block p-8 bg-white text-black font-mono">
         <div className="text-center mb-6">
           <div className="flex justify-center mb-2">
             <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
               <Fuel className="text-white w-6 h-6" />
             </div>
           </div>
           <h1 className="text-2xl font-bold uppercase tracking-wide">Motorway Petroleum</h1>
           <p className="text-sm text-gray-600">Shift Closing Receipt</p>
           <p className="text-xs mt-1 text-gray-500">{currentTime.toLocaleString()}</p>
         </div>
         
         <div className="mb-6 border-b-2 border-dashed border-gray-300 pb-4">
           <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">Salesman</span>
              <span className="font-bold">{salesmanName}</span>
           </div>
           <div className="flex justify-between text-sm">
              <span className="text-gray-500">Shift ID</span>
              <span className="font-mono">{Date.now().toString().slice(-6)}</span>
           </div>
         </div>

         <div className="mb-4">
           <h3 className="font-bold border-b border-gray-200 mb-2 pb-1 text-sm uppercase">Petrol (PMS)</h3>
           {nozzles.filter((n:any) => n.type === FuelType.PETROL).map((n:any) => (
             <div key={n.id} className="flex justify-between text-sm mb-1">
               <span>{n.name}</span>
               <span className="font-mono">{n.closing} - {n.opening} = <span className="font-bold">{(n.closing - n.opening).toFixed(1)}</span></span>
             </div>
           ))}
           <div className="text-right font-bold mt-2 text-sm bg-gray-50 p-1 rounded">Total PMS: {calculations.petrolSold.toFixed(1)} L</div>
         </div>

         <div className="mb-6">
           <h3 className="font-bold border-b border-gray-200 mb-2 pb-1 text-sm uppercase">Diesel (HSD)</h3>
           {nozzles.filter((n:any) => n.type === FuelType.DIESEL).map((n:any) => (
             <div key={n.id} className="flex justify-between text-sm mb-1">
               <span>{n.name}</span>
               <span className="font-mono">{n.closing} - {n.opening} = <span className="font-bold">{(n.closing - n.opening).toFixed(1)}</span></span>
             </div>
           ))}
           <div className="text-right font-bold mt-2 text-sm bg-gray-50 p-1 rounded">Total HSD: {calculations.dieselSold.toFixed(1)} L</div>
         </div>

         <div className="mb-4 border-t-2 border-dashed border-gray-300 pt-4 space-y-2">
            <div className="flex justify-between text-sm"><span>Total Revenue</span><span className="font-bold">Rs {calculations.totalRevenue.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm text-red-600"><span>Expenses</span><span>- Rs {financials.expenses}</span></div>
            <div className="flex justify-between text-sm text-orange-600"><span>Credits</span><span>- Rs {financials.credits}</span></div>
            <div className="flex justify-between text-sm text-green-600"><span>Recoveries</span><span>+ Rs {financials.recoveries}</span></div>
            <div className="flex justify-between font-bold text-lg mt-4 pt-2 border-t border-gray-200"><span>Net Cash</span><span>Rs {calculations.netAmount.toLocaleString()}</span></div>
         </div>

         <div className={`text-center mt-6 p-4 rounded-xl border-2 ${calculations.difference >= 0 ? 'border-green-100 bg-green-50' : 'border-red-100 bg-red-50'}`}>
           <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Final Status</p>
           <p className={`font-black text-2xl ${calculations.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
             {calculations.difference >= 0 ? 'EXCESS' : 'SHORT'}
           </p>
           <p className={`font-bold text-lg ${calculations.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Rs {Math.abs(calculations.difference).toLocaleString()}
           </p>
         </div>

         <div className="text-center mt-8 pt-6 border-t border-gray-100">
           <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">System Generated Report</p>
           <p className="text-xs font-bold text-slate-700">Powered by Umar Ali</p>
           <p className="text-xs text-slate-500">0316 8432329</p>
         </div>
      </div>

      {/* Compact Progress Bar */}
      <div className="mb-8 flex justify-between items-center px-4 relative print:hidden">
         <div className="absolute top-1/2 left-4 right-4 h-1 bg-slate-200 rounded-full -z-10">
           <div className="h-full bg-black rounded-full transition-all duration-500" style={{ width: `${((step - 1) / 4) * 100}%` }}></div>
         </div>
         {[Step.PETROL, Step.DIESEL, Step.TESTS, Step.FINANCIALS, Step.SUMMARY].map((s) => (
           <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 z-10 ${step >= s ? 'bg-black text-white shadow-lg scale-110' : 'bg-white text-slate-300 border border-slate-100'}`}>
             <div className={`w-2 h-2 rounded-full ${step >= s ? 'bg-white' : 'bg-current'}`}></div>
           </div>
         ))}
      </div>

      <div className="bg-white/80 backdrop-blur-xl p-6 rounded-[2.5rem] shadow-3d-float border border-white animate-in fade-in slide-in-from-bottom-4 duration-500 print:hidden">
        
        {step === Step.PETROL && (
          <div className="space-y-5">
            <div className="text-center mb-2">
              <h2 className="text-xl font-bold text-slate-900">Petrol Readings</h2>
            </div>
            {nozzles.filter((n: any) => n.type === FuelType.PETROL).map((n: any) => {
              const diff = n.closing - n.opening;
              const error = n.closing !== 0 && diff < 0 ? "Closing can't be less than opening" : undefined;
              return (
                <div key={n.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex justify-between mb-2"><span className="font-bold text-sm">{n.name}</span><span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">PMS</span></div>
                  <div className="grid grid-cols-2 gap-3">
                     <NumberInput label="Opening" value={n.opening} onChange={(v) => onNozzleChange(n.id, 'opening', v)} />
                     <NumberInput label="Closing" value={n.closing} onChange={(v) => onNozzleChange(n.id, 'closing', v)} error={error} />
                  </div>
                </div>
              );
            })}
            <div className="bg-amber-50 p-4 rounded-2xl flex justify-between items-center border border-amber-100">
               <span className="text-xs font-bold text-amber-800/60 uppercase">Total</span>
               <span className="text-2xl font-bold text-amber-600">{calculations.petrolSold.toFixed(0)} L</span>
            </div>
          </div>
        )}

        {step === Step.DIESEL && (
          <div className="space-y-5">
            <div className="text-center mb-2">
              <h2 className="text-xl font-bold text-slate-900">Diesel Readings</h2>
            </div>
            {nozzles.filter((n: any) => n.type === FuelType.DIESEL).map((n: any) => {
              const diff = n.closing - n.opening;
              const error = n.closing !== 0 && diff < 0 ? "Closing can't be less than opening" : undefined;
              return (
                <div key={n.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex justify-between mb-2"><span className="font-bold text-sm">{n.name}</span><span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">HSD</span></div>
                  <div className="grid grid-cols-2 gap-3">
                     <NumberInput label="Opening" value={n.opening} onChange={(v) => onNozzleChange(n.id, 'opening', v)} />
                     <NumberInput label="Closing" value={n.closing} onChange={(v) => onNozzleChange(n.id, 'closing', v)} error={error} />
                  </div>
                </div>
              );
            })}
            <div className="bg-slate-100 p-4 rounded-2xl flex justify-between items-center border border-slate-200">
               <span className="text-xs font-bold text-slate-500 uppercase">Total</span>
               <span className="text-2xl font-bold text-slate-800">{calculations.dieselSold.toFixed(0)} L</span>
            </div>
          </div>
        )}

        {step === Step.TESTS && (
          <div className="space-y-6">
            <div className="text-center"><h2 className="text-xl font-bold text-slate-900">Testing</h2></div>
            <div className="bg-white p-6 rounded-[2rem] shadow-inner-light border border-slate-50 space-y-4">
              <NumberInput label="Petrol Tests" value={financials.testLitersPetrol} onChange={(v) => onFinancialChange('testLitersPetrol', v)} suffix="L" />
              <div className="h-px bg-slate-100 w-full" />
              <NumberInput label="Diesel Tests" value={financials.testLitersDiesel} onChange={(v) => onFinancialChange('testLitersDiesel', v)} suffix="L" />
            </div>
          </div>
        )}

        {step === Step.FINANCIALS && (
          <div className="space-y-4">
            <div className="text-center"><h2 className="text-xl font-bold text-slate-900">Cash & Expenses</h2></div>
            <NumberInput className="bg-red-50 p-2 rounded-2xl border border-red-100" label="Expenses" value={financials.expenses} onChange={(v) => onFinancialChange('expenses', v)} prefix="Rs" />
            <NumberInput className="bg-orange-50 p-2 rounded-2xl border border-orange-100" label="Credits" value={financials.credits} onChange={(v) => onFinancialChange('credits', v)} prefix="Rs" />
            <NumberInput className="bg-green-50 p-2 rounded-2xl border border-green-100" label="Recoveries" value={financials.recoveries} onChange={(v) => onFinancialChange('recoveries', v)} prefix="Rs" />
            <div className="pt-2"><NumberInput className="bg-white p-3 rounded-2xl shadow-3d" label="Cash in Hand" value={financials.bankCash} onChange={(v) => onFinancialChange('bankCash', v)} prefix="Rs" /></div>
          </div>
        )}

        {step === Step.SUMMARY && (
           <div className="space-y-6 text-center">
              <div>
                <div className={`inline-flex p-3 rounded-full mb-2 ${calculations.difference >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {calculations.difference >= 0 ? <CheckCircle className="w-8 h-8" /> : <X className="w-8 h-8" />}
                </div>
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                   {calculations.difference >= 0 ? '+' : '-'} {Math.abs(calculations.difference).toLocaleString()}
                </h2>
                <p className={`text-xs font-bold uppercase tracking-widest ${calculations.difference >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {calculations.difference >= 0 ? 'Excess Cash' : 'Shortage'}
                </p>
              </div>

              <div className="bg-white/60 rounded-2xl p-4 text-sm space-y-2 border border-white shadow-sm">
                 <div className="flex justify-between"><span className="text-slate-500">Revenue</span><span className="font-bold">Rs {calculations.totalRevenue.toLocaleString()}</span></div>
                 <div className="flex justify-between"><span className="text-slate-500">Deductions</span><span className="font-bold text-red-500">-Rs {(financials.expenses + financials.credits).toLocaleString()}</span></div>
                 <div className="flex justify-between"><span className="text-slate-500">Recoveries</span><span className="font-bold text-green-500">+Rs {financials.recoveries.toLocaleString()}</span></div>
                 <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between"><span className="font-bold text-slate-900">Net Expected</span><span className="font-bold text-blue-600">Rs {calculations.netAmount.toLocaleString()}</span></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <button onClick={handlePrint} className="flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 shadow-sm hover:bg-slate-50 active:scale-95 transition-transform">
                   <Printer className="w-4 h-4" /> Print Receipt
                 </button>
                 <button 
                  onClick={handleShare} 
                  disabled={isSharing}
                  className="flex items-center justify-center gap-2 py-3 bg-[#25D366] text-white rounded-xl font-bold shadow-sm hover:bg-[#128C7E] active:scale-95 transition-transform disabled:opacity-70"
                 >
                   {isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                   {isSharing ? 'Generating...' : 'Share Receipt'}
                 </button>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-100 text-left">
                 <div className="flex justify-between items-center mb-2">
                   <div className="flex items-center gap-2 font-bold text-xs text-slate-700"><Zap className="w-4 h-4 text-amber-500" /> AI Insights</div>
                   {!aiReport && <button onClick={onGenerateReport} disabled={isGeneratingReport} className="text-[10px] bg-black text-white px-3 py-1.5 rounded-full">{isGeneratingReport ? '...' : 'Analyze'}</button>}
                 </div>
                 {aiReport && <p className="text-xs text-slate-600 leading-relaxed font-medium">"{aiReport}"</p>}
              </div>

              <button onClick={onSave} className="w-full py-4 bg-black text-white rounded-2xl font-bold shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                <Save className="w-5 h-5" /> Close Shift
              </button>
           </div>
        )}

        <div className="flex justify-between mt-8 pt-4 border-t border-slate-100">
           {step > Step.PETROL && step !== Step.SUMMARY && (
             <button onClick={onBack} className="p-3 rounded-xl bg-slate-100 text-slate-600 font-bold active:scale-95 transition-all"><ArrowLeft className="w-5 h-5" /></button>
           )}
           {step < Step.SUMMARY && (
             <button onClick={onNext} className="ml-auto px-8 py-3 rounded-xl bg-black text-white font-bold shadow-lg active:scale-95 transition-all flex items-center gap-2">Next <ArrowRight className="w-5 h-5" /></button>
           )}
        </div>
        
        <DeveloperFooter />
      </div>
    </div>
  );
});

// --- MAIN APP COMPONENT ---

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<Step>(Step.HOME);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [salesmanName, setSalesmanName] = useState("");
  
  // State initialization with lazy initializers to avoid localStorage reads on re-render
  const [nozzles, setNozzles] = useState<NozzleReading[]>(() => {
    const s = localStorage.getItem('fuel_nozzles'); return s ? JSON.parse(s) : INITIAL_NOZZLES;
  });
  const [financials, setFinancials] = useState<Financials>(() => {
    const s = localStorage.getItem('fuel_financials'); return s ? JSON.parse(s) : INITIAL_FINANCIALS;
  });
  const [prices, setPrices] = useState<Prices>(() => {
    const s = localStorage.getItem('fuel_prices'); return s ? JSON.parse(s) : DEFAULT_PRICES;
  });
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    const s = localStorage.getItem('fuel_history'); return s ? JSON.parse(s) : [];
  });
  const [aiReport, setAiReport] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => { const t = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => localStorage.setItem('fuel_nozzles', JSON.stringify(nozzles)), [nozzles]);
  useEffect(() => localStorage.setItem('fuel_financials', JSON.stringify(financials)), [financials]);
  useEffect(() => localStorage.setItem('fuel_prices', JSON.stringify(prices)), [prices]);
  useEffect(() => localStorage.setItem('fuel_history', JSON.stringify(history)), [history]);

  const calculations = useMemo(() => {
    let pSold = 0, dSold = 0;
    nozzles.forEach(n => {
      const sold = Math.max(0, n.closing - n.opening);
      n.type === FuelType.PETROL ? pSold += sold : dSold += sold;
    });
    const netP = Math.max(0, pSold - financials.testLitersPetrol);
    const netD = Math.max(0, dSold - financials.testLitersDiesel);
    const rev = (netP * prices.petrol) + (netD * prices.diesel);
    const net = rev - financials.expenses - financials.credits + financials.recoveries;
    return { petrolSold: pSold, dieselSold: dSold, netPetrolSold: netP, netDieselSold: netD, totalRevenue: rev, netAmount: net, difference: financials.bankCash - net };
  }, [nozzles, financials, prices]);

  // Callbacks for child components
  const handleNozzleChange = useCallback((id: number, field: 'opening' | 'closing', value: number) => {
    setNozzles(prev => prev.map(n => n.id === id ? { ...n, [field]: value } : n));
  }, []);
  const handleFinancialChange = useCallback((field: keyof Financials, value: number) => {
    setFinancials(prev => ({ ...prev, [field]: value }));
  }, []);
  const handlePriceChange = useCallback((p: Prices) => setPrices(p), []);
  const handleGenerateReport = useCallback(async () => {
    setIsGenerating(true);
    const r = await generateShiftAnalysis(nozzles, financials, prices, { 
      petrolLiters: calculations.netPetrolSold, dieselLiters: calculations.netDieselSold, revenue: calculations.totalRevenue, net: calculations.netAmount 
    });
    setAiReport(r); setIsGenerating(false);
  }, [nozzles, financials, prices, calculations]);
  
  const handleSave = useCallback(() => {
    const entry: HistoryEntry = {
      id: Date.now().toString(), date: new Date().toLocaleDateString(), timestamp: new Date().toISOString(), salesmanName: salesmanName || "Unknown",
      totalPetrolLiters: calculations.netPetrolSold, totalDieselLiters: calculations.netDieselSold, totalRevenue: calculations.totalRevenue,
      netAmount: calculations.netAmount, shortageExcess: calculations.difference, aiAnalysis: aiReport
    };
    setHistory(prev => [entry, ...prev]);
    alert("Shift data saved securely."); setNozzles(INITIAL_NOZZLES); setFinancials(INITIAL_FINANCIALS); setAiReport(""); setCurrentStep(Step.HOME);
  }, [salesmanName, calculations, aiReport]);

  const handleStart = useCallback(() => {
    if (!salesmanName.trim()) return alert("Enter Salesman ID / Name");
    setNozzles(INITIAL_NOZZLES); setFinancials(INITIAL_FINANCIALS); setAiReport(""); setCurrentStep(Step.PETROL);
  }, [salesmanName]);

  const greeting = useMemo(() => {
    const h = currentTime.getHours(); return h < 12 ? "Good Morning" : h < 18 ? "Good Afternoon" : "Good Evening";
  }, [currentTime]);

  const handleFilterChange = useCallback((p: ReportPeriod) => {}, []);

  return (
    <div className="min-h-screen font-sans text-slate-800 overflow-x-hidden">
      <Header 
        currentTime={currentTime} 
        onHome={() => setCurrentStep(Step.HOME)} 
        onHistory={() => setShowHistory(true)} 
        onSettings={() => setShowSettings(true)} 
      />
      
      <SettingsModal show={showSettings} onClose={() => setShowSettings(false)} prices={prices} onPriceChange={handlePriceChange} />
      <HistoryModal show={showHistory} onClose={() => setShowHistory(false)} history={history} onFilterChange={handleFilterChange} />

      <main className="pt-10 min-h-screen pb-10">
        {currentStep === Step.HOME ? (
          <HomeView 
            greeting={greeting} 
            salesmanName={salesmanName} 
            onNameChange={setSalesmanName} 
            onStart={handleStart} 
            onHistory={() => setShowHistory(true)} 
          />
        ) : (
          <StepWizard 
            step={currentStep} 
            nozzles={nozzles} 
            financials={financials} 
            calculations={calculations}
            aiReport={aiReport}
            isGeneratingReport={isGenerating}
            onNozzleChange={handleNozzleChange}
            onFinancialChange={handleFinancialChange}
            onGenerateReport={handleGenerateReport}
            onSave={handleSave}
            onNext={() => setCurrentStep(p => p + 1)}
            onBack={() => setCurrentStep(p => p - 1)}
            salesmanName={salesmanName}
            currentTime={currentTime}
          />
        )}
      </main>
    </div>
  );
};

export default App;