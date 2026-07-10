'use client';
import { useState, useEffect } from 'react';
import { Sparkles, Loader2, ChevronDown, ChevronUp, TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react';
import { getWeeklyDigest } from '../../lib/claudeApi';

function getISOWeek() {
  const d = new Date();
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const week = Math.ceil(((d - jan4) / 86400000 + jan4.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function lsGet(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* storage unavailable */ } }

export default function WeeklyDigest({ scoredAccounts, changedAccounts }) {
  const [digest,    setDigest]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [expanded,  setExpanded]  = useState(true);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    if (!scoredAccounts.length) return;
    const currentWeek = getISOWeek();
    const cached = lsGet('cr_weekly_digest');
    const cachedWeek = lsGet('cr_weekly_digest_week');

    if (cached && cachedWeek === currentWeek) {
      setDigest(cached);
      return;
    }

    setLoading(true);
    getWeeklyDigest(scoredAccounts, changedAccounts)
      .then(d => {
        setDigest(d);
        lsSet('cr_weekly_digest', d);
        lsSet('cr_weekly_digest_week', currentWeek);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoredAccounts.length]);

  if (loading) return (
    <div className="bg-[#1a1a2e] border border-[#6B93F0]/20 rounded-card p-5 flex items-center gap-3">
      <Loader2 size={15} className="animate-spin text-[#6B93F0]" />
      <span className="text-sm text-white/40 font-medium">Generating weekly digest…</span>
    </div>
  );

  if (error || !digest) return null;

  return (
    <div className="bg-[#1a1a2e] border border-[#6B93F0]/20 rounded-card overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/5 transition-colors text-left"
      >
        <Sparkles size={15} className="text-[#6B93F0] flex-shrink-0" />
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-[#6B93F0] mb-0.5">Weekly Digest</p>
          <p className="text-sm font-semibold text-white leading-snug">{digest.headline}</p>
        </div>
        {expanded ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-white/[0.06] pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {digest.improved && (
              <div className="flex items-start gap-2.5">
                <TrendingDown size={14} className="text-[#16A36B] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#16A36B] mb-1">What improved</p>
                  <p className="text-xs text-white/60 leading-relaxed">{digest.improved}</p>
                </div>
              </div>
            )}
            {digest.deteriorated && (
              <div className="flex items-start gap-2.5">
                <TrendingUp size={14} className="text-[#E5484D] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#E5484D] mb-1">Needs attention</p>
                  <p className="text-xs text-white/60 leading-relaxed">{digest.deteriorated}</p>
                </div>
              </div>
            )}
          </div>

          {digest.actions?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Actions this week</p>
              <div className="space-y-1.5">
                {digest.actions.map((action, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 size={12} className="text-[#6B93F0] flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-white/60">{action}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
