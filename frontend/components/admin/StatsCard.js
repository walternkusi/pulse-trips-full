'use client';
// KPI card: icon, title, big value and the % change with an arrow (emerald up, rose down).
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import GlassCard from './GlassCard';

const TONE = {
  cyan: 'from-cyan-400/40 to-teal-400/20 text-cyan-100',
  emerald: 'from-emerald-400/40 to-teal-400/20 text-emerald-100',
  amber: 'from-amber-400/40 to-orange-400/20 text-amber-100',
  rose: 'from-rose-400/40 to-pink-400/20 text-rose-100',
  blue: 'from-blue-400/40 to-indigo-400/20 text-blue-100',
};

// `change`: number = % vs previous period, null = nothing to compare yet, undefined = hide.
// `invert`: true when going up is bad (e.g. abandonment).
function Delta({ change, invert, label }) {
  if (change === undefined) return null;
  if (change === null) return <span className="text-xs font-medium text-white/70">New activity</span>;
  const good = invert ? change < 0 : change > 0;
  const bad = invert ? change > 0 : change < 0;
  const Arrow = change < 0 ? ArrowDownRight : ArrowUpRight;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${good ? 'text-emerald-300' : bad ? 'text-rose-300' : 'text-white/70'}`}>
      {change !== 0 && <Arrow size={14} aria-hidden="true" />}
      {change > 0 ? '+' : ''}{change}%<span className="sr-only"> {good ? 'improvement' : bad ? 'decline' : 'no change'}</span>
      {label && <span className="font-normal text-white/70"> {label}</span>}
    </span>
  );
}

export default function StatsCard({ icon: Icon, title, value, change, changeLabel = 'vs previous 30 days', invert = false, tone = 'cyan', size = 'lg', hint, badge }) {
  const small = size === 'sm';
  return (
    <GlassCard className={`group relative min-w-0 overflow-hidden ${small ? 'p-4' : 'p-5'}`}>
      <div className="flex items-start justify-between gap-3">
        <span className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ring-1 ring-white/20 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 ${TONE[tone]} ${small ? 'h-9 w-9' : 'h-11 w-11'}`}>
          {Icon && <Icon size={small ? 18 : 22} aria-hidden="true" />}
        </span>
        {badge}
      </div>
      <p className={`m-0 mt-4 font-medium text-white/70 ${small ? 'text-xs' : 'text-sm'}`}>{title}</p>
      <p className={`m-0 mt-1 font-semibold tabular-nums tracking-tight text-white ${small ? 'text-xl' : 'text-3xl'}`}>{value}</p>
      <div className="mt-2 min-h-[1.25rem]">
        {hint ? <span className="text-xs text-white/70">{hint}</span> : <Delta change={change} invert={invert} label={small ? '' : changeLabel} />}
      </div>
    </GlassCard>
  );
}
