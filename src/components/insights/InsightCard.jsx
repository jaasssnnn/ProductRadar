'use client';
const SEVERITY_BORDER = {
  high:   'border-l-ink',
  medium: 'border-l-ink/45',
  low:    'border-l-ink/20',
};
const SEVERITY_BADGE = {
  high:   'bg-gradient-to-br from-[#f0c8c8] via-[#ddc4e2] to-[#c5ceee] text-black',
  medium: 'bg-gradient-to-br from-kpi-blue-from to-kpi-blue-to text-black',
  low:    'bg-gradient-to-br from-[#ccd8f5] via-[#b8cef2] to-[#a8d8ec] text-black',
};

export default function InsightCard({ insight }) {
  return (
    <div className={`bg-white rounded-3xl border border-hairline border-l-4 ${SEVERITY_BORDER[insight.severity] || SEVERITY_BORDER.medium} p-7 shadow-sm`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <h3 className="text-sm font-bold text-ink leading-snug">{insight.title}</h3>
        <span className={`text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0 capitalize border border-black/5 ${SEVERITY_BADGE[insight.severity] || SEVERITY_BADGE.medium}`}>
          {insight.severity}
        </span>
      </div>
      <p className="text-sm text-ink-soft leading-relaxed mb-4 font-medium">{insight.description}</p>
      <div className="bg-canvas rounded-2xl p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-ink-mute mb-1.5">Action</p>
        <p className="text-xs text-ink-soft leading-relaxed font-medium">{insight.action}</p>
      </div>
    </div>
  );
}
