'use client';
import { useRouter } from 'next/navigation';
import { TrendingUp, TrendingDown, Plus, ArrowRight, Activity } from 'lucide-react';
import { useApp } from '../context/AppContext';

const BAND_COLORS = {
  Critical: { bg: 'bg-red-500/15',    text: 'text-red-400'    },
  High:     { bg: 'bg-orange-500/15', text: 'text-orange-400' },
  Medium:   { bg: 'bg-white/10',      text: 'text-white/50'   },
  Low:      { bg: 'bg-green-500/15',  text: 'text-green-400'  },
};

const FACTOR_LABELS = {
  inactivity:    'No recent activity',
  usage_decline: 'Usage declining',
  billing:       'Billing issue',
  support:       'Support friction',
  renewal_risk:  'Renewal at risk',
  low_adoption:  'Low feature adoption',
};

function BandChip({ label }) {
  const c = BAND_COLORS[label] || BAND_COLORS.Medium;
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${c.bg} ${c.text}`}>{label}</span>
  );
}

function ChangeCard({ account, onClick }) {
  const { type, delta, newFactors, prevLabel, label } = account;

  const config = {
    escalated:  { icon: TrendingUp,   color: 'text-[#E5484D]', border: 'border-l-[#E5484D]', label: 'Escalated' },
    rose:       { icon: TrendingUp,   color: 'text-[#C98A1E]', border: 'border-l-[#C98A1E]', label: 'Score rose' },
    new_factor: { icon: Plus,         color: 'text-[#C98A1E]', border: 'border-l-[#C98A1E]', label: 'New signal' },
    improved:   { icon: TrendingDown, color: 'text-[#16A36B]', border: 'border-l-[#16A36B]', label: 'Improved' },
    fell:       { icon: TrendingDown, color: 'text-[#16A36B]', border: 'border-l-[#16A36B]', label: 'Score fell' },
  }[type] || { icon: Activity, color: 'text-white/30', border: 'border-l-white/10', label: 'Changed' };

  const Icon = config.icon;

  return (
    <div
      onClick={onClick}
      className={`bg-[#1c1c1e] border border-white/[0.08] border-l-4 ${config.border} rounded-card p-5 cursor-pointer hover:bg-white/[0.03] transition-colors flex items-center gap-4`}
    >
      <div className={`p-2 rounded-xl bg-white/5 flex-shrink-0 ${config.color}`}>
        <Icon size={15} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-sm font-bold text-white">{account.account_name}</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/5 ${config.color}`}>{config.label}</span>
        </div>

        {type === 'escalated' && (
          <div className="flex items-center gap-2 mt-1">
            <BandChip label={prevLabel} />
            <ArrowRight size={12} className="text-white/25" />
            <BandChip label={label} />
            {newFactors.length > 0 && (
              <span className="text-xs text-white/30 font-medium ml-1">
                driven by: {newFactors.map(k => FACTOR_LABELS[k] || k).join(', ')}
              </span>
            )}
          </div>
        )}

        {(type === 'rose' || type === 'fell') && (
          <p className="text-xs text-white/30 font-medium mt-1">
            Score {delta > 0 ? '+' : ''}{delta} pts · still {label}
          </p>
        )}

        {type === 'new_factor' && (
          <p className="text-xs text-white/30 font-medium mt-1">
            New: {newFactors.map(k => FACTOR_LABELS[k] || k).join(', ')}
          </p>
        )}

        {type === 'improved' && (
          <div className="flex items-center gap-2 mt-1">
            <BandChip label={prevLabel} />
            <ArrowRight size={12} className="text-white/25" />
            <BandChip label={label} />
          </div>
        )}
      </div>

      <div className="text-right flex-shrink-0">
        <p className={`text-lg font-bold tabular-nums ${delta > 0 ? 'text-red-400' : 'text-green-400'}`}>
          {delta > 0 ? '+' : ''}{delta}
        </p>
        <p className="text-xs text-white/30 font-medium">pts</p>
      </div>

      <ArrowRight size={14} className="text-white/25 flex-shrink-0" />
    </div>
  );
}

