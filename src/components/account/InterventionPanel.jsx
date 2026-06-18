'use client';
import { useState } from 'react';
import { Sparkles, Copy, Check, Loader2 } from 'lucide-react';
import { getAccountRecommendation } from '../../lib/claudeApi';

function CopyButton({ field, text, copied, onCopy }) {
  return (
    <button onClick={() => onCopy(field, text)} className="p-2 rounded-full text-ink-mute hover:text-ink hover:bg-canvas transition-colors">
      {copied === field ? <Check size={13} className="text-ink-soft" /> : <Copy size={13} />}
    </button>
  );
}

export default function InterventionPanel({ account, scoreResult }) {
  const [loading, setLoading] = useState(false);
  const [aiData, setAiData] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try { setAiData(await getAccountRecommendation(account, scoreResult)); }
    catch (e) { console.error('AI error:', e); setError(e.message || 'Failed to generate recommendations.'); }
    finally { setLoading(false); }
  }

  function handleCopy(field, text) {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="bg-[#1c1c1e] rounded-card overflow-hidden border border-white/[0.08]">
      <div className="flex items-center gap-3 px-8 py-5 border-b border-white/[0.08]">
        <Sparkles size={15} className="text-white/40" />
        <h3 className="text-sm font-bold text-white/60 tracking-wide uppercase">AI Intervention</h3>
      </div>

      <div className="p-8">
        {!aiData && !loading && (
          <div className="text-center py-10">
            <div className="w-14 h-14 rounded-3xl bg-white/5 flex items-center justify-center mx-auto mb-5">
              <Sparkles size={22} className="text-white/30" strokeWidth={1.5} />
            </div>
            <p className="text-sm text-white/35 mb-6 leading-relaxed max-w-xs mx-auto font-medium">
              Generate personalized outreach based on this account's risk signals.
            </p>
            <button onClick={handleGenerate} className="w-full py-4 bg-white text-black text-sm font-bold rounded-full hover:bg-white/90 transition-colors tracking-wide">
              Generate Recommendations
            </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-14 gap-4">
            <Loader2 size={22} className="animate-spin text-white/30" strokeWidth={1.5} />
            <span className="text-sm text-white/30 font-medium">Analyzing account signals...</span>
          </div>
        )}

        {error && <div className="bg-white/5 rounded-2xl p-5 text-sm text-white/50 font-medium">{error}</div>}

        {aiData && (
          <div className="space-y-7">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-3">Summary</p>
              <p className="text-sm text-white/60 leading-relaxed">{aiData.summary}</p>
            </div>
            {aiData.whyNow && (
              <div className="bg-white/5 rounded-2xl p-6 border-l-4 border-white/20">
                <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Why Act Now</p>
                <p className="text-sm text-white/60 font-medium leading-relaxed">{aiData.whyNow}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-3">Recommended Action</p>
              <p className="text-sm text-white/60 leading-relaxed">{aiData.recommendation}</p>
            </div>
            {aiData.outreachEmail && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-white/30">Email Draft</p>
                  <CopyButton field="email" text={aiData.outreachEmail} copied={copied} onCopy={handleCopy} />
                </div>
                <textarea readOnly value={aiData.outreachEmail} className="w-full text-xs text-white/50 bg-white/5 rounded-2xl p-5 resize-none focus:outline-none font-mono border border-white/10 leading-relaxed" rows={7} />
              </div>
            )}
            {aiData.outreachWhatsApp && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-white/30">WhatsApp / SMS</p>
                  <CopyButton field="whatsapp" text={aiData.outreachWhatsApp} copied={copied} onCopy={handleCopy} />
                </div>
                <textarea readOnly value={aiData.outreachWhatsApp} className="w-full text-xs text-white/50 bg-white/5 rounded-2xl p-5 resize-none focus:outline-none border border-white/10 leading-relaxed" rows={3} />
              </div>
            )}
            <button onClick={handleGenerate} className="text-xs text-white/25 hover:text-white/50 transition-colors font-medium">Regenerate ↺</button>
          </div>
        )}
      </div>
    </div>
  );
}
