// =============================================================================
// HOME PAGE (server component)
// Rendered on the server: fast first paint and fully indexable by Google.
// Sections: hero + search · trust strip · featured · categories · why us ·
// reviews · newsletter.
// =============================================================================
import Link from 'next/link';
import TourCard from '@/components/TourCard';
import ReviewList from '@/components/ReviewList';
import NewsletterForm from '@/components/NewsletterForm';
import Icon from '@/components/Icons';
import { api } from '@/lib/api';
import { getServerContext } from '@/lib/prefs';

const HERO_IMG = 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=2000&q=70';

export default async function Home() {
  const { t } = await getServerContext();
  const [{ tours, destinations }, { reviews }] = await Promise.all([api.getTours(), api.getReviews().catch(() => ({ reviews: [] }))]);

  // Featured: tours ticked "Show on home page" in the admin first, then best rated,
  // then catalogue order. Up to 6 cards (two rows on desktop).
  const featured = [...tours]
    .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || (b.rating?.average || 0) - (a.rating?.average || 0))
    .slice(0, 6);
  // Every destination we operate in (incl. ones without tours yet, e.g. Rwanda).
  const countries = destinations || [...new Set(tours.map((x) => x.country))].sort();
  // One representative photo per category for the "explore by experience" tiles.
  const categories = ['safari', 'adventure', 'day-trip', 'event'].map((c) => ({ c, img: tours.find((x) => x.category === c)?.images[0] }));

  const why = [
    { icon: 'users', title: t('why.local.t'), text: t('why.local.d') },
    { icon: 'calendar', title: t('why.flex.t'), text: t('why.flex.d') },
    { icon: 'shield', title: t('why.secure.t'), text: t('why.secure.d') },
    { icon: 'chat', title: t('why.support.t'), text: t('why.support.d') },
  ];

  return (
    <>
      {/* ---------------- HERO ---------------- */}
      <section className="hero">
        <img className="hero-bg" src={HERO_IMG} alt="" fetchPriority="high" />
        <div className="hero-shade" aria-hidden="true" />
        <div className="wrap hero-content">
          <p className="kicker kicker-light">{t('hero.kicker')}</p>
          <h1>{t('hero.title1')} <span className="grad-text">{t('hero.title2')}</span></h1>
          <p className="hero-sub">{t('hero.sub')}</p>

          {/* Plain GET form: works even before JavaScript loads, lands on clean /tours?country=… URLs */}
          <form action="/tours" className="hero-search" role="search">
            <label>
              <span>{t('hero.where')}</span>
              <select name="country" defaultValue="">
                <option value="">{t('hero.anywhere')}</option>
                {countries.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label>
              <span>{t('hero.what')}</span>
              <select name="category" defaultValue="">
                <option value="">{t('hero.anything')}</option>
                {['safari', 'adventure', 'day-trip', 'event'].map((c) => <option key={c} value={c}>{t(`cat.${c}`)}</option>)}
              </select>
            </label>
            <button className="btn btn-lg">{t('hero.search')} <Icon name="arrowRight" size={18} /></button>
          </form>
        </div>
      </section>

      {/* ---------------- TRUST STRIP ---------------- */}
      <section className="trust" aria-label="Why book with us">
        <ul className="wrap trust-row">
          <li><Icon name="bolt" /> {t('trust.instant')}</li>
          <li><Icon name="calendar" /> {t('trust.free')}</li>
          <li><Icon name="lock" /> {t('trust.secure')}</li>
          <li><Icon name="shield" /> {t('trust.local')}</li>
        </ul>
      </section>

      {/* ---------------- FEATURED ---------------- */}
      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <h2>{t('home.featured')}</h2>
              <p className="muted">{t('home.featuredSub')}</p>
            </div>
            <Link href="/tours" className="link-strong">{t('home.viewAll')} <Icon name="arrowRight" size={16} /></Link>
          </div>
          <div className="tour-grid">{featured.map((tour, i) => <TourCard key={tour.slug} tour={tour} priority={i === 0} />)}</div>
        </div>
      </section>

      {/* ---------------- CATEGORIES ---------------- */}
      <section className="section section-tint">
        <div className="wrap">
          <h2>{t('home.explore')}</h2>
          <div className="cat-grid">
            {categories.map(({ c, img }) => (
              <Link key={c} href={`/tours?category=${c}`} className="cat-tile">
                {img && <img src={img.src.replace('w=1600', 'w=700')} alt="" loading="lazy" />}
                <span>{t(`cat.${c}`)} <Icon name="arrowRight" size={18} /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- WHY US ---------------- */}
      <section className="section">
        <div className="wrap">
          <h2>{t('home.whyTitle')}</h2>
          <div className="why-grid">
            {why.map((w) => (
              <div key={w.title} className="why-item">
                <span className="why-icon"><Icon name={w.icon} size={24} /></span>
                <h3>{w.title}</h3>
                <p className="muted">{w.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- REVIEWS ---------------- */}
      <section className="section section-tint">
        <div className="wrap">
          <div className="section-head">
            <h2>{t('home.reviewsTitle')}</h2>
            <Link href="/reviews" className="link-strong">{t('nav.reviews')} <Icon name="arrowRight" size={16} /></Link>
          </div>
          {/* Honest empty state: no invented testimonials */}
          {reviews.length ? <ReviewList reviews={reviews.slice(0, 3)} showTour /> : <p className="empty">{t('home.reviewsEmpty')}</p>}
        </div>
      </section>

      {/* ---------------- NEWSLETTER ---------------- */}
      <section className="news-band">
        <div className="wrap news-band-inner">
          <div>
            <h2>{t('news.title')}</h2>
            <p>{t('news.sub')}</p>
          </div>
          <NewsletterForm source="home" variant="band" />
        </div>
      </section>
    </>
  );
}
