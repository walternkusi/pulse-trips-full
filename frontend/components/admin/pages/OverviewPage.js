'use client';
// OVERVIEW: revenue bars + category donut, KPI cards, and the funnel / sources / top tours from the old dashboard.
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Activity, CalendarCheck, CircleDollarSign, Download, Hourglass, Mail, Plus, Receipt, Users, XCircle, Percent } from 'lucide-react';
import { useAdmin } from '../AdminContext';
import { categoryBreakdown, downloadCsv, guestsTrend, monthlyKpis, revenueSeries } from '@/lib/admin-stats';
import GlassCard from '../GlassCard';
import Stagger from '../Stagger';
import StatsCard from '../StatsCard';
import ChartCard from '../ChartCard';
import DataTable from '../DataTable';
import PageHeader, { primaryBtn, secondaryBtn } from '../PageHeader';
import Segmented from '../Segmented';
import { CardSkeleton } from '../Skeleton';
import { Donut, RevenueBars, usd } from '../charts';

const STEP_LABEL = { view_item: 'Viewed a tour', begin_checkout: 'Started checkout', add_payment_info: 'Reached payment', purchase: 'Booked' };
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };

export function bookingsCsv(bookings) {
  return bookings.map((b) => ({ reference: b.reference, status: b.status, guest: b.name, email: b.email, tour: b.tourName, date: b.date, time: b.time, guests: b.adults + b.children, total: b.total, currency: b.currency, total_usd: b.totalUsd, payment: `${b.payment?.provider || ''} ${b.payment?.method || ''}`.trim(), created: b.createdAt }));
}

