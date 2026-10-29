'use client';
// =============================================================================
// PHOTO MANAGER (admin tour editor)
// Manage a tour's photos. The FIRST photo is the tour-card cover.
//   • Search real photos of the actual place (Unsplash, credited & licensed)
//   • Upload your own photos (resized in the browser before upload)
//   • Paste an image link (https only)
//   • Reorder, set cover, edit alt text, remove
// =============================================================================
import { useState } from 'react';
import { api } from '@/lib/api';
import Icon from '@/components/Icons';

const MAX_PHOTOS = 12;

// Scales a photo to max 1800 px wide and re-encodes it as JPEG (~0.82 quality):
// sharp on retina screens but typically 300–700 KB instead of 5–10 MB from a camera.
function resizeForWeb(file, max = 1800) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => reject(new Error(`Could not read ${file.name}`));
    img.src = URL.createObjectURL(file);
  });
}

// Turns a file name like "ngorongoro_crater-sunrise.jpg" into starter alt text.
// A 404 from an admin endpoint means the API process is older than this page.
export const explain = (err) => (err.status === 404 ? 'The backend is running an older version. Restart it (Ctrl+C, then npm run dev) and try again.' : err.message);

const altFromName = (name) => name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').trim();

export default function PhotoManager({ token, images, onChange, suggestedQuery }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [link, setLink] = useState('');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState({ results: [], page: 1, total: 0, open: false });

  const full = images.length >= MAX_PHOTOS;
  const update = (i, patch) => onChange(images.map((img, n) => (n === i ? { ...img, ...patch } : img)));
  const move = (from, to) => {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };
  const add = (img) => onChange([...images, img].slice(0, MAX_PHOTOS));

  // --- Upload own photos ---------------------------------------------------------
  async function upload(e) {
    const files = [...e.target.files].slice(0, MAX_PHOTOS - images.length);
    e.target.value = '';
    setError('');
    const added = [];
    for (const [i, f] of files.entries()) {
      setBusy(`Uploading ${i + 1}/${files.length}…`);
      try {
        const { src } = await api.admin.uploadPhoto(token, await resizeForWeb(f));
        added.push({ src, alt: altFromName(f.name) });
      } catch (err) { setError(explain(err)); }
    }
    onChange([...images, ...added].slice(0, MAX_PHOTOS));
    setBusy('');
  }

  // --- Paste a link --------------------------------------------------------------
  function addLink(e) {
    e.preventDefault();
    if (!/^https:\/\/\S+$/.test(link.trim())) return setError('Paste a full https:// image link.');
    add({ src: link.trim(), alt: '' });
    setLink(''); setError('');
  }

  // --- Search real photos of the place -----------------------------------------
  async function runSearch(page = 1) {
    const q = (query || suggestedQuery).trim();
    if (!q) return;
    setBusy('Searching…'); setError('');
    try {
      const data = await api.admin.searchPhotos(token, q, page);
      setSearch((s) => ({ open: true, page, total: data.total, results: page === 1 ? data.results : [...s.results, ...data.results] }));
      if (!query) setQuery(q);
    } catch (err) { setError(err.message); }
    setBusy('');
  }

  function pick(p) {
    add({ src: p.src, alt: p.alt, credit: p.credit });
    api.admin.trackPhoto(token, p.downloadLocation).catch(() => {}); // Unsplash licence requirement
  }
  const used = (p) => images.some((img) => img.src === p.src);

  return (
    <div className="photo-manager">
      {/* ---- Current photos ---- */}
      {/* Empty state is itself a button: one click opens the file picker */}
      {images.length === 0 && (
        <button type="button" className="pm-empty" onClick={() => document.getElementById('te-upload')?.click()}>
          <Icon name="camera" size={28} />
          <b>Upload photos</b>
          <span>JPEG, PNG or WebP · or search real photos of the place below</span>
        </button>
      )}
      <ol className="pm-grid">
        {images.map((img, i) => (
          <li key={`${img.src}-${i}`} className={i === 0 ? 'cover' : ''}>
            <div className="pm-thumb">
              <img src={img.src.replace('w=1600', 'w=500')} alt="" loading="lazy" />
              {i === 0 && <span className="chip chip-brand">Card cover</span>}
            </div>
            <label className="field field-sm">Alt text <small>(describe the scene)</small>
              <input value={img.alt} maxLength={160} placeholder="e.g. Wildebeest crossing the Mara River" onChange={(e) => update(i, { alt: e.target.value })} />
            </label>
            {img.credit && <p className="tiny muted">Photo: {img.credit.name} / Unsplash</p>}
            <div className="pm-actions">
              {i > 0 && <button type="button" className="btn btn-sm btn-outline" onClick={() => move(i, 0)}>Make cover</button>}
              <button type="button" className="icon-btn" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label="Move left"><Icon name="chevronLeft" size={18} /></button>
              <button type="button" className="icon-btn" onClick={() => move(i, i + 1)} disabled={i === images.length - 1} aria-label="Move right"><Icon name="chevronRight" size={18} /></button>
              <button type="button" className="icon-btn" onClick={() => onChange(images.filter((_, n) => n !== i))} aria-label="Remove photo"><Icon name="x" size={18} /></button>
            </div>
          </li>
        ))}
      </ol>

      {/* ---- Add photos ---- */}
      <div className="pm-add">
        <div className="pm-search">
          <p className="mini-title"><Icon name="camera" size={16} /> Find real photos of this place</p>
          <p className="tiny muted">Search the exact place and its nature, e.g. “Ngorongoro Crater”, “Boulders Beach penguins”, “Amboseli elephants Kilimanjaro”.</p>
          <form className="promo-row" onSubmit={(e) => { e.preventDefault(); runSearch(1); }}>
            <input value={query} placeholder={suggestedQuery || 'Place or landscape'} onChange={(e) => setQuery(e.target.value)} aria-label="Search photos" />
            <button className="btn btn-sm" disabled={Boolean(busy) || full}>Search</button>
          </form>
        </div>

        <div className="pm-other">
          <label className={`btn btn-sm btn-outline ${full ? 'disabled' : ''}`}>
            <Icon name="download" size={16} /> Upload photos
            <input id="te-upload" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden disabled={full || Boolean(busy)} onChange={upload} />
          </label>
          <form className="promo-row" onSubmit={addLink}>
            <input value={link} placeholder="…or paste an https:// image link" onChange={(e) => setLink(e.target.value)} aria-label="Image link" />
            <button className="btn btn-sm btn-outline" disabled={!link || full}>Add</button>
          </form>
        </div>
      </div>

      {busy && <p className="small muted" role="status">{busy}</p>}
      {error && <p className="notice notice-err" role="alert">{error}</p>}
      {full && <p className="tiny muted">Maximum {MAX_PHOTOS} photos per tour.</p>}

      {/* ---- Search results ---- */}
      {search.open && (
        <div className="pm-results">
          <p className="small muted">{search.total.toLocaleString()} photos found. Click a photo to add it.</p>
          <ul className="pm-results-grid">
            {search.results.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => pick(p)} disabled={used(p) || full} aria-label={`Add photo: ${p.alt}`}>
                  <img src={p.thumb} alt="" loading="lazy" />
                  {used(p) && <span className="pm-added"><Icon name="check" size={18} /> Added</span>}
                </button>
                <small>{p.location && <><Icon name="pin" size={12} /> {p.location} · </>}
                  <a href={p.credit.url} target="_blank" rel="noopener">{p.credit.name}</a></small>
              </li>
            ))}
          </ul>
          {search.results.length < search.total && <button type="button" className="btn btn-sm btn-ghost" onClick={() => runSearch(search.page + 1)} disabled={Boolean(busy)}>More results</button>}
        </div>
      )}
    </div>
  );
}
