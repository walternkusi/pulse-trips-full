// =============================================================================
// ROOT LAYOUT (server component)
// Wraps every page: fonts, global CSS, preferences, header/footer, chat,
// promo pop-up, analytics and site-wide SEO defaults.
// =============================================================================
import './globals.css';
import { Suspense } from 'react';
import { Poppins, Inter } from 'next/font/google';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ChatWidget from '@/components/ChatWidget';
import PromoPopup from '@/components/PromoPopup';
import { Analytics, ConsentBanner } from '@/components/Analytics';
import { PrefsProvider } from '@/components/Providers';
import { getServerContext } from '@/lib/prefs';

// next/font self-hosts the fonts (no request to Google at runtime, no layout shift).
// Poppins matches the bold geometric wordmark in the logo; Inter is very readable for body text.
const heading = Poppins({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--f-head', display: 'swap' });
const body = Inter({ subsets: ['latin'], variable: '--f-body', display: 'swap' });

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// --- SEO defaults (pages override title/description) -----------------------------
export const metadata = {
  metadataBase: new URL(SITE),
  title: { default: 'Pulse Trips | African Safaris, Treks & Events', template: '%s | Pulse Trips' },
  description: 'Book African safaris, Kilimanjaro treks, city day trips and events with local guides. Live availability, instant confirmation, M-Pesa & card payments.',
  keywords: ['African safari', 'Serengeti safari', 'Kilimanjaro trek', 'Nairobi tours', 'Cape Town tours', 'Africa events'],
  openGraph: { type: 'website', siteName: 'Pulse Trips', locale: 'en_GB', images: [{ url: '/logo.jpg', width: 1024, height: 1024, alt: 'Pulse Trips' }] },
  twitter: { card: 'summary_large_image' },
  alternates: { canonical: '/' },
};

// Mobile browser chrome matches the brand navy.
export const viewport = { themeColor: '#151A24', width: 'device-width', initialScale: 1 };

// Schema.org: tells search engines who we are (shows in Google's knowledge panel).
const organizationLd = {
  '@context': 'https://schema.org',
  '@type': 'TravelAgency',
  name: 'Pulse Trips',
  slogan: 'Africa · Events · Travel · Vibes',
  url: SITE,
  logo: `${SITE}/logo.jpg`,
  areaServed: ['Kenya', 'Tanzania', 'South Africa', 'Rwanda', 'Uganda'],
  ...(process.env.NEXT_PUBLIC_WHATSAPP ? { telephone: `+${process.env.NEXT_PUBLIC_WHATSAPP}` } : {}),
};

export default async function RootLayout({ children }) {
  const { lang, currency, rates, dict } = await getServerContext();
  return (
    <html lang={lang} className={`${heading.variable} ${body.variable}`}>
      <body>
        <PrefsProvider lang={lang} currency={currency} rates={rates} dict={dict}>
          {/* useSearchParams inside Analytics needs a Suspense boundary */}
          <Suspense fallback={null}><Analytics /></Suspense>
          <Header />
          <main id="main">{children}</main>
          <Footer />
          <ChatWidget />
          <PromoPopup />
          <ConsentBanner />
        </PrefsProvider>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }} />
      </body>
    </html>
  );
}
