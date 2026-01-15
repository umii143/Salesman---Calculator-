import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtext?: string;
  colorClass?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, subtext, colorClass = "bg-white" }) => {
  return (
    <div className={`${colorClass} p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between`}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-slate-500 text-sm font-medium uppercase tracking-wider">{title}</span>
        <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
          {icon}
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-800">{value}</div>
        {subtext && <div className="text-xs text-slate-500 mt-1">{subtext}</div>}
      </div>
    </div>
  );
};