// Moved unchanged from the old single-page admin; the glass theme (admin.css) restyles it.
'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatAmount } from '@/lib/money';
import Icon from '@/components/Icons';

const usd = (n) => formatAmount(n, 'USD', 'en');
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
const isoDay = (offset = 0) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

// =============================================================================
// CRM: guests, requirements, history, notes
// =============================================================================
export default function GuestsPanel({ token }) {
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
