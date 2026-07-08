export function computeCost(customers, activity, support, manualCAC, spendRows, manualCostPerTicket) {
  if (!customers.length) return null;

  const totalMRR = customers.reduce((s, c) => s + (parseFloat(c.mrr) || 0), 0);
  const avgMRR   = customers.length ? totalMRR / customers.length : 0;

  // Active users = customers with any activity event
  const activeIds  = new Set(activity.map(a => a.customer_id).filter(Boolean));
  const activeUsers = customers.filter(c => activeIds.has(c.customer_id)).length;

  const mrrPerActiveUser    = activeUsers > 0  ? totalMRR / activeUsers    : null;
  const mrrPerCustomer      = customers.length  ? totalMRR / customers.length : null;

  // Support tickets
  const totalTickets = support.reduce((s, r) => s + (parseInt(r.ticket_count) || 0), 0);
  const costPerTicket = manualCostPerTicket || null;
  const totalSupportCost = costPerTicket && totalTickets ? costPerTicket * totalTickets : null;

  // LTV: ARPU × average lifespan (assumed 24 months when churn rate unknown)
  // If spend data has enough info we could compute churn, otherwise use 24mo default
  const avgLifespanMonths = 24;
  const ltv = avgMRR * avgLifespanMonths;

  // CAC from spend CSV: sum spend / sum new_customers
  let derivedCAC = null;
  let totalSpend = 0;
  if (spendRows && spendRows.length) {
    totalSpend = spendRows.reduce((s, r) => s + (parseFloat(r.spend || r.total_spend || r.amount || 0)), 0);
    const newCustomers = spendRows.reduce((s, r) => s + (parseInt(r.new_customers || r.new_signups || 0)), 0);
    if (newCustomers > 0) derivedCAC = totalSpend / newCustomers;
  }

  const cac    = manualCAC || derivedCAC;
  const ltvcac = cac && ltv ? ltv / cac : null;

  // By plan
  const planMap = {};
  customers.forEach(c => {
    const plan = c.plan || 'Unknown';
    if (!planMap[plan]) planMap[plan] = { count: 0, mrr: 0 };
    planMap[plan].count++;
    planMap[plan].mrr += parseFloat(c.mrr) || 0;
  });
  const byPlan = Object.entries(planMap)
    .map(([plan, d]) => ({ plan, count: d.count, mrr: d.mrr, arpu: d.count ? d.mrr / d.count : 0 }))
    .sort((a, b) => b.arpu - a.arpu);

  // Spend by channel (if channel column present)
  const byChannel = [];
  if (spendRows && spendRows.length && spendRows[0].channel) {
    const channelMap = {};
    spendRows.forEach(r => {
      const ch = r.channel || 'Other';
      channelMap[ch] = (channelMap[ch] || 0) + (parseFloat(r.spend || r.total_spend || 0));
    });
    byChannel.push(...Object.entries(channelMap).map(([channel, spend]) => ({ channel, spend })).sort((a, b) => b.spend - a.spend));
  }

  return {
    totalMRR, avgMRR, totalCustomers: customers.length,
    activeUsers, mrrPerActiveUser, mrrPerCustomer,
    totalTickets, totalSpend,
    costPerTicket, totalSupportCost,
    ltv, avgLifespanMonths,
    cac, derivedCAC, ltvcac,
    byPlan, byChannel,
  };
}
