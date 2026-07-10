'use client';
import { useState } from 'react';
import { Sparkles, Loader2, SendHorizontal } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getConversationalAnswer } from '../../lib/claudeApi';

const EXAMPLE_QUESTIONS = [
  'Which plan has the highest churn risk?',
  'Which cohort has the worst 30-day retention?',
  'How many accounts have billing issues?',
  'Who are our top 3 accounts at risk this week?',
];

const tooltipStyle = { background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 };

export default function AIQueryPanel({ scoredAccounts, retentionData, activationData, costData }) {
  const [question, setQuestion] = useState('');
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  function buildContext() {
    const retentionSummary = retentionData
      ? `Day-7: ${retentionData.avgDay7.toFixed(1)}%, Day-30: ${retentionData.avgDay30.toFixed(1)}%, Day-90: ${retentionData.avgDay90.toFixed(1)}%`
      : null;

    const activationSummary = activationData
      ? `7-day activation rate: ${activationData.activationRate7.toFixed(1)}%, 30-day: ${activationData.activationRate30.toFixed(1)}%, Avg TTFV: ${activationData.avgTTFV?.toFixed(1) ?? 'N/A'} days`
      : null;

    const costSummary = costData
      ? `MRR/active user: $${costData.mrrPerActiveUser?.toFixed(0) ?? 'N/A'}, LTV: $${Math.round(costData.ltv).toLocaleString()}, LTV:CAC: ${costData.ltvcac?.toFixed(1) ?? 'N/A'}x`
      : null;

    return { scoredAccounts, retentionSummary, activationSummary, costSummary };
  }

  async function handleAsk(q) {
    const qText = q || question.trim();
    if (!qText || loading) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const answer = await getConversationalAnswer(qText, buildContext());
      setResult(answer);
      if (!q) setQuestion('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[#111] border border-white/[0.08] rounded-card p-6 space-y-5">
      <div className="flex items-center gap-2.5">
        <Sparkles size={15} className="text-[#6B93F0]" />
        <p className="text-xs font-bold uppercase tracking-widest text-white/40">Ask your data</p>
      </div>

      {/* Input */}
      <div className="flex gap-3">
        <input
          type="text"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAsk()}
          placeholder="Which cohort has the worst 30-day retention?"
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors"
        />
        <button
          onClick={() => handleAsk()}
          disabled={!question.trim() || loading}
          className="px-4 py-2.5 bg-[#6B93F0] text-white text-sm font-bold rounded-xl hover:bg-[#5a82df] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <SendHorizontal size={14} />}
        </button>
      </div>

      {/* Example questions */}
      {!result && !loading && (
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_QUESTIONS.map(q => (
            <button
              key={q}
              onClick={() => handleAsk(q)}
              className="text-xs text-white/40 bg-white/5 border border-white/[0.08] px-3 py-1.5 rounded-full hover:bg-white/10 hover:text-white/60 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2.5 py-2">
          <Loader2 size={14} className="animate-spin text-[#6B93F0]" />
          <span className="text-sm text-white/40">Querying your data…</span>
        </div>
      )}

      {/* Error */}
      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Answer */}
      {result && (
        <div className="space-y-4 pt-1 border-t border-white/[0.06]">
          <p className="text-sm text-white/80 leading-relaxed">{result.answer}</p>

          {result.chartData?.length > 0 && (
            <div>
              {result.chartTitle && (
                <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4">{result.chartTitle}</p>
              )}
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={result.chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#9A9AA2', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#9A9AA2', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" fill="#6B93F0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <button
            onClick={() => { setResult(null); setQuestion(''); }}
            className="text-xs text-white/25 hover:text-white/50 transition-colors"
          >
            Ask another question
          </button>
        </div>
      )}
    </div>
  );
}
