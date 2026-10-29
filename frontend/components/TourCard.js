'use client'; // needs the visitor's currency for the price
// =============================================================================
// TOUR CARD
// Photo, category, rating, key facts and "from" price. The whole card is one
// link (bigger tap target on phones) with a visible button for clarity.
// =============================================================================
import Link from 'next/link';
import { usePrefs } from './Providers';
import Icon, { Stars } from './Icons';

export default function TourCard({ tour, priority = false }) {
  const { t, priceUsd } = usePrefs();
  const image = tour.images?.[0];

  return (
    <article className="tour-card">
      <Link href={`/tours/${tour.slug}`} className="tour-card-link">
        <div className="tour-card-media">
          {image ? (
            // loading="lazy" keeps the page fast: off-screen photos load only when scrolled to.
            <img src={image.src.replace('w=1600', 'w=800')} alt={image.alt} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} width="800" height="533" />
          ) : <div className="media-fallback" aria-hidden="true" />}
          <span className="chip chip-dark">{t(`cat.${tour.category}`)}</span>
        </div>

        <div className="tour-card-body">
          <div className="tour-card-meta">
            <span><Icon name="pin" size={14} /> {tour.country}</span>
            {tour.rating?.count > 0
              ? <span className="rating"><Stars value={tour.rating.average} size={14} /> {tour.rating.average} · {t('card.reviews', { n: tour.rating.count })}</span>
              : <span className="chip chip-soft">{t('card.new')}</span>}
          </div>
          <h3>{tour.name}</h3>
          <p className="tour-card-blurb">{tour.blurb}</p>
          <ul className="facts-inline">
            <li><Icon name="clock" size={15} /> {tour.durationLabel}</li>
            <li><Icon name="users" size={15} /> {t('tour.groupValue', { n: tour.maxGuests })}</li>
            <li><Icon name="mountain" size={15} /> {tour.level}</li>
          </ul>
          <div className="tour-card-foot">
            <div className="price">
              <span className="price-from">{t('card.from')}</span>
              <b>{priceUsd(tour.pricing.adult)}</b>
              <span className="price-unit">{t('card.perAdult')}</span>
            </div>
            <span className="btn btn-sm" aria-hidden="true">{t('card.view')}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
