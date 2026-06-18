/** @type {import('tailwindcss').Config} */
export default {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── AETHER design token system ──
        // Surfaces
        canvas:   '#F4F3F5',   // app background — warm light gray
        surface:  '#FFFFFF',   // cards / sidebar
        'surface-muted': '#FAFAFB', // table header / subtle fills

        // Ink / text
        ink:        '#15151A', // primary text + KPI values + dark buttons
        'ink-soft': '#4A4A52', // KPI labels / strong secondary
        'ink-mute': '#9A9AA2', // axis / table header / captions
        hairline:   '#ECEBEF', // borders, gridlines, dividers
        'row-hover':'#F7F6F9',

        // KPI gradient stops (soft but present)
        'kpi-cream-from': '#FFEBB0', 'kpi-cream-to': '#FFDC7A',
        'kpi-blue-from':  '#CCE0FF', 'kpi-blue-to':  '#A8C8FF',
        'kpi-lav-from':   '#E2CCFF', 'kpi-lav-to':   '#C8AAFF',
        'kpi-rose-from':  '#FFD0E6', 'kpi-rose-to':  '#FFB0CC',
        'kpi-text':       '#15151A', // KPI value text
        'kpi-subtext':    '#4A4A52', // KPI label text

        // Chart
        'bar':       '#8E7CF0',  // solid periwinkle-purple
        'bar-soft':  '#C9C0F5',  // hatched / secondary bar
        'accent':    '#4070E0',  // CTA blue

        // Status (traffic-light mapping per reference)
        'status-success-fg': '#16A36B', 'status-success-bg': '#E4F6EE',
        'status-warning-fg': '#C98A1E', 'status-warning-bg': '#FBF1DE',
        'status-fail-fg':    '#E5484D', 'status-fail-bg':    '#FCEAEA',
        'status-critical-fg':'#B00020', 'status-critical-bg':'#FBE3E6',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        card: '24px',
        chip: '999px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(20,20,30,0.04), 0 8px 24px rgba(20,20,30,0.05)',
        'card-hover': '0 2px 4px rgba(20,20,30,0.05), 0 12px 32px rgba(20,20,30,0.08)',
        arrow: '0 4px 12px rgba(20,20,30,0.18)',
      },
    },
  },
  plugins: [],
}
