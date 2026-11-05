'use client';
// BOOKINGS: searchable list of every booking. Same API calls and MoMo confirm/reject logic as before.
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, Download, Search, X } from 'lucide-react';
import { api } from '@/lib/api';
import { formatAmount } from '@/lib/money';
import { downloadCsv, methodLabel, providerLabel } from '@/lib/admin-stats';
import { useConfirm } from '@/components/ConfirmDialog';
import { useAdmin } from '../AdminContext';
import GlassCard from '../GlassCard';
import Stagger from '../Stagger';
import DataTable from '../DataTable';
import FilterChips from '../FilterChips';
import StatusBadge from '../StatusBadge';
import PageHeader, { secondaryBtn } from '../PageHeader';
import { bookingsCsv } from './OverviewPage';

export default function BookingsPage() {
  const { token, reload } = useAdmin();
  const confirm = useConfirm();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [status, setStatus] = useState(params.get('status') || '');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [again, setAgain] = useState(0);

  // The top-bar search and the notification bell link here with ?q= and ?status=.
  useEffect(() => { setQ(params.get('q') || ''); setStatus(params.get('status') || ''); }, [params]);

  useEffect(() => {
    const id = setTimeout(() => api.admin.bookings(token, { q, status }).then((d) => setRows(d.bookings)).catch((e) => setError(e.message)), 250);
    return () => clearTimeout(id);
  }, [token, q, status, again]);

  // MoMo QR bookings are paid outside the site: staff compare the MoMo statement, then confirm or reject here.
  const decide = useCallback(async (b, accept) => {
    const due = `RWF ${b.payment.momo.amountRwf.toLocaleString('en')}`;
    const ok = await confirm(accept
      ? { title: 'Confirm this payment?', message: `Confirm that ${due} arrived for ${b.reference}. The guest gets their voucher by email and SMS.`, confirmLabel: 'Yes, payment received', cancelLabel: 'Not yet' }
      : { title: 'Reject this booking?', message: `${b.reference} will be cancelled and its seats freed for other guests.`, confirmLabel: 'Reject booking', cancelLabel: 'Keep it', tone: 'danger' });
    if (!ok) return;
    setError(''); setNotice('');
    try {
      await (accept ? api.admin.confirmPayment : api.admin.rejectPayment)(token, b.reference);
      setNotice(accept ? `${b.reference} confirmed. The voucher was sent.` : `${b.reference} rejected and the seats were freed.`);
      setAgain((n) => n + 1); reload();
    } catch (e) { setError(e.message); }
  }, [token, reload, confirm]);

  const columns = [
    { key: 'reference', header: 'Ref', className: 'whitespace-nowrap', render: (b) => <code className="text-cyan-100">{b.reference}</code> },
    { key: 'name', header: 'Guest', render: (b) => <><span className="font-medium">{b.name}</span><span className="block text-xs text-white/70">{b.email}</span></> },
    { key: 'tourName', header: 'Tour', render: (b) => <>{b.tourName}{b.isPrivate && <span className="ml-2 rounded-full bg-white/15 px-2 py-0.5 text-xs">private</span>}</> },
    { key: 'date', header: 'Departure', sortValue: (b) => `${b.date} ${b.time}`, render: (b) => `${b.date} ${b.time}` },
    { key: 'pax', header: 'Pax', align: 'right', sortValue: (b) => b.adults + b.children, render: (b) => b.adults + b.children },
    { key: 'total', header: 'Total', align: 'right', sortValue: (b) => b.totalUsd, render: (b) => formatAmount(b.total, b.currency, 'en') },
    {
      key: 'payment', header: 'Payment', sortable: false, className: 'min-w-[14rem]',
      render: (b) => (
        <div className="text-xs">
          <span className="text-white/80">{providerLabel(b)} · {methodLabel(b)}</span>
          {b.payment?.provider === 'momo_qr' && (
            <>
              <span className="mt-0.5 block">Due: <b>RWF {b.payment.momo.amountRwf.toLocaleString('en')}</b></span>
              <span className="block text-white/75">{b.payment.proof ? <>ID: <code className="text-cyan-100">{b.payment.proof.transactionId}</code>{b.payment.proof.payerPhone && ` · ${b.payment.proof.payerPhone}`}</> : 'no transaction ID yet'}</span>
              {b.status !== 'confirmed' && b.status !== 'cancelled' && (
                <span className="mt-2 flex gap-2">
                  <button type="button" onClick={() => decide(b, true)} className="inline-flex min-h-[34px] items-center gap-1 rounded-lg bg-emerald-500/80 px-3 text-xs font-semibold text-white transition hover:bg-emerald-400 active:scale-95"><Check size={14} aria-hidden="true" /> Confirm paid</button>
                  <button type="button" onClick={() => decide(b, false)} className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-rose-300/50 bg-rose-400/15 px-3 text-xs font-semibold text-rose-100 transition hover:bg-rose-400/30 active:scale-95"><X size={14} aria-hidden="true" /> Reject</button>
                </span>
              )}
            </>
          )}
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (b) => <span className="flex flex-wrap gap-1.5"><StatusBadge status={b.status} />{b.checkedInAt && <StatusBadge status="checked in" />}</span> },
  ];

  return (
    <>
      <PageHeader title="Bookings" subtitle="Every booking, newest first. Confirm MoMo payments once you see the money.">
        <button type="button" className={secondaryBtn} disabled={!rows?.length} onClick={() => downloadCsv('pulse-trips-bookings.csv', bookingsCsv(rows))}><Download size={16} aria-hidden="true" /> Export CSV</button>
      </PageHeader>
      <Stagger>
        <GlassCard className="p-5" hover={false}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <FilterChips label="Booking status" value={status} onChange={setStatus} options={[{ value: '', label: 'All' }, ...['confirmed', 'pending', 'cancelled', 'expired'].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))]} />
            <div className="relative w-full sm:w-72">
              <label htmlFor="bk-search" className="sr-only">Search reference, name or email</label>
              <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
              <input id="bk-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reference, name or email"
                className="h-10 w-full rounded-xl border border-white/20 bg-white/10 pl-9 pr-3 text-sm text-white outline-none transition hover:border-white/40 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/20" />
            </div>
          </div>
          <div aria-live="polite">
            {error && <p role="alert" className="mb-3 rounded-xl bg-rose-400/20 px-4 py-2.5 text-sm text-rose-100">{error}</p>}
            {notice && <p className="mb-3 rounded-xl bg-emerald-400/20 px-4 py-2.5 text-sm text-emerald-100">{notice}</p>}
          </div>
          <DataTable caption="Bookings" columns={columns} rows={rows || []} loading={rows === null} rowKey={(b) => b.reference} pageSize={10} empty="No bookings match." />
        </GlassCard>
      </Stagger>
    </>
  );
}
