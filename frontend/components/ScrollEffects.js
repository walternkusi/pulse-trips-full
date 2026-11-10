'use client';
// =============================================================================
// SCROLL EFFECTS (site-wide, no per-page wiring)
//   • progress bar   thin gradient line at the top showing how far you have read
//   • spotlight      a soft glow follows the mouse inside cards
// The fade-up reveal of cards and sections is pure CSS now (section 22 of globals.css): nothing here
// touches the page's own elements while React is still hydrating them, which used to trigger a
// "hydration mismatch" warning in development.
// =============================================================================
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

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
    let attached = false;
    const attach = () => { attached = true; document.addEventListener('pointermove', onMove, { passive: true }); };
    // Only after the page is fully loaded and hydrated: writing styles on cards earlier would clash with React.
    let timer = 0;
    const start = () => { timer = setTimeout(attach, 1500); };
    if (document.readyState === 'complete') start(); else window.addEventListener('load', start, { once: true });
    return () => { clearTimeout(timer); window.removeEventListener('load', start); if (attached) document.removeEventListener('pointermove', onMove); cancelAnimationFrame(frame); };
  }, [admin]);

  if (admin) return null;
  return <div ref={bar} className="scroll-progress" aria-hidden="true" />;
}
