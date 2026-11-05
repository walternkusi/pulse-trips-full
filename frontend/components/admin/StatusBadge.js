// Colour-coded status pill. Emerald = good, amber = waiting, rose = problem, cyan = info, slate = inactive.
// (Full class names are written out so Tailwind can find them.)
const TONE = {
  emerald: 'bg-slate-950/45 text-emerald-200 ring-emerald-300/60',
  amber: 'bg-slate-950/45 text-amber-200 ring-amber-300/60',
  rose: 'bg-slate-950/45 text-rose-200 ring-rose-300/60',
  cyan: 'bg-slate-950/45 text-cyan-100 ring-cyan-300/60',
  slate: 'bg-slate-950/45 text-white ring-white/40',
};
const MAP = {
  confirmed: 'emerald', paid: 'emerald', published: 'emerald', approved: 'emerald', live: 'emerald',
  pending: 'amber', draft: 'amber', 'awaiting check': 'amber',
  scheduled: 'cyan', 'in transit': 'cyan', 'checked in': 'cyan', featured: 'cyan',
  cancelled: 'rose', expired: 'rose', hidden: 'rose', rejected: 'rose', refunded: 'rose',
  archived: 'slate',
};

// On top of photos the translucent tones lose contrast, so `onImage` switches to a dark pill with a bright label.
const ON_IMAGE = {
  emerald: 'bg-slate-950/80 text-emerald-300 ring-emerald-300/50', amber: 'bg-slate-950/80 text-amber-300 ring-amber-300/50',
  rose: 'bg-slate-950/80 text-rose-300 ring-rose-300/50', cyan: 'bg-slate-950/80 text-cyan-200 ring-cyan-300/50', slate: 'bg-slate-950/80 text-white ring-white/40',
};

export default function StatusBadge({ status, tone, onImage = false, children, className = '' }) {
  const label = children ?? status;
  const t = tone || MAP[String(status).toLowerCase()] || 'slate';
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${(onImage ? ON_IMAGE : TONE)[t]} ${className}`}>{label}</span>;
}
