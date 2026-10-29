'use client'; // runs in the browser: it reacts to clicks and typing
// =============================================================================
// BOOKING PANEL (checkout)
// Three short steps on one card, revealed progressively:
//   1. Date (live calendar) + departure time (seats left per slot)
//   2. Guests (adult/child), private option, add-ons, promo code
//   3. Guest details, special requirements, payment method, policy
//
// • Prices: the SERVER quotes every change (POST /api/quote). We only display.
// • Real time: an EventSource listens to /api/availability/stream; when anyone
//   books or cancels this tour, the calendar and slots refresh instantly.
// • Payment: demo mode confirms instantly; live mode redirects to Stripe or
//   Flutterwave's secure hosted page and comes back to /bookings.
// • Analytics: begin_checkout, add_payment_info and purchase (GA4 names).
// =============================================================================
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { track } from '@/lib/analytics';
import { usePrefs } from './Providers';
import AvailabilityCalendar from './AvailabilityCalendar';
import Icon from './Icons';
import MomoPay from './MomoPay';

// Accessible − / + number control.
function Stepper({ label, hint, value, min, max, onChange }) {
  return (
    <div className="stepper">
      <div><b>{label}</b>{hint && <small>{hint}</small>}</div>
      <div className="stepper-ctrl">
        <button type="button" className="icon-btn" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`${label} −1`}><Icon name="minus" size={18} /></button>
        <output aria-live="polite" aria-label={label}>{value}</output>
        <button type="button" className="icon-btn" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`${label} +1`}><Icon name="plus" size={18} /></button>
      </div>
    </div>
  );
}

const METHODS = [
  { id: 'card', icon: 'card', title: 'book.card', sub: 'book.cardSub' },
  { id: 'wallet', icon: 'wallet', title: 'book.wallet', sub: 'book.walletSub' },
  { id: 'mobile_money', icon: 'mobile', title: 'book.mobile', sub: 'book.mobileSub' },
];

