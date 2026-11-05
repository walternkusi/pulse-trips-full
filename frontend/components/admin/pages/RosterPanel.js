// Moved unchanged from the old single-page admin; the glass theme (admin.css) restyles it.
'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatAmount } from '@/lib/money';
import Icon from '@/components/Icons';
import { useConfirm } from '@/components/ConfirmDialog';

const usd = (n) => formatAmount(n, 'USD', 'en');
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
const isoDay = (offset = 0) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

// =============================================================================
// ROSTER: guides, drivers, vehicles per departure
// =============================================================================
export default function RosterPanel({ token }) {
  const confirm = useConfirm();
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
    if (!(await confirm({ title: 'Cancel the whole departure?', message: `All ${d.manifest.length} booking(s) on ${d.tourName}, ${d.date} ${d.time}, will be cancelled for weather. Guests get a 100% refund and an email/SMS.`, confirmLabel: 'Cancel departure', cancelLabel: 'Keep departure', tone: 'danger' }))) return;
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
