'use client';
// Weekly / Monthly / Yearly style toggle with a sliding highlight.
import { motion } from 'framer-motion';

export default function Segmented({ id, options, value, onChange, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl border border-white/20 bg-white/10 p-1">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.value)}
            className={`relative min-h-[34px] rounded-lg px-3.5 text-sm font-medium transition-colors ${on ? 'text-white' : 'text-white/75 hover:text-white'}`}>
            {on && <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-lg bg-cyan-500/40 ring-1 ring-inset ring-cyan-200/50" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
