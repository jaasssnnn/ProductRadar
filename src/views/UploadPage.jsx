'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, Loader2, AlertCircle, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { parseCSV, normalizeHeaders, detectFileType, fetchSampleCSV } from '../lib/csvParser';
import { scoreAccount } from '../lib/scoring';
import { useApp } from '../context/AppContext';
import StripeConnect from '../components/upload/StripeConnect';
import dynamic from 'next/dynamic';
const CanvasBackground = dynamic(() => import('../components/ui/CanvasBackground'), { ssr: false });

const TYPE_LABELS = {
  customers: 'Customers',
  activity:  'Activity',
  billing:   'Billing',
  support:   'Support',
  unknown:   'Unknown',
};

function runScoring(accountRows, activity, billing, support) {
  const presence = {
    activity: activity.length > 0,
    billing:  billing.length > 0,
    support:  support.length > 0,
  };
  const billingMap = Object.fromEntries(billing.map(r => [r.customer_id, r]));
  const supportMap = Object.fromEntries(support.map(r => [r.customer_id, r]));
  return accountRows.map(customer => ({
    ...customer,
    ...scoreAccount(
      customer,
      activity.filter(r => r.customer_id === customer.customer_id),
      billingMap[customer.customer_id] || null,
      supportMap[customer.customer_id] || null,
      presence,
    ),
  }));
}

