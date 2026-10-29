// =============================================================================
// TOUR DETAIL PAGE (server component)
// Clean URL: /tours/serengeti-great-migration-safari
//
// Left column: gallery, facts, highlights, itinerary, inclusions, what to
// bring, route map, policy, reviews. Right column: sticky booking panel.
// On phones the booking panel follows the content and a sticky bar keeps
// "Book now" one tap away.
// SEO: per-tour title/description/OpenGraph image + Schema.org TouristTrip
// (or Event) with offers, itinerary and aggregateRating, plus breadcrumbs.
// =============================================================================
import { notFound } from 'next/navigation';
import Link from 'next/link';
import BookingPanel from '@/components/BookingPanel';
import ReviewList from '@/components/ReviewList';
import { Gallery, RouteMap } from '@/components/TourMedia';
import { ViewTracker, MobileBookBar } from '@/components/TourClientBits';
import Icon, { Stars } from '@/components/Icons';
import { api } from '@/lib/api';
import { getServerContext } from '@/lib/prefs';
import { formatUsd } from '@/lib/money';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// Loads one tour from the backend; returns null if it doesn't exist.
async function loadTour(slug) {
  try { return await api.getTour(slug); } catch { return null; }
}

// --- SEO: title, description and share image come from the tour data ------------
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await loadTour(slug);
  if (!data) return { title: 'Tour not found' };
  const { tour } = data;
  return {
    title: `${tour.name} (${tour.durationLabel}, ${tour.country})`,
    description: tour.blurb,
    alternates: { canonical: `/tours/${tour.slug}` },
    openGraph: { title: tour.name, description: tour.blurb, images: tour.images.slice(0, 1).map((i) => ({ url: i.src, alt: i.alt })) },
  };
}

// --- Schema.org structured data -------------------------------------------------
function structuredData(tour) {
  const url = `${SITE}/tours/${tour.slug}`;
  const offer = { '@type': 'Offer', price: tour.pricing.adult, priceCurrency: 'USD', availability: 'https://schema.org/InStock', url };
  const rating = tour.rating?.count ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: tour.rating.average, reviewCount: tour.rating.count, bestRating: 5 } } : {};
  const main = tour.category === 'event'
    ? { '@context': 'https://schema.org', '@type': 'Event', name: tour.name, description: tour.blurb, image: tour.images.map((i) => i.src), eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: { '@type': 'Place', name: tour.meetingPoint.name, address: tour.country, geo: { '@type': 'GeoCoordinates', latitude: tour.meetingPoint.lat, longitude: tour.meetingPoint.lng } },
      organizer: { '@type': 'Organization', name: 'Pulse Trips', url: SITE }, offers: offer, ...rating }
    : { '@context': 'https://schema.org', '@type': 'TouristTrip', name: tour.name, description: tour.blurb, image: tour.images.map((i) => i.src), touristType: tour.category,
      itinerary: { '@type': 'ItemList', itemListElement: tour.stops.map((s, i) => ({ '@type': 'ListItem', position: i + 1, item: { '@type': 'TouristAttraction', name: s.name, geo: { '@type': 'GeoCoordinates', latitude: s.lat, longitude: s.lng } } })) },
      provider: { '@type': 'TravelAgency', name: 'Pulse Trips', url: SITE }, offers: offer, ...rating };
  const breadcrumbs = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
    { '@type': 'ListItem', position: 2, name: 'Tours', item: `${SITE}/tours` },
    { '@type': 'ListItem', position: 3, name: tour.name, item: url },
  ] };
  return [main, breadcrumbs];
}

