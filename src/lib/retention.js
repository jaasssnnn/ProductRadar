const DAY_MS = 86400000;
export const RETENTION_WINDOWS = [7, 14, 30, 60, 90];

function activityByCustomer(activity) {
  const map = {};
  activity.forEach(a => {
    if (!a.customer_id || !a.timestamp) return;
    const t = new Date(a.timestamp);
    if (isNaN(t)) return;
    if (!map[a.customer_id]) map[a.customer_id] = [];
    map[a.customer_id].push(t);
  });
  return map;
}

function retainedAt(signup, events, days) {
  return events.some(t => {
    const d = (t - signup) / DAY_MS;
    return d >= 0 && d <= days;
  });
}

export function computeRetention(customers, activity) {
  if (!customers.length || !activity.length) return null;

  const eventsMap = activityByCustomer(activity);

  // Group by signup month
  const cohortMap = {};
  customers.forEach(c => {
    if (!c.signup_date) return;
    const d = new Date(c.signup_date);
    if (isNaN(d)) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!cohortMap[key]) cohortMap[key] = [];
    cohortMap[key].push(c);
  });

  const cohortData = Object.entries(cohortMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, members]) => {
      const signup_dates = members.map(c => new Date(c.signup_date));
      const raw = { day0: members.length };
      RETENTION_WINDOWS.forEach(d => {
        raw[`day${d}`] = members.filter((c, i) => {
          const events = eventsMap[c.customer_id] || [];
          return retainedAt(signup_dates[i], events, d);
        }).length;
      });
      const pct = {};
      RETENTION_WINDOWS.forEach(d => {
        pct[`day${d}`] = members.length > 0 ? (raw[`day${d}`] / members.length) * 100 : 0;
      });
      return { month, size: members.length, raw, pct };
    });

  // Overall curve — weighted average across cohorts
  const curves = [{ day: 0, pct: 100 }, ...RETENTION_WINDOWS.map(d => {
    const totalSize = cohortData.reduce((s, c) => s + c.size, 0);
    const totalRetained = cohortData.reduce((s, c) => s + c.raw[`day${d}`], 0);
    return { day: d, pct: totalSize > 0 ? (totalRetained / totalSize) * 100 : 0 };
  })];

  // Day-30 churn rate per cohort (100 - day30 retention)
  const avgDay7  = curves.find(c => c.day === 7)?.pct ?? 0;
  const avgDay30 = curves.find(c => c.day === 30)?.pct ?? 0;
  const avgDay90 = curves.find(c => c.day === 90)?.pct ?? 0;

  return { cohortData, curves, avgDay7, avgDay30, avgDay90 };
}
