'use client';
import { useState } from 'react';
import { BarChart2, ChevronDown, ChevronUp, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

function defaultDates() {
  const to   = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  const fmt = d => d.toISOString().split('T')[0];
  return { from: fmt(from), to: fmt(to) };
}

export default function MixpanelConnect({ onSyncComplete }) {
  const [open,       setOpen]       = useState(false);
  const [apiSecret,  setApiSecret]  = useState('');
  const [fromDate,   setFromDate]   = useState(defaultDates().from);
  const [toDate,     setToDate]     = useState(defaultDates().to);
  const [syncing,    setSyncing]    = useState(false);
  const [error,      setError]      = useState(null);
  const [lastSync,   setLastSync]   = useState(null);

  async function handleSync() {
    if (!apiSecret.trim()) { setError('API secret is required.'); return; }
    setSyncing(true); setError(null);
    try {
      const res  = await fetch('/api/mixpanel/sync', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ apiSecret: apiSecret.trim(), fromDate, toDate }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Sync failed.');
      setLastSync(data.meta);
      setOpen(false);
      onSyncComplete(data.activity);
    } catch (e) {
      setError(e.message);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="border border-white/10 rounded-2xl bg-white/5 backdrop-blur-sm overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/5 transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0">
          <BarChart2 size={15} className="text-white/60" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-white">Sync from Mixpanel</p>
          <p className="text-xs text-white/40 font-medium">
            {lastSync
              ? `Last sync: ${lastSync.rowCount} activity rows from ${lastSync.fromDate} → ${lastSync.toDate}`
              : 'Pull event data directly from your Mixpanel project'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastSync && <CheckCircle size={13} className="text-green-400" />}
          {open ? <ChevronUp size={15} className="text-white/30" /> : <ChevronDown size={15} className="text-white/30" />}
        </div>
      </button>

      {/* Expandable form */}
      {open && (
        <div className="px-5 pb-5 border-t border-white/[0.07] pt-4 space-y-4">
          <div>
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-1.5">
              API Secret
            </label>
            <input
              type="password"
              placeholder="Your Mixpanel project API secret"
              value={apiSecret}
              onChange={e => setApiSecret(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors font-mono"
            />
            <p className="text-[11px] text-white/25 mt-1.5">
              Found in Mixpanel → Settings → Project Settings → Access Keys
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-1.5">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-1.5">To</label>
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs text-red-400 font-medium">
              <AlertCircle size={12} className="flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <button
            onClick={handleSync}
            disabled={syncing || !apiSecret.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-black text-xs font-bold rounded-full hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {syncing
              ? <><Loader2 size={12} className="animate-spin" /> Pulling events…</>
              : 'Sync Mixpanel Events →'}
          </button>

          <p className="text-[11px] text-white/20 text-center">
            Credentials are sent directly to Mixpanel and never stored.
          </p>
        </div>
      )}
    </div>
  );
}
