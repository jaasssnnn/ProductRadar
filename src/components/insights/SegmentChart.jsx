'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

const BAR_COLORS = ['#8FBCFF', '#6A9FE8'];

export default function SegmentChart({ data, dataKey, nameKey, title, unit = '' }) {
  return (
    <div className="bg-[#1c1c1e] rounded-card border border-white/[0.08] p-6">
      <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-5">{title}</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
          <XAxis dataKey={nameKey} tick={{ fontSize: 11, fill: '#666' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#666' }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            formatter={v => [`${v}${unit}`, title]}
            contentStyle={{
              fontSize: 12,
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              background: '#1c1c1e',
              color: '#fff',
            }}
            cursor={false}
          />
          <Bar dataKey={dataKey} radius={[6, 6, 6, 6]} background={{ fill: '#2a2a2a', radius: [6, 6, 6, 6] }}>
            {data.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
