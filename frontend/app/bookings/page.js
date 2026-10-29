'use client'; // form + state
// =============================================================================
// MY BOOKING / E-VOUCHER
// Guests find a booking with reference + email (no account needed).
// The confirmation email and payment providers link here with
// ?ref=PT-XXXX&email=... so the voucher opens straight away.
//
// Features: QR code for check-in, meeting point, what to bring, price
// breakdown, print / save as PDF, add to calendar (.ics), change date
// (policy-checked) and cancel (refund per policy).
// After a live payment (?paid=1) we poll briefly until the provider's
// webhook has confirmed the booking.
// =============================================================================
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { track } from '@/lib/analytics';
import { usePrefs } from '@/components/Providers';
import AvailabilityCalendar from '@/components/AvailabilityCalendar';
import Icon from '@/components/Icons';

// Builds a calendar file so the trip lands in Google/Apple/Outlook calendars.
// Times are "floating" (no time zone) = the local time at the destination.
function downloadIcs(booking, tour) {
  const dt = `${booking.date.replaceAll('-', '')}T${booking.time.replace(':', '')}00`;
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Pulse Trips//Booking//EN', 'BEGIN:VEVENT',
    `UID:${booking.reference}@pulsetrips`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART:${dt}`, `SUMMARY:${tour.name} (${booking.reference})`,
    `LOCATION:${tour.meetingPoint.name}`, `DESCRIPTION:Meet: ${tour.meetingPoint.note} Ref ${booking.reference}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = `${booking.reference}.ics`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function BookingsInner() {
  const { t, money } = usePrefs();
  const params = useSearchParams();
  const [form, setForm] = useState({ reference: params.get('ref') || '', email: params.get('email') || '' });
  const [voucher, setVoucher] = useState(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  // Reschedule state
  const [moving, setMoving] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [newTime, setNewTime] = useState('');

  const load = useCallback(async (reference, email) => {
    setError('');
    try {
      const { voucher: v } = await api.getVoucher(reference.trim(), email.trim());
      setVoucher(v);
      return v;
    } catch (err) { setVoucher(null); setError(err.message); return null; }
  }, []);

  // Auto-open from email / payment links. After live payment, poll until confirmed.
  useEffect(() => {
    const ref = params.get('ref'), email = params.get('email');
    if (!ref || !email) return;
    let tries = 0, timer;
    const paid = params.get('paid') === '1';
    if (paid) setInfo(t('manage.paid'));
    const run = async () => {
      const v = await load(ref, email);
      if (paid && v?.booking.status === 'pending' && tries++ < 10) { timer = setTimeout(run, 3000); return; }
      if (paid && v?.booking.status === 'confirmed') {
        setInfo('');
        // GA4 purchase for live payments (demo payments are tracked in the booking panel).
        const key = `pt_purchase_${v.booking.reference}`;
        try {
          if (!sessionStorage.getItem(key)) {
            sessionStorage.setItem(key, '1');
            track('purchase', { slug: v.booking.slug, transaction_id: v.booking.reference, value: v.booking.total, currency: v.booking.currency });
          }
        } catch { /* ignore */ }
      }
    };
    run();
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function find(e) {
    e.preventDefault();
    setBusy(true); await load(form.reference, form.email); setBusy(false);
  }

  async function cancel() {
    if (!window.confirm(t('manage.confirmCancel'))) return;
    setBusy(true);
    try {
      const { booking } = await api.cancelBooking(voucher.booking.reference, voucher.booking.email);
      setVoucher({ ...voucher, booking });
      setInfo(t('manage.refund', { amount: money(booking.refund.amount, booking.currency), p: booking.refund.percent }));
    } catch (err) { setError(err.message); }
    setBusy(false);
  }

  async function pickDate(d) {
    setNewDate(d); setNewTime('');
    const { slots: list } = await api.getSlots(voucher.booking.slug, d);
    setSlots(list.filter((s) => s.status !== 'closed' && s.status !== 'soldout'));
    if (list[0]) setNewTime(list.find((s) => s.status !== 'closed' && s.status !== 'soldout')?.time || '');
  }

  async function reschedule() {
    setBusy(true); setError('');
    try {
      const { booking } = await api.rescheduleBooking(voucher.booking.reference, voucher.booking.email, newDate, newTime);
      setVoucher({ ...voucher, booking });
      setMoving(false);
      setInfo(`${booking.date} · ${booking.time}`);
    } catch (err) { setError(err.message); }
    setBusy(false);
  }

  const b = voucher?.booking;
  const tour = voucher?.tour;

  return (
    <div className="wrap section narrow">
      <h1>{t('manage.title')}</h1>

      {!voucher && (
        <>
          <p className="muted">{t('manage.sub')}</p>
          <form className="card form-card" onSubmit={find}>
            <label className="field">{t('manage.ref')}<input required placeholder="PT-4F9A2C" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value.toUpperCase() })} /></label>
            <label className="field">{t('book.email')}<input required type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            <button className="btn" disabled={busy}>{t('manage.find')}</button>
          </form>
        </>
      )}

      {info && <p className="notice notice-ok" role="status">{info}</p>}
      {error && <p className="notice notice-err" role="alert">{error}</p>}

      {b && tour && (
        <article className="voucher">
          {/* ---- Voucher header with brand gradient ---- */}
          <header className="voucher-head">
            <div>
              <span className={`status status-${b.status}`}>{t(`manage.status.${b.status}`)}</span>
              <h2>{tour.name}</h2>
              <p>{b.date} · {b.time} · {tour.durationLabel}</p>
            </div>
            <img src="/logo-256.jpg" alt="Pulse Trips" width="56" height="56" className="voucher-logo" />
          </header>

          <div className="voucher-body">
            {/* ---- QR + reference ---- */}
            <div className="voucher-qr">
              {b.status === 'confirmed' && <img src={voucher.qr} alt={`Check-in QR code for ${b.reference}`} width="200" height="200" />}
              <p className="ref-big">{b.reference}</p>
              {b.status === 'confirmed' && <p className="small muted">{t('manage.showQr')}</p>}
            </div>

            {/* ---- Trip details ---- */}
            <div className="voucher-details">
              <h3><Icon name="users" size={18} /> {t('manage.guests')}</h3>
              <p>{b.name} · {b.adults} {t('book.adults').toLowerCase()}{b.children ? `, ${b.children} ${t('book.children').toLowerCase()}` : ''}{b.isPrivate ? ` · ${t('tour.private')}` : ''}</p>

              <h3><Icon name="pin" size={18} /> {t('manage.meeting')}</h3>
              <p><b>{tour.meetingPoint.name}</b><br />{tour.meetingPoint.note}<br />
                <a className="link-strong" target="_blank" rel="noopener" href={`https://www.google.com/maps?q=${tour.meetingPoint.lat},${tour.meetingPoint.lng}`}>{t('tour.openMaps')}</a></p>

              <h3><Icon name="info" size={18} /> {t('manage.prep')}</h3>
              <ul className="plain">{voucher.prepTips.map((x) => <li key={x}>{x}</li>)}</ul>

              <h3><Icon name="check" size={18} /> {t('manage.bring')}</h3>
              <ul className="pill-list">{tour.whatToBring.map((x) => <li key={x}>{x}</li>)}</ul>

              <h3><Icon name="tag" size={18} /> {t('manage.price')}</h3>
              <div className="quote">
                {b.price.lines.map((l, i) => <div key={i} className={`quote-line ${l.amount < 0 ? 'discount' : ''}`}><span>{l.label}</span><span>{money(l.amount, b.currency)}</span></div>)}
                <div className="quote-total"><span>{t('book.total')}</span><b>{money(b.total, b.currency)}</b></div>
              </div>
            </div>
          </div>

          {/* ---- Actions (hidden when printing) ---- */}
          <footer className="voucher-actions no-print">
            <button className="btn btn-outline btn-sm" onClick={() => window.print()}><Icon name="print" size={16} /> {t('manage.print')}</button>
            {b.status === 'confirmed' && <button className="btn btn-outline btn-sm" onClick={() => downloadIcs(b, tour)}><Icon name="calendar" size={16} /> {t('manage.calendar')}</button>}
            {b.status === 'confirmed' && !b.rescheduleCount && <button className="btn btn-outline btn-sm" onClick={() => setMoving(!moving)}><Icon name="calendar" size={16} /> {t('manage.reschedule')}</button>}
            {(b.status === 'confirmed' || b.status === 'pending') && <button className="btn btn-danger btn-sm" onClick={cancel} disabled={busy}>{t('manage.cancel')}</button>}
          </footer>

          {moving && (
            <section className="voucher-move no-print">
              <h3>{t('manage.newDate')}</h3>
              <AvailabilityCalendar slug={b.slug} value={newDate} onSelect={pickDate} />
              {newDate && (
                <div className="slots">
                  {slots.map((s) => (
                    <label key={s.time} className={`slot ${newTime === s.time ? 'on' : ''}`}>
                      <input type="radio" name="newtime" checked={newTime === s.time} onChange={() => setNewTime(s.time)} />
                      <b>{s.time}</b><span className={`slot-seats s-${s.status}`}>{t('book.seatsLeft', { n: s.seatsLeft })}</span>
                    </label>
                  ))}
                </div>
              )}
              <button className="btn" disabled={!newDate || !newTime || busy} onClick={reschedule}>{t('manage.saveDate')}</button>
              <p className="small muted"><Link href="/policies" className="link-strong">{t('tour.readPolicy')}</Link></p>
            </section>
          )}
        </article>
      )}
    </div>
  );
}

// useSearchParams() must sit inside a Suspense boundary in the App Router.
export default function BookingsPage() {
  return <Suspense fallback={<div className="wrap section">…</div>}><BookingsInner /></Suspense>;
}
