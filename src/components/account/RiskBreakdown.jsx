import { AlertTriangle, TrendingDown, CreditCard, MessageSquare, Clock, Star } from 'lucide-react';

const ICONS = {
  inactivity:    AlertTriangle,
  usage_decline: TrendingDown,
  billing:       CreditCard,
  support:       MessageSquare,
  renewal_risk:  Clock,
  low_adoption:  Star,
};

export default function RiskBreakdown({ factors }) {
  if (!factors || factors.length === 0) {
    return <p className="text-sm text-white/30 py-6 text-center">No risk factors detected.</p>;
  }
  return (
    <div className="space-y-2">
      {factors.map(factor => {
        const Icon = ICONS[factor.key] || AlertTriangle;
        return (
          <div key={factor.key} className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl">
            <div className="p-2 rounded-xl bg-white/10 flex-shrink-0">
              <Icon size={14} className="text-white/60" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-bold text-white">{factor.label}</span>
                <span className="text-xs font-bold text-white/60 bg-white/10 px-2 py-0.5 rounded-full">+{factor.points}</span>
              </div>
              <p className="text-xs text-white/35 leading-relaxed">{factor.detail}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
