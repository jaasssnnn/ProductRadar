'use client';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useApp } from '../context/AppContext';
import { computeRetention, RETENTION_WINDOWS } from '../lib/retention';

const COHORT_COLORS = ['#8E7CF0', '#4070E0', '#16A36B', '#C98A1E', '#E5484D', '#EA7A19', '#6B93F0', '#A78BFA'];

function heatColor(pct) {
  if (pct >= 70) return { bg: '#16A36B22', text: '#16A36B' };
  if (pct >= 50) return { bg: '#C98A1E22', text: '#C98A1E' };
  if (pct >= 30) return { bg: '#EA7A1922', text: '#EA7A19' };
  return { bg: '#E5484D22', text: '#E5484D' };
}

export default function RetentionPage() {
  const { customers, activity, dataLoaded } = useApp();
  const router = useRouter();

  const retention = useMemo(() => computeRetention(customers, activity), [customers, activity]);

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

  if (!retention) {
    return (
      <div className="min-h-full bg-black p-8 flex items-center justify-center">
        <p className="text-sm text-white/40">Retention analysis requires both customer data (with signup dates) and activity data.</p>
      </div>
    );
  }

  const { cohortData, curves, avgDay7, avgDay30, avgDay90 } = retention;

  const kpis = [
    { label: 'Day-7 Retention',  value: `${avgDay7.toFixed(1)}%`,  gradient: 'bg-gradient-to-br from-kpi-blue-from to-kpi-blue-to' },
    { label: 'Day-30 Retention', value: `${avgDay30.toFixed(1)}%`, gradient: 'bg-gradient-to-br from-kpi-lav-from to-kpi-lav-to' },
    { label: 'Day-90 Retention', value: `${avgDay90.toFixed(1)}%`, gradient: 'bg-gradient-to-br from-kpi-rose-from to-kpi-rose-to' },
  ];

  return (
    <div className="min-h-full bg-black p-8 space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Retention</h2>
        <p className="text-sm text-white/40 font-medium mt-1">Cohort retention curves and day-7/30/90 benchmarks</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        {kpis.map(k => (
          <div key={k.label} className={`${k.gradient} rounded-card p-5 min-h-[110px] flex flex-col justify-between`}>
            <p className="text-xs font-bold text-kpi-subtext uppercase tracking-widest">{k.label}</p>
            <p className="text-4xl font-extrabold text-kpi-text">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Retention curve */}
      <div className="bg-[#111] border border-white/[0.08] rounded-card p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-5">Overall Retention Curve</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={curves} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="day" tickFormatter={d => `D${d}`} tick={{ fill: '#9A9AA2', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => `${v.toFixed(0)}%`} tick={{ fill: '#9A9AA2', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
            <Tooltip formatter={v => `${v.toFixed(1)}%`} labelFormatter={d => `Day ${d}`} contentStyle={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
            <Line type="monotone" dataKey="pct" stroke="#8E7CF0" strokeWidth={2.5} dot={{ fill: '#8E7CF0', r: 4 }} name="Retention %" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Per-cohort curves */}
      {cohortData.length > 1 && (() => {
        const days = [0, ...RETENTION_WINDOWS];
        const chartData = days.map(d => {
          const point = { day: d };
          cohortData.forEach(c => {
            point[c.month] = d === 0 ? 100 : c.pct[`day${d}`];
          });
          return point;
        });
        return (
          <div className="bg-[#111] border border-white/[0.08] rounded-card p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-5">Retention by Cohort</p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="day" tickFormatter={d => `D${d}`} tick={{ fill: '#9A9AA2', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `${v.toFixed(0)}%`} tick={{ fill: '#9A9AA2', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip formatter={v => `${Number(v).toFixed(1)}%`} labelFormatter={d => `Day ${d}`} contentStyle={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#9A9AA2' }} />
                {cohortData.map((cohort, i) => (
                  <Line key={cohort.month} type="monotone" dataKey={cohort.month} stroke={COHORT_COLORS[i % COHORT_COLORS.length]} strokeWidth={1.8} dot={false} name={`${cohort.month} (n=${cohort.size})`} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      })()}

      {/* Heatmap table */}
      <div className="bg-[#111] border border-white/[0.08] rounded-card p-6 overflow-x-auto">
        <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-5">Cohort Heatmap</p>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left text-xs text-white/40 font-bold uppercase tracking-wider pb-3 pr-6">Cohort</th>
              <th className="text-center text-xs text-white/40 font-bold uppercase tracking-wider pb-3 px-3">Size</th>
              {RETENTION_WINDOWS.map(d => (
                <th key={d} className="text-center text-xs text-white/40 font-bold uppercase tracking-wider pb-3 px-3">D{d}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {cohortData.map(cohort => (
              <tr key={cohort.month}>
                <td className="py-3 pr-6 text-white font-semibold">{cohort.month}</td>
                <td className="py-3 px-3 text-center text-white/40">{cohort.size}</td>
                {RETENTION_WINDOWS.map(d => {
                  const pct = cohort.pct[`day${d}`];
                  const { bg, text } = heatColor(pct);
                  return (
                    <td key={d} className="py-3 px-3 text-center">
                      <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold" style={{ background: bg, color: text }}>
                        {pct.toFixed(0)}%
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
