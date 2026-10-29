'use client';
// =============================================================================
// PROMO POP-UP (lead capture)
// Offers 10% off + the free travel guide in exchange for an email.
// Polite by design:
//   • appears after 25 s on the site OR when a desktop visitor moves to leave
//   • never on checkout-critical pages (/bookings, /admin)
//   • never again for 7 days once dismissed, never for subscribers
//   • closes with Esc, the ✕ button or a click on the backdrop
// =============================================================================
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { usePrefs } from './Providers';
import NewsletterForm, { SUBSCRIBED_KEY } from './NewsletterForm';
import Icon from './Icons';

const DISMISSED_KEY = 'pt_popup_dismissed_at';
const SNOOZE_MS = 7 * 86400000;
const DELAY_MS = 25000;

// Should we show the pop-up at all for this visitor?
function eligible() {
  try {
    if (localStorage.getItem(SUBSCRIBED_KEY)) return false;
    const at = Number(localStorage.getItem(DISMISSED_KEY));
    return !at || Date.now() - at > SNOOZE_MS;
  } catch { return false; } // storage blocked: don't risk showing it repeatedly
}

export default function PromoPopup() {
  const { t } = usePrefs();
  const pathname = usePathname();
  const dialogRef = useRef(null);
  const [open, setOpen] = useState(false);
  const blocked = pathname.startsWith('/bookings') || pathname.startsWith('/admin');

  // Timers / exit intent.
  useEffect(() => {
    if (blocked || !eligible()) return;
    const show = () => setOpen(true);
    const timer = setTimeout(show, DELAY_MS);
    // Exit intent: cursor leaves through the top of the window (desktop only).
    const onLeave = (e) => { if (e.clientY <= 0) show(); };
    document.addEventListener('mouseout', onLeave);
    return () => { clearTimeout(timer); document.removeEventListener('mouseout', onLeave); };
  }, [blocked]);

  // Native <dialog>: gives us focus trapping and Esc handling for free.
  useEffect(() => {
    const d = dialogRef.current;
    if (open && d && !d.open) d.showModal();
  }, [open]);

  function close() {
    try { localStorage.setItem(DISMISSED_KEY, String(Date.now())); } catch { /* ignore */ }
    dialogRef.current?.close();
    setOpen(false);
  }

  if (!open) return null;
  return (
    <dialog ref={dialogRef} className="promo-dialog" aria-labelledby="promo-title" onCancel={close}
      onClick={(e) => { if (e.target === dialogRef.current) close(); }}>
      <div className="promo-inner">
        <div className="promo-art" aria-hidden="true">
          <img src="/logo-256.jpg" alt="" width="96" height="96" />
          <span className="promo-badge">−10%</span>
        </div>
        <div className="promo-body">
          <button className="icon-btn promo-close" onClick={close} aria-label="Close"><Icon name="x" /></button>
          <p className="kicker">{t('hero.kicker')}</p>
          <h2 id="promo-title">{t('news.title')}</h2>
          <p className="muted">{t('news.sub')}</p>
          <NewsletterForm source="popup" />
          <p className="tiny muted">{t('news.privacy')}</p>
          <button className="link-btn" onClick={close}>{t('news.noThanks')}</button>
        </div>
      </div>
    </dialog>
  );
}
