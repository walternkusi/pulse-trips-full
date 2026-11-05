'use client';
// =============================================================================
// CHARTS (Recharts): cyan bars with the selected bar brighter, gradient donut, area chart.
// Minimal grid lines, glass tooltips, animated entrance.
// =============================================================================
import { useId, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatAmount } from '@/lib/money';

export const usd = (n) => formatAmount(n, 'USD', 'en');
const axis = { stroke: 'rgb(255 255 255 / .65)', fontSize: 12, tickLine: false, axisLine: false };
const compact = (n) => (n >= 1000 ? `$${(n / (n >= 10000 ? 1000 : 1000)).toFixed(n >= 10000 ? 0 : 1)}k` : `$${Math.round(n)}`);
const useSafeId = () => useId().replace(/:/g, '');

// Hover tooltip in the same glass style as the cards.
export function GlassTooltip({ active, payload, label, format = (v) => v }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-pop px-3 py-2 text-xs text-white">
      {label !== undefined && <p className="m-0 mb-1 font-semibold">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="m-0 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.payload?.color || p.color || '#22d3ee' }} aria-hidden="true" />
          {p.name}: <b className="tabular-nums">{format(p.value)}</b>
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
export function RevenueBars({ data }) {
  const gid = useSafeId();
  const [hover, setHover] = useState(null);
  const active = hover ?? data.length - 1; // the latest bar is highlighted until you point at another
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="h-72 w-full lg:h-80" role="img" aria-label={`Revenue bar chart. Total ${usd(total)} across ${data.length} periods; latest ${usd(data[data.length - 1]?.value || 0)}.`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -6, bottom: 0 }} onMouseLeave={() => setHover(null)}>
          <defs>
            <linearGradient id={`${gid}d`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22d3ee" /><stop offset="100%" stopColor="#0e7490" /></linearGradient>
            <linearGradient id={`${gid}b`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ecfeff" /><stop offset="100%" stopColor="#22d3ee" /></linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgb(255 255 255 / .1)" strokeDasharray="3 6" />
          <XAxis dataKey="label" {...axis} />
          <YAxis {...axis} tickFormatter={compact} width={50} allowDecimals={false} />
          <Tooltip cursor={{ fill: 'rgb(255 255 255 / .07)' }} content={<GlassTooltip format={usd} />} />
          <Bar dataKey="value" name="Revenue" radius={[8, 8, 0, 0]} maxBarSize={46} animationDuration={900} onMouseEnter={(_, i) => setHover(i)}>
            {data.map((d, i) => <Cell key={d.label + i} fill={`url(#${gid}${i === active ? 'b' : 'd'})`} fillOpacity={i === active ? 1 : 0.6} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
const PALETTE = [['#22d3ee', '#0e7490'], ['#60a5fa', '#4338ca'], ['#34d399', '#047857'], ['#fbbf24', '#d97706']];

// Donut with a gradient per segment, a value in the middle and a legend underneath.
export function Donut({ data, centerValue, centerLabel, valueLabel = (v) => v }) {
  const gid = useSafeId();
  const total = data.reduce((s, d) => s + d.value, 0);
  const rows = total ? data : [{ name: 'No data yet', value: 1 }];
  const colored = data.map((d, i) => ({ ...d, color: PALETTE[i % PALETTE.length][0] }));
  return (
    <div>
      <div className="relative mx-auto h-52 w-52" role="img" aria-label={total ? `Donut chart: ${colored.map((d) => `${d.name} ${Math.round((d.value / total) * 100)}%`).join(', ')}` : 'Donut chart with no data yet'}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {PALETTE.map(([a, b], i) => <linearGradient key={i} id={`${gid}${i}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={a} /><stop offset="100%" stopColor={b} /></linearGradient>)}
            </defs>
            <Pie data={total ? colored : rows} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="94%" paddingAngle={total ? 3 : 0} cornerRadius={total ? 8 : 0} stroke="none" startAngle={90} endAngle={-270} animationDuration={1100}>
              {(total ? colored : rows).map((d, i) => <Cell key={d.name} fill={total ? `url(#${gid}${i % PALETTE.length})` : 'rgb(255 255 255 / .12)'} />)}
            </Pie>
            {total > 0 && <Tooltip content={<GlassTooltip format={valueLabel} />} />}
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-semibold tabular-nums text-white">{centerValue}</span>
          <span className="text-xs text-white/70">{centerLabel}</span>
        </div>
      </div>
      <ul className="m-0 mt-4 grid list-none gap-2 p-0">
        {colored.map((d, i) => (
          <li key={d.name} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-white/85"><span className="h-2.5 w-2.5 rounded-full" style={{ background: `linear-gradient(135deg, ${PALETTE[i % PALETTE.length][0]}, ${PALETTE[i % PALETTE.length][1]})` }} aria-hidden="true" />{d.name}</span>
            <span className="tabular-nums text-white">{valueLabel(d.value)} <span className="text-white/70">· {total ? Math.round((d.value / total) * 100) : 0}%</span></span>
          </li>
        ))}
        {!total && <li className="text-sm text-white/70">Nothing booked yet.</li>}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function RevenueArea({ data }) {
  const gid = useSafeId();
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="h-64 w-full" role="img" aria-label={`Daily revenue for the last ${data.length} days. Total ${usd(total)}.`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -6, bottom: 0 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22d3ee" stopOpacity=".55" /><stop offset="100%" stopColor="#22d3ee" stopOpacity="0" /></linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgb(255 255 255 / .1)" strokeDasharray="3 6" />
          <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={28} />
          <YAxis {...axis} tickFormatter={compact} width={50} allowDecimals={false} />
          <Tooltip cursor={{ stroke: 'rgb(255 255 255 / .35)' }} content={<GlassTooltip format={usd} />} />
          <Area type="monotone" dataKey="value" name="Revenue" stroke="#67e8f9" strokeWidth={2.5} fill={`url(#${gid})`} animationDuration={1100} activeDot={{ r: 5, fill: '#ecfeff', stroke: '#22d3ee', strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
