'use client';
// Row of filter pills (radio-group semantics). options: [{ value, label, count? }]
export default function FilterChips({ options, value, onChange, label = 'Filter' }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.value)}
            className={`inline-flex min-h-[36px] items-center gap-2 rounded-full border px-4 text-sm font-medium transition active:scale-95 ${on ? 'border-cyan-300/70 bg-cyan-500/30 text-white shadow-lg shadow-cyan-900/20' : 'border-white/20 bg-white/10 text-white/80 hover:border-white/40 hover:bg-white/20 hover:text-white'}`}>
            {o.label}
            {o.count !== undefined && <span className={`rounded-full px-1.5 text-xs ${on ? 'bg-white/25' : 'bg-white/15'}`}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
