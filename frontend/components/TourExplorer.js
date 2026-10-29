'use client';
// =============================================================================
// TOUR EXPLORER (filters + grid)
// Filters live in the URL (/tours?category=safari&country=Kenya) so results are
// shareable, bookmarkable and indexable: clean URLs are good for SEO too.
// Filtering happens instantly in the browser (the catalogue is small).
// =============================================================================
import { useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { usePrefs } from './Providers';
import TourCard from './TourCard';

const CATEGORIES = ['all', 'safari', 'adventure', 'day-trip', 'event'];

export default function TourExplorer({ tours, destinations }) {
  const { t } = usePrefs();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const category = params.get('category') || 'all';
  const country = params.get('country') || '';

  // All destinations we operate in (from the API), so e.g. Rwanda is listed before it has tours.
  const countries = useMemo(() => destinations || [...new Set(tours.map((x) => x.country))].sort(), [tours, destinations]);
  const results = tours.filter((x) => (category === 'all' || x.category === category) && (!country || x.country === country));

  // Updates one filter in the URL without scrolling to the top.
  function setFilter(key, value) {
    const next = new URLSearchParams(params);
    if (!value || value === 'all') next.delete(key); else next.set(key, value);
    router.replace(`${pathname}${next.size ? `?${next}` : ''}`, { scroll: false });
  }

  return (
    <>
      <div className="filters" role="group" aria-label="Filters">
        <div className="chip-row" role="radiogroup" aria-label="Category">
          {CATEGORIES.map((c) => (
            <button key={c} role="radio" aria-checked={category === c} className={`chip-btn ${category === c ? 'on' : ''}`} onClick={() => setFilter('category', c)}>
              {t(`cat.${c}`)}
            </button>
          ))}
        </div>
        <label className="select-inline">
          <span className="sr-only">{t('filters.country')}</span>
          <select value={country} onChange={(e) => setFilter('country', e.target.value)}>
            <option value="">{t('filters.anyCountry')}</option>
            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>

      <p className="muted results-count" aria-live="polite">{t('filters.results', { n: results.length })}</p>
      {results.length ? (
        <div className="tour-grid">{results.map((tour, i) => <TourCard key={tour.slug} tour={tour} priority={i < 3} />)}</div>
      ) : (
        // No tours yet for this filter: turn the dead end into a custom-trip lead.
        <div className="empty">
          <p>{country ? t('filters.soon', { country }) : t('filters.none')}</p>
          <Link href="/contact" className="btn">{t('hero.cta2')}</Link>
        </div>
      )}
    </>
  );
}
