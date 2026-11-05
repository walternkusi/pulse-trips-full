'use client';
// Glass top bar: menu button (phones), search, notifications, theme switch and the user.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Menu, Moon, Search, Sun } from 'lucide-react';
import { useAdmin } from './AdminContext';
import { usd } from './charts';

const iconBtn = 'relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white/90 transition hover:bg-white/20 hover:text-white active:scale-95';

export default function Topbar() {
  const router = useRouter();
  const { setMobileNav, mobileNav, theme, setTheme, attention, pendingPayments, adminName, adminRole } = useAdmin();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  // Close the notification list on outside click or Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown); document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const search = (e) => { e.preventDefault(); router.push(`/admin/bookings${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`); };

  return (
    <header className="glass-card relative z-20 mx-4 mt-4 flex items-center gap-3 px-3 py-2.5 sm:px-4 lg:mx-4">
      <button type="button" className={`${iconBtn} lg:hidden`} aria-label="Open menu" aria-expanded={mobileNav} aria-controls="admin-sidebar" onClick={() => setMobileNav(true)}><Menu size={20} /></button>

      <form role="search" onSubmit={search} className="relative min-w-0 flex-1 sm:max-w-md">
        <label htmlFor="admin-search" className="sr-only">Search bookings by reference, guest name or email</label>
        <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/70" />
        <input id="admin-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search bookings, guests…"
          className="h-10 w-full rounded-xl border border-white/20 bg-white/10 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-white/55 hover:border-white/40 focus:border-cyan-300 focus:bg-white/15 focus:ring-4 focus:ring-cyan-300/20" />
      </form>

      <div className="ml-auto flex items-center gap-2">
        <button type="button" className={iconBtn} onClick={() => setTheme(theme === 'teal' ? 'midnight' : 'teal')} aria-label={theme === 'teal' ? 'Switch to the midnight theme' : 'Switch to the teal theme'}>
          {theme === 'teal' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        <div ref={box} className="relative">
          <button type="button" className={iconBtn} aria-label={`Notifications${attention.payments ? `, ${attention.payments} to review` : ''}`} aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(!open)}>
            <Bell size={18} />
            {attention.payments > 0 && <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-amber-950">{attention.payments}</span>}
          </button>
          <AnimatePresence>
            {open && (
              <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="glass-pop absolute right-0 top-12 z-50 w-80 max-w-[calc(100vw-2rem)] p-3 text-white">
                <p className="m-0 mb-2 px-1 text-sm font-semibold">Payments to confirm</p>
                {pendingPayments.length ? (
                  <ul className="m-0 grid list-none gap-1 p-0">
                    {pendingPayments.slice(0, 5).map((b) => (
                      <li key={b.reference}>
                        <Link href={`/admin/bookings?q=${b.reference}`} onClick={() => setOpen(false)} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm transition hover:bg-white/15">
                          <span className="min-w-0"><b className="block truncate">{b.name}</b><span className="text-xs text-white/70">{b.reference} · ID {b.payment.proof.transactionId}</span></span>
                          <span className="shrink-0 text-xs font-semibold text-amber-200">{usd(b.totalUsd)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : <p className="m-0 px-1 py-3 text-sm text-white/70">All caught up. No MoMo payments are waiting.</p>}
                <Link href="/admin/bookings?status=pending" onClick={() => setOpen(false)} className="mt-2 block rounded-lg bg-white/10 py-2 text-center text-sm font-semibold transition hover:bg-white/20">Open bookings</Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="ml-1 flex items-center gap-3 border-l border-white/20 pl-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 text-base font-semibold text-white ring-2 ring-white/30" aria-hidden="true">{adminName[0]?.toUpperCase()}</span>
          <div className="hidden leading-tight sm:block">
            <p className="m-0 text-sm font-semibold text-white">{adminName}</p>
            <p className="m-0 text-xs text-white/80">{adminRole}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
