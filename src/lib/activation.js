const DAY_MS = 86400000;

const ACTIVATION_EVENT_NAMES = new Set([
  'activated', 'activation', 'onboarding_complete', 'onboarding_completed',
  'first_login', 'setup_complete', 'feature_use',
]);

export function computeActivation(customers, activity) {
  if (!customers.length) return null;

  // First event timestamp per customer
  const firstEvent = {};
  // First activation-specific event per customer
  const firstActivation = {};
  const hasActivationEvents = activity.some(
    a => a.event_name && ACTIVATION_EVENT_NAMES.has(a.event_name.toLowerCase())
  );

  activity.forEach(a => {
    if (!a.customer_id || !a.timestamp) return;
    const t = new Date(a.timestamp);
    if (isNaN(t)) return;
    if (!firstEvent[a.customer_id] || t < firstEvent[a.customer_id]) firstEvent[a.customer_id] = t;
    if (hasActivationEvents && a.event_name && ACTIVATION_EVENT_NAMES.has(a.event_name.toLowerCase())) {
      if (!firstActivation[a.customer_id] || t < firstActivation[a.customer_id]) firstActivation[a.customer_id] = t;
    }
  });

  const activationTs = hasActivationEvents ? firstActivation : firstEvent;

  const metrics = customers.map(c => {
    const signup = c.signup_date ? new Date(c.signup_date) : null;
    const activated = activationTs[c.customer_id];
    const first = firstEvent[c.customer_id];
    const ttfv = signup && !isNaN(signup) && first ? Math.max(0, (first - signup) / DAY_MS) : null;
    const daysToActivate = signup && !isNaN(signup) && activated ? Math.max(0, (activated - signup) / DAY_MS) : null;
    return {
      ...c,
      ttfv,
      daysToActivate,
      activatedWithin7:  daysToActivate !== null && daysToActivate <= 7,
      activatedWithin30: daysToActivate !== null && daysToActivate <= 30,
      hasAnyActivity: !!first,
    };
  });

  const withSignup = metrics.filter(c => c.signup_date && !isNaN(new Date(c.signup_date)));
  const activated7  = withSignup.filter(c => c.activatedWithin7).length;
  const activated30 = withSignup.filter(c => c.activatedWithin30).length;

  const ttfvValues = metrics.filter(c => c.ttfv !== null).map(c => c.ttfv).sort((a, b) => a - b);
  const avgTTFV    = ttfvValues.length ? ttfvValues.reduce((s, v) => s + v, 0) / ttfvValues.length : null;
  const medianTTFV = ttfvValues.length ? ttfvValues[Math.floor(ttfvValues.length / 2)] : null;

  // By plan
  const planMap = {};
  metrics.forEach(c => {
    const plan = c.plan || 'Unknown';
    if (!planMap[plan]) planMap[plan] = { total: 0, a7: 0, a30: 0 };
    planMap[plan].total++;
    if (c.activatedWithin7)  planMap[plan].a7++;
    if (c.activatedWithin30) planMap[plan].a30++;
  });
  const byPlan = Object.entries(planMap).map(([plan, d]) => ({
    plan,
    total:   d.total,
    rate7:   d.total ? (d.a7  / d.total) * 100 : 0,
    rate30:  d.total ? (d.a30 / d.total) * 100 : 0,
  }));

  // By cohort (signup month)
  const cohortMap = {};
  metrics.forEach(c => {
    if (!c.signup_date) return;
    const d = new Date(c.signup_date);
    if (isNaN(d)) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!cohortMap[key]) cohortMap[key] = { total: 0, a7: 0, a30: 0 };
    cohortMap[key].total++;
    if (c.activatedWithin7)  cohortMap[key].a7++;
    if (c.activatedWithin30) cohortMap[key].a30++;
  });
  const byCohort = Object.entries(cohortMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, d]) => ({
      month,
      total:  d.total,
      rate7:  d.total ? (d.a7  / d.total) * 100 : 0,
      rate30: d.total ? (d.a30 / d.total) * 100 : 0,
    }));

  return {
    total: customers.length,
    activationRate7:  withSignup.length ? (activated7  / withSignup.length) * 100 : 0,
    activationRate30: withSignup.length ? (activated30 / withSignup.length) * 100 : 0,
    avgTTFV,
    medianTTFV,
    byPlan,
    byCohort,
    hasActivationEvents,
    metrics,
  };
}
