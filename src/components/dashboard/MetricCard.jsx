'use client';
import { ArrowUpRight } from 'lucide-react';

export default function MetricCard({ title, value, subtitle, icon: Icon, gradient, onArrow }) {
  return (
    <div className={`relative rounded-card p-5 overflow-visible flex flex-col justify-between min-h-[150px] ${gradient}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-black/60 leading-snug">{title}</p>
        {Icon && (
          <div className="w-9 h-9 rounded-2xl bg-black/10 flex items-center justify-center flex-shrink-0">
            <Icon size={16} className="text-black/50" strokeWidth={1.8} />
          </div>
        )}
      </div>
      <div>
        <p className="text-[2.25rem] font-extrabold text-black tracking-tight leading-none">{value}</p>
        {subtitle && (
          <p className="text-[11px] text-black/50 mt-2 font-semibold uppercase tracking-wide">{subtitle}</p>
        )}
      </div>
      {/* Notch — bg-black to blend with page */}
      <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-black">
        <button
          type="button"
          onClick={onArrow}
          className="w-11 h-11 rounded-full bg-white/10 border border-white/10 text-white flex items-center justify-center transition-colors hover:bg-white/20 active:scale-95"
        >
          <ArrowUpRight size={18} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}