export default async function TourPage({ params }) {
  const { slug } = await params;
  const data = await loadTour(slug);
  if (!data) notFound(); // shows the 404 page
  const { tour, addons, reviews } = data;
  const { t, currency, rates, lang } = await getServerContext();
  const [{ policy }] = await Promise.all([api.getPolicies().catch(() => ({ policy: null }))]);
  const price = (usd) => formatUsd(usd, currency, rates, lang);

  const facts = [
    { icon: 'clock', label: t('tour.duration'), value: tour.durationLabel },
    { icon: 'users', label: t('tour.group'), value: t('tour.groupValue', { n: tour.maxGuests }) },
    { icon: 'mountain', label: t('tour.level'), value: tour.level },
    { icon: 'heart', label: t('tour.age'), value: tour.minAge ? `${tour.minAge}+` : t('tour.anyAge') },
    { icon: 'globe', label: t('tour.languages'), value: tour.languages.join(', ') },
    { icon: 'calendar', label: t('tour.departs'), value: tour.departures.join(' · ') },
  ];

  return (
    <>
      {structuredData(tour).map((ld, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />)}
      <ViewTracker tour={tour} />

      <div className="wrap tour-page">
        {/* Breadcrumbs: orientation for people, context for Google */}
        <nav aria-label="Breadcrumb" className="crumbs">
          <Link href="/">Home</Link> <Icon name="chevronRight" size={14} /> <Link href="/tours">{t('nav.tours')}</Link> <Icon name="chevronRight" size={14} /> <span aria-current="page">{tour.name}</span>
        </nav>

        <header className="tour-title">
          <div className="chip-row">
            <span className="chip chip-brand">{t(`cat.${tour.category}`)}</span>
            <span className="chip chip-soft"><Icon name="pin" size={13} /> {tour.country}</span>
          </div>
          <h1>{tour.name}</h1>
          <p className="lead">{tour.blurb}</p>
          {tour.rating.count > 0 && (
            <a href="#reviews" className="rating-line"><Stars value={tour.rating.average} /> <b>{tour.rating.average}</b> · {t('card.reviews', { n: tour.rating.count })}</a>
          )}
        </header>

        <div className="tour-layout">
          {/* ================= LEFT: content ================= */}
          <div className="tour-main">
            <Gallery images={tour.images} video={tour.video} title={tour.name} />

            {/* Key facts at a glance */}
            <dl className="facts-grid">
              {facts.map((f) => (
                <div key={f.label}><dt><Icon name={f.icon} size={18} /> {f.label}</dt><dd>{f.value}</dd></div>
              ))}
            </dl>

            <section className="block">
              <h2>{t('tour.highlights')}</h2>
              <ul className="ticks">{tour.highlights.map((h) => <li key={h}><Icon name="sparkle" size={18} /> {h}</li>)}</ul>
            </section>

            {/* Step-by-step breakdown of the day(s) */}
            <section className="block">
              <h2>{t('tour.itinerary')}</h2>
              <ol className="timeline">
                {tour.itinerary.map((s) => (
                  <li key={s.title}>
                    <span className="timeline-time">{s.time}</span>
                    <div><h3>{s.title}</h3><p>{s.text}</p></div>
                  </li>
                ))}
              </ol>
            </section>

            <section className="block two-col">
              <div>
                <h2>{t('tour.included')}</h2>
                <ul className="ticks ok">{tour.inclusions.map((x) => <li key={x}><Icon name="check" size={18} /> {x}</li>)}</ul>
              </div>
              <div>
                <h2>{t('tour.excluded')}</h2>
                <ul className="ticks no">{tour.exclusions.map((x) => <li key={x}><Icon name="x" size={18} /> {x}</li>)}</ul>
              </div>
            </section>

            {/* Transparent pricing tiers */}
            <section className="block">
              <h2>{t('tour.pricingTitle')}</h2>
              <div className="price-tiers">
                <div><span>{t('tour.adult')}</span><b>{price(tour.pricing.adult)}</b></div>
                {tour.minAge < 12 && <div><span>{t('tour.child')}</span><b>{price(tour.pricing.child)}</b></div>}
                <div><span>{t('tour.private')}</span><b>{price(tour.pricing.privateFlat)}</b></div>
              </div>
              <ul className="small muted plain">
                {tour.pricing.group && <li>{t('tour.groupRate', { n: tour.pricing.group.minGuests, p: Math.round(tour.pricing.group.discount * 100) })}</li>}
                {tour.pricing.seasons.map((s) => <li key={s.name}>{s.name}: {s.multiplier > 1 ? '+' : '−'}{Math.round(Math.abs(s.multiplier - 1) * 100)}%</li>)}
              </ul>
            </section>

            <section className="block">
              <h2>{t('tour.bring')}</h2>
              <ul className="pill-list">{tour.whatToBring.map((x) => <li key={x}>{x}</li>)}</ul>
            </section>

            <section className="block">
              <h2>{t('tour.meeting')}</h2>
              <p><b>{tour.meetingPoint.name}</b>: {tour.meetingPoint.note}</p>
              <RouteMap stops={tour.stops} meetingPoint={tour.meetingPoint} />
            </section>

            {/* Policy summary: builds trust right where people decide */}
            {policy && (
              <section className="block policy-box">
                <h2><Icon name="shield" /> {t('tour.policy')}</h2>
                <ul className="plain">
                  {policy.refundTiers.map((tier) => <li key={tier.label}><b>{tier.percent}%</b> refund · {tier.label}</li>)}
                  <li>{policy.weather.options.join(' or ')} if we cancel for weather.</li>
                </ul>
                <Link href="/policies" className="link-strong">{t('tour.readPolicy')} <Icon name="arrowRight" size={16} /></Link>
              </section>
            )}

            <section className="block" id="reviews">
              <h2>{t('tour.reviews')}</h2>
              {reviews.length ? <ReviewList reviews={reviews} /> : <p className="empty">{t('home.reviewsEmpty')}</p>}
            </section>
          </div>

          {/* ================= RIGHT: booking ================= */}
          <aside className="tour-aside" aria-label={t('book.title')}>
            <BookingPanel tour={tour} addons={addons} />
          </aside>
        </div>
      </div>

      <MobileBookBar tour={tour} />
    </>
  );
}
