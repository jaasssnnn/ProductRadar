'use client';
import { useState, useEffect } from 'react';
import { Zap, CheckCircle, RefreshCw, Unlink, Loader2, AlertCircle } from 'lucide-react';

const CONNECT_CONFIGURED = !!process.env.NEXT_PUBLIC_STRIPE_CONNECT_CONFIGURED;

export default function StripeConnect({ onSyncComplete }) {
  const [status,  setStatus]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error,   setError]   = useState(null);

  async function checkStatus() {
    try {
      const res  = await fetch('/api/stripe/status');
      const data = await res.json();
      setStatus(data);
    } catch (e) { setStatus({ connected: false }); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (CONNECT_CONFIGURED) {
      checkStatus();
      const params = new URLSearchParams(window.location.search);
      const result = params.get('stripe');
      if (result === 'connected') { window.history.replaceState({}, '', '/upload'); checkStatus(); }
      else if (result === 'denied') { setError('Stripe connection was cancelled.'); window.history.replaceState({}, '', '/upload'); }
      else if (result === 'error')  { setError('Something went wrong connecting to Stripe. Try again.'); window.history.replaceState({}, '', '/upload'); }
    } else {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDirectSync() {
    setSyncing(true); setError(null);
    try {
      const res  = await fetch('/api/stripe/direct-sync');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onSyncComplete(data);
    } catch (e) { setError(e.message); }
    finally     { setSyncing(false); }
  }

  async function handleConnect() {
    setError(null);
    try {
      const res  = await fetch('/api/stripe/auth');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      window.location.href = data.url;
    } catch (e) { setError(e.message || 'Failed to start Stripe connection.'); }
  }

  async function handleSync() {
    setSyncing(true); setError(null);
    try {
      const res  = await fetch('/api/stripe/sync');
      const data = await res.json();
      if (res.status === 401) { setStatus({ connected: false, expired: true }); return; }
      if (data.error) throw new Error(data.error);
      onSyncComplete(data);
    } catch (e) { setError(e.message); }
    finally     { setSyncing(false); }
  }

  async function handleDisconnect() {
    await fetch('/api/stripe/disconnect', { method: 'POST' });
    setStatus({ connected: false }); setError(null);
  }

  if (loading) return (
    <div className="border border-white/10 rounded-2xl p-5 flex items-center gap-3 bg-white/5">
      <Loader2 size={15} className="animate-spin text-white/30" />
      <span className="text-sm text-white/40 font-medium">Checking Stripe connection…</span>
    </div>
  );

  // Direct mode
  if (!CONNECT_CONFIGURED) return (
    <div className="border border-white/10 rounded-2xl p-5 bg-white/5 backdrop-blur-sm">
      <div className="flex items-start gap-4">
        <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0">
          <Zap size={15} className="text-white/60" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-white mb-0.5">Sync from Stripe</p>
          <p className="text-xs text-white/40 font-medium leading-relaxed mb-4">
            Pull customers, subscriptions, and billing data directly from your Stripe account.
          </p>
          {error && (
            <div className="flex items-center gap-2 mb-3 text-xs text-red-400 font-medium">
              <AlertCircle size={12} /> {error}
            </div>
          )}
          <button
            onClick={handleDirectSync}
            disabled={syncing}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-black text-xs font-bold rounded-full hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            {syncing ? <><Loader2 size={12} className="animate-spin" /> Syncing…</> : 'Sync Stripe Data →'}
          </button>
        </div>
      </div>
    </div>
  );

  // Connect OAuth: not connected
  if (!status?.connected) return (
    <div className="border border-white/10 rounded-2xl p-5 bg-white/5 backdrop-blur-sm">
      <div className="flex items-start gap-4">
        <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0">
          <Zap size={15} className="text-white/60" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-white mb-0.5">Connect Stripe</p>
          <p className="text-xs text-white/40 font-medium leading-relaxed mb-4">
            Pull customers, subscriptions, and billing data automatically — no CSV needed.
            {status?.expired && <span className="text-yellow-400 ml-1">Previous connection expired. Reconnect to continue.</span>}
          </p>
          {error && (
            <div className="flex items-center gap-2 mb-3 text-xs text-red-400 font-medium">
              <AlertCircle size={12} /> {error}
            </div>
          )}
          <button
            onClick={handleConnect}
            className="px-5 py-2.5 bg-white text-black text-xs font-bold rounded-full hover:bg-white/90 transition-colors"
          >
            Connect Stripe Account →
          </button>
        </div>
      </div>
    </div>
  );

  // Connect OAuth: connected
  return (
    <div className="border border-white/20 rounded-2xl p-5 bg-white/5 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CheckCircle size={15} className="text-green-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-white">Connected to Stripe</p>
            <p className="text-xs text-white/40 font-medium">{status.accountName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-4 py-2 bg-white text-black text-xs font-bold rounded-full hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            {syncing ? <><Loader2 size={12} className="animate-spin" /> Syncing…</> : <><RefreshCw size={12} /> Sync Data</>}
          </button>
          <button onClick={handleDisconnect} title="Disconnect Stripe" className="p-2 text-white/30 hover:text-red-400 transition-colors">
            <Unlink size={14} />
          </button>
        </div>
      </div>
      {error && (
        <div className="flex items-center gap-2 mt-3 text-xs text-red-400 font-medium">
          <AlertCircle size={12} /> {error}
        </div>
      )}
    </div>
  );
}
