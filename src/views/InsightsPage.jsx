'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import InsightCard from '../components/insights/InsightCard';
import SegmentChart from '../components/insights/SegmentChart';
import { getInsightsSummary } from '../lib/claudeApi';

const FACTOR_LABELS = {
  inactivity:    'No recent activity',
  usage_decline: 'Usage drop',
  billing:       'Billing issue',
  support:       'Support friction',
  renewal_risk:  'Renewal at risk',
  low_adoption:  'Low feature adoption',
};

const STAT_GRADIENTS = [
  'bg-gradient-to-br from-kpi-blue-from to-kpi-blue-to',
  'bg-gradient-to-br from-kpi-rose-from to-kpi-rose-to',
  'bg-gradient-to-br from-kpi-cream-from to-kpi-cream-to',
];

const BAND_ORDER = ['Critical', 'High', 'Medium', 'Low'];

function outcomeAnalytics(scoredAccounts, accountStatuses, outcomes) {
  const resolvedIds = Object.entries(accountStatuses)
    .filter(([, s]) => s === 'resolved')
    .map(([id]) => id);

  const counts = { Saved: 0, Churned: 0, Expanded: 0 };
  resolvedIds.forEach(id => {
    const o = outcomes[id];
    if (o && counts[o] !== undefined) counts[o]++;
  });

  const total = counts.Saved + counts.Churned + counts.Expanded;

  const byBand = {};
  resolvedIds.forEach(id => {
    const acct    = scoredAccounts.find(a => a.customer_id === id);
    const outcome = outcomes[id];
    if (!acct || !outcome) return;
    const b = acct.label;
    if (!byBand[b]) byBand[b] = { Saved: 0, Churned: 0, Expanded: 0, total: 0 };
    byBand[b][outcome]++;
    byBand[b].total++;
  });

  return { counts, total, byBand, resolvedCount: resolvedIds.length };
}

