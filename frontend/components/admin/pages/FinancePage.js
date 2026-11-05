'use client';
// FINANCE: revenue / payouts / pending / refunds, revenue area chart, collection donut and the transactions table.
import { useMemo, useState } from 'react';
import { Banknote, CircleDollarSign, Download, Hourglass, RotateCcw, Search } from 'lucide-react';
import { useAdmin } from '../AdminContext';
import { dailySeries, downloadCsv, financeTotals, monthlyKpis, providerLabel, refundUsd } from '@/lib/admin-stats';
import { MOCK_PAYOUTS } from '@/lib/admin-mock';
import { formatAmount } from '@/lib/money';
import Stagger from '../Stagger';
import StatsCard from '../StatsCard';
import ChartCard from '../ChartCard';
import DataTable from '../DataTable';
import FilterChips from '../FilterChips';
import StatusBadge from '../StatusBadge';
import PageHeader, { secondaryBtn } from '../PageHeader';
import { CardSkeleton } from '../Skeleton';
import { Donut, RevenueArea, usd } from '../charts';
import { bookingsCsv } from './OverviewPage';

// One display status per booking for the money view.
const moneyStatus = (b) => (b.status === 'confirmed' ? 'paid' : refundUsd(b) > 0 ? 'refunded' : b.status);

export default function FinancePage() {
  const { bookings, loading } = useAdmin();
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');

  const totals = useMemo(() => (bookings ? financeTotals(bookings) : null), [bookings]);
  const kpi = useMemo(() => (bookings ? monthlyKpis(bookings) : null), [bookings]);
  const daily = useMemo(() => (bookings ? dailySeries(bookings, 30) : []), [bookings]);
  const payouts = MOCK_PAYOUTS.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amountUsd, 0);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (bookings || [])
      .map((b) => ({ ...b, ms: moneyStatus(b) }))
      .filter((b) => (filter === 'all' || b.ms === filter) && (!needle || [b.reference, b.name, b.email, b.tourName].some((v) => String(v).toLowerCase().includes(needle))));
  }, [bookings, filter, q]);
  const count = (s) => (bookings || []).filter((b) => moneyStatus(b) === s).length;

  const donut = totals ? [{ name: 'Collected', value: totals.revenue }, { name: 'Pending', value: totals.pending }, { name: 'Refunded', value: totals.refunds }].filter((d) => d.value > 0) : [];

  return (
    <>
      <PageHeader title="Finance" subtitle="Money in, money waiting and money returned. All figures are in USD.">
        <button type="button" className={secondaryBtn} disabled={!rows.length} onClick={() => downloadCsv('pulse-trips-transactions.csv', bookingsCsv(rows))}><Download size={16} aria-hidden="true" /> Export transactions</button>
      </PageHeader>

      {!bookings ? (
        <div className="grid grid-cols-1 gap-4" aria-busy="true"><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <CardSkeleton key={i} className="h-40" />)}</div><CardSkeleton className="h-80" /></div>
      ) : (
        <Stagger className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatsCard icon={CircleDollarSign} tone="cyan" title="Revenue (confirmed)" value={usd(totals.revenue)} change={kpi.revenueChange} />
            <StatsCard icon={Banknote} tone="emerald" title="Payouts" value={usd(payouts)} hint="Sample data: payouts are not connected yet"
              badge={<span className="rounded-full bg-amber-400/25 px-2 py-0.5 text-[11px] font-semibold text-amber-100">Sample</span>} />
            <StatsCard icon={Hourglass} tone="amber" title="Pending" value={usd(totals.pending)} hint="Held seats waiting for payment" />
            <StatsCard icon={RotateCcw} tone="rose" title="Refunds" value={usd(totals.refunds)} hint="Returned to guests" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard className="lg:col-span-2" title="Revenue, last 30 days" subtitle="Confirmed bookings per day"><RevenueArea data={daily} /></ChartCard>
            <ChartCard title="Collection" subtitle="Collected vs waiting vs refunded">
              <Donut data={donut} centerValue={`${totals.collectedPct}%`} centerLabel="collected" valueLabel={usd} />
            </ChartCard>
          </div>

          <ChartCard title="Transactions" subtitle={`${rows.length} of ${bookings.length} bookings`}
            actions={
              <div className="relative w-full sm:w-64">
                <label htmlFor="fin-search" className="sr-only">Search transactions</label>
                <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
                <input id="fin-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reference, guest, tour"
                  className="h-10 w-full rounded-xl border border-white/20 bg-white/10 pl-9 pr-3 text-sm text-white outline-none transition hover:border-white/40 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/20" />
              </div>
            }>
            <div className="mb-4">
              <FilterChips label="Transaction status" value={filter} onChange={setFilter} options={[
                { value: 'all', label: 'All', count: bookings.length }, { value: 'paid', label: 'Paid', count: count('paid') }, { value: 'pending', label: 'Pending', count: count('pending') },
                { value: 'refunded', label: 'Refunded', count: count('refunded') }, { value: 'cancelled', label: 'Cancelled', count: count('cancelled') }, { value: 'expired', label: 'Expired', count: count('expired') },
              ]} />
            </div>
            <DataTable caption="Transactions" rows={rows} rowKey={(b) => b.reference} pageSize={8} empty="No transactions match."
              columns={[
                { key: 'createdAt', header: 'Date', render: (b) => new Date(b.createdAt).toLocaleDateString('en-GB', { dateStyle: 'medium' }), sortValue: (b) => b.createdAt },
                { key: 'reference', header: 'Reference', className: 'whitespace-nowrap', render: (b) => <code className="text-cyan-100">{b.reference}</code> },
                { key: 'name', header: 'Guest', render: (b) => <><span className="font-medium">{b.name}</span><span className="block text-xs text-white/70">{b.email}</span></> },
                { key: 'tourName', header: 'Tour' },
                { key: 'method', header: 'Method', sortValue: (b) => `${b.payment?.provider}`, render: (b) => <span className="text-white/85">{providerLabel(b)}</span> },
                { key: 'totalUsd', header: 'Amount', align: 'right', render: (b) => <><span className="font-semibold">{formatAmount(b.total, b.currency, 'en')}</span>{b.currency !== 'USD' && <span className="block text-xs text-white/70">{usd(b.totalUsd)}</span>}</> },
                { key: 'ms', header: 'Status', render: (b) => <StatusBadge status={b.ms} /> },
              ]} />
          </ChartCard>
        </Stagger>
      )}
    </>
  );
}
