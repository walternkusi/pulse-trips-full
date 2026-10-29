'use client';
// =============================================================================
// AVAILABILITY CALENDAR
// Month grid coloured by live availability: available / few seats / sold out /
// no tour. Data comes from GET /api/availability/calendar and is re-fetched
// whenever `refreshKey` changes (the booking panel bumps it on every real-time
// update pushed by the server).
//
// Accessibility: real <button>s, aria-pressed for the selected day, a text
// label for each status (colour is never the only signal), keyboard friendly.
// =============================================================================
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { usePrefs } from './Providers';
import Icon from './Icons';

const MAX_MONTHS_AHEAD = 12;

// Local "today" as YYYY-MM-DD / YYYY-MM (the visitor's own calendar).
const pad = (n) => String(n).padStart(2, '0');
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const shiftMonth = (month, delta) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
};

export default function AvailabilityCalendar({ slug, value, onSelect, refreshKey = 0 }) {
  const { t, lang } = usePrefs();
  const firstMonth = todayIso().slice(0, 7);
  const [month, setMonth] = useState(value ? value.slice(0, 7) : firstMonth);
  const [days, setDays] = useState(null);
  const [error, setError] = useState('');

  // Fetch the month whenever it changes or a real-time update arrives.
  useEffect(() => {
    let alive = true; // ignore late responses after the month changed
    setError('');
    api.getCalendar(slug, month)
      .then((d) => alive && setDays(d.days))
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [slug, month, refreshKey]);

  // Localised month title and weekday initials (Monday first).
  const [y, m] = month.split('-').map(Number);
  const title = new Intl.DateTimeFormat(lang, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 1)));
  const weekdays = useMemo(() => [...Array(7)].map((_, i) =>
    new Intl.DateTimeFormat(lang, { weekday: 'narrow', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, 1 + i)))), [lang]); // 2024-01-01 is a Monday
  const leadingBlanks = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;

  const canPrev = month > firstMonth;
  const canNext = month < shiftMonth(firstMonth, MAX_MONTHS_AHEAD);
  const label = { available: t('cal.available'), limited: t('cal.limited'), soldout: t('cal.soldout'), closed: t('cal.closed') };

  return (
    <div className="calendar">
      <div className="cal-head">
        <button type="button" className="icon-btn" disabled={!canPrev} onClick={() => setMonth(shiftMonth(month, -1))} aria-label={t('cal.prev')}><Icon name="chevronLeft" /></button>
        <b aria-live="polite">{title}</b>
        <button type="button" className="icon-btn" disabled={!canNext} onClick={() => setMonth(shiftMonth(month, 1))} aria-label={t('cal.next')}><Icon name="chevronRight" /></button>
      </div>

      <div className="cal-grid" role="group" aria-label={title}>
        {weekdays.map((w, i) => <span key={i} className="cal-wd" aria-hidden="true">{w}</span>)}
        {[...Array(leadingBlanks)].map((_, i) => <span key={`b${i}`} />)}
        {days ? days.map((d) => {
          const selectable = d.status === 'available' || d.status === 'limited';
          return (
            <button key={d.date} type="button" disabled={!selectable}
              className={`cal-day s-${d.status} ${value === d.date ? 'selected' : ''}`}
              aria-pressed={value === d.date}
              aria-label={`${d.date}: ${label[d.status]}${selectable ? `, ${t('book.seatsLeft', { n: d.seatsLeft })}` : ''}`}
              onClick={() => onSelect(d.date)}>
              {Number(d.date.slice(8))}
            </button>
          );
        }) : <span className="cal-loading">{error || t('cal.loading')}</span>}
      </div>

      {/* Legend: colour + text, never colour alone */}
      <ul className="cal-legend">
        {['available', 'limited', 'soldout'].map((s) => <li key={s}><span className={`dot s-${s}`} aria-hidden="true" />{label[s]}</li>)}
      </ul>
    </div>
  );
}
