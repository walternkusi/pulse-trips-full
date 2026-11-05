'use client';
// A glass card with a title, optional subtitle, an actions slot (toggle, filters) and the chart below.
import GlassCard from './GlassCard';

export default function ChartCard({ title, subtitle, actions, className = '', children }) {
  return (
    <GlassCard className={`min-w-0 p-5 ${className}`} hover={false}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-base font-semibold text-white">{title}</h2>
          {subtitle && <p className="m-0 mt-0.5 text-sm text-white/70">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </GlassCard>
  );
}
