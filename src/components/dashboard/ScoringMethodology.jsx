'use client';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FACTORS = [
  {
    name: 'Inactivity',
    points: '+25',
    trigger: 'No activity events in the last 14 days',
    rationale: 'Complete disengagement is the strongest leading indicator of churn. Accounts that stop logging in have already mentally churned — billing usually follows 30–60 days later. Weighted highest because it is both the most predictive and the most actionable signal.',
  },
  {
    name: 'Usage Decline',
    points: '+20',
    trigger: 'Usage in the most recent week is ≥50% lower than the prior two weeks',
    rationale: 'A sharp decline in week-over-week usage is a reliable early warning. Research across B2B SaaS consistently shows usage drop precedes cancellation by 4–8 weeks on average, giving the CS team a meaningful intervention window.',
  },
  {
    name: 'Billing Issue',
    points: '+15',
    trigger: 'Any failed invoice, open invoice with failed payment attempt, or historical failed_payments > 0',
    rationale: 'Payment failure is a direct operational churn risk — involuntary churn accounts for roughly 20–40% of total SaaS churn. Fires on historical failures too, not just current status, because a past payment issue indicates the payment method is unreliable and may fail again at the next renewal.',
  },
  {
    name: 'Support Friction',
    points: '+15',
    trigger: '3+ unresolved support tickets, OR sentiment tagged as negative',
    rationale: 'High open ticket counts and negative sentiment signal that the customer is experiencing pain without resolution. Both are correlated with reduced renewal intent. Weighted equal to billing because unresolved product friction is as likely to drive voluntary churn as payment issues are to drive involuntary churn.',
  },
  {
    name: 'Renewal at Risk',
    points: '+10',
    trigger: 'Renewal date is within 30 days AND usage has dropped ≥20%',
    rationale: 'Time-pressure amplifier. A usage drop that would otherwise be a medium concern becomes urgent when the contract is about to expire. Uses a lower usage threshold (20%) than the Usage Decline factor (50%) because any decline within the renewal window is worth acting on.',
  },
  {
    name: 'Low Feature Adoption',
    points: '+10',
    trigger: 'Fewer than 3 total feature_use events recorded for the account',
    rationale: "Accounts that haven't adopted the product's core features have not experienced its value. Low adoption strongly predicts churn at renewal — customers who see ROI renew, customers who don't, don't. Weighted lowest of all because it is a slow-moving signal, not an acute emergency.",
  },
];

const BANDS = [
  { label: 'Critical', range: '75 – 100', meaning: 'Multiple simultaneous risk signals. Needs immediate outreach — churn risk is high and likely within the current billing period.' },
  { label: 'High',     range: '50 – 74',  meaning: 'Significant risk. Proactive intervention is warranted. Risk signals are present but there may still be time to reverse them.' },
  { label: 'Medium',   range: '25 – 49',  meaning: 'Early warning. Worth monitoring closely and scheduling a check-in. One or two signals have fired but the account is not yet in crisis.' },
  { label: 'Low',      range: '0 – 24',   meaning: 'Healthy account. No significant churn signals. Standard relationship maintenance is sufficient.' },
];

export default function ScoringMethodology() {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-[#1c1c1e] border border-white/[0.08] rounded-card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <p className="text-xs font-bold uppercase tracking-widest text-white/60">How Scoring Works</p>
          <span className="text-xs text-white/30 font-medium">6 heuristic factors · 0–100 scale</span>
        </div>
        <ChevronDown
          size={15}
          className={`text-white/30 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="border-t border-white/[0.08] px-6 pb-6 pt-5 space-y-6">

          <p className="text-sm text-white/50 font-medium leading-relaxed max-w-3xl">
            ChurnRadar uses a <span className="text-white font-semibold">heuristic scoring engine</span> — no machine learning, no black box.
            Every account score is the direct sum of the factors below. Weights were chosen based on revenue impact, industry retention research,
            and the relative urgency of each signal type. Future versions would calibrate weights against recorded intervention outcomes.
          </p>

          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-white/30">Risk Factors</p>
            <div className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.08] overflow-hidden">
              {FACTORS.map(f => (
                <div key={f.name} className="grid grid-cols-[120px_56px_1fr] gap-4 px-5 py-4 bg-[#1c1c1e] hover:bg-white/[0.03] transition-colors">
                  <div>
                    <p className="text-xs font-bold text-white">{f.name}</p>
                    <p className="text-xs text-white/30 font-medium mt-0.5">{f.trigger}</p>
                  </div>
                  <div className="flex items-start pt-0.5">
                    <span className="text-sm font-bold text-white/60 bg-white/10 px-2.5 py-1 rounded-full">{f.points}</span>
                  </div>
                  <p className="text-xs text-white/40 font-medium leading-relaxed">{f.rationale}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-white/30">Risk Bands</p>
            <div className="grid grid-cols-2 gap-3">
              {BANDS.map(b => (
                <div key={b.label} className="bg-white/5 rounded-2xl px-5 py-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-bold text-white">{b.label}</span>
                    <span className="text-xs text-white/30 font-medium">{b.range} pts</span>
                  </div>
                  <p className="text-xs text-white/40 font-medium leading-relaxed">{b.meaning}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 border border-white/[0.08] rounded-2xl px-5 py-4">
            <p className="text-xs font-bold text-white/60 mb-1">On calibration</p>
            <p className="text-xs text-white/35 font-medium leading-relaxed">
              Current weights are heuristic. As intervention outcomes accumulate in the system (Saved / Churned / Expanded),
              the scoring model can be refined to reflect which signals actually predicted churn in your specific account base —
              moving from industry averages toward data calibrated on your own retention patterns.
            </p>
          </div>

        </div>
      )}
    </div>
  );
}