function Section({ title, accounts, navigate }) {
  if (!accounts.length) return null;
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-widest text-white/40">{title} ({accounts.length})</p>
      {accounts.map(a => (
        <ChangeCard key={a.customer_id} account={a} onClick={() => navigate(`/account/${a.customer_id}`)} />
      ))}
    </div>
  );
}

export default function ChangesPage() {
  const router = useRouter();
  const { accountChanges, previousSnapshot, dataLoaded } = useApp();

  const escalated  = accountChanges.filter(a => a.type === 'escalated');
  const rose       = accountChanges.filter(a => a.type === 'rose');
  const newFactor  = accountChanges.filter(a => a.type === 'new_factor');
  const improved   = accountChanges.filter(a => a.type === 'improved');
  const fell       = accountChanges.filter(a => a.type === 'fell');

  const snapshotDate = previousSnapshot?.timestamp
    ? new Date(previousSnapshot.timestamp).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    : null;

  return (
    <div className="min-h-full bg-black p-8 space-y-6">
      <div className="mb-2">
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Changes</h2>
        <p className="text-sm text-white/40 font-medium mt-1">
          {snapshotDate ? `Account movements vs analysis from ${snapshotDate}` : 'Account risk movements between runs'}
        </p>
      </div>

      {/* No data loaded */}
      {!dataLoaded && (
        <div className="bg-[#1c1c1e] border border-white/[0.08] rounded-card p-12 text-center">
          <Activity size={32} className="mx-auto mb-4 text-white/30" strokeWidth={1.4} />
          <p className="text-sm font-bold text-white mb-2">No data loaded yet</p>
          <p className="text-xs text-white/30 font-medium max-w-xs mx-auto">Upload your CSVs and run an analysis first.</p>
          <button onClick={() => router.push('/upload')} className="mt-6 px-5 py-2.5 text-xs font-bold text-black bg-white rounded-full hover:bg-white/90 transition-colors">
            Upload Data
          </button>
        </div>
      )}

      {/* First run — no previous snapshot */}
      {dataLoaded && !previousSnapshot && (
        <div className="bg-[#1c1c1e] border border-white/[0.08] rounded-card p-12 text-center">
          <Activity size={32} className="mx-auto mb-4 text-white/30" strokeWidth={1.4} />
          <p className="text-sm font-bold text-white mb-2">No comparison available yet</p>
          <p className="text-xs text-white/30 font-medium max-w-sm mx-auto leading-relaxed">
            This view compares your current analysis against the previous one. Run a second analysis after uploading updated data and the changes will appear here.
          </p>
        </div>
      )}

      {/* Has snapshot but nothing changed */}
      {dataLoaded && previousSnapshot && accountChanges.length === 0 && (
        <div className="bg-[#1c1c1e] border border-white/[0.08] rounded-card p-12 text-center">
          <Activity size={32} className="mx-auto mb-4 text-[#16A36B]" strokeWidth={1.4} />
          <p className="text-sm font-bold text-white mb-2">No significant changes</p>
          <p className="text-xs text-white/30 font-medium">
            All accounts are stable vs the {snapshotDate} analysis.
          </p>
        </div>
      )}

      {/* Change sections in priority order */}
      {accountChanges.length > 0 && (
        <div className="space-y-8">
          <Section title="Escalated — risk band moved up"   accounts={escalated}  navigate={router.push} />
          <Section title="Score rising within band"          accounts={rose}       navigate={router.push} />
          <Section title="New risk signals appeared"         accounts={newFactor}  navigate={router.push} />
          <Section title="Improved — risk band moved down"   accounts={improved}   navigate={router.push} />
          <Section title="Score falling within band"         accounts={fell}       navigate={router.push} />
        </div>
      )}
    </div>
  );
}
