'use client';
// =============================================================================
// SITE FOOTER
// Brand, link columns, embedded newsletter sign-up, accepted payment methods,
// contact shortcuts and legal line.
// =============================================================================
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePrefs } from './Providers';
import { Logo } from './Header';
import NewsletterForm from './NewsletterForm';
import Icon from './Icons';

const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP || '250790631111';
const EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'hello@pulsetrips.example';

export default function Footer() {
  const { t } = usePrefs();
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null; // admin has its own layout

  return (
    <footer className="site-footer">
      {/* Thin gradient line echoing the logo */}
      <div className="grad-line" aria-hidden="true" />
      <div className="wrap footer-grid">
        <div className="footer-brand">
          <Logo size={52} />
          <p>{t('footer.tagline')}</p>
          <div className="footer-contact">
            {WHATSAPP && <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener"><Icon name="whatsapp" size={18} /> WhatsApp</a>}
            <a href={`mailto:${EMAIL}`}><Icon name="mail" size={18} /> {EMAIL}</a>
          </div>
        </div>

        <nav aria-label={t('footer.explore')}>
          <h2 className="footer-title">{t('footer.explore')}</h2>
          <Link href="/tours?category=safari">{t('cat.safari')}</Link>
          <Link href="/tours?category=adventure">{t('cat.adventure')}</Link>
          <Link href="/tours?category=day-trip">{t('cat.day-trip')}</Link>
          <Link href="/tours?category=event">{t('cat.event')}</Link>
          <Link href="/travel-guide">{t('footer.guide')}</Link>
        </nav>

        <nav aria-label={t('footer.help')}>
          <h2 className="footer-title">{t('footer.help')}</h2>
          <Link href="/bookings">{t('nav.myBooking')}</Link>
          <Link href="/how-it-works">{t('nav.how')}</Link>
          <Link href="/policies">{t('nav.policies')}</Link>
          <Link href="/reviews">{t('nav.reviews')}</Link>
          <Link href="/contact">{t('nav.contact')}</Link>
        </nav>

        <div>
          <h2 className="footer-title">{t('footer.newsletter')}</h2>
          <p className="footer-small">{t('news.title')}</p>
          <NewsletterForm source="footer" variant="dark" />
        </div>
      </div>

      <div className="wrap footer-bottom">
        <span>© {new Date().getFullYear()} Pulse Trips. {t('footer.rights')}</span>
        {/* Accepted payment methods: builds trust right before checkout */}
        <ul className="pay-badges" aria-label="Accepted payment methods">
          {['Visa', 'Mastercard', 'Apple Pay', 'Google Pay', 'M-Pesa', 'MTN MoMo'].map((m) => <li key={m}>{m}</li>)}
        </ul>
      </div>
    </footer>
  );
}