export default function UploadPage() {
  const router = useRouter();
  const {
    customers: ctxCustomers, activity: ctxActivity, billing: ctxBilling, support: ctxSupport,
    dataLoaded,
    setCustomers, setActivity, setBilling, setSupport, setScoredAccounts, setDataLoaded,
  } = useApp();
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  async function processFiles(files) {
    setError(null);
    const results = [];
    for (const file of files) {
      if (!file.name.endsWith('.csv')) continue;
      try {
        const raw  = await parseCSV(file);
        const rows = normalizeHeaders(raw);
        results.push({ name: file.name, type: detectFileType(rows), rows });
      } catch { setError(`Could not parse ${file.name}.`); }
    }
    if (results.length > 0) {
      setUploadedFiles(prev => {
        const updated = [...prev];
        for (const r of results) {
          const idx = updated.findIndex(f => f.type === r.type);
          if (idx >= 0) updated[idx] = r; else updated.push(r);
        }
        return updated;
      });
    }
  }

  async function handleLoadSample() {
    setLoading(true); setError(null);
    try {
      const [customers, activity, billing, support] = await Promise.all([
        fetchSampleCSV('customers.csv'), fetchSampleCSV('activity.csv'),
        fetchSampleCSV('billing.csv'),   fetchSampleCSV('support.csv'),
      ]);
      setUploadedFiles([
        { name: 'customers.csv', type: 'customers', rows: customers },
        { name: 'activity.csv',  type: 'activity',  rows: activity },
        { name: 'billing.csv',   type: 'billing',   rows: billing },
        { name: 'support.csv',   type: 'support',   rows: support },
      ]);
    } catch (e) { setError('Failed to load sample data: ' + e.message); }
    finally { setLoading(false); }
  }

  async function handleAnalyze() {
    setLoading(true); setError(null);
    try {
      const get = type => uploadedFiles.find(f => f.type === type)?.rows || [];
      const customersFile = get('customers');
      const activityFile  = get('activity');
      const billingFile   = get('billing');
      const supportFile   = get('support');

      if (customersFile.length === 0 && dataLoaded && ctxCustomers.length > 0) {
        const mergedActivity = activityFile.length > 0 ? activityFile : ctxActivity;
        const mergedSupport  = supportFile.length  > 0 ? supportFile  : ctxSupport;
        const mergedBilling  = billingFile.length  > 0 ? billingFile  : ctxBilling;
        const scored = runScoring(ctxCustomers, mergedActivity, mergedBilling, mergedSupport);
        setActivity(mergedActivity); setBilling(mergedBilling); setSupport(mergedSupport);
        setScoredAccounts(scored); setDataLoaded(true);
        router.push('/dashboard');
        return;
      }

      const accountRows = customersFile.length > 0 ? customersFile : uploadedFiles[0]?.rows || [];
      if (accountRows.length === 0) { setError('No account data found.'); return; }

      const scored = runScoring(accountRows, activityFile, billingFile, supportFile);
      setCustomers(accountRows); setActivity(activityFile); setBilling(billingFile); setSupport(supportFile);
      setScoredAccounts(scored); setDataLoaded(true);
      router.push('/dashboard');
    } catch (e) { setError('Error: ' + e.message); }
    finally { setLoading(false); }
  }

  async function handleStripeSyncComplete(stripeData) {
    setLoading(true); setError(null);
    try {
      const { customers: stripeCustomers, billing: stripeBilling } = stripeData;
      const get = type => uploadedFiles.find(f => f.type === type)?.rows || [];
      const scored = runScoring(stripeCustomers, get('activity'), stripeBilling, get('support'));
      setCustomers(stripeCustomers); setActivity(get('activity'));
      setBilling(stripeBilling);     setSupport(get('support'));
      setScoredAccounts(scored);     setDataLoaded(true);
      router.push('/dashboard');
    } catch (e) { setError('Error scoring Stripe data: ' + e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-black relative flex items-center justify-center px-6 py-16">
      <CanvasBackground />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-lg"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <img src="/logo.png" alt="ChurnRadar" className="w-10 h-10" />
          <span className="text-white font-bold text-lg tracking-tight">ChurnRadar</span>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-[28px] p-8">

          {/* Header */}
          <div className="text-center mb-7">
            <h1 className="text-2xl font-bold text-white tracking-tight">Upload your data</h1>
            <p className="text-sm text-white/40 mt-1.5 font-medium">
              Drop CSV exports — customers, activity, billing, or support
            </p>
          </div>

          {/* Stripe Connect */}
          <StripeConnect onSyncComplete={handleStripeSyncComplete} />

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-white/30 font-bold uppercase tracking-widest">or upload CSV</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
              dragging
                ? 'border-white/40 bg-white/10'
                : 'border-white/15 hover:border-white/30 hover:bg-white/5'
            }`}
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); processFiles(Array.from(e.dataTransfer.files)); }}
          >
            <input ref={inputRef} type="file" accept=".csv" multiple className="hidden" onChange={e => processFiles(Array.from(e.target.files))} />
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
              <Upload size={22} className="text-white/50" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-semibold text-white/60">Click to upload or drag and drop</p>
            <p className="text-xs text-white/30 mt-1 font-medium">CSV files only · any combination</p>
          </div>

          {/* File list */}
          {uploadedFiles.length > 0 && (
            <div className="mt-5 space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">
                {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} ready
              </p>
              {uploadedFiles.map(file => (
                <div key={file.name} className="flex items-center gap-3 p-3.5 bg-white/5 rounded-2xl border border-white/10">
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                    <FileText size={13} className="text-white/50" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-semibold truncate">{file.name}</p>
                    <p className="text-xs text-white/30 font-medium">{file.rows.length} rows</p>
                  </div>
                  <span className="text-xs font-bold text-white/50 bg-white/10 px-3 py-1 rounded-full">
                    {TYPE_LABELS[file.type]}
                  </span>
                  <button
                    onClick={() => setUploadedFiles(p => p.filter(f => f.name !== file.name))}
                    className="text-white/20 hover:text-white/50 transition-colors ml-1 flex-shrink-0"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 mt-5 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-sm text-red-400 font-medium">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 space-y-3">
            <motion.button
              onClick={handleAnalyze}
              disabled={uploadedFiles.length === 0 || loading}
              whileHover={{ scale: uploadedFiles.length === 0 || loading ? 1 : 1.01 }}
              whileTap={{ scale: uploadedFiles.length === 0 || loading ? 1 : 0.99 }}
              className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-bold text-black bg-white rounded-full hover:bg-white/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed tracking-wide"
            >
              {loading ? <><Loader2 size={15} className="animate-spin" /> Scoring…</> : 'Analyze Accounts →'}
            </motion.button>
            <button
              onClick={handleLoadSample}
              disabled={loading}
              className="w-full py-3 text-sm font-bold text-white/30 hover:text-white/60 transition-colors disabled:opacity-40"
            >
              Load sample data
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
