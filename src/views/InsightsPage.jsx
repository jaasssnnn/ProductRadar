'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, GitBranch, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import InsightCard from '../components/insights/InsightCard';
import SegmentChart from '../components/insights/SegmentChart';
import AIQueryPanel from '../components/insights/AIQueryPanel';
import { getInsightsSummary } from '../lib/claudeApi';
import { computeRetention } from '../lib/retention';
import { computeActivation } from '../lib/activation';
import { computeCost } from '../lib/cost';
import { BASE_WEIGHTS } from '../lib/scoring';
import { FACTOR_SHORT } from '../lib/clustering';
import { getRiskLabel } from '../lib/scoring';

const FACTOR_LABELS = {
  inactivity:    'Inactivity',
  usage_decline: 'Usage Decline',
  billing:       'Billing Issue',
  support:       'Support Friction',
  renewal_risk:  'Renewal Risk',
  low_adoption:  'Low Adoption',
};

const STAT_GRADIENTS = [
  'bg-gradient-to-br from-kpi-blue-from to-kpi-blue-to',
  'bg-gradient-to-br from-kpi-rose-from to-kpi-rose-to',
  'bg-gradient-to-br from-kpi-cream-from to-kpi-cream-to',
];

const BAND_ORDER = ['Critical', 'High', 'Medium', 'Low'];
const RISK_COLORS = { Critical: '#E5484D', High: '#EA7A19', Medium: '#C98A1E', Low: '#16A36B' };

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

