'use client';
import { useRouter } from 'next/navigation';
import { Users, AlertTriangle, Zap, TrendingDown, TrendingUp, ArrowRight, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';
import MetricCard from '../components/dashboard/MetricCard';
import RiskTable from '../components/dashboard/RiskTable';
import SegmentChart from '../components/insights/SegmentChart';
import ScoringMethodology from '../components/dashboard/ScoringMethodology';
import WeeklyDigest from '../components/dashboard/WeeklyDigest';
import AnomalyBanner from '../components/dashboard/AnomalyBanner';

const FACTOR_LABELS = {
  inactivity:    'No recent activity',
  usage_decline: 'Usage drop',
  billing:       'Billing issue',
  support:       'Support friction',
  renewal_risk:  'Renewal at risk',
  low_adoption:  'Low feature adoption',
};

const KPI_CARDS = (total, atRisk, critical, mrr) => [
  { title: 'Total Accounts', value: total,                    subtitle: 'in dataset',    icon: Users,        gradient: 'bg-gradient-to-br from-kpi-blue-from to-kpi-blue-to' },
  { title: 'At Risk',        value: atRisk,                   subtitle: 'score ≥ 50',    icon: AlertTriangle, gradient: 'bg-gradient-to-br from-kpi-cream-from to-kpi-cream-to' },
  { title: 'Critical',       value: critical,                  subtitle: 'score ≥ 75',    icon: Zap,          gradient: 'bg-gradient-to-br from-kpi-rose-from to-kpi-rose-to' },
  { title: 'MRR at Risk',    value: `$${mrr.toLocaleString()}`, subtitle: 'expected loss', icon: TrendingDown, gradient: 'bg-gradient-to-br from-kpi-lav-from to-kpi-lav-to' },
];

const LABEL_ORDER = { Critical: 4, High: 3, Medium: 2, Low: 1 };
const MISSING_DATA_INFO = {
  activity: 'No activity data — inactivity and usage decline factors cannot be scored.',
  billing:  'No billing data — billing risk factor cannot be scored.',
  support:  'No support data — support friction factor cannot be scored.',
};

const STATUS_META = [
  { value: 'unactioned',          label: 'Unactioned', color: 'text-ink-mute'       },
  { value: 'contacted',           label: 'Contacted',  color: 'text-[#C98A1E]'      },
  { value: 'follow_up_scheduled', label: 'Follow-up',  color: 'text-[#4070E0]'      },
  { value: 'resolved',            label: 'Resolved',   color: 'text-[#16A36B]'      },
];

export default function DashboardPage() {
  const { scoredAccounts, dataLoaded, changedAccounts, loadedDataTypes, accountStatuses, lastSynced } = useApp();
  const router = useRouter();

  if (!dataLoaded) {
    return (
      <div className="min-h-full bg-black p-8 flex flex-col items-center justify-center h-64 text-center">
        <p className="text-sm text-ink-mute mb-5 font-medium">No data loaded yet.</p>
        <button onClick={() => router.push('/upload')} className="px-6 py-3 text-sm font-bold text-white bg-ink rounded-chip hover:bg-[#2A2A30] transition-colors">
          Upload Data
        </button>
      </div>
    );
  }

  const atRisk    = scoredAccounts.filter(a => a.score >= 50);
  const critical  = scoredAccounts.filter(a => a.label === 'Critical');
  // Weighted: MRR × (score/100) so a 90-risk account contributes 90% of its MRR, not 100%
  const mrrAtRisk = Math.round(scoredAccounts.reduce((sum, a) => sum + parseFloat(a.mrr || 0) * (a.score / 100), 0));
  const cards     = KPI_CARDS(scoredAccounts.length, atRisk.length, critical.length, mrrAtRisk);

  const factorCounts = {};
  scoredAccounts.forEach(a => (a.factors || []).forEach(f => {
    factorCounts[f.key] = (factorCounts[f.key] || 0) + 1;
  }));
  const factorData = Object.entries(factorCounts)
    .map(([key, count]) => ({ factor: FACTOR_LABELS[key] || key, count }))
    .sort((a, b) => b.count - a.count);

  const missingTypes = ['activity', 'billing', 'support'].filter(t => !loadedDataTypes.includes(t));

  const statusCounts = STATUS_META.map(({ value, label, color }) => {
    const count = value === 'unactioned'
      ? scoredAccounts.filter(a => !accountStatuses[a.customer_id] || accountStatuses[a.customer_id] === 'unactioned').length
      : scoredAccounts.filter(a => accountStatuses[a.customer_id] === value).length;
    return { value, label, color, count };
  });
  const worsened = changedAccounts.filter(a => (LABEL_ORDER[a.label] || 0) > (LABEL_ORDER[a.prevLabel] || 0));
  const improved = changedAccounts.filter(a => (LABEL_ORDER[a.label] || 0) < (LABEL_ORDER[a.prevLabel] || 0));

  return (
    <div className="min-h-full bg-black p-8 space-y-5">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Dashboard</h2>
          <p className="text-sm text-white/40 font-medium mt-1">Churn risk overview across all accounts</p>
        </div>
        {lastSynced && (
          <p className="text-sm text-white/70 font-medium mt-1.5">
            Last synced {new Date(lastSynced).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </p>
        )}
      </div>

      {/* Weekly digest */}
      <WeeklyDigest scoredAccounts={scoredAccounts} changedAccounts={changedAccounts} />

      {/* Anomaly banner */}
      <AnomalyBanner scoredAccounts={scoredAccounts} />

      {/* Confidence banner */}
      {missingTypes.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl px-5 py-4 flex items-start gap-3">
          <Info size={15} className="text-[#C98A1E] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-[#C98A1E] uppercase tracking-widest mb-1">Partial data — scores may be incomplete</p>
            <p className="text-xs text-[#C98A1E]/80 font-medium leading-relaxed">
              {missingTypes.map(t => MISSING_DATA_INFO[t]).join(' ')}
            </p>
          </div>
        </div>
      )}

      {/* What changed since last run */}
      {changedAccounts.length > 0 && (
        <div className="bg-[#1c1c1e] border border-white/[0.08] rounded-card p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">
            {changedAccounts.length} account{changedAccounts.length > 1 ? 's' : ''} changed risk level since last run
          </p>
          <div className="space-y-2">
            {[...worsened, ...improved].map(a => {
              const worse = (LABEL_ORDER[a.label] || 0) > (LABEL_ORDER[a.prevLabel] || 0);
              return (
                <div
                  key={a.customer_id}
                  className="flex items-center justify-between gap-4 p-3 rounded-xl bg-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                  onClick={() => router.push(`/account/${a.customer_id}`)}
                >
                  <span className="text-sm font-semibold text-white">{a.account_name}</span>
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span className="text-white/30">{a.prevLabel}</span>
                    {worse
                      ? <TrendingUp size={13} className="text-[#E5484D]" />
                      : <TrendingDown size={13} className="text-[#16A36B]" />
                    }
                    <span className={worse ? 'text-[#E5484D]' : 'text-[#16A36B]'}>{a.label}</span>
                    <ArrowRight size={12} className="text-white/30 ml-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(card => <MetricCard key={card.title} {...card} onArrow={() => router.push('/insights')} />)}
      </div>

      {/* Scoring methodology */}
      <ScoringMethodology />

      {/* Risk factors chart */}
      <SegmentChart data={factorData} dataKey="count" nameKey="factor" title="Most Common Risk Factors" unit=" accts" />

      {/* Workflow status summary */}
      <div className="flex items-center gap-2 px-1">
        <p className="text-xs font-bold uppercase tracking-widest text-white/25 mr-2">Workflow</p>
        {statusCounts.map(({ label, color, count }, i) => (
          <span key={label} className="flex items-center gap-2">
            {i > 0 && <span className="text-hairline select-none">·</span>}
            <span className={`text-xs font-bold ${color}`}>{count} {label}</span>
          </span>
        ))}
      </div>

      {/* Accounts table */}
      <RiskTable accounts={scoredAccounts} />
    </div>
  );
}
