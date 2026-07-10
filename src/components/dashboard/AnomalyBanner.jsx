'use client';
import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import { getAnomalyInsight } from '../../lib/claudeApi';

function lsGet(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* storage unavailable */ } }

function detectAnomalies(scoredAccounts, prevMetrics) {
  if (!prevMetrics || !scoredAccounts.length) return [];
  const anomalies = [];

  const critical   = scoredAccounts.filter(a => a.label === 'Critical').length;
  const atRisk     = scoredAccounts.filter(a => a.score >= 50).length;
  const mrrAtRisk  = Math.round(scoredAccounts.reduce((s, a) => s + parseFloat(a.mrr || 0) * (a.score / 100), 0));

  const critDiff   = critical  - (prevMetrics.critical  || 0);
  const riskDiff   = atRisk    - (prevMetrics.atRisk    || 0);
  const mrrDiff    = prevMetrics.mrrAtRisk > 0
    ? ((mrrAtRisk - prevMetrics.mrrAtRisk) / prevMetrics.mrrAtRisk) * 100
    : 0;

  if (critDiff >= 2) anomalies.push(`Critical accounts jumped by ${critDiff} (now ${critical} total)`);
  if (riskDiff >= 3) anomalies.push(`At-risk accounts increased by ${riskDiff} (now ${atRisk} total)`);
  if (mrrDiff >= 20) anomalies.push(`Weighted MRR at risk rose ${mrrDiff.toFixed(0)}% to $${mrrAtRisk.toLocaleString()}`);

  return anomalies;
}

export default function AnomalyBanner({ scoredAccounts }) {
  const [banner,   setBanner]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [visible,  setVisible]  = useState(true);
  const ranRef = useRef(false);

  useEffect(() => {
    if (!scoredAccounts.length || ranRef.current) return;
    ranRef.current = true;

    const prevMetrics = lsGet('cr_prev_metrics');
    const anomalies   = detectAnomalies(scoredAccounts, prevMetrics);

    // Save current metrics for next run
    lsSet('cr_prev_metrics', {
      critical:  scoredAccounts.filter(a => a.label === 'Critical').length,
      atRisk:    scoredAccounts.filter(a => a.score >= 50).length,
      mrrAtRisk: Math.round(scoredAccounts.reduce((s, a) => s + parseFloat(a.mrr || 0) * (a.score / 100), 0)),
    });

    if (!anomalies.length) return;

    // Check if this exact anomaly set was already dismissed
    const dismissed = lsGet('cr_anomaly_dismissed');
    if (dismissed && dismissed === anomalies.join('|')) return;

    setLoading(true);
    getAnomalyInsight(anomalies, scoredAccounts)
      .then(result => setBanner(result))
      .catch(() => setBanner({ alert: anomalies[0], severity: 'medium' }))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoredAccounts.length]);

  function dismiss() {
    const prevMetrics = lsGet('cr_prev_metrics');
    const anomalies   = detectAnomalies(scoredAccounts, prevMetrics);
    lsSet('cr_anomaly_dismissed', anomalies.join('|'));
    setVisible(false);
  }

  if (loading) return (
    <div className="bg-[#2a1a1a] border border-[#E5484D]/20 rounded-2xl px-5 py-3 flex items-center gap-3">
      <Loader2 size={13} className="animate-spin text-[#E5484D]/60" />
      <span className="text-xs text-[#E5484D]/60 font-medium">Analyzing anomalies…</span>
    </div>
  );

  if (!banner || !visible) return null;

  const isHigh = banner.severity === 'high';

  return (
    <div className={`border rounded-2xl px-5 py-4 flex items-start gap-3 ${
      isHigh
        ? 'bg-[#2a1a1a] border-[#E5484D]/30'
        : 'bg-[#2a2010] border-[#C98A1E]/30'
    }`}>
      <AlertTriangle size={14} className={`flex-shrink-0 mt-0.5 ${isHigh ? 'text-[#E5484D]' : 'text-[#C98A1E]'}`} />
      <div className="flex-1">
        <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isHigh ? 'text-[#E5484D]' : 'text-[#C98A1E]'}`}>
          Anomaly Detected
        </p>
        <p className="text-xs text-white/70 font-medium leading-relaxed">{banner.alert}</p>
      </div>
      <button onClick={dismiss} className="text-white/20 hover:text-white/50 transition-colors flex-shrink-0 mt-0.5">
        <X size={13} />
      </button>
    </div>
  );
}
