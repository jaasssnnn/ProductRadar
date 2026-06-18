const styles = {
  Critical: 'bg-ink text-white',
  High:     'bg-ink/60 text-white',
  Medium:   'bg-ink/30 text-white',
  Low:      'bg-ink/10 text-ink-soft',
};

export default function RiskBadge({ label }) {
  return (
    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold tracking-wide ${styles[label] || 'bg-ink/10 text-ink-mute'}`}>
      {label}
    </span>
  );
}
