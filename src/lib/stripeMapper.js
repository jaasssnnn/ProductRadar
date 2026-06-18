// Maps Stripe API objects into the shape our scoring engine expects.
// Stripe amounts are in the smallest currency unit (cents for USD) — divide by 100.
// Stripe timestamps are Unix seconds — multiply by 1000 for JS Date.

// Number of months in one billing period, by interval.
// Used to normalise ANY cadence (weekly, monthly, quarterly, annual) to a monthly MRR.
const INTERVAL_MONTHS = { day: 1 / 30, week: 1 / 4.345, month: 1, year: 12 };

/**
 * Safely converts a Unix-seconds timestamp to a YYYY-MM-DD string.
 * Returns null instead of throwing if the value is missing or invalid —
 * `new Date(undefined * 1000).toISOString()` throws RangeError, which would
 * otherwise crash the entire sync for every account.
 */
function unixToISODate(unixSeconds) {
  if (!unixSeconds || typeof unixSeconds !== 'number') return null;
  const d = new Date(unixSeconds * 1000);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
}

/**
 * Derives normalised monthly MRR from a Stripe price, accounting for both the
 * interval (month/year/week/day) and interval_count (e.g. every 3 months).
 * A $300 quarterly plan → $100/mo; a $1200 annual plan → $100/mo.
 */
function deriveMonthlyMRR(priceItem) {
  const amountCents   = priceItem?.unit_amount || 0;
  const interval      = priceItem?.recurring?.interval || 'month';
  const intervalCount = priceItem?.recurring?.interval_count || 1;
  const periodMonths  = (INTERVAL_MONTHS[interval] || 1) * intervalCount;
  if (periodMonths <= 0) return 0;
  return (amountCents / 100) / periodMonths;
}

/**
 * Maps Stripe customers + subscriptions → customers.csv shape
 * Only includes customers with an active/trialing/past_due subscription (paying accounts).
 */
export function mapStripeCustomers(customers, subscriptions) {
  return customers
    .map(customer => {
      const sub = subscriptions.find(
        s => s.customer === customer.id &&
             ['active', 'trialing', 'past_due'].includes(s.status)
      );
      if (!sub) return null; // No active subscription — skip

      const item      = sub.items?.data?.[0];
      const priceItem = item?.price;
      const mrr       = deriveMonthlyMRR(priceItem);

      // current_period_end lives on the subscription in older API versions,
      // but moved to the subscription item in Stripe API 2025-03+. Check both.
      const periodEnd = sub.current_period_end ?? item?.current_period_end;

      return {
        customer_id:  customer.id,
        account_name: customer.name || customer.email || customer.id,
        mrr:          mrr.toFixed(2),
        renewal_date: unixToISODate(periodEnd),
        plan:         priceItem?.nickname || priceItem?.product || 'Default',
        signup_date:  unixToISODate(customer.created),
        status:       sub.status,
      };
    })
    .filter(Boolean);
}

/**
 * Maps Stripe customers + subscriptions + invoices → billing.csv shape
 */
export function mapStripeBilling(customers, subscriptions, invoices) {
  return customers.map(customer => {
    const sub              = subscriptions.find(s => s.customer === customer.id);
    const customerInvoices = invoices.filter(i => i.customer === customer.id);

    // Invoices that had at least one failed payment attempt and are still open/uncollectible
    const failedInvoices = customerInvoices.filter(i =>
      i.status === 'uncollectible' ||
      (i.status === 'open' && i.attempt_count > 0)
    );

    const openInvoices = customerInvoices.filter(i => i.status === 'open');

    const lastPaid = customerInvoices
      .filter(i => i.status === 'paid')
      .sort((a, b) => b.created - a.created)[0];

    // Derive a single invoice_status for our scoring engine
    const invoice_status = failedInvoices.length > 0 ? 'failed'
      : openInvoices.length > 0                      ? 'overdue'
      :                                                 'paid';

    return {
      customer_id:          customer.id,
      invoice_status,
      failed_payments:      failedInvoices.length.toString(),
      subscription_status:  sub?.status || 'unknown',
      last_payment_date:    lastPaid ? unixToISODate(lastPaid.created) : null,
    };
  });
}
