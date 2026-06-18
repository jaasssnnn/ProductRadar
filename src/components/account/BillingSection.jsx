import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';

const STATUS_CONFIG = {
  paid:    { icon: CheckCircle, color: 'text-green-400',  bg: 'bg-green-500/10',  label: 'Paid' },
  overdue: { icon: AlertCircle, color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Overdue' },
  failed:  { icon: XCircle,     color: 'text-red-400',    bg: 'bg-red-500/10',    label: 'Failed' },
};

export default function BillingSection({ billingRow }) {
  if (!billingRow) return <p className="text-sm text-white/30 py-4">No billing data available.</p>;

  const config     = STATUS_CONFIG[billingRow.invoice_status] || STATUS_CONFIG.paid;
  const Icon       = config.icon;
  const failedCount = parseInt(billingRow.failed_payments) || 0;

  return (
    <div className="space-y-3">
      <div className={`flex items-center gap-4 p-4 rounded-2xl ${config.bg}`}>
        <Icon size={18} className={`${config.color} flex-shrink-0`} />
        <div>
          <p className="text-sm font-bold text-white">Invoice: {config.label}</p>
          <p className="text-xs text-white/40 mt-0.5 font-medium">Subscription: {billingRow.subscription_status || '—'}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 rounded-2xl p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Last Payment</p>
          <p className="text-sm font-bold text-white">{billingRow.last_payment_date || '—'}</p>
        </div>
        <div className={`rounded-2xl p-4 ${failedCount > 0 ? 'bg-red-500/10' : 'bg-white/5'}`}>
          <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Failed</p>
          <p className={`text-2xl font-bold ${failedCount > 0 ? 'text-red-400' : 'text-white/30'}`}>{failedCount}</p>
        </div>
      </div>
    </div>
  );
}
