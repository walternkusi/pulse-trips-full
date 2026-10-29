// =============================================================================
// REVIEWS PAGE (server component)
// Summary (average + star distribution), all verified reviews, the review
// form, and links to external review platforms (TripAdvisor / Google).
//
// 🔌 To EMBED TripAdvisor or Google reviews, paste their widget code where
//    marked below, or fetch them server-side with the Google Places API.
// =============================================================================
import ReviewList from '@/components/ReviewList';
import ReviewForm from '@/components/ReviewForm';
import { Stars } from '@/components/Icons';
import { api } from '@/lib/api';
import { getServerContext } from '@/lib/prefs';

export const metadata = {
  title: 'Verified Traveler Reviews',
  description: 'Honest reviews from guests who booked and travelled with Pulse Trips, with star ratings and traveler photos.',
  alternates: { canonical: '/reviews' },
};

const EXTERNAL = [
  ['TripAdvisor', process.env.NEXT_PUBLIC_TRIPADVISOR_URL],
  ['Google', process.env.NEXT_PUBLIC_GOOGLE_REVIEWS_URL],
].filter(([, url]) => url);

export default async function Reviews() {
  const { t } = await getServerContext();
  const { reviews } = await api.getReviews();
  const count = reviews.length;
  const average = count ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;
  // How many 5★, 4★ … 1★ reviews (for the distribution bars).
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: reviews.filter((r) => r.rating === n).length }));

  return (
    <>
      <section className="page-hero">
        <div className="wrap">
          <h1>{t('reviews.title')}</h1>
          <p>{t('reviews.sub')}</p>
        </div>
      </section>

      <div className="wrap section reviews-layout">
        <div>
          {count > 0 && (
            <div className="rating-summary card">
              <div className="rating-big"><b>{average}</b><Stars value={average} size={20} /><span className="muted small">{t('reviews.basedOn', { n: count })}</span></div>
              <ul className="dist">
                {dist.map(({ n, c }) => (
                  <li key={n} title={`${c} × ${n}★`}>
                    <span>{n}★</span>
                    <span className="dist-bar"><span style={{ width: `${(c / count) * 100}%` }} /></span>
                    <span className="small">{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Empty state: tells visitors what is happening instead of a blank page */}
          {count === 0 ? <p className="empty">{t('home.reviewsEmpty')}</p> : <ReviewList reviews={reviews} showTour />}

          {EXTERNAL.length > 0 && (
            <p className="external-reviews">
              {t('reviews.also')}{' '}
              {EXTERNAL.map(([name, url]) => <a key={name} href={url} target="_blank" rel="noopener" className="chip chip-soft">{name} ↗</a>)}
            </p>
          )}
          {/* ↓ Paste a TripAdvisor / Google reviews widget here if you use one. */}
        </div>

        <aside><ReviewForm /></aside>
      </div>
    </>
  );
}