export default function BookingPanel({ tour, addons }) {
  const { t, lang, currency, money, priceUsd } = usePrefs();

  // --- Trip selection -------------------------------------------------------------
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState(null);       // departures on the chosen date
  const [time, setTime] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [isPrivate, setIsPrivate] = useState(false);
  const [picked, setPicked] = useState([]);       // add-on ids
  const [promoInput, setPromoInput] = useState('');
  const [promoCode, setPromoCode] = useState('');
  // --- Guest & payment ----------------------------------------------------------------
  const [guest, setGuest] = useState({ name: '', email: '', phone: '', notes: '' });
  const [method, setMethod] = useState('card');
  const [acceptPolicy, setAcceptPolicy] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  // --- Server data & UI state -----------------------------------------------------
  const [quote, setQuote] = useState(null);
  const [demo, setDemo] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // bumps on real-time updates
  const [status, setStatus] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState('');           // '' | 'booking' | 'redirect'
  const [done, setDone] = useState(null);         // { booking, qr }
  const [momo, setMomo] = useState(null);         // booking waiting for a MoMo QR payment
  const startedRef = useRef(false);               // begin_checkout sent once
  const dateRef = useRef('');
  dateRef.current = date;

  const allowChildren = tour.minAge < 12; // 12+/18+ experiences have one adult rate
  const slot = slots?.find((s) => s.time === time);
  const maxGuests = isPrivate ? tour.maxGuests : Math.min(tour.maxGuests, slot?.seatsLeft ?? tour.maxGuests);

  // Load departures for a date (and keep the chosen time if still bookable).
  async function loadSlots(d) {
    try {
      const { slots: list } = await api.getSlots(tour.slug, d);
      setSlots(list);
      setTime((cur) => {
        const ok = (s) => s.status !== 'closed' && s.status !== 'soldout';
        if (list.find((s) => s.time === cur && ok(s))) return cur;
        return list.find(ok)?.time || ''; // auto-select the first open departure
      });
    } catch (e) { setStatus({ type: 'error', text: e.message }); }
  }

  function chooseDate(d) {
    setDate(d); setSlots(null); setStatus({ type: '', text: '' });
    loadSlots(d);
    if (!startedRef.current) {
      startedRef.current = true;
      track('begin_checkout', { slug: tour.slug, currency, items: [{ item_id: tour.slug, item_name: tour.name }] });
    }
  }

  // --- Real-time availability (Server-Sent Events) ------------------------------
  useEffect(() => {
    if (typeof EventSource === 'undefined') return;
    const es = new EventSource(api.streamUrl(tour.slug));
    es.addEventListener('availability', (e) => {
      const msg = JSON.parse(e.data);
      setRefreshKey((k) => k + 1);                      // calendar re-fetches its month
      if (msg.date === dateRef.current) loadSlots(msg.date); // slots for the open date
    });
    return () => es.close(); // close when leaving the page
  }, [tour.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  // Payment mode (demo notice) + "payment cancelled" message after a provider redirect.
  useEffect(() => {
    api.paymentConfig().then((c) => setDemo(c.demo)).catch(() => {});
    if (new URLSearchParams(window.location.search).get('payment') === 'cancelled') {
      setStatus({ type: 'warn', text: t('book.paymentCancelled') });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep guest counts inside the seats available.
  useEffect(() => {
    if (adults + children > maxGuests) { setChildren(Math.max(0, maxGuests - adults)); setAdults(Math.min(adults, maxGuests)); }
  }, [maxGuests]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Live server quote (debounced so typing doesn't spam the API) -------------
  useEffect(() => {
    if (!date) { setQuote(null); return; }
    const id = setTimeout(() => {
      api.getQuote({ slug: tour.slug, date, adults, children, isPrivate, addonIds: picked, promoCode, currency })
        .then((r) => setQuote(r.quote))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(id);
  }, [tour.slug, date, adults, children, isPrivate, picked, promoCode, currency]);

  const toggleAddon = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  // --- Submit -------------------------------------------------------------------------
  async function submit(e) {
    e.preventDefault();
    if (!time) return setStatus({ type: 'error', text: t('book.departures') });
    setBusy('booking'); setStatus({ type: '', text: '' });
    track('add_payment_info', { slug: tour.slug, payment_type: method, currency, value: quote?.total });
    try {
      const { booking, redirectUrl } = await api.createBooking({
        slug: tour.slug, date, time, adults, children, isPrivate, addonIds: picked, promoCode,
        currency, method, acceptPolicy, marketingOptIn, language: lang, ...guest,
      });
      if (booking.payment?.provider === 'momo_qr') {
        // MTN MoMo pay code: show our QR and the exact amount; staff confirm the payment later.
        setMomo(booking);
        setBusy('');
        return;
      }
      if (redirectUrl) {
        // Live payment: the provider's page collects card / wallet / mobile-money details.
        setBusy('redirect');
        window.location.href = redirectUrl;
        return;
      }
      // Demo mode: already confirmed. Show the instant voucher.
      track('purchase', { slug: tour.slug, transaction_id: booking.reference, value: booking.total, currency: booking.currency, items: [{ item_id: tour.slug, item_name: tour.name }] });
      const { voucher } = await api.getVoucher(booking.reference, booking.email).catch(() => ({ voucher: null }));
      setDone({ booking, qr: voucher?.qr });
      setBusy('');
    } catch (err) {
      setStatus({ type: 'error', text: err.message }); // e.g. "Only 2 seat(s) left on that departure."
      setBusy('');
      loadSlots(date); // show the fresh seat count
    }
  }

  // --- MoMo QR payment screen -------------------------------------------------------
  if (momo) {
    return <MomoPay booking={momo} onAnother={() => { setMomo(null); setDate(''); setSlots(null); setTime(''); startedRef.current = false; }} />;
  }

  // --- Success view -----------------------------------------------------------------
  if (done) {
    const { booking, qr } = done;
    const voucherHref = `/bookings?ref=${booking.reference}&email=${encodeURIComponent(booking.email)}`;
    return (
      <div className="booking-card success-card" id="book" role="status">
        <div className="success-icon"><Icon name="check" size={30} strokeWidth={2.5} /></div>
        <h2>{t('book.confirmed')}</h2>
        <p>{t('book.confirmedSub', { email: booking.email })}</p>
        <p className="ref-big">{booking.reference}</p>
        {qr && <img src={qr} alt={`QR code for booking ${booking.reference}`} width="160" height="160" className="qr" />}
        <p className="muted small">{booking.date} · {booking.time} · {money(booking.total, booking.currency)}</p>
        <Link href={voucherHref} className="btn btn-block">{t('book.viewVoucher')}</Link>
        <button className="btn btn-ghost btn-block" onClick={() => { setDone(null); setDate(''); setSlots(null); setTime(''); startedRef.current = false; }}>{t('book.another')}</button>
      </div>
    );
  }

  // --- Checkout form ------------------------------------------------------------------
  const showStep2 = Boolean(date && time);
  return (
    <form className="booking-card" id="book" onSubmit={submit} aria-labelledby="book-title">
      <div className="booking-head">
        <div>
          <span className="price-from">{t('card.from')}</span>{' '}
          <b className="price-lg">{priceUsd(tour.pricing.adult)}</b>{' '}
          <span className="price-unit">{t('card.perAdult')}</span>
        </div>
        <span className="live-pill"><span className="pulse-dot" aria-hidden="true" />{t('book.live')}</span>
      </div>
      <h2 id="book-title" className="sr-only">{t('book.title')}</h2>

      {/* ---------- STEP 1: date & departure ---------- */}
      <fieldset className="step">
        <legend><span className="step-n">1</span>{t('book.step1')}</legend>
        <AvailabilityCalendar slug={tour.slug} value={date} onSelect={chooseDate} refreshKey={refreshKey} />
        {date && (
          <div className="slots" role="radiogroup" aria-label={t('book.departures')}>
            {slots === null ? <p className="muted small">{t('common.loading')}</p>
              : slots.length === 0 ? <p className="muted small">{t('book.noDepartures')}</p>
                : slots.map((s) => {
                  const open = s.status === 'available' || s.status === 'limited';
                  return (
                    <label key={s.time} className={`slot ${time === s.time ? 'on' : ''} ${open ? '' : 'off'}`}>
                      <input type="radio" name="time" value={s.time} checked={time === s.time} disabled={!open} onChange={() => setTime(s.time)} />
                      <b>{s.time}</b>
                      <span className={`slot-seats s-${s.status}`}>{open ? t('book.seatsLeft', { n: s.seatsLeft }) : t('book.soldOut')}</span>
                    </label>
                  );
                })}
          </div>
        )}
      </fieldset>

      {/* ---------- STEP 2: guests & extras ---------- */}
      {showStep2 && (
        <fieldset className="step">
          <legend><span className="step-n">2</span>{t('book.step2')}</legend>
          <Stepper label={t('book.adults')} value={adults} min={1} max={maxGuests - children} onChange={setAdults} />
          {allowChildren && <Stepper label={t('book.children')} hint={t('book.childAge')} value={children} min={0} max={maxGuests - adults} onChange={setChildren} />}

          {/* Private tours need an empty departure */}
          {slot && slot.seatsLeft === tour.maxGuests && (
            <label className="check-row">
              <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
              <span><b>{t('book.private')}</b> · {priceUsd(tour.pricing.privateFlat)}<small>{t('book.privateNote', { n: tour.maxGuests })}</small></span>
            </label>
          )}

          {addons.length > 0 && (
            <div className="addons">
              <p className="mini-title">{t('book.addons')}</p>
              {addons.map((a) => (
                <label key={a.id} className="check-row">
                  <input type="checkbox" checked={picked.includes(a.id)} onChange={() => toggleAddon(a.id)} />
                  <span>{a.label}<small>{priceUsd(a.price)} {a.per === 'person' ? t('book.perPerson') : t('book.perBooking')}</small></span>
                </label>
              ))}
            </div>
          )}

          {/* Promo code (e.g. WELCOME10 from the newsletter) */}
          <div className="promo-row">
            <label className="sr-only" htmlFor="promo">{t('book.promo')}</label>
            <input id="promo" placeholder={t('book.promo')} value={promoInput} onChange={(e) => setPromoInput(e.target.value.toUpperCase())} autoComplete="off" />
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setPromoCode(promoInput.trim())} disabled={!promoInput.trim()}>{t('book.apply')}</button>
          </div>
          {quote?.promo === 'applied' && <p className="ok-text small"><Icon name="tag" size={14} /> {t('book.promoOk')}</p>}
          {quote?.promo === 'invalid' && <p className="err-text small">{t('book.promoBad')}</p>}
        </fieldset>
      )}

      {/* ---------- Price breakdown (from the server) ---------- */}
      {showStep2 && quote && (
        <div className="quote" aria-live="polite">
          {quote.lines.map((l, i) => (
            <div key={i} className={`quote-line ${l.amount < 0 ? 'discount' : ''}`}><span>{l.label}</span><span>{money(l.amount, quote.currency)}</span></div>
          ))}
          <div className="quote-total"><span>{t('book.total')}</span><b>{money(quote.total, quote.currency)}</b></div>
          <p className="tiny muted">{t('book.priceNote')}</p>
        </div>
      )}

      {/* ---------- STEP 3: details & payment ---------- */}
      {showStep2 && (
        <fieldset className="step">
          <legend><span className="step-n">3</span>{t('book.step3')}</legend>
          <label className="field">{t('book.name')}<input required autoComplete="name" value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} /></label>
          <label className="field">{t('book.email')}<input required type="email" autoComplete="email" value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} /></label>
          <label className="field">{t('book.phone')} <span className="opt">({t('common.optional')})</span>
            <input type="tel" autoComplete="tel" inputMode="tel" placeholder="+254 700 000 000" value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} />
            <small>{t('book.phoneHint')}</small>
          </label>
          <label className="field">{t('book.notes')} <span className="opt">({t('common.optional')})</span>
            <textarea rows={2} maxLength={500} placeholder={t('book.notesHint')} value={guest.notes} onChange={(e) => setGuest({ ...guest, notes: e.target.value })} />
          </label>

          <div className="pay-methods" role="radiogroup" aria-label={t('book.payment')}>
            <p className="mini-title">{t('book.payment')}</p>
            {METHODS.map((m) => (
              <label key={m.id} className={`pay-method ${method === m.id ? 'on' : ''}`}>
                <input type="radio" name="method" value={m.id} checked={method === m.id} onChange={() => setMethod(m.id)} />
                <Icon name={m.icon} size={22} />
                <span><b>{t(m.title)}</b><small>{t(m.sub)}</small></span>
              </label>
            ))}
          </div>
          {demo && <p className="notice notice-warn small"><Icon name="info" size={16} /> {t('book.demo')}</p>}

          <label className="check-row">
            <input type="checkbox" required checked={acceptPolicy} onChange={(e) => setAcceptPolicy(e.target.checked)} />
            <span>{t('book.accept', { link: '' })}<Link href="/policies" target="_blank" className="link-strong">{t('book.policyLink')}</Link></span>
          </label>
          <label className="check-row">
            <input type="checkbox" checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)} />
            <span>{t('book.optIn')}</span>
          </label>

          <button className="btn btn-lg btn-block" disabled={Boolean(busy) || !quote}>
            {busy === 'booking' ? t('book.processing') : busy === 'redirect' ? t('book.redirecting')
              : <><Icon name="lock" size={18} /> {t('book.pay', { total: quote ? money(quote.total, quote.currency) : '' })}</>}
          </button>
          <p className="tiny muted center"><Icon name="shield" size={14} /> {t('book.secure')}</p>
        </fieldset>
      )}

      {status.text && <p className={`notice ${status.type === 'error' ? 'notice-err' : 'notice-warn'}`} role="alert">{status.text}</p>}
    </form>
  );
}
