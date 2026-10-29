'use client';
// =============================================================================
// TOUR EDITOR (admin → Tours tab)
// Left: every tour (published or hidden) + "New tour".
// Right: live tour-card preview + the edit form:
//   1. Card & basics   2. Photos   3. Prices   4. Schedule
//   5. Meeting point & map   6. Page content   7. Add-ons
// Saving sends the tour to PUT /api/admin/tours/:slug; the server validates it
// and writes it to storage/tours.json. The public site shows changes instantly.
// =============================================================================
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import TourCard from '@/components/TourCard';
import PhotoManager, { explain } from './PhotoManager';
import Icon from '@/components/Icons';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// --- Converting between the saved tour and the editable form -------------------
// Lists are edited as "one item per line"; itinerary/stops use "a | b | c" lines.
const lines = (arr = []) => arr.join('\n');
const fromLines = (text) => String(text || '').split('\n').map((s) => s.trim()).filter(Boolean);
const piped = (text) => fromLines(text).map((l) => l.split('|').map((s) => s.trim()));

function toForm(t) {
  return {
    ...t,
    languages: (t.languages || []).join(', '),
    departures: (t.departures || []).join(', '),
    highlights: lines(t.highlights), inclusions: lines(t.inclusions), exclusions: lines(t.exclusions), whatToBring: lines(t.whatToBring),
    itinerary: (t.itinerary || []).map((s) => `${s.time} | ${s.title} | ${s.text}`).join('\n'),
    stops: (t.stops || []).map((s) => `${s.name} | ${s.lat} | ${s.lng}`).join('\n'),
    groupMin: t.pricing?.group?.minGuests || '',
    groupPct: t.pricing?.group ? Math.round(t.pricing.group.discount * 100) : '',
  };
}

function fromForm(f) {
  return {
    ...f,
    languages: f.languages.split(',').map((s) => s.trim()).filter(Boolean),
    departures: f.departures.split(',').map((s) => s.trim()).filter(Boolean),
    highlights: fromLines(f.highlights), inclusions: fromLines(f.inclusions), exclusions: fromLines(f.exclusions), whatToBring: fromLines(f.whatToBring),
    itinerary: piped(f.itinerary).map(([time = '', title = '', ...rest]) => ({ time, title, text: rest.join(' | ') })),
    stops: piped(f.stops).map(([name, lat, lng]) => ({ name, lat: Number(lat), lng: Number(lng) })),
    pricing: {
      ...f.pricing,
      adult: Number(f.pricing.adult), child: Number(f.pricing.child), privateFlat: Number(f.pricing.privateFlat),
      group: Number(f.groupMin) > 1 ? { minGuests: Number(f.groupMin), discount: Number(f.groupPct || 0) / 100 } : null,
      seasons: f.pricing.seasons || [],
    },
  };
}

// Starting point for a brand-new tour (hidden until "Published" is ticked).
const BLANK = {
  slug: '', name: '', blurb: '', category: 'day-trip', country: 'Kenya', level: 'Easy',
  durationLabel: 'Full day', durationHours: 8, maxGuests: 12, minAge: 0, cutoffHours: 12,
  languages: ['English'], daysOfWeek: [0, 1, 2, 3, 4, 5, 6], departures: ['08:00'],
  pricing: { adult: 100, child: 60, privateFlat: 800, group: null, seasons: [] },
  images: [], video: '', addonIds: [], published: false,
  meetingPoint: { name: '', lat: -1.2864, lng: 36.8172, note: '' },
  stops: [], itinerary: [], highlights: [], inclusions: [], exclusions: [], whatToBring: [],
};

