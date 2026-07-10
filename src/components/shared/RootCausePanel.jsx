'use client';
import { useState, useEffect, useRef } from 'react';
import { Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { getRootCauseHypothesis } from '../../lib/claudeApi';

function lsGet(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

export default function RootCausePanel({ metricName, currentVal, prevKey, threshold = 5, topAccounts = [] }) {
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [expanded, setExpanded] = useState(true);
  const ranRef = useRef(false);

  useEffect(() => {
    if (currentVal == null || ranRef.current) return;

    const prevVal = lsGet(prevKey);

    // Save current for next comparison
    lsSet(prevKey, currentVal);

    if (prevVal == null) return;

    const drop = prevVal - currentVal;
    if (drop < threshold) return;

    ranRef.current = true;
    setLoading(true);
    getRootCauseHypothesis(metricName, currentVal, prevVal, topAccounts)
      .then(setResult)
      .catch(() => setResult(null))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVal]);

  if (loading) return (
    <div className="bg-[#1a1a2e] border border-[#6B93F0]/20 rounded-card px-5 py-4 flex items-center gap-3">
      <Loader2 size={13} className="animate-spin text-[#6B93F0]" />
      <span className="text-xs text-white/40 font-medium">Analyzing why {metricName} dropped…</span>
    </div>
  );

  if (!result) return null;

  return (
    <div className="bg-[#1a1a2e] border border-[#6B93F0]/20 rounded-card overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/5 transition-colors text-left"
      >
        <Sparkles size={14} className="text-[#6B93F0] flex-shrink-0" />
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B93F0] mb-0.5">AI Root Cause</p>
          <p className="text-sm font-semibold text-white">{metricName} dropped — here's why it might have</p>
        </div>
        {expanded ? <ChevronUp size={13} className="text-white/30" /> : <ChevronDown size={13} className="text-white/30" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-white/[0.06] pt-4 space-y-3">
          <p className="text-sm text-white/70 leading-relaxed">{result.hypothesis}</p>
          <div className="bg-white/5 rounded-xl px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1">Recommended action</p>
            <p className="text-xs text-white/60">{result.recommendation}</p>
          </div>
        </div>
      )}
    </div>
  );
}
