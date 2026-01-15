import React, { memo } from 'react';
import { AlertCircle } from 'lucide-react';

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  min?: number;
  readOnly?: boolean;
  className?: string;
  error?: string; // New error prop
}

export const NumberInput: React.FC<NumberInputProps> = memo(({
  label,
  value,
  onChange,
  prefix,
  suffix,
  placeholder = "0",
  min = 0,
  readOnly = false,
  className = "",
  error
}) => {
  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <div className={`relative flex items-center rounded-xl transition-all duration-200 
        ${error 
          ? 'bg-red-50 border border-red-300 ring-2 ring-red-100' 
          : readOnly 
            ? 'bg-gray-100 border border-gray-200' 
            : 'bg-white shadow-sm border border-slate-100 focus-within:ring-2 focus-within:ring-blue-500/20'
        }`}>
        {prefix && (
          <span className={`pl-3 font-bold text-sm ${error ? 'text-red-500' : 'text-slate-500'}`}>{prefix}</span>
        )}
        <input
          type="number"
          inputMode="decimal" 
          pattern="[0-9]*"
          min={min}
          value={value === 0 ? '' : value}
          onChange={(e) => {
            let val = parseFloat(e.target.value);
            if (isNaN(val)) val = 0;
            // Strictly enforce minimum value (default 0) to prevent negatives
            if (val < min) val = min;
            onChange(val);
          }}
          readOnly={readOnly}
          placeholder={placeholder}
          className={`w-full py-3 px-3 font-bold text-lg bg-transparent focus:outline-none placeholder:text-slate-300 ${error ? 'text-red-600' : 'text-slate-800'} ${prefix ? 'pl-2' : ''} ${suffix ? 'pr-8' : ''}`}
        />
        {suffix && (
          <span className={`absolute right-3 font-medium text-xs ${error ? 'text-red-400' : 'text-slate-400'}`}>{suffix}</span>
        )}
        {error && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
             <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
        )}
      </div>
      {error && (
        <span className="text-[10px] font-bold text-red-500 ml-1 animate-pulse">{error}</span>
      )}
    </div>
  );
});