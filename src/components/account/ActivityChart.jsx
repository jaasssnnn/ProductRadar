'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

function buildWeeklyData(activityRows) {
  const now   = new Date();
  const weeks = [
    { label: '4w ago',    min: 28, max: 35 },
    { label: '3w ago',    min: 21, max: 28 },
    { label: '2w ago',    min: 14, max: 21 },
    { label: 'Last week', min: 7,  max: 14 },
    { label: 'This week', min: 0,  max: 7  },
  ];
  return weeks.map(({ label, min, max }) => {
    const count = activityRows
      .filter(r => {
        const d = (now - new Date(r.timestamp)) / (1000 * 60 * 60 * 24);
        return d >= min && d < max;
      })
      .reduce((sum, r) => sum + (parseInt(r.count) || 1), 0);
    return { label, count };
  });
}

export default function ActivityChart({ activityRows }) {
  const data = buildWeeklyData(activityRows || []);
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#555' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#555' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, background: '#1c1c1e', color: '#fff' }}
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
        />
        <Bar dataKey="count" fill="#8FBCFF" radius={[6, 6, 0, 0]} name="Events" />
      </BarChart>
    </ResponsiveContainer>
  );
}
