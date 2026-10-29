// =============================================================================
// ALL TOURS (server component)
// Clean URL: /tours, /tours?category=safari, /tours?country=Kenya
// =============================================================================
import { Suspense } from 'react';
import TourExplorer from '@/components/TourExplorer';
import { api } from '@/lib/api';
import { getServerContext } from '@/lib/prefs';

export const metadata = {
  title: 'Tours, Safaris & Events in Africa',
  description: 'Compare African safaris, Kilimanjaro treks, day trips and events. Filter by country and type, see live prices in your currency.',
  alternates: { canonical: '/tours' },
};

export default async function ToursPage() {
  const { t } = await getServerContext();
  const { tours, destinations } = await api.getTours();
  return (
    <>
      <section className="page-hero">
        <div className="wrap">
          <p className="kicker kicker-light">{t('hero.kicker')}</p>
          <h1>{t('home.featured')}</h1>
          <p>{t('hero.sub')}</p>
        </div>
      </section>
      <section className="section">
        <div className="wrap">
          {/* Suspense: TourExplorer reads the URL's search params in the browser */}
          <Suspense fallback={<p className="muted">{t('common.loading')}</p>}>
            <TourExplorer tours={tours} destinations={destinations} />
          </Suspense>
        </div>
      </section>
    </>
  );
}
