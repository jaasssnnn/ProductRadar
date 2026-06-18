'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpDown, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';

function SortHeader({ col, label, sortKey, onSort }) {
  return (
    <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest text-white/30 cursor-pointer hover:text-white/60 select-none transition-colors" onClick={() => onSort(col)}>
      <span className="flex items-center gap-1.5">
        {label}
        <ArrowUpDown size={10} className={sortKey === col ? 'text-white/50' : 'text-white/20'} />
      </span>
    </th>
  );
}

function Sparkline({ data }) {
  if (!data || data.every(v => v === 0)) return <span className="text-white/20 text-xs">—</span>;
  const W = 52, H = 22, PAD = 2;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const y = H - PAD - (v / max) * (H - PAD * 2);
    return [x, y];
  });
  const trending = data[data.length - 1] < data[0] ? '#E5484D'
                 : data[data.length - 1] > data[0] ? '#16A36B'
                 : '#555';
  return (
    <svg width={W} height={H} className="overflow-visible flex-shrink-0">
      <polyline points={pts.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={trending} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2" fill={trending} />)}
    </svg>
  );
}

const STATUS_CYCLE  = ['unactioned', 'contacted', 'follow_up_scheduled', 'resolved'];
const STATUS_LABELS = { unactioned: 'Unactioned', contacted: 'Contacted', follow_up_scheduled: 'Follow-up', resolved: 'Resolved' };
const STATUS_STYLES = {
  unactioned:          'bg-white/5 text-white/30',
  contacted:           'bg-white/10 text-white/60',
  follow_up_scheduled: 'bg-white/15 text-white/80',
  resolved:            'bg-white text-black',
};
const RISK_COLORS = { Critical: '#E5484D', High: '#EA7A19', Medium: '#C98A1E', Low: '#16A36B' };

export default function RiskTable({ accounts }) {
  const router = useRouter();
  const { accountStatuses, updateStatus, outcomes, owners } = useApp();
  const [sortKey, setSortKey] = useState('score');
  const [sortDir, setSortDir] = useState('desc');

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  function cycleStatus(customerId, current) {
    const idx  = STATUS_CYCLE.indexOf(current);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    updateStatus(customerId, next);
  }

  const sorted = [...accounts].sort((a, b) => {
    let av = a[sortKey], bv = b[sortKey];
    if (sortKey === 'mrr' || sortKey === 'score') { av = parseFloat(av) || 0; bv = parseFloat(bv) || 0; }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  function isRenewalSoon(d) {
    if (!d) return false;
    const days = Math.floor((new Date(d) - new Date()) / 86400000);
    return days >= 0 && days <= 30;
  }

  return (
    <div className="bg-[#1c1c1e] rounded-card border border-white/[0.08] overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/[0.08] bg-white/[0.02]">
            <SortHeader col="account_name" label="Account"  sortKey={sortKey} onSort={handleSort} />
            <SortHeader col="plan"         label="Plan"     sortKey={sortKey} onSort={handleSort} />
            <SortHeader col="mrr"          label="MRR"      sortKey={sortKey} onSort={handleSort} />
            <SortHeader col="renewal_date" label="Renewal"  sortKey={sortKey} onSort={handleSort} />
            <SortHeader col="score"        label="Score"    sortKey={sortKey} onSort={handleSort} />
            <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest text-white/30">Risk</th>
            <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest text-white/30">Top Signal</th>
            <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest text-white/30">Status</th>
            <th className="px-6 py-5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.06]">
          {sorted.map(account => {
            const status    = accountStatuses[account.customer_id] || 'unactioned';
            const topFactor = account.factors?.[0];
            const outcome   = outcomes[account.customer_id];
            const owner     = owners[account.customer_id];
            return (
              <tr
                key={account.customer_id}
                onClick={() => router.push(`/account/${account.customer_id}`)}
                className="hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                <td className="px-6 py-5">
                  <span className="font-semibold text-sm text-white block">{account.account_name}</span>
                  {owner && <span className="text-xs text-white/30 font-medium mt-0.5 block">→ {owner}</span>}
                </td>
                <td className="px-6 py-5">
                  <span className="text-xs font-bold text-white/40 bg-white/5 px-2.5 py-1 rounded-full">{account.plan}</span>
                </td>
                <td className="px-6 py-5">
                  <span className="text-sm font-bold text-white tabular-nums">${Number(account.mrr).toLocaleString()}</span>
                </td>
                <td className="px-6 py-5">
                  <span className={`text-sm font-medium tabular-nums ${isRenewalSoon(account.renewal_date) ? 'text-white font-bold' : 'text-white/30'}`}>
                    {account.renewal_date || '—'}
                  </span>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-white w-6 tabular-nums">{account.score}</span>
                    <Sparkline data={account.weeklyActivity} />
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: RISK_COLORS[account.label] || '#555' }}>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: RISK_COLORS[account.label] || '#555' }} />
                    {account.label}
                  </span>
                </td>
                <td className="px-6 py-5">
                  <span className="text-xs text-white/35 font-medium">{topFactor?.label || '—'}</span>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={e => { e.stopPropagation(); e.preventDefault(); cycleStatus(account.customer_id, status); }}
                      className={`text-xs px-3.5 py-2 rounded-full font-bold transition-all hover:opacity-80 active:scale-95 ${STATUS_STYLES[status]}`}
                    >
                      {STATUS_LABELS[status]}
                    </button>
                    {status === 'resolved' && outcome && (
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                        outcome === 'Saved'   ? 'bg-green-500/20 text-green-400' :
                        outcome === 'Churned' ? 'bg-red-500/20 text-red-400'   :
                                                'bg-white/10 text-white/60'
                      }`}>{outcome}</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="p-2 rounded-full bg-white/5 text-white/30 inline-flex">
                    <ArrowRight size={14} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {accounts.length === 0 && (
        <div className="text-center py-20 text-white/30 text-sm font-medium">No accounts to display.</div>
      )}
    </div>
  );
}
