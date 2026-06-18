/**
 * @param dataPresence  Which data SOURCES are loaded, e.g. { activity, billing, support }.
 *   When a source is absent we SKIP its factors rather than treating the absence as a
 *   churn signal (missing activity ≠ "999 days inactive"). This keeps scores honest and
 *   consistent with the partial-data confidence banner. If omitted, presence is inferred
 *   from the arguments — preserving the original all-CSV behavior.
 */
export function scoreAccount(customer, activityRows, billingRow, supportRow, dataPresence) {
  const now = new Date();
  const factors = [];
  let score = 0;

  const present = dataPresence || {
    activity: Array.isArray(activityRows) && activityRows.length > 0,
    billing:  !!billingRow,
    support:  !!supportRow,
  };

  // ── 1. Inactivity Risk (+25) ────────────────────────────────────────────
  const lastActivity = activityRows
    .map(r => new Date(r.timestamp))
    .sort((a, b) => b - a)[0];

  // Null (not 999) when no activity source — absence is "unknown", not "inactive".
  const daysSinceActivity = !present.activity
    ? null
    : lastActivity
      ? Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24))
      : 999;

  if (present.activity && daysSinceActivity >= 14) {
    score += 25;
    factors.push({
      key: 'inactivity',
      label: 'No recent activity',
      detail: `Last activity was ${daysSinceActivity} days ago`,
      points: 25,
      severity: 'high',
    });
  }

  // ── 2. Usage Decline — trend-based (+20) ────────────────────────────────
  // Bucket activity into 4 weekly windows (w1=oldest, w4=newest)
  const weekBuckets = [
    { min: 21, max: 28 },
    { min: 14, max: 21 },
    { min: 7,  max: 14 },
    { min: 0,  max: 7  },
  ];
  const weeklyActivity = weekBuckets.map(({ min, max }) =>
    activityRows
      .filter(r => {
        const d = (now - new Date(r.timestamp)) / (1000 * 60 * 60 * 24);
        return d >= min && d < max;
      })
      .reduce((sum, r) => sum + (parseInt(r.count) || 1), 0)
  );

  const [w1, w2, w3, w4] = weeklyActivity;
  const weeklyMean = (w1 + w2 + w3 + w4) / 4;

  // Linear slope via least-squares: x=[1,2,3,4], Σ(xi−2.5)²=5
  const slope = (-1.5 * w1 - 0.5 * w2 + 0.5 * w3 + 1.5 * w4) / 5;
  const normalizedSlope = weeklyMean > 0 ? slope / weeklyMean : 0;

  // Keep recentCount/priorCount for the renewal risk calculation below
  const recentCount = w3 + w4;
  const priorCount  = w1 + w2;
  let usageDropPercent = 0;
  if (priorCount > 0 && recentCount < priorCount) {
    usageDropPercent = Math.round(((priorCount - recentCount) / priorCount) * 100);
  }

  // Fire the factor on sustained negative trend, not a single bad week.
  // Gated on activity presence — no activity source means no trend to assess.
  const isTrendDeclining = present.activity && normalizedSlope < -0.10 && (w1 + w2) > 0;
  if (isTrendDeclining) {
    score += 20;
    factors.push({
      key: 'usage_decline',
      label: 'Usage declining',
      detail: `Consistent downward trend — ~${Math.abs(Math.round(normalizedSlope * 100))}% avg drop per week over 4 weeks`,
      points: 20,
      severity: normalizedSlope < -0.25 ? 'high' : 'medium',
    });
  }

  // ── 3. Billing Risk (+15) ───────────────────────────────────────────────
  if (billingRow) {
    const hasBillingRisk =
      billingRow.invoice_status === 'failed' ||
      billingRow.invoice_status === 'overdue' ||
      parseInt(billingRow.failed_payments) > 0;

    if (hasBillingRisk) {
      score += 15;
      factors.push({
        key: 'billing',
        label: 'Billing issue detected',
        detail: `Invoice ${billingRow.invoice_status}, ${billingRow.failed_payments} failed payment(s)`,
        points: 15,
        severity: 'medium',
      });
    }
  }

  // ── 4. Support Friction (+15) ───────────────────────────────────────────
  if (supportRow) {
    const unresolved = parseInt(supportRow.unresolved_tickets) || 0;
    const isNegative = supportRow.sentiment_tag === 'negative';

    if (unresolved > 2 || isNegative) {
      score += 15;
      factors.push({
        key: 'support',
        label: 'Support friction',
        detail: `${unresolved} unresolved ticket(s), sentiment: ${supportRow.sentiment_tag}`,
        points: 15,
        severity: 'medium',
      });
    }
  }

  // ── 5. Renewal Timing + Weak Usage (+10) ────────────────────────────────
  if (customer.renewal_date) {
    const daysToRenewal = Math.floor(
      (new Date(customer.renewal_date) - now) / (1000 * 60 * 60 * 24)
    );
    if (daysToRenewal <= 30 && daysToRenewal >= 0 && usageDropPercent >= 20) {
      score += 10;
      factors.push({
        key: 'renewal_risk',
        label: 'Renewal at risk',
        detail: `Renewal in ${daysToRenewal} days with declining usage`,
        points: 10,
        severity: 'medium',
      });
    }
  }

  // ── 6. Low Feature Adoption (+10) ───────────────────────────────────────
  // Gated on activity presence — can't assess adoption without activity data.
  const featureUseEvents = activityRows.filter(r => r.event_name === 'feature_use');
  const totalFeatureCount = featureUseEvents.reduce(
    (sum, r) => sum + (parseInt(r.count) || 1), 0
  );

  if (present.activity && totalFeatureCount < 3) {
    score += 10;
    factors.push({
      key: 'low_adoption',
      label: 'Low feature adoption',
      detail: `Only ${totalFeatureCount} feature interactions recorded`,
      points: 10,
      severity: 'low',
    });
  }

  const finalScore = Math.min(score, 100);

  return {
    score: finalScore,
    label: getRiskLabel(finalScore),
    factors,
    daysSinceActivity,
    usageDropPercent,
    recentCount,
    priorCount,
    weeklyActivity,
    normalizedSlope,
    dataPresence: present,
  };
}

export function getRiskLabel(score) {
  if (score >= 75) return 'Critical';
  if (score >= 50) return 'High';
  if (score >= 25) return 'Medium';
  return 'Low';
}

export function getRiskColor(label) {
  return {
    Critical: 'red',
    High: 'orange',
    Medium: 'yellow',
    Low: 'green',
  }[label] || 'gray';
}