export default function TourEditor({ token }) {
  const [tours, setTours] = useState([]);
  const [addons, setAddons] = useState([]);
  const [options, setOptions] = useState({ countries: [], categories: [], levels: [] });
  const [selected, setSelected] = useState(null); // slug, or 'new'
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState('');         // JSON snapshot to detect unsaved changes
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);

  // Load the catalogue (and keep the current selection after a save).
  async function load(keep) {
    const d = await api.admin.tours(token);
    setTours(d.tours); setAddons(d.addons); setOptions(d.options);
    const slug = keep || selected || d.tours[0]?.slug;
    const t = d.tours.find((x) => x.slug === slug);
    if (t) open(t);
  }
  useEffect(() => { load().catch((e) => setMsg({ type: 'error', text: explain(e) })); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  function open(t) {
    const f = toForm(t);
    setSelected(t.slug || 'new'); setForm(f); setSaved(JSON.stringify(f)); setMsg({ type: '', text: '' });
  }
  const dirty = form && JSON.stringify(form) !== saved;
  // Warn before closing the tab with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  function choose(t) {
    if (dirty && !window.confirm('Discard unsaved changes?')) return;
    open(t);
  }

  // Field helpers.
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setIn = (group, k, v) => setForm((f) => ({ ...f, [group]: { ...f[group], [k]: v } }));
  const bind = (k, type = 'text') => ({ value: form[k] ?? '', onChange: (e) => set(k, type === 'number' ? Number(e.target.value) : e.target.value) });

  async function save() {
    setSaving(true); setMsg({ type: '', text: '' });
    try {
      const data = fromForm(form);
      const { tour } = selected === 'new' ? await api.admin.createTour(token, data) : await api.admin.saveTour(token, form.slug, data);
      await load(tour.slug);
      setMsg({ type: 'ok', text: tour.published ? 'Saved. The website is updated.' : 'Saved as hidden. Tick "Published" to show it on the website.' });
    } catch (e) { setMsg({ type: 'error', text: explain(e) }); } // server-side validation message
    setSaving(false);
  }

  // Live preview of the public tour card from the unsaved form.
  const preview = useMemo(() => {
    if (!form) return null;
    try { return { ...fromForm(form), slug: form.slug || 'preview', rating: tours.find((t) => t.slug === form.slug)?.rating || { average: 0, count: 0 } }; }
    catch { return null; }
  }, [form, tours]);

  return (
    <div className="tour-editor">
      {/* ================= Tour list ================= */}
      <aside className="card te-list">
        <button className="btn btn-sm btn-block" onClick={() => choose(BLANK)}>+ New tour</button>
        <ul className="guest-list">
          {tours.map((t) => (
            <li key={t.slug}>
              <button className={selected === t.slug ? 'on' : ''} onClick={() => choose(t)}>
                {t.images[0] ? <img src={t.images[0].src.replace('w=1600', 'w=160')} alt="" className="te-thumb" /> : <span className="te-thumb media-fallback" />}
                <span><b>{t.name}</b><small>{t.country} · {t.images.length} photo(s)</small></span>
                {t.published === false && <span className="chip chip-warn">hidden</span>}
                {t.featured && t.published !== false && <span className="chip chip-brand">home</span>}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* ================= Editor ================= */}
      {form && (
        <div className="te-main">
          <section className="card te-preview">
            <div>
              <h2>{selected === 'new' ? 'New tour' : form.name}</h2>
              <p className="small muted">Card preview: this is how the tour appears on the home page and tours list.</p>
              {form.slug && <Link href={`/tours/${form.slug}`} target="_blank" className="link-strong">View tour page ↗</Link>}
            </div>
            {preview && preview.images.length > 0 ? <div className="te-card"><TourCard tour={preview} /></div> : (
              // Clickable placeholder: jumps to the Photos section and opens the file picker.
              <button type="button" className="pm-empty" onClick={() => {
                document.getElementById('te-photos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                document.getElementById('te-upload')?.click();
              }}>
                <Icon name="camera" size={28} />
                <b>Add a photo</b>
                <span>The first photo becomes the card cover</span>
              </button>
            )}
          </section>

          {/* 1. Card & basics */}
          <section className="card">
            <h2>1. Card & basics</h2>
            <label className="check-row"><input type="checkbox" checked={form.published !== false} onChange={(e) => set('published', e.target.checked)} />
              <span><b>Published</b><small>Untick to hide this tour from the website (existing bookings keep working).</small></span></label>
            <label className="check-row"><input type="checkbox" checked={Boolean(form.featured)} onChange={(e) => set('featured', e.target.checked)} />
              <span><b>Show on home page</b><small>Featured tours appear first in “Featured experiences” (up to 6 cards). All published tours are always on the Tours page.</small></span></label>
            <label className="field">Tour name<input {...bind('name')} maxLength={120} /></label>
            <label className="field">Card description <small>{form.blurb.length}/300: one or two sentences that sell the experience</small>
              <textarea rows={3} maxLength={300} {...bind('blurb')} /></label>
            <div className="form-row">
              <label className="field">Category<select {...bind('category')}>{options.categories.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
              <label className="field">Country<select {...bind('country')}>{options.countries.map((c) => <option key={c}>{c}</option>)}</select></label>
            </div>
            <div className="form-row">
              <label className="field">Difficulty<select {...bind('level')}>{options.levels.map((c) => <option key={c}>{c}</option>)}</select></label>
              <label className="field">Duration label <small>shown to guests, e.g. “3 days”</small><input {...bind('durationLabel')} /></label>
            </div>
            <div className="form-row">
              <label className="field">Duration in hours <small>used to block guides & vehicles</small><input type="number" min="1" {...bind('durationHours', 'number')} /></label>
              <label className="field">Max guests per departure<input type="number" min="1" {...bind('maxGuests', 'number')} /></label>
            </div>
            <div className="form-row">
              <label className="field">Minimum age<input type="number" min="0" {...bind('minAge', 'number')} /></label>
              <label className="field">Guide languages <small>comma separated</small><input {...bind('languages')} /></label>
            </div>
          </section>

          {/* 2. Photos */}
          <section className="card" id="te-photos">
            <h2>2. Photos</h2>
            <p className="small muted">Use photos of the real place and its nature. The first photo is the card cover; the others form the gallery on the tour page.</p>
            <PhotoManager token={token} images={form.images} onChange={(imgs) => set('images', imgs)} suggestedQuery={`${form.name} ${form.country}`.trim()} />
            <label className="field">Video preview link <small>optional, https MP4 that plays muted on the tour page</small><input {...bind('video')} placeholder="https://…/preview.mp4" /></label>
          </section>

          {/* 3. Prices */}
          <section className="card">
            <h2>3. Prices <small className="muted">(USD, converted automatically for visitors)</small></h2>
            <div className="form-row">
              <label className="field">Adult<input type="number" min="0" value={form.pricing.adult} onChange={(e) => setIn('pricing', 'adult', e.target.value)} /></label>
              <label className="field">Child<input type="number" min="0" value={form.pricing.child} onChange={(e) => setIn('pricing', 'child', e.target.value)} /></label>
            </div>
            <div className="form-row">
              <label className="field">Private group (flat)<input type="number" min="0" value={form.pricing.privateFlat} onChange={(e) => setIn('pricing', 'privateFlat', e.target.value)} /></label>
              <div className="form-row">
                <label className="field">Group from (guests)<input type="number" min="0" {...bind('groupMin')} placeholder="none" /></label>
                <label className="field">Group discount %<input type="number" min="0" max="90" {...bind('groupPct')} /></label>
              </div>
            </div>
            {form.pricing.seasons?.length > 0 && <p className="tiny muted">Seasonal rules kept: {form.pricing.seasons.map((s) => `${s.name} ×${s.multiplier}`).join(', ')}</p>}
          </section>

          {/* 4. Schedule */}
          <section className="card">
            <h2>4. Schedule</h2>
            <fieldset className="te-days">
              <legend className="mini-title">Runs on</legend>
              {DAYS.map((d, i) => (
                <label key={d} className={`chip-btn ${form.daysOfWeek.includes(i) ? 'on' : ''}`}>
                  <input type="checkbox" className="sr-only" checked={form.daysOfWeek.includes(i)}
                    onChange={(e) => set('daysOfWeek', e.target.checked ? [...form.daysOfWeek, i] : form.daysOfWeek.filter((x) => x !== i))} />
                  {d}
                </label>
              ))}
            </fieldset>
            <div className="form-row">
              <label className="field">Departure times <small>local time, comma separated, e.g. 06:30, 13:00</small><input {...bind('departures')} /></label>
              <label className="field">Stop selling (hours before)<input type="number" min="0" {...bind('cutoffHours', 'number')} /></label>
            </div>
          </section>

          {/* 5. Meeting point & map */}
          <section className="card">
            <h2>5. Meeting point & route map</h2>
            <div className="form-row">
              <label className="field">Meeting point name<input value={form.meetingPoint.name} onChange={(e) => setIn('meetingPoint', 'name', e.target.value)} /></label>
              <label className="field">Pickup note<input value={form.meetingPoint.note} onChange={(e) => setIn('meetingPoint', 'note', e.target.value)} /></label>
            </div>
            <div className="form-row">
              <label className="field">Latitude<input type="number" step="any" value={form.meetingPoint.lat} onChange={(e) => setIn('meetingPoint', 'lat', e.target.value)} /></label>
              <label className="field">Longitude<input type="number" step="any" value={form.meetingPoint.lng} onChange={(e) => setIn('meetingPoint', 'lng', e.target.value)} /></label>
            </div>
            <p className="tiny muted">Tip: right-click the spot in Google Maps and click the coordinates to copy them.</p>
            <label className="field">Map stops <small>one per line: Name | latitude | longitude</small>
              <textarea rows={4} {...bind('stops')} placeholder="Boulders Beach | -34.1975 | 18.4510" /></label>
          </section>

          {/* 6. Page content */}
          <section className="card">
            <h2>6. Tour page content</h2>
            <label className="field">Itinerary <small>one step per line: Time | Title | Description</small>
              <textarea rows={5} {...bind('itinerary')} placeholder="08:00 | Chapman’s Peak | Photo stops along the coastal road." /></label>
            <div className="form-row">
              <label className="field">Highlights <small>one per line</small><textarea rows={4} {...bind('highlights')} /></label>
              <label className="field">What to bring <small>one per line</small><textarea rows={4} {...bind('whatToBring')} /></label>
            </div>
            <div className="form-row">
              <label className="field">Included <small>one per line</small><textarea rows={4} {...bind('inclusions')} /></label>
              <label className="field">Not included <small>one per line</small><textarea rows={4} {...bind('exclusions')} /></label>
            </div>
          </section>

          {/* 7. Add-ons */}
          <section className="card">
            <h2>7. Add-ons offered</h2>
            {addons.map((a) => (
              <label key={a.id} className="check-row">
                <input type="checkbox" checked={form.addonIds.includes(a.id)} onChange={(e) => set('addonIds', e.target.checked ? [...form.addonIds, a.id] : form.addonIds.filter((x) => x !== a.id))} />
                <span>{a.label}<small>USD {a.price} {a.per === 'person' ? 'per person' : 'per booking'}</small></span>
              </label>
            ))}
          </section>

          {/* Sticky save bar */}
          <div className="te-savebar">
            <span className={`small ${dirty ? 'warn-text' : 'muted'}`}>{dirty ? '● Unsaved changes' : 'All changes saved'}</span>
            {msg.text && <span className={msg.type === 'ok' ? 'ok-text small' : 'err-text small'} role="status">{msg.text}</span>}
            <div className="te-savebar-actions">
              {dirty && <button className="btn btn-sm btn-ghost" onClick={() => setForm(JSON.parse(saved))}>Discard</button>}
              <button className="btn btn-sm" onClick={save} disabled={saving || (!dirty && selected !== 'new')}>{saving ? 'Saving…' : selected === 'new' ? 'Create tour' : 'Save changes'}</button>
            </div>
          </div>
        </div>
      )}
      {msg.text && !form && <p className="notice notice-err">{msg.text}</p>}
    </div>
  );
}