export default function InsightsPage() {
  const { scoredAccounts, dataLoaded, accountStatuses, outcomes } = useApp();
  const router = useRouter();
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function loadInsights() {
    setLoading(true);
    setError(null);
    try { setInsights(await getInsightsSummary(scoredAccounts)); }
    catch (e) { setError('Failed to load AI insights.'); }
    finally { setLoading(false); }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (dataLoaded && scoredAccounts.length && !insights) loadInsights(); }, [dataLoaded, scoredAccounts]);

  if (!dataLoaded) {
    return (
      <div className="min-h-full bg-black p-8 flex flex-col items-center justify-center h-64 text-center">
        <p className="text-sm text-ink-mute mb-5 font-medium">No data loaded yet.</p>
        <button onClick={() => router.push('/upload')} className="px-6 py-3 text-sm font-bold text-white bg-ink rounded-full hover:bg-ink/90">
          Upload Data
        </button>
      </div>
    );
  }

  const highRisk    = scoredAccounts.filter(a => a.score >= 50);
  const mrrAtRisk   = Math.round(scoredAccounts.reduce((sum, a) => sum + parseFloat(a.mrr || 0) * (a.score / 100), 0));
  const pctHighRisk = Math.round((highRisk.length / scoredAccounts.length) * 100);

  const riskLevelData = ['Critical', 'High', 'Medium', 'Low'].map(label => ({
    label, count: scoredAccounts.filter(a => a.label === label).length,
  }));

  const planMRR = {};
  scoredAccounts.forEach(a => {
    planMRR[a.plan] = (planMRR[a.plan] || 0) + parseFloat(a.mrr || 0) * (a.score / 100);
  });
  const planData = Object.entries(planMRR).map(([plan, mrr]) => ({ plan, mrr }));

  const factorCounts = {};
  scoredAccounts.forEach(a => (a.factors || []).forEach(f => {
    factorCounts[f.key] = (factorCounts[f.key] || 0) + 1;
  }));
  const factorData = Object.entries(factorCounts)
    .map(([key, count]) => ({ factor: FACTOR_LABELS[key] || key, count }))
    .sort((a, b) => b.count - a.count);

  const stats = [
    { label: 'MRR at Risk',     value: `$${mrrAtRisk.toLocaleString()}` },
    { label: 'High / Critical', value: `${pctHighRisk}%` },
    { label: 'Top Risk Factor', value: factorData[0]?.factor || '—', small: true },
  ];

  const oa = outcomeAnalytics(scoredAccounts, accountStatuses, outcomes);
  const saveRate = oa.total > 0 ? Math.round((oa.counts.Saved / oa.total) * 100) : null;

  return (
    <div className="min-h-full bg-black p-8 space-y-6">
      <div className="mb-2">
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Insights</h2>
        <p className="text-sm text-white/40 font-medium mt-1">AI-powered patterns across your accounts</p>
      </div>

      {/* Stat cards — gradient like KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map(({ label, value, small }, i) => (
          <div key={label} className={`rounded-3xl p-6 flex flex-col justify-between min-h-[140px] shadow-sm border border-black/5 ${STAT_GRADIENTS[i]}`}>
            <p className="text-sm font-semibold text-black/60 leading-snug">{label}</p>
            <p className={`font-bold text-black tracking-tight leading-none ${small ? 'text-lg mt-2' : 'text-4xl'}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Intervention Outcomes — only shown once any account has a recorded outcome */}
      {oa.total > 0 && (
        <div className="bg-[#1c1c1e] border border-white/[0.08] rounded-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-white/40">Intervention Outcomes</p>
            <span className="text-xs text-white/30 font-medium">{oa.resolvedCount} resolved account{oa.resolvedCount !== 1 ? 's' : ''}</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Saved',    count: oa.counts.Saved,    pct: Math.round((oa.counts.Saved    / oa.total) * 100), bg: 'bg-green-500/15', text: 'text-green-400' },
              { label: 'Churned',  count: oa.counts.Churned,  pct: Math.round((oa.counts.Churned  / oa.total) * 100), bg: 'bg-red-500/15',   text: 'text-red-400' },
              { label: 'Expanded', count: oa.counts.Expanded, pct: Math.round((oa.counts.Expanded / oa.total) * 100), bg: 'bg-white/5',      text: 'text-white/60' },
            ].map(({ label, count, pct, bg, text }) => (
              <div key={label} className={`${bg} rounded-2xl p-4 flex flex-col gap-1`}>
                <p className={`text-2xl font-bold ${text}`}>{count}</p>
                <p className={`text-xs font-semibold ${text} opacity-80`}>{label} · {pct}%</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-5 py-3">
            <p className="text-sm text-white/30 font-medium">Overall save rate</p>
            <p className="text-xl font-bold text-white ml-auto">{saveRate}%</p>
            <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-green-400 rounded-full" style={{ width: `${saveRate}%` }} />
            </div>
          </div>

          {BAND_ORDER.filter(b => oa.byBand[b]).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-white/30">By Risk Band</p>
              <div className="space-y-2">
                {BAND_ORDER.filter(b => oa.byBand[b]).map(band => {
                  const b = oa.byBand[band];
                  const savedPct = Math.round((b.Saved / b.total) * 100);
                  return (
                    <div key={band} className="flex items-center gap-3 text-sm">
                      <span className="w-16 text-xs font-bold text-white/40">{band}</span>
                      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-green-400 rounded-full" style={{ width: `${savedPct}%` }} />
                      </div>
                      <span className="text-xs text-white/30 font-medium w-24 text-right">
                        {b.Saved}S · {b.Churned}C · {b.Expanded}E
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Insights */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={13} className="text-white/40" />
          <p className="text-xs font-bold uppercase tracking-widest text-white/40">AI Insights</p>
        </div>
        {loading && (
          <div className="flex items-center gap-3 text-white/30 py-6">
            <Loader2 size={16} className="animate-spin text-white/30" />
            <span className="text-sm font-medium">Analyzing patterns...</span>
          </div>
        )}
        {error && <p className="text-sm text-white/30 font-medium">{error}</p>}
        {insights && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.map((insight, i) => <InsightCard key={i} insight={insight} />)}
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <SegmentChart data={riskLevelData} dataKey="count" nameKey="label" title="Accounts by Risk Level" unit=" accts" />
        <SegmentChart data={planData}      dataKey="mrr"   nameKey="plan"  title="MRR at Risk by Plan" />
      </div>
    </div>
  );
}
