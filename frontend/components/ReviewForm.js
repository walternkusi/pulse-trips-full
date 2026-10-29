'use client';
// =============================================================================
// REVIEW FORM
// Only real guests can review: the backend checks the booking reference +
// email belong to a confirmed, completed trip, then tags it "Verified traveler".
// Photos are resized in the browser (max 900 px, JPEG ~75%) before upload so
// they stay small and fast to load.
// =============================================================================
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { usePrefs } from './Providers';
import Icon from './Icons';

// Reads an image file, scales it down on a <canvas>, returns a JPEG data URL.
function resizeImage(file, max = 900) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export default function ReviewForm() {
  const { t } = usePrefs();
  const router = useRouter();
  const [form, setForm] = useState({ reference: '', email: '', rating: 0, title: '', text: '' });
  const [photos, setPhotos] = useState([]);
  const [hover, setHover] = useState(0);
  const [status, setStatus] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);

  const bind = (k) => ({ value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }) });

  async function addPhotos(e) {
    const files = [...e.target.files].slice(0, 3 - photos.length);
    const resized = await Promise.all(files.map((f) => resizeImage(f).catch(() => null)));
    setPhotos([...photos, ...resized.filter(Boolean)].slice(0, 3));
    e.target.value = ''; // allow re-selecting the same file
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.rating) return setStatus({ type: 'error', text: t('reviews.rating') });
    setBusy(true); setStatus({ type: '', text: '' });
    try {
      await api.createReview({ ...form, photos });
      setStatus({ type: 'ok', text: t('reviews.thanks') });
      setForm({ reference: '', email: '', rating: 0, title: '', text: '' }); setPhotos([]);
      router.refresh(); // show the new review in the server-rendered list
    } catch (err) { setStatus({ type: 'error', text: err.message }); }
    setBusy(false);
  }

  return (
    <form className="card form-card" onSubmit={submit}>
      <h2>{t('reviews.write')}</h2>
      <p className="muted small">{t('reviews.writeSub')}</p>
      <div className="form-row">
        <label className="field">{t('manage.ref')}<input required placeholder="PT-4F9A2C" {...bind('reference')} /></label>
        <label className="field">{t('book.email')}<input required type="email" {...bind('email')} /></label>
      </div>

      {/* Star picker: radio buttons under the hood = keyboard accessible */}
      <fieldset className="star-picker" onMouseLeave={() => setHover(0)}>
        <legend>{t('reviews.rating')}</legend>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} onMouseEnter={() => setHover(n)} className={(hover || form.rating) >= n ? 'on' : ''}>
            <input type="radio" name="rating" value={n} checked={form.rating === n} onChange={() => setForm({ ...form, rating: n })} />
            <Icon name="star" size={30} />
            <span className="sr-only">{n} stars</span>
          </label>
        ))}
      </fieldset>

      <label className="field">{t('reviews.headline')} <span className="opt">({t('common.optional')})</span><input maxLength={120} {...bind('title')} /></label>
      <label className="field">{t('reviews.text')}<textarea required minLength={20} rows={5} maxLength={2000} {...bind('text')} /></label>

      <div className="photo-picker">
        <label className="btn btn-outline btn-sm">
          <Icon name="camera" size={16} /> {t('reviews.photos')}
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={addPhotos} disabled={photos.length >= 3} />
        </label>
        {photos.map((p, i) => (
          <button type="button" key={i} className="photo-thumb" onClick={() => setPhotos(photos.filter((_, n) => n !== i))} aria-label={`Remove photo ${i + 1}`}>
            <img src={p} alt="" width="64" height="64" /><span><Icon name="x" size={14} /></span>
          </button>
        ))}
      </div>

      <button className="btn" disabled={busy}>{busy ? '…' : t('reviews.submit')}</button>
      {status.text && <p className={status.type === 'ok' ? 'notice notice-ok' : 'notice notice-err'} role="status">{status.text}</p>}
    </form>
  );
}
