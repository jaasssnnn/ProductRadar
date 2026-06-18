'use client';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import AccountHeader from '../components/account/AccountHeader';
import RiskBreakdown from '../components/account/RiskBreakdown';
import ActivityChart from '../components/account/ActivityChart';
import BillingSection from '../components/account/BillingSection';
import SupportSection from '../components/account/SupportSection';
import InterventionPanel from '../components/account/InterventionPanel';

const STATUSES = [
  { value: 'unactioned',          label: 'Unactioned' },
  { value: 'contacted',           label: 'Contacted' },
  { value: 'follow_up_scheduled', label: 'Follow-up' },
  { value: 'resolved',            label: 'Resolved' },
];

export default function AccountDetailPage() {
  const { customerId } = useParams();
  const router = useRouter();
  const { scoredAccounts, activity, billing, support, accountStatuses, updateStatus, notes, updateNote, outcomes, updateOutcome, owners, updateOwner, dueDates, updateDueDate } = useApp();
  const account = scoredAccounts.find(a => a.customer_id === customerId);

  if (!account) {
    return (
      <div className="min-h-full bg-canvas flex flex-col items-center justify-center h-64 text-center p-8">
        <p className="text-sm text-ink-mute mb-5 font-medium">Account not found.</p>
        <button onClick={() => router.push('/dashboard')} className="px-6 py-3 text-sm font-bold text-white bg-ink rounded-full hover:bg-[#2A2A30] transition-colors">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const accountActivity = activity.filter(r => r.customer_id === customerId);
  const billingRow  = billing.find(r => r.customer_id === customerId) || null;
  const supportRow  = support.find(r => r.customer_id === customerId) || null;
  const scoreResult = {
    score: account.score, label: account.label, factors: account.factors,
    daysSinceActivity: account.daysSinceActivity, usageDropPercent: account.usageDropPercent,
  };
  const currentStatus = accountStatuses[customerId] || 'unactioned';

  return (
    <div className="min-h-full bg-black">
      <div className="max-w-7xl p-8 space-y-6">
        <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors">
          <ArrowLeft size={14} />
          Dashboard
        </button>

        <div className="grid grid-cols-[8fr_2fr] gap-4">
          <div className="bg-[#1c1c1e] border border-white/[0.08] rounded-card p-10 min-h-[240px] flex flex-col justify-center">
            <AccountHeader account={account} scoreResult={scoreResult} />
          </div>
          <div className="bg-[#1c1c1e] border border-white/[0.08] rounded-card p-8 min-h-[240px] flex flex-col items-center justify-center">
            <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Risk Score</p>
            <p className="text-8xl font-bold text-white tracking-tight leading-none">{scoreResult.score}</p>
            <p className="text-sm font-bold text-white/30 mt-2">/ 100</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left */}
          <div className="space-y-5">
            <div className="bg-[#1c1c1e] border border-white/[0.08] rounded-card p-7">
              <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-5">Risk Factors</p>
              <RiskBreakdown factors={account.factors} />
            </div>

            <div className="bg-[#1c1c1e] border border-white/[0.08] rounded-card p-7">
              <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-5">Account Status</p>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {STATUSES.map(s => (
                    <button
                      key={s.value}
                      onClick={() => updateStatus(customerId, s.value)}
                      className={`py-3 rounded-full text-xs font-bold tracking-wide transition-all duration-150 ${
                        currentStatus === s.value
                          ? 'bg-white text-black'
                          : 'bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/60'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {currentStatus === 'resolved' && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Outcome</p>
                    <div className="grid grid-cols-3 gap-2">
                      {['Saved', 'Churned', 'Expanded'].map(o => (
                        <button
                          key={o}
                          onClick={() => updateOutcome(customerId, o)}
                          className={`py-2.5 rounded-full text-xs font-bold tracking-wide transition-all duration-150 ${
                            outcomes[customerId] === o
                              ? o === 'Saved'   ? 'bg-green-500/20 text-green-400'
                              : o === 'Churned' ? 'bg-red-500/20 text-red-400'
                              :                   'bg-white/15 text-white'
                              : 'bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/60'
                          }`}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Owner</p>
                    <input
                      type="text"
                      value={owners[customerId] || ''}
                      onChange={e => updateOwner(customerId, e.target.value)}
                      placeholder="Assign to..."
                      className="w-full text-sm border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-white/10 text-white/60 placeholder:text-white/20 bg-white/5 font-medium"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Due Date</p>
                    <input
                      type="date"
                      value={dueDates[customerId] || ''}
                      onChange={e => updateDueDate(customerId, e.target.value)}
                      className="w-full text-sm border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-white/10 text-white/60 bg-white/5 font-medium"
                    />
                  </div>
                </div>

                <textarea
                  value={notes[customerId] || ''}
                  onChange={e => updateNote(customerId, e.target.value)}
                  placeholder="Add a note..."
                  className="w-full text-sm border border-white/10 rounded-2xl p-5 resize-none focus:outline-none focus:ring-2 focus:ring-white/10 text-white/60 placeholder:text-white/20 bg-white/5 font-medium leading-relaxed"
                  rows={4}
                />
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="space-y-5">
            <div className="bg-[#1c1c1e] border border-white/[0.08] rounded-card p-7">
              <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-5">Activity — last 5 weeks</p>
              <ActivityChart activityRows={accountActivity} />
            </div>
            <div className="bg-[#1c1c1e] border border-white/[0.08] rounded-card p-7">
              <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-5">Billing</p>
              <BillingSection billingRow={billingRow} />
            </div>
            <div className="bg-[#1c1c1e] border border-white/[0.08] rounded-card p-7">
              <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-5">Support</p>
              <SupportSection supportRow={supportRow} />
            </div>
          </div>
        </div>

        <InterventionPanel account={account} scoreResult={scoreResult} />
      </div>
    </div>
  );
}
