'use client';
// =============================================================================
// SCROLL EFFECTS (site-wide, no per-page wiring)
//   • progress bar   thin gradient line at the top showing how far you have read
//   • reveal         cards and sections below the fold fade up as they scroll into view
//   • spotlight      a soft glow follows the mouse inside cards
// Everything is progressive: without JavaScript, or when the visitor asks their OS for
// reduced motion, nothing is hidden and nothing moves.
// =============================================================================
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

// What fades up. Elements already on screen when the page opens are left alone (no flash).
const REVEAL = [
  '.section-head', '.section > .wrap > h2', '.tour-card', '.cat-tile', '.why-item', '.review-card', '.step-card',
  '.contact-card', '.news-band-inner > *', '.facts-grid', '.block', '.faq details', '.policy-box', '.prose section',
  '.voucher', '.form-card', '.empty', '.trust-row li', '.footer-grid > *', '.price-tiers > div', '.rating-summary',
].join(',');

// Cards that get the mouse-following glow (they read --mx / --my).
const SPOTLIGHT = '.tour-card, .why-item, .step-card, .contact-card, .review-card';

export default function ScrollEffects() {
  const pathname = usePathname();
  const bar = useRef(null);
  const admin = pathname.startsWith('/admin');

  // --- Progress bar -------------------------------------------------------------
  useEffect(() => {
    if (admin) return undefined;
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(frame); };
  }, [pathname, admin]);

  // --- Reveal on scroll ---------------------------------------------------------
  useEffect(() => {
    if (admin || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timers = new Set();
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target;
        io.unobserve(el);
        el.setAttribute('data-rv', 'in');
        // Once it has faded in, drop the attribute so hover effects on the element work normally.
        const t = setTimeout(() => { el.removeAttribute('data-rv'); timers.delete(t); }, 1100 + (parseFloat(el.style.getPropertyValue('--rv-d')) || 0) * 1000);
        timers.add(t);
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    const scan = () => {
      const counts = new Map(); // stagger siblings: 0s, .07s, .14s … (max .42s)
      document.querySelectorAll(`main ${REVEAL.split(',').join(', main ')}, footer ${'.footer-grid > *'}`).forEach((el) => {
        if (el.dataset.rvSeen) return;
        el.dataset.rvSeen = '1';
        if (el.getBoundingClientRect().top < window.innerHeight * 0.95) return; // already visible
        const n = counts.get(el.parentElement) || 0;
        counts.set(el.parentElement, n + 1);
        el.style.setProperty('--rv-d', `${Math.min(n, 6) * 0.07}s`);
        el.setAttribute('data-rv', '');
        io.observe(el);
      });
    };

    scan();
    // Content that arrives a moment later (filters, streamed sections) is picked up too.
    let pending = 0;
    const mo = new MutationObserver(() => { if (!pending) pending = requestAnimationFrame(() => { pending = 0; scan(); }); });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); cancelAnimationFrame(pending); timers.forEach(clearTimeout); };
  }, [pathname, admin]);

  // --- Spotlight glow -----------------------------------------------------------
  useEffect(() => {
    if (admin || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined;
    let frame = 0;
    const onMove = (e) => {
      const card = e.target.closest?.(SPOTLIGHT);
      if (!card || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    };
    document.addEventListener('pointermove', onMove, { passive: true });
    return () => { document.removeEventListener('pointermove', onMove); cancelAnimationFrame(frame); };
  }, [admin]);

  if (admin) return null;
  return <div ref={bar} className="scroll-progress" aria-hidden="true" />;
}
