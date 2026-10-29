'use client';
// =============================================================================
// ADMIN DASHBOARD (/admin)
// Internal tools for the team, protected by ADMIN_TOKEN (backend .env).
//   • Overview  – KPIs, checkout funnel & abandonment, top tours, traffic sources
//   • Bookings  – searchable list of every booking
//   • Guests    – CRM: past bookings, special requirements, communication history, notes
//   • Tours     – edit tour cards & pages: text, real photos, prices, schedule
//   • Roster    – assign guides, drivers & vehicles to departures; weather cancel
//   • Check-in  – guides scan a voucher QR (opens /admin?checkin=PT-XXXX)
// The token is kept in sessionStorage (cleared when the tab closes).
// =============================================================================
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatAmount } from '@/lib/money';
import Icon from '@/components/Icons';
import TourEditor from '@/components/admin/TourEditor';

const TOKEN_KEY = 'pt_admin_token';
const usd = (n) => formatAmount(n, 'USD', 'en');
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
const isoDay = (offset = 0) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

// Readable names for the GA4-style funnel steps.
const STEP_LABEL = { view_item: 'Viewed a tour', begin_checkout: 'Started checkout', add_payment_info: 'Reached payment', purchase: 'Booked' };

// =============================================================================
// OVERVIEW
// =============================================================================
function Overview({ token }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.admin.overview(token).then(setData).catch((e) => setError(e.message)); }, [token]);
  if (error) return <p className="notice notice-err">{error}</p>;
  if (!data) return <p className="muted">Loading…</p>;
  const k = data.kpis;
  const top = Math.max(1, ...data.funnel.map((f) => f.sessions));

  return (
    <>
      {/* KPI stat tiles: a single number each, no chart needed */}
      <div className="kpi-grid">
        {[
          ['Revenue (confirmed)', usd(k.revenueUsd)], ['Confirmed bookings', k.confirmedBookings],
          ['Average order', usd(k.averageOrderUsd)], ['Guests next 7 days', k.guestsNext7Days],
          ['Checkout abandonment', `${data.abandonmentRate}%`], ['Newsletter subscribers', k.subscribers],
          ['Pending payment holds', k.pendingHolds], ['Cancelled', k.cancelled],
        ].map(([label, value]) => <div key={label} className="kpi"><span>{label}</span><b>{value}</b></div>)}
      </div>

      <div className="admin-two">
        {/* Funnel: one series, one brand hue, direct labels; title attr = hover tooltip */}
        <section className="card">
          <h2>Checkout funnel <small className="muted">(unique sessions)</small></h2>
          <ul className="funnel">
            {data.funnel.map((f, i) => {
              const prev = i ? data.funnel[i - 1].sessions : null;
              const conv = prev ? Math.round((f.sessions / prev) * 100) : null;
              return (
                <li key={f.step} title={`${STEP_LABEL[f.step]}: ${f.sessions} sessions${conv !== null && prev ? ` (${conv}% of previous step)` : ''}`}>
                  <span className="funnel-label">{STEP_LABEL[f.step]}</span>
                  <span className="funnel-track"><span className="funnel-bar" style={{ width: `${(f.sessions / top) * 100}%` }} /></span>
                  <span className="funnel-value">{f.sessions}{conv !== null && prev ? <small> · {conv}%</small> : null}</span>
                </li>
              );
            })}
          </ul>
          <p className="small muted">Full reports, conversions and attribution: Google Analytics 4 (set NEXT_PUBLIC_GA_ID).</p>
        </section>

        <section className="card">
          <h2>Traffic sources</h2>
          {data.sources.length ? (
            <table className="admin-table">
              <thead><tr><th scope="col">Source</th><th scope="col" className="num">Sessions</th></tr></thead>
              <tbody>{data.sources.map((s) => <tr key={s.source}><td>{s.source}</td><td className="num">{s.sessions}</td></tr>)}</tbody>
            </table>
          ) : <p className="muted">No visits recorded yet.</p>}
        </section>
      </div>

      <section className="card">
        <h2>Top-performing tours</h2>
        {data.topTours.length ? (
          <div className="table-scroll">
            <table className="admin-table">
              <thead><tr><th scope="col">Tour</th><th scope="col" className="num">Views</th><th scope="col" className="num">Bookings</th><th scope="col" className="num">Guests</th><th scope="col" className="num">Revenue</th><th scope="col" className="num">View → book</th></tr></thead>
              <tbody>
                {data.topTours.map((t) => (
                  <tr key={t.slug}>
                    <td><Link href={`/tours/${t.slug}`} className="link-strong">{t.name}</Link></td>
                    <td className="num">{t.views}</td><td className="num">{t.bookings}</td><td className="num">{t.guests}</td>
                    <td className="num">{usd(t.revenueUsd)}</td>
                    <td className="num">{t.views ? `${Math.round((t.bookings / t.views) * 100)}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="muted">No data yet.</p>}
      </section>
    </>
  );
}

// =============================================================================
// BOOKINGS
// =============================================================================
function Bookings({ token }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState([]);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState('');
  useEffect(() => {
    const id = setTimeout(() => api.admin.bookings(token, { q, status }).then((d) => setRows(d.bookings)).catch(() => {}), 250);
    return () => clearTimeout(id);
  }, [token, q, status, reload]);

  // MoMo QR bookings are paid outside the site: staff compare the MoMo statement, then confirm or reject here.
  async function decide(b, accept) {
    const due = `RWF ${b.payment.momo.amountRwf.toLocaleString('en')}`;
    const ask = accept ? `Confirm that ${due} arrived for ${b.reference}? The guest gets their voucher by email/SMS.` : `Reject ${b.reference}? The booking is cancelled and the seats are freed.`;
    if (!window.confirm(ask)) return;
    setError('');
    try { await (accept ? api.admin.confirmPayment : api.admin.rejectPayment)(token, b.reference); setReload((n) => n + 1); }
    catch (e) { setError(e.message); }
  }

  return (
    <section className="card">
      <div className="admin-filters">
        <input placeholder="Search reference, name or email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search bookings" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">All statuses</option>
          {['confirmed', 'pending', 'cancelled', 'expired'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {error && <p className="notice notice-err" role="alert">{error}</p>}
      <div className="table-scroll">
        <table className="admin-table">
          <thead><tr><th scope="col">Ref</th><th scope="col">Guest</th><th scope="col">Tour</th><th scope="col">Departure</th><th scope="col" className="num">Pax</th><th scope="col" className="num">Total</th><th scope="col">Payment</th><th scope="col">Status</th></tr></thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.reference}>
                <td><code>{b.reference}</code></td>
                <td>{b.name}<br /><small className="muted">{b.email}</small></td>
                <td>{b.tourName}{b.isPrivate && <span className="chip chip-soft">private</span>}</td>
                <td>{b.date} {b.time}</td>
                <td className="num">{b.adults + b.children}</td>
                <td className="num">{formatAmount(b.total, b.currency, 'en')}</td>
                <td>
                  <small>{b.payment?.provider} · {b.payment?.method}</small>
                  {b.payment?.provider === 'momo_qr' && (
                    <>
                      <br /><small>Due: <b>RWF {b.payment.momo.amountRwf.toLocaleString('en')}</b></small>
                      <br /><small>{b.payment.proof ? <>ID: <code>{b.payment.proof.transactionId}</code>{b.payment.proof.payerPhone && ` · ${b.payment.proof.payerPhone}`}</> : <span className="muted">no transaction ID yet</span>}</small>
                      {b.status !== 'confirmed' && b.status !== 'cancelled' && (
                        <div className="row-actions">
                          <button className="btn btn-sm" onClick={() => decide(b, true)}>Confirm paid</button>{' '}
                          <button className="btn btn-sm btn-danger" onClick={() => decide(b, false)}>Reject</button>
                        </div>
                      )}
                    </>
                  )}
                </td>
                <td><span className={`status status-${b.status}`}>{b.status}</span>{b.checkedInAt && <span className="chip chip-ok">checked in</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="muted">No bookings match.</p>}
      </div>
    </section>
  );
}

// =============================================================================
// CRM: guests, requirements, history, notes
// =============================================================================
function Guests({ token }) {
  const [q, setQ] = useState('');
  const [guests, setGuests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    const id = setTimeout(() => api.admin.guests(token, q).then((d) => setGuests(d.guests)).catch(() => {}), 250);
    return () => clearTimeout(id);
  }, [token, q]);

  const open = useCallback((email) => { setSelected(email); api.admin.guest(token, email).then(setDetail).catch(() => setDetail(null)); }, [token]);

  async function addNote(e) {
    e.preventDefault();
    await api.admin.addNote(token, selected, note);
    setNote(''); open(selected);
  }

  return (
    <div className="admin-two crm">
      <section className="card">
        <input className="admin-search" placeholder="Search guests" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search guests" />
        <ul className="guest-list">
          {guests.map((g) => (
            <li key={g.email}>
              <button className={selected === g.email ? 'on' : ''} onClick={() => open(g.email)}>
                <span className="avatar" aria-hidden="true">{(g.name || g.email)[0].toUpperCase()}</span>
                <span>
                  <b>{g.name || g.email}</b>
                  <small>{g.isLeadOnly ? 'Lead (message only)' : `${g.confirmed} trip(s) · ${usd(g.spentUsd)}`}{g.subscriber ? ' · subscriber' : ''}</small>
                </span>
                {g.requirements.length > 0 && <span className="chip chip-warn" title={g.requirements.join(' | ')}>needs</span>}
              </button>
            </li>
          ))}
          {!guests.length && <li className="muted">No guests yet.</li>}
        </ul>
      </section>

      <section className="card">
        {!detail ? <p className="muted">Select a guest to see their profile.</p> : (
          <>
            <h2>{detail.summary.name || detail.summary.email}</h2>
            <p className="muted small">{detail.summary.email} {detail.summary.phone && `· ${detail.summary.phone}`}</p>
            <div className="kpi-grid kpi-sm">
              <div className="kpi"><span>Trips</span><b>{detail.summary.confirmed}</b></div>
              <div className="kpi"><span>Lifetime value</span><b>{usd(detail.summary.spentUsd)}</b></div>
              <div className="kpi"><span>Next trip</span><b>{detail.summary.nextTrip || '—'}</b></div>
            </div>

            {detail.summary.requirements.length > 0 && (
              <div className="notice notice-warn"><b>Special requirements:</b> {detail.summary.requirements.join(' · ')}</div>
            )}

            <h3>Bookings</h3>
            <ul className="plain">
              {detail.bookings.map((b) => <li key={b.reference}><code>{b.reference}</code> {b.tourName}, {b.date} {b.time} · <span className={`status status-${b.status}`}>{b.status}</span></li>)}
            </ul>

            <h3>Communication history</h3>
            <ol className="timeline-admin">
              {detail.timeline.map((e, i) => <li key={i}><span className={`tl-type t-${e.type}`}>{e.type}</span><span>{e.text}</span><small>{fmtDate(e.at)}</small></li>)}
            </ol>

            <form onSubmit={addNote} className="note-form">
              <label className="sr-only" htmlFor="note">Internal note</label>
              <textarea id="note" rows={2} placeholder="Add an internal note (only staff can see this)" value={note} onChange={(e) => setNote(e.target.value)} required />
              <button className="btn btn-sm">Save note</button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

// =============================================================================
// ROSTER: guides, drivers, vehicles per departure
// =============================================================================
function Roster({ token }) {
  const [range, setRange] = useState({ from: isoDay(0), to: isoDay(13), all: false });
  const [deps, setDeps] = useState([]);
  const [res, setRes] = useState({ guides: [], drivers: [], vehicles: [] });
  const [drafts, setDrafts] = useState({});
  const [msg, setMsg] = useState({ id: '', type: '', text: '' });

  const load = useCallback(() => {
    api.admin.roster(token, { from: range.from, to: range.to, ...(range.all ? { all: '1' } : {}) })
      .then((d) => { setDeps(d.departures); setDrafts(Object.fromEntries(d.departures.map((x) => [x.id, x.assignment]))); })
      .catch((e) => setMsg({ id: '', type: 'error', text: e.message }));
  }, [token, range]);

  useEffect(() => { api.admin.resources(token).then(setRes).catch(() => {}); }, [token]);
  useEffect(load, [load]);

  const setDraft = (id, field, value) => setDrafts({ ...drafts, [id]: { ...drafts[id], [field]: value } });

  async function save(id) {
    try { await api.admin.assign(token, id, drafts[id]); setMsg({ id, type: 'ok', text: 'Saved' }); load(); }
    catch (e) { setMsg({ id, type: 'error', text: e.message }); } // e.g. double-booked guide
  }
  async function weatherCancel(d) {
    if (!window.confirm(`Cancel ALL ${d.manifest.length} booking(s) on ${d.tourName} ${d.date} ${d.time} for weather? Guests get a 100% refund and an email/SMS.`)) return;
    const r = await api.admin.weatherCancel(token, d.id);
    setMsg({ id: d.id, type: 'ok', text: `${r.cancelled} booking(s) cancelled and refunded` });
    load();
  }

  const select = (d, field, list, label) => (
    <label className="field field-sm">{label}
      <select value={drafts[d.id]?.[field] || ''} onChange={(e) => setDraft(d.id, field, e.target.value)}>
        <option value="">— Unassigned —</option>
        {list.map((r) => <option key={r.id} value={r.id}>{r.name}{r.seats ? ` (${r.seats} seats)` : ''}{r.languages ? ` · ${r.languages.join('/')}` : ''}</option>)}
      </select>
    </label>
  );

  return (
    <>
      <div className="card admin-filters">
        <label className="field field-sm">From<input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></label>
        <label className="field field-sm">To<input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></label>
        <label className="check-row"><input type="checkbox" checked={range.all} onChange={(e) => setRange({ ...range, all: e.target.checked })} /> <span>Show departures without guests</span></label>
      </div>
      {msg.text && !msg.id && <p className={`notice ${msg.type === 'ok' ? 'notice-ok' : 'notice-err'}`}>{msg.text}</p>}
      {!deps.length && <p className="muted">No departures with guests in this window.</p>}

      <div className="roster-grid">
        {deps.map((d) => (
          <article key={d.id} className="card roster-card">
            <header>
              <div><b>{d.tourName}</b><small>{d.date} · {d.time} · {d.durationLabel}</small></div>
              <span className="chip chip-soft">{d.guests}/{d.capacity} pax · {d.checkedIn} in</span>
            </header>
            {d.warnings.map((w) => <p key={w} className="tiny warn-text"><Icon name="info" size={14} /> {w}</p>)}

            <div className="roster-selects">
              {select(d, 'guideId', res.guides, 'Guide')}
              {select(d, 'driverId', res.drivers, 'Driver')}
              {select(d, 'vehicleId', res.vehicles, 'Vehicle')}
            </div>

            {/* Manifest: who's coming + what they need */}
            {d.manifest.length > 0 && (
              <details className="manifest">
                <summary>Guest manifest ({d.manifest.length})</summary>
                <ul className="plain">
                  {d.manifest.map((m) => (
                    <li key={m.reference}>{m.checkedIn ? '✅' : '⬜'} <b>{m.name}</b> ×{m.guests} <code>{m.reference}</code> {m.phone}
                      {m.notes && <span className="chip chip-warn">{m.notes}</span>}</li>
                  ))}
                </ul>
              </details>
            )}

            <footer>
              <button className="btn btn-sm" onClick={() => save(d.id)}>Save assignment</button>
              {d.manifest.length > 0 && <button className="btn btn-sm btn-danger" onClick={() => weatherCancel(d)}>Weather cancel</button>}
              {msg.id === d.id && <span className={msg.type === 'ok' ? 'ok-text small' : 'err-text small'}>{msg.text}</span>}
            </footer>
          </article>
        ))}
      </div>
    </>
  );
}

// =============================================================================
// CHECK-IN (QR codes on vouchers open /admin?checkin=PT-XXXX)
// =============================================================================
function CheckIn({ token, initialRef }) {
  const [ref, setRef] = useState(initialRef || '');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const run = useCallback(async (r) => {
    setError(''); setResult(null);
    try { setResult((await api.admin.checkin(token, r.trim().toUpperCase())).booking); } catch (e) { setError(e.message); }
  }, [token]);
  useEffect(() => { if (initialRef) run(initialRef); }, [initialRef, run]);

  return (
    <section className="card narrow-card">
      <h2>Guest check-in</h2>
      <p className="muted small">Scan the QR on the guest&apos;s voucher with your phone camera, or type the reference.</p>
      <form onSubmit={(e) => { e.preventDefault(); run(ref); }} className="promo-row">
        <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="PT-4F9A2C" aria-label="Booking reference" />
        <button className="btn">Check in</button>
      </form>
      {error && <p className="notice notice-err">{error}</p>}
      {result && (
        <div className="notice notice-ok">
          <b>✅ {result.name}</b>: {result.adults + result.children} guest(s), {result.tourName}, {result.date} {result.time}
          {result.notes && <p><b>Needs:</b> {result.notes}</p>}
        </div>
      )}
    </section>
  );
}

// =============================================================================
// SHELL: login + tabs
// =============================================================================
const TABS = [['overview', 'Overview'], ['tours', 'Tours'], ['bookings', 'Bookings'], ['guests', 'Guests (CRM)'], ['roster', 'Roster'], ['checkin', 'Check-in']];

function AdminInner() {
  const params = useSearchParams();
  const checkinRef = params.get('checkin') || '';
  const [token, setToken] = useState('');
  const [input, setInput] = useState('');
  const [tab, setTab] = useState(checkinRef ? 'checkin' : 'overview');
  const [error, setError] = useState('');

  useEffect(() => { try { setToken(sessionStorage.getItem(TOKEN_KEY) || ''); } catch { /* ignore */ } }, []);

  async function login(e) {
    e.preventDefault();
    try {
      await api.admin.overview(input); // validates the token
      try { sessionStorage.setItem(TOKEN_KEY, input); } catch { /* ignore */ }
      setToken(input); setError('');
    } catch (err) { setError(err.message); }
  }
  function logout() { try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } setToken(''); }

  if (!token) {
    return (
      <div className="admin-login">
        <form className="card form-card" onSubmit={login}>
          <img src="/logo-256.jpg" alt="Pulse Trips" width="64" height="64" className="brand-img" />
          <h1>Team dashboard</h1>
          <label className="field">Admin token<input type="password" required value={input} onChange={(e) => setInput(e.target.value)} autoComplete="current-password" /></label>
          <button className="btn btn-block">Sign in</button>
          {error && <p className="notice notice-err">{error}</p>}
          <Link href="/" className="small muted">← Back to website</Link>
        </form>
      </div>
    );
  }

  return (
    <div className="admin">
      <header className="admin-bar">
        <Link href="/" className="brand"><img src="/logo-256.jpg" alt="" width="36" height="36" className="brand-img" /><span className="brand-word">Pulse<span>Trips</span></span></Link>
        <nav className="admin-tabs" role="tablist" aria-label="Admin sections">
          {TABS.map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>)}
        </nav>
        <button className="btn btn-sm btn-outline-light" onClick={logout}>Sign out</button>
      </header>
      <div className="admin-body">
        {tab === 'overview' && <Overview token={token} />}
        {tab === 'tours' && <TourEditor token={token} />}
        {tab === 'bookings' && <Bookings token={token} />}
        {tab === 'guests' && <Guests token={token} />}
        {tab === 'roster' && <Roster token={token} />}
        {tab === 'checkin' && <CheckIn token={token} initialRef={checkinRef} />}
      </div>
    </div>
  );
}

export default function AdminPage() {
  return <Suspense fallback={null}><AdminInner /></Suspense>;
}
