'use client';
// =============================================================================
// REVIEW LIST (social proof)
// Star rating, "Verified traveler" tag, travel month and guest photos.
// Photos open in a native <dialog> lightbox.
// =============================================================================
import { useRef, useState } from 'react';
import { usePrefs } from './Providers';
import Icon, { Stars } from './Icons';

export default function ReviewList({ reviews, showTour = false }) {
  const { t, lang } = usePrefs();
  const dialogRef = useRef(null);
  const [photo, setPhoto] = useState(null);

  const open = (src) => { setPhoto(src); dialogRef.current?.showModal(); };
  // "2026-08" -> "August 2026" in the visitor's language.
  const month = (ym) => new Intl.DateTimeFormat(lang, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${ym}-01T00:00:00Z`));

  return (
    <>
      <div className="review-grid">
        {reviews.map((r) => (
          <article key={r.id} className="review-card">
            <header>
              <Stars value={r.rating} />
              {r.verified && <span className="chip chip-ok"><Icon name="shield" size={13} /> {t('reviews.verified')}</span>}
            </header>
            {r.title && <h3>{r.title}</h3>}
            <p>{r.text}</p>
            {r.photos?.length > 0 && (
              <div className="review-photos">
                {r.photos.map((src, i) => (
                  <button key={i} onClick={() => open(src)} aria-label={`Open photo ${i + 1} from ${r.name}`}>
                    <img src={src} alt="" width="80" height="80" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
            <footer>
              <span className="avatar" aria-hidden="true">{r.name[0]}</span>
              <span><b>{r.name}</b><small>{showTour && r.tourName ? `${r.tourName} · ` : ''}{t('reviews.travelled', { d: month(r.travelDate) })}</small></span>
            </footer>
          </article>
        ))}
      </div>

      <dialog ref={dialogRef} className="lightbox" onClick={() => dialogRef.current.close()}>
        {photo && <img src={photo} alt="Guest photo" />}
        <button className="icon-btn" aria-label="Close"><Icon name="x" /></button>
      </dialog>
    </>
  );
}
