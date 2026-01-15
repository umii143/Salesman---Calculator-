export enum FuelType {
  PETROL = 'PETROL',
  DIESEL = 'DIESEL'
}

export interface NozzleReading {
  id: number;
  name: string;
  type: FuelType;
  opening: number;
  closing: number;
}

export interface Financials {
  expenses: number;
  credits: number;
  recoveries: number;
  bankCash: number;
  testLitersPetrol: number;
  testLitersDiesel: number;
}

export interface Prices {
  petrol: number;
  diesel: number;
}

export interface DailyReport {
  timestamp: string;
  salesmanName: string;
  totalPetrolLiters: number;
  totalDieselLiters: number;
  totalRevenue: number;
  netAmount: number;
  shortageExcess: number;
  aiAnalysis?: string;
}

export interface HistoryEntry extends DailyReport {
  id: string;
  date: string;
}