function ClusterCard({ cluster }) {
  const color = RISK_COLORS[getRiskLabel(cluster.avgScore)] || '#555';
  return (
    <div className="bg-[#1c1c1e] border border-white/[0.08] rounded-card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-white leading-snug">{cluster.name}</p>
          <p className="text-xs text-white/40 font-medium mt-0.5 leading-snug">{cluster.description}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-2xl font-bold tabular-nums leading-none" style={{ color }}>{cluster.avgScore}</p>
          <p className="text-xs text-white/25 font-medium mt-0.5">avg score</p>
        </div>
      </div>

      {cluster.dominantFactors.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {cluster.dominantFactors.map(f => (
            <span key={f} className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/8 text-white/50">
              {FACTOR_SHORT[f]}
            </span>
          ))}
        </div>
      )}

      <div>
        <p className="text-xs text-white/25 font-medium mb-1.5">
          {cluster.members.length} account{cluster.members.length !== 1 ? 's' : ''}
        </p>
        <div className="space-y-0.5">
          {cluster.members.slice(0, 5).map(a => (
            <p key={a.customer_id} className="text-xs text-white/35 font-medium truncate">· {a.account_name}</p>
          ))}
          {cluster.members.length > 5 && (
            <p className="text-xs text-white/20 font-medium">+{cluster.members.length - 5} more</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const { scoredAccounts, dataLoaded, accountStatuses, outcomes, clusters, learnedWeights, learnedWeightsMeta, activity, customers, billing, support } = useApp();
  const router = useRouter();
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const retentionData  = useMemo(() => computeRetention(customers, activity),          [customers, activity]);
  const activationData = useMemo(() => computeActivation(customers, activity),         [customers, activity]);
  const costData       = useMemo(() => computeCost(customers, activity, support, null, []), [customers, activity, support]);

  async function loadInsights() {
    setLoading(true); setError(null);
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

  const isLearned   = learnedWeightsMeta?.isLearned;
  const sampleSize  = learnedWeightsMeta?.sampleSize ?? 0;

  return (
    <div className="min-h-full bg-black p-8 space-y-6">
      <div className="mb-2">
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Insights</h2>
        <p className="text-sm text-white/40 font-medium mt-1">AI-powered patterns across your accounts</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map(({ label, value, small }, i) => (
          <div key={label} className={`rounded-3xl p-6 flex flex-col justify-between min-h-[140px] shadow-sm border border-black/5 ${STAT_GRADIENTS[i]}`}>
            <p className="text-sm font-semibold text-black/60 leading-snug">{label}</p>
            <p className={`font-bold text-black tracking-tight leading-none ${small ? 'text-lg mt-2' : 'text-4xl'}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Risk Profiles — K-Means Clusters */}
      {clusters.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <GitBranch size={13} className="text-white/40" />
            <p className="text-xs font-bold uppercase tracking-widest text-white/40">Risk Profiles</p>
            <span className="text-xs text-white/20 font-medium ml-1">
              {clusters.length} segments · {scoredAccounts.length} accounts · k-means clustering
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {clusters.map(cluster => (
              <ClusterCard key={cluster.id} cluster={cluster} />
            ))}
          </div>
        </div>
      )}

      {/* Scoring Intelligence — Learned Weights */}
      <div className="bg-[#1c1c1e] border border-white/[0.08] rounded-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap size={13} className={isLearned ? 'text-green-400' : 'text-white/30'} />
            <p className="text-xs font-bold uppercase tracking-widest text-white/40">Scoring Intelligence</p>
          </div>
          {isLearned ? (
            <span className="text-xs bg-green-500/15 text-green-400 font-bold px-2.5 py-1 rounded-full">
              Active · {sampleSize} outcomes
            </span>
          ) : (
            <span className="text-xs bg-white/5 text-white/30 font-bold px-2.5 py-1 rounded-full">
              Needs {Math.max(0, 5 - sampleSize)} more outcome{5 - sampleSize !== 1 ? 's' : ''} to activate
            </span>
          )}
        </div>

        <p className="text-xs text-white/40 font-medium mb-5 leading-relaxed">
          {isLearned
            ? `Factor weights have been adjusted based on ${sampleSize} recorded intervention outcomes. Factors that reliably predicted churn in your account base are weighted higher; factors that appeared in saved accounts are weighted lower.`
            : 'Record Saved / Churned / Expanded outcomes on resolved accounts. Once 5 outcomes are logged, ProductRadar will calibrate factor weights against your actual churn data instead of industry defaults.'
          }
        </p>

        <div className="space-y-3">
          {Object.entries(BASE_WEIGHTS).map(([key, base]) => {
            const learned = learnedWeights?.[key] ?? base;
            const delta   = learned - base;
            const maxW    = Math.max(...Object.values(learnedWeights ?? BASE_WEIGHTS), ...Object.values(BASE_WEIGHTS));
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="text-xs text-white/50 font-medium w-32 flex-shrink-0">{FACTOR_LABELS[key]}</span>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/20 w-6 tabular-nums text-right">{base}</span>
                    <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
                      <div className="h-full bg-white/25 rounded-full transition-all" style={{ width: `${(base / maxW) * 100}%` }} />
                    </div>
                    <span className="text-xs text-white/20 w-10">base</span>
                  </div>
                  {isLearned && (
                    <div className="flex items-center gap-2">
                      <span className={`text-xs w-6 tabular-nums text-right font-bold ${
                        delta > 0 ? 'text-red-400' : delta < 0 ? 'text-green-400' : 'text-white/20'
                      }`}>{learned}</span>
                      <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(learned / maxW) * 100}%`,
                            background: delta > 0 ? '#E5484D' : delta < 0 ? '#16A36B' : 'rgba(255,255,255,0.25)',
                          }}
                        />
                      </div>
                      <span className={`text-xs font-bold w-10 ${
                        delta > 0 ? 'text-red-400' : delta < 0 ? 'text-green-400' : 'text-white/20'
                      }`}>
                        {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '—'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Intervention Outcomes */}
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

      {/* Conversational AI query */}
      <AIQueryPanel
        scoredAccounts={scoredAccounts}
        retentionData={retentionData}
        activationData={activationData}
        costData={costData}
      />
    </div>
  );
}
