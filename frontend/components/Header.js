'use client'; // mobile menu needs state
// =============================================================================
// SITE HEADER
// Desktop: logo · navigation · language/currency · "My booking".
// Mobile:  logo · hamburger that opens a full-width drawer.
// Sticky with a subtle shadow once the page scrolls.
// =============================================================================
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePrefs } from './Providers';
import PrefsToggle from './PrefsToggle';
import Icon from './Icons';

// Brand mark: round logo + wordmark (used in header and footer).
export function Logo({ size = 44 }) {
  return (
    <span className="brand">
      {/* Plain <img>: the logo is tiny and already optimised (256 px JPEG). */}
      <img src="/logo-256.jpg" alt="" width={size} height={size} className="brand-img" />
      <span className="brand-word">Pulse<span>Trips</span></span>
    </span>
  );
}

export default function Header() {
  const { t } = usePrefs();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const links = [
    ['/tours', t('nav.tours')], ['/how-it-works', t('nav.how')], ['/reviews', t('nav.reviews')],
    ['/policies', t('nav.policies')], ['/contact', t('nav.contact')],
  ];

  // Close the mobile drawer whenever the route changes.
  useEffect(() => setOpen(false), [pathname]);

  // Add a shadow after scrolling a little (visual separation from content).
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Escape closes the drawer (keyboard users).
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Admin has its own chrome.
  if (pathname.startsWith('/admin')) return null;

  const isActive = (href) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
      <a href="#main" className="skip-link">{t('nav.skip')}</a>
      <div className="wrap header-row">
        <Link href="/" aria-label="Pulse Trips home"><Logo /></Link>

        {/* Desktop navigation */}
        <nav aria-label="Main" className="nav-desktop">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className={isActive(href) ? 'active' : ''} aria-current={isActive(href) ? 'page' : undefined}>{label}</Link>
          ))}
        </nav>

        <div className="header-actions">
          <PrefsToggle className="hide-mobile" />
          <Link href="/bookings" className="btn btn-sm btn-outline-light hide-mobile">{t('nav.myBooking')}</Link>
          <button className="icon-btn show-mobile" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(!open)} aria-label={open ? t('nav.close') : t('nav.menu')}>
            <Icon name={open ? 'x' : 'menu'} size={24} />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div id="mobile-nav" className={`mobile-nav ${open ? 'open' : ''}`} hidden={!open}>
        <nav aria-label="Mobile" className="wrap">
          {links.map(([href, label]) => <Link key={href} href={href} aria-current={isActive(href) ? 'page' : undefined}>{label}</Link>)}
          <Link href="/bookings">{t('nav.myBooking')}</Link>
          <PrefsToggle className="prefs-mobile" />
        </nav>
      </div>
    </header>
  );
}
