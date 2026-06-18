import RiskBadge from '../dashboard/RiskBadge';

export default function AccountHeader({ account, scoreResult }) {
  const daysToRenewal = account.renewal_date
    ? Math.floor((new Date(account.renewal_date) - new Date()) / 86400000)
    : null;

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap mb-3">
        <span className="text-xs font-bold uppercase tracking-widest text-white/50 bg-white/10 px-3 py-1.5 rounded-full">{account.plan}</span>
        <RiskBadge label={scoreResult.label} />
      </div>
      <h2 className="text-5xl font-bold text-white tracking-tight mb-3">{account.account_name}</h2>
      <div className="flex items-center gap-6 flex-wrap">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-1">MRR</p>
          <p className="text-lg font-bold text-white">${Number(account.mrr).toLocaleString()}</p>
        </div>
        {account.renewal_date && (
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-1">Renewal</p>
            <p className={`text-lg font-bold ${daysToRenewal <= 30 && daysToRenewal >= 0 ? 'text-white' : 'text-white/50'}`}>
              {account.renewal_date}
              {daysToRenewal !== null && daysToRenewal >= 0 && (
                <span className="ml-2 text-sm font-medium opacity-50">({daysToRenewal}d)</span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
