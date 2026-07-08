'use client';
import { useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Upload } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { computeCost } from '../lib/cost';
import { parseCSV, normalizeHeaders } from '../lib/csvParser';

export default function CostPage() {
  const { customers, activity, support, dataLoaded } = useApp();
  const router = useRouter();
  const [manualCAC, setManualCAC]             = useState('');
  const [manualCostPerTicket, setManualCPT]   = useState('');
  const [spendRows, setSpendRows]             = useState([]);
  const [spendError, setSpendError]           = useState('');
  const fileRef = useRef();

  const cost = useMemo(
    () => computeCost(customers, activity, support, manualCAC ? parseFloat(manualCAC) : null, spendRows, manualCostPerTicket ? parseFloat(manualCostPerTicket) : null),
    [customers, activity, support, manualCAC, spendRows, manualCostPerTicket]
  );

  async function handleSpendFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = normalizeHeaders(await parseCSV(file));
      setSpendRows(rows);
      setSpendError('');
    } catch {
      setSpendError('Could not parse CSV — make sure it has spend/total_spend and new_customers columns.');
    }
  }

  if (!dataLoaded) {
    return (
      <div className="min-h-full bg-black p-8 flex flex-col items-center justify-center h-64 text-center">
        <p className="text-sm text-white/40 font-medium mb-5">No data loaded yet.</p>
        <button onClick={() => router.push('/upload')} className="px-6 py-3 text-sm font-bold text-white bg-white/10 rounded-chip hover:bg-white/20 transition-colors">
          Upload Data
        </button>
      </div>
    );
  }

  if (!cost) {
    return (
      <div className="min-h-full bg-black p-8 flex items-center justify-center">
        <p className="text-sm text-white/40">Cost analysis requires customer data with MRR.</p>
      </div>
    );
  }

  const { totalMRR, totalCustomers, activeUsers, mrrPerActiveUser, totalTickets, costPerTicket, totalSupportCost, ltv, cac, ltvcac, byPlan, byChannel, avgLifespanMonths } = cost;

  const kpis = [
    { label: 'MRR / Active User', value: mrrPerActiveUser !== null ? `$${mrrPerActiveUser.toFixed(0)}` : '—', sub: `${activeUsers} of ${totalCustomers} active`, gradient: 'bg-gradient-to-br from-kpi-blue-from to-kpi-blue-to' },
    { label: 'Estimated LTV',     value: ltv > 0 ? `$${Math.round(ltv).toLocaleString()}` : '—', sub: `ARPU × ${avgLifespanMonths}mo lifespan`, gradient: 'bg-gradient-to-br from-kpi-lav-from to-kpi-lav-to' },
    { label: 'LTV : CAC',         value: ltvcac !== null ? `${ltvcac.toFixed(1)}x` : '—', sub: cac ? `CAC $${Math.round(cac)}` : 'Enter CAC below', gradient: ltvcac >= 3 ? 'bg-gradient-to-br from-kpi-cream-from to-kpi-cream-to' : 'bg-gradient-to-br from-kpi-rose-from to-kpi-rose-to' },
  ];

  const tooltipStyle = { background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 };

  return (
    <div className="min-h-full bg-black p-8 space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Cost per User</h2>
        <p className="text-sm text-white/40 font-medium mt-1">MRR efficiency, LTV, and LTV:CAC ratio across your customer base</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        {kpis.map(k => (
          <div key={k.label} className={`${k.gradient} rounded-card p-5 min-h-[110px] flex flex-col justify-between`}>
            <p className="text-xs font-bold text-kpi-subtext uppercase tracking-widest">{k.label}</p>
            <div>
              <p className="text-4xl font-extrabold text-kpi-text">{k.value}</p>
              <p className="text-xs text-kpi-subtext mt-1">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CAC + support cost inputs + spend CSV */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#111] border border-white/[0.08] rounded-card p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Manual CAC Input</p>
          <p className="text-xs text-white/30 mb-3">Average cost to acquire one new customer (in $)</p>
          <div className="flex items-center gap-3">
            <span className="text-white/40 text-sm font-semibold">$</span>
            <input
              type="number"
              min="0"
              placeholder="e.g. 250"
              value={manualCAC}
              onChange={e => setManualCAC(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>
          {manualCAC && !isNaN(parseFloat(manualCAC)) && (
            <p className="text-xs text-white/30 mt-3">LTV:CAC = {ltvcac !== null ? `${ltvcac.toFixed(1)}x` : '—'} {ltvcac >= 3 ? '✓ healthy' : ltvcac ? '⚠ below 3x target' : ''}</p>
          )}
        </div>

        <div className="bg-[#111] border border-white/[0.08] rounded-card p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Support Cost / Ticket</p>
          <p className="text-xs text-white/30 mb-3">Average cost to resolve one support ticket (in $)</p>
          <div className="flex items-center gap-3">
            <span className="text-white/40 text-sm font-semibold">$</span>
            <input
              type="number"
              min="0"
              placeholder="e.g. 18"
              value={manualCostPerTicket}
              onChange={e => setManualCPT(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>
          {costPerTicket && totalTickets > 0 && (
            <p className="text-xs text-white/30 mt-3">
              Total support cost: ${totalSupportCost?.toLocaleString()} across {totalTickets} tickets
            </p>
          )}
        </div>

        <div className="bg-[#111] border border-white/[0.08] rounded-card p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Spend CSV (optional)</p>
          <p className="text-xs text-white/30 mb-3">Columns: <code className="text-white/50">spend</code>, <code className="text-white/50">new_customers</code>, optional: <code className="text-white/50">channel</code>, <code className="text-white/50">month</code></p>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm text-white/60 font-semibold transition-colors"
          >
            <Upload size={14} />
            {spendRows.length > 0 ? `${spendRows.length} rows loaded` : 'Upload spend.csv'}
          </button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleSpendFile} />
          {spendError && <p className="text-xs text-red-400 mt-2">{spendError}</p>}
          {spendRows.length > 0 && !manualCAC && cost.derivedCAC && (
            <p className="text-xs text-white/30 mt-3">Derived CAC: ${Math.round(cost.derivedCAC)}</p>
          )}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total MRR',          value: `$${Math.round(totalMRR).toLocaleString()}` },
          { label: 'Total Customers',    value: totalCustomers },
          { label: 'Active Users',       value: activeUsers },
          { label: 'Support Cost / Ticket', value: costPerTicket ? `$${costPerTicket}` : '—' },
        ].map(s => (
          <div key={s.label} className="bg-[#111] border border-white/[0.08] rounded-card p-5 text-center">
            <p className="text-2xl font-extrabold text-white">{s.value}</p>
            <p className="text-xs text-white/40 font-medium mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ARPU by plan */}
      {byPlan.length > 0 && (
        <div className="bg-[#111] border border-white/[0.08] rounded-card p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-5">ARPU by Plan</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byPlan} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="plan" tick={{ fill: '#9A9AA2', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `$${v}`} tick={{ fill: '#9A9AA2', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={v => `$${v.toFixed(0)}`} contentStyle={tooltipStyle} />
              <Bar dataKey="arpu" name="ARPU" fill="#8E7CF0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Spend by channel */}
      {byChannel.length > 0 && (
        <div className="bg-[#111] border border-white/[0.08] rounded-card p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-5">Spend by Channel</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byChannel} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="channel" tick={{ fill: '#9A9AA2', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `$${v.toLocaleString()}`} tick={{ fill: '#9A9AA2', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={v => `$${v.toLocaleString()}`} contentStyle={tooltipStyle} />
              <Bar dataKey="spend" name="Spend" fill="#4070E0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Plan table */}
      <div className="bg-[#111] border border-white/[0.08] rounded-card p-6 overflow-x-auto">
        <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-5">Plan Breakdown</p>
        <table className="w-full text-sm">
          <thead>
            <tr>
              {['Plan', 'Customers', 'Total MRR', 'ARPU'].map(h => (
                <th key={h} className="text-left text-xs text-white/40 font-bold uppercase tracking-wider pb-3 pr-8">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {byPlan.map(p => (
              <tr key={p.plan}>
                <td className="py-3 pr-8 text-white font-semibold">{p.plan}</td>
                <td className="py-3 pr-8 text-white/60">{p.count}</td>
                <td className="py-3 pr-8 text-white/80">${Math.round(p.mrr).toLocaleString()}</td>
                <td className="py-3 pr-8 text-white/80 font-medium">${Math.round(p.arpu).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