export default function OverviewPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { overview, bookings, tours, adminName, loading } = useAdmin();
  const [mode, setMode] = useState('weekly');

  // Voucher QR codes open /admin?checkin=PT-XXXX: send them to the check-in screen.
  const checkin = params.get('checkin');
  useEffect(() => { if (checkin) router.replace(`/admin/check-in?ref=${encodeURIComponent(checkin)}`); }, [checkin, router]);

  const series = useMemo(() => (bookings ? revenueSeries(bookings, mode) : []), [bookings, mode]);
  const cats = useMemo(() => (bookings && tours ? categoryBreakdown(bookings, tours) : []), [bookings, tours]);
  const kpi = useMemo(() => (bookings ? monthlyKpis(bookings) : null), [bookings]);
  const guests = useMemo(() => (bookings ? guestsTrend(bookings) : null), [bookings]);
  const k = overview?.kpis;
  const ready = Boolean(overview && bookings && tours);
  const top = Math.max(1, ...(overview?.funnel || []).map((f) => f.sessions));
  const totalPaid = cats.reduce((s, c) => s + c.value, 0);

  return (
    <>
      <PageHeader title={`${greeting()}, ${adminName}`} subtitle="Here is how Pulse Trips is doing: revenue, bookings and what needs your attention.">
        <button type="button" className={secondaryBtn} disabled={!bookings?.length} onClick={() => downloadCsv('pulse-trips-bookings.csv', bookingsCsv(bookings))}><Download size={16} aria-hidden="true" /> Export bookings</button>
        <Link href="/admin/tours" className={primaryBtn}><Plus size={16} aria-hidden="true" /> New tour</Link>
      </PageHeader>

      {!ready ? (
        <div className="grid grid-cols-1 gap-4" aria-busy="true">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3"><CardSkeleton className="h-[22rem] lg:col-span-2" /><CardSkeleton className="h-[22rem]" /></div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <CardSkeleton key={i} className="h-40" />)}</div>
        </div>
      ) : (
        <Stagger className="grid grid-cols-1 gap-4">
          {/* Row 1: revenue bars + donut */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard className="lg:col-span-2" title="Revenue" subtitle="Confirmed bookings in USD"
              actions={<Segmented id="rev" label="Chart period" value={mode} onChange={setMode} options={[{ value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }]} />}>
              <RevenueBars key={mode} data={series} />
            </ChartCard>
            <ChartCard title="Bookings by experience" subtitle="Confirmed bookings">
              <Donut data={cats} centerValue={totalPaid} centerLabel="confirmed" valueLabel={(v) => `${v}`} />
            </ChartCard>
          </div>

          {/* Row 2: four headline cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatsCard icon={CircleDollarSign} tone="cyan" title="Revenue, last 30 days" value={usd(kpi.revenue)} change={kpi.revenueChange} />
            <StatsCard icon={CalendarCheck} tone="emerald" title="Confirmed bookings" value={kpi.bookings} change={kpi.bookingsChange} />
            <StatsCard icon={Users} tone="blue" title="Guests in the next 7 days" value={guests.next} change={guests.change} changeLabel="vs previous 7 days" />
            <StatsCard icon={Receipt} tone="amber" title="Average order" value={usd(kpi.aov)} change={kpi.aovChange} />
          </div>

          {/* Row 3: four smaller tiles */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatsCard size="sm" icon={Percent} tone="rose" title="Checkout abandonment" value={`${overview.abandonmentRate}%`} invert change={undefined} hint="Started checkout, did not book" />
            <StatsCard size="sm" icon={Hourglass} tone="amber" title="Pending payment holds" value={k.pendingHolds} hint="Seats held while guests pay" />
            <StatsCard size="sm" icon={Mail} tone="cyan" title="Newsletter subscribers" value={k.subscribers} hint="Total sign-ups" />
            <StatsCard size="sm" icon={XCircle} tone="rose" title="Cancelled" value={k.cancelled} hint="All time" />
          </div>

          {/* Funnel + sources */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard className="lg:col-span-2" title="Checkout funnel" subtitle="Unique sessions at each step">
              <ul className="m-0 grid list-none gap-4 p-0">
                {overview.funnel.map((f, i) => {
                  const prev = i ? overview.funnel[i - 1].sessions : null;
                  const conv = prev ? Math.round((f.sessions / prev) * 100) : null;
                  return (
                    <li key={f.step} className="grid grid-cols-[8.5rem_1fr_4.5rem] items-center gap-3 text-sm">
                      <span className="text-white/85">{STEP_LABEL[f.step]}</span>
                      <span className="h-3 overflow-hidden rounded-full bg-white/10"><motion.span className="block h-full rounded-full bg-gradient-to-r from-cyan-400 to-teal-300" initial={{ width: 0 }} animate={{ width: `${(f.sessions / top) * 100}%` }} transition={{ duration: 0.9, delay: 0.1 * i, ease: [0.22, 0.8, 0.3, 1] }} /></span>
                      <span className="text-right font-semibold tabular-nums text-white">{f.sessions}{conv !== null && prev ? <span className="font-normal text-white/70"> · {conv}%</span> : null}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="m-0 mt-4 text-xs text-white/70">Full reports and attribution live in Google Analytics 4 (set NEXT_PUBLIC_GA_ID).</p>
            </ChartCard>
            <ChartCard title="Traffic sources" subtitle="First source of each visit">
              {overview.sources.length ? (
                <ul className="m-0 grid list-none gap-2.5 p-0">
                  {overview.sources.slice(0, 7).map((s) => (
                    <li key={s.source} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm transition hover:bg-white/10"><span className="flex items-center gap-2 text-white/90"><Activity size={14} className="text-cyan-300" aria-hidden="true" />{s.source}</span><b className="tabular-nums">{s.sessions}</b></li>
                  ))}
                </ul>
              ) : <p className="m-0 text-sm text-white/70">No visits recorded yet.</p>}
            </ChartCard>
          </div>

          <ChartCard title="Top-performing tours" subtitle="By confirmed revenue">
            <DataTable caption="Top-performing tours" rows={overview.topTours} rowKey={(t) => t.slug} pageSize={6} empty="No data yet."
              columns={[
                { key: 'name', header: 'Tour', render: (t) => <Link href={`/tours/${t.slug}`} className="font-medium text-cyan-200 underline-offset-4 hover:underline">{t.name}</Link> },
                { key: 'views', header: 'Views', align: 'right' },
                { key: 'bookings', header: 'Bookings', align: 'right' },
                { key: 'guests', header: 'Guests', align: 'right' },
                { key: 'revenueUsd', header: 'Revenue', align: 'right', render: (t) => usd(t.revenueUsd) },
                { key: 'conv', header: 'View → book', align: 'right', sortValue: (t) => (t.views ? t.bookings / t.views : 0), render: (t) => (t.views ? `${Math.round((t.bookings / t.views) * 100)}%` : '—') },
              ]} />
          </ChartCard>
        </Stagger>
      )}
    </>
  );
}
