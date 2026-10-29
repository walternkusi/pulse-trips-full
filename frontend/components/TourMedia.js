'use client';
// =============================================================================
// TOUR MEDIA
//   <Gallery>   large hero photo / looping video preview + thumbnails
//   <RouteMap>  interactive map of the meeting point & highlight stops
// =============================================================================
import { useState } from 'react';
import { usePrefs } from './Providers';
import Icon from './Icons';

// -----------------------------------------------------------------------------
// GALLERY
// The first photo loads eagerly (it's the largest thing on screen: LCP).
// If the tour has a `video`, it plays muted & looped as the first slide.
// -----------------------------------------------------------------------------
export function Gallery({ images = [], video, title }) {
  const slides = [...(video ? [{ video, poster: images[0]?.src, alt: title }] : []), ...images];
  const [i, setI] = useState(0);
  if (!slides.length) return <div className="gallery-main media-fallback" aria-hidden="true" />;
  const s = slides[i];

  return (
    <div className="gallery">
      <div className="gallery-main">
        {s.video ? (
          // Muted + playsInline is required for autoplay on iOS. Reduced-motion users get the poster only.
          <video src={s.video} poster={s.poster} autoPlay muted loop playsInline preload="metadata" aria-label={s.alt} className="motion-safe" />
        ) : (
          <img src={s.src} alt={s.alt} fetchPriority={i === 0 ? 'high' : 'auto'} width="1600" height="900" />
        )}
        {slides.length > 1 && (
          <>
            <button className="gallery-nav prev" onClick={() => setI((i - 1 + slides.length) % slides.length)} aria-label="Previous photo"><Icon name="chevronLeft" /></button>
            <button className="gallery-nav next" onClick={() => setI((i + 1) % slides.length)} aria-label="Next photo"><Icon name="chevronRight" /></button>
            <span className="gallery-count"><Icon name="camera" size={14} /> {i + 1}/{slides.length}</span>
          </>
        )}
        {/* Photographer credit for library photos (Unsplash asks for attribution) */}
        {s.credit?.name && (
          <span className="gallery-credit">Photo: {s.credit.url ? <a href={s.credit.url} target="_blank" rel="noopener">{s.credit.name}</a> : s.credit.name} / Unsplash</span>
        )}
      </div>
      {slides.length > 1 && (
        <div className="gallery-thumbs">
          {slides.map((x, n) => (
            <button key={n} className={n === i ? 'on' : ''} onClick={() => setI(n)} aria-label={`Show photo ${n + 1}: ${x.alt}`} aria-current={n === i}>
              <img src={(x.poster || x.src).replace('w=1600', 'w=240')} alt="" loading="lazy" width="120" height="80" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// ROUTE MAP
// OpenStreetMap embed (free, no API key). Click a stop to fly the map there;
// "All stops" frames the whole route. A Google Maps link opens turn-by-turn
// directions through every stop on the visitor's phone.
// 🔌 For a richer map (drawn route line, custom pins) swap the iframe for
//    Leaflet or Mapbox GL with the same `stops` data.
// -----------------------------------------------------------------------------
export function RouteMap({ stops = [], meetingPoint }) {
  const { t } = usePrefs();
  const [active, setActive] = useState(-1); // -1 = whole route
  if (!stops.length) return null;

  // Bounding box around one stop (zoomed in) or all stops (with padding).
  const pts = active >= 0 ? [stops[active]] : stops;
  const lats = pts.map((p) => p.lat), lngs = pts.map((p) => p.lng);
  const pad = active >= 0 || pts.length === 1 ? 0.03 : 0.25;
  const bbox = [Math.min(...lngs) - pad, Math.min(...lats) - pad, Math.max(...lngs) + pad, Math.max(...lats) + pad].map((n) => n.toFixed(4)).join(',');
  const marker = active >= 0 ? stops[active] : meetingPoint || stops[0];
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker.lat},${marker.lng}`;

  // Google Maps directions: origin -> waypoints -> destination.
  const ll = (p) => `${p.lat},${p.lng}`;
  const directions = stops.length > 1
    ? `https://www.google.com/maps/dir/?api=1&origin=${ll(stops[0])}&destination=${ll(stops[stops.length - 1])}${stops.length > 2 ? `&waypoints=${stops.slice(1, -1).map(ll).join('|')}` : ''}`
    : `https://www.google.com/maps?q=${ll(stops[0])}`;

  return (
    <div className="route-map">
      <iframe title="Tour route map" src={src} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      <ol className="route-stops">
        {stops.length > 1 && (
          <li><button className={active === -1 ? 'on' : ''} onClick={() => setActive(-1)}><Icon name="globe" size={16} /> All stops</button></li>
        )}
        {stops.map((s, n) => (
          <li key={s.name}>
            <button className={active === n ? 'on' : ''} onClick={() => setActive(n)}>
              <span className="stop-n" aria-hidden="true">{n + 1}</span> {s.name}
            </button>
          </li>
        ))}
      </ol>
      <a href={directions} target="_blank" rel="noopener" className="link-strong"><Icon name="pin" size={16} /> {t('tour.openMaps')}</a>
    </div>
  );
}
