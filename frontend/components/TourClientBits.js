'use client';
// =============================================================================
// SMALL CLIENT HELPERS FOR THE TOUR PAGE
//   <ViewTracker>   sends GA4 `view_item` once per page view
//   <MobileBookBar> sticky bottom bar on phones: price + "Book now"
// =============================================================================
import { useEffect } from 'react';
import { track } from '@/lib/analytics';
import { usePrefs } from './Providers';

export function ViewTracker({ tour }) {
  useEffect(() => {
    track('view_item', { slug: tour.slug, items: [{ item_id: tour.slug, item_name: tour.name, item_category: tour.category, price: tour.pricing.adult }] });
  }, [tour.slug]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// Over 60% of tour searches happen on phones: the booking button must always be one tap away.
export function MobileBookBar({ tour }) {
  const { t, priceUsd } = usePrefs();
  // Lifts the chat/WhatsApp buttons above this bar (see .has-bookbar in globals.css).
  useEffect(() => {
    document.body.classList.add('has-bookbar');
    return () => document.body.classList.remove('has-bookbar');
  }, []);
  return (
    <div className="mobile-bookbar">
      <div>
        <span className="price-from">{t('card.from')}</span> <b>{priceUsd(tour.pricing.adult)}</b>
        <small>{t('card.perAdult')}</small>
      </div>
      <a href="#book" className="btn">{t('tour.bookNow')}</a>
    </div>
  );
}
