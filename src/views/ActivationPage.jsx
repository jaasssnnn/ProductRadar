'use client';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useApp } from '../context/AppContext';
import { computeActivation } from '../lib/activation';

export default function ActivationPage() {
  const { customers, activity, dataLoaded } = useApp();
  const router = useRouter();

  const activation = useMemo(() => computeActivation(customers, activity), [customers, activity]);

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

  if (!activation) {
    return (
      <div className="min-h-full bg-black p-8 flex items-center justify-center">
        <p className="text-sm text-white/40">Activation analysis requires customer data.</p>
      </div>
    );
  }

  const { activationRate7, activationRate30, avgTTFV, medianTTFV, byPlan, byCohort, hasActivationEvents } = activation;

  const kpis = [
    { label: '7-Day Activation Rate',  value: `${activationRate7.toFixed(1)}%`,  gradient: 'bg-gradient-to-br from-kpi-blue-from to-kpi-blue-to' },
    { label: '30-Day Activation Rate', value: `${activationRate30.toFixed(1)}%`, gradient: 'bg-gradient-to-br from-kpi-lav-from to-kpi-lav-to' },
    { label: 'Avg Time to First Value', value: avgTTFV !== null ? `${avgTTFV.toFixed(1)}d` : '—', gradient: 'bg-gradient-to-br from-kpi-cream-from to-kpi-cream-to' },
  ];

  const tooltipStyle = { background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 };

  return (
    <div className="min-h-full bg-black p-8 space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Activation</h2>
        <p className="text-sm text-white/40 font-medium mt-1">
          Onboarding funnel completion, time-to-first-value, and activation rate by plan and cohort
        </p>
        {!hasActivationEvents && activity.length > 0 && (
          <p className="mt-2 text-xs text-white/25 font-medium">
            No dedicated activation events detected — using first activity event as activation proxy.
          </p>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        {kpis.map(k => (
          <div key={k.label} className={`${k.gradient} rounded-card p-5 min-h-[110px] flex flex-col justify-between`}>
            <p className="text-xs font-bold text-kpi-subtext uppercase tracking-widest">{k.label}</p>
            <div>
              <p className="text-4xl font-extrabold text-kpi-text">{k.value}</p>
              {k.label === 'Avg Time to First Value' && medianTTFV !== null && (
                <p className="text-xs text-kpi-subtext mt-1">Median: {medianTTFV.toFixed(1)}d</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* By plan */}
      {byPlan.length > 0 && (
        <div className="bg-[#111] border border-white/[0.08] rounded-card p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-5">Activation Rate by Plan</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byPlan} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="plan" tick={{ fill: '#9A9AA2', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `${v.toFixed(0)}%`} tick={{ fill: '#9A9AA2', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip formatter={v => `${v.toFixed(1)}%`} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#9A9AA2' }} />
              <Bar dataKey="rate7"  name="7-Day Rate"  fill="#8E7CF0" radius={[4, 4, 0, 0]} />
              <Bar dataKey="rate30" name="30-Day Rate" fill="#4070E0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* By cohort */}
      {byCohort.length > 1 && (
        <div className="bg-[#111] border border-white/[0.08] rounded-card p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-5">Activation Rate by Cohort Month</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byCohort} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#9A9AA2', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `${v.toFixed(0)}%`} tick={{ fill: '#9A9AA2', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip formatter={v => `${v.toFixed(1)}%`} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#9A9AA2' }} />
              <Bar dataKey="rate7"  name="7-Day Rate"  fill="#8E7CF0" radius={[4, 4, 0, 0]} />
              <Bar dataKey="rate30" name="30-Day Rate" fill="#4070E0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Cohort table */}
      {byCohort.length > 0 && (
        <div className="bg-[#111] border border-white/[0.08] rounded-card p-6 overflow-x-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-5">Cohort Breakdown</p>
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['Cohort', 'Accounts', '7-Day Rate', '30-Day Rate'].map(h => (
                  <th key={h} className="text-left text-xs text-white/40 font-bold uppercase tracking-wider pb-3 pr-8">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {byCohort.map(c => (
                <tr key={c.month}>
                  <td className="py-3 pr-8 text-white font-semibold">{c.month}</td>
                  <td className="py-3 pr-8 text-white/60">{c.total}</td>
                  <td className="py-3 pr-8 text-white/80 font-medium">{c.rate7.toFixed(1)}%</td>
                  <td className="py-3 pr-8 text-white/80 font-medium">{c.rate30.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
