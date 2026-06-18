import { MessageSquare } from 'lucide-react';

const SENTIMENT_STYLES = {
  positive: 'bg-green-500/20 text-green-400',
  neutral:  'bg-white/10 text-white/40',
  negative: 'bg-red-500/20 text-red-400',
};

export default function SupportSection({ supportRow }) {
  if (!supportRow) return <p className="text-sm text-white/30 py-4">No support data available.</p>;

  const total      = parseInt(supportRow.ticket_count) || 0;
  const unresolved = parseInt(supportRow.unresolved_tickets) || 0;
  const sentiment  = supportRow.sentiment_tag || 'neutral';

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/5 rounded-2xl p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Total</p>
          <p className="text-3xl font-bold text-white">{total}</p>
        </div>
        <div className={`rounded-2xl p-4 text-center ${unresolved > 2 ? 'bg-red-500/10' : 'bg-white/5'}`}>
          <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Open</p>
          <p className={`text-3xl font-bold ${unresolved > 2 ? 'text-red-400' : 'text-white/30'}`}>{unresolved}</p>
        </div>
        <div className="bg-white/5 rounded-2xl p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Sentiment</p>
          <span className={`inline-block mt-1 text-xs font-bold px-3 py-1.5 rounded-full ${SENTIMENT_STYLES[sentiment]}`}>
            {sentiment}
          </span>
        </div>
      </div>
      {supportRow.last_ticket_date && (
        <p className="text-xs text-white/30 flex items-center gap-1.5 font-medium">
          <MessageSquare size={11} />
          Last ticket: {supportRow.last_ticket_date}
        </p>
      )}
    </div>
  );
}
