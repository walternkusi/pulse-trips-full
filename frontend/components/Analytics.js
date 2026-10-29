'use client';
// =============================================================================
// GOOGLE ANALYTICS 4 + COOKIE CONSENT
// • Loads gtag.js only when NEXT_PUBLIC_GA_ID is set.
// • Google Consent Mode v2: analytics cookies stay OFF until the visitor
//   clicks "Accept" in the consent banner (GDPR / POPIA / Kenya DPA friendly).
// • Sends a page_view on every client-side navigation (Next.js doesn't reload
//   pages, so GA would otherwise only see the first one).
//
// In GA4, mark `purchase` and `generate_lead` as key events (conversions) and
// build a funnel exploration: view_item -> begin_checkout -> add_payment_info
// -> purchase to see where visitors abandon checkout.
// =============================================================================
import { useEffect, useState } from 'react';
import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { usePrefs } from './Providers';
import { track, getConsent, setConsent } from '@/lib/analytics';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID || '';

export function Analytics() {
  const pathname = usePathname();
  const search = useSearchParams();

  // Page view on each route change (also logs to our first-party funnel).
  useEffect(() => {
    track('page_view', { page_path: pathname, page_location: window.location.href, page_title: document.title });
  }, [pathname, search]);

  if (!GA_ID) return null;
  // The stored consent is read INSIDE the script (not during render) so server
  // and browser HTML stay identical (no hydration mismatch).
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;
var c='denied';try{if(localStorage.getItem('pt_consent')==='granted')c='granted';}catch(e){}
gtag('consent','default',{analytics_storage:c,ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
gtag('js',new Date());gtag('config',${JSON.stringify(GA_ID)},{send_page_view:false});`}
      </Script>
    </>
  );
}

// Small banner at the bottom; remembers the choice in localStorage.
export function ConsentBanner() {
  const { t } = usePrefs();
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  // Only ask when GA is actually configured, and only once.
  useEffect(() => { if (GA_ID && !getConsent()) setShow(true); }, []);
  if (!show || pathname.startsWith('/admin')) return null;

  const choose = (v) => { setConsent(v); setShow(false); };
  return (
    <div className="consent" role="region" aria-label="Cookie consent">
      <p>{t('consent.text')} <a href="/policies#privacy">Privacy</a></p>
      <div className="consent-actions">
        <button className="btn btn-sm btn-ghost" onClick={() => choose('denied')}>{t('consent.decline')}</button>
        <button className="btn btn-sm" onClick={() => choose('granted')}>{t('consent.accept')}</button>
      </div>
    </div>
  );
}
