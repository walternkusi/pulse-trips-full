'use client';
// Fixed glass sidebar on desktop, slide-in drawer on phones.
import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { CalendarCheck, Globe, LayoutDashboard, LogOut, Map, Megaphone, ScanLine, ShieldCheck, Truck, Users, Wallet, X } from 'lucide-react';
import { useAdmin } from './AdminContext';

const GROUPS = [
  { label: 'Overview', items: [
    { href: '/admin', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/finance', label: 'Finance', icon: Wallet },
  ] },
  { label: 'Operations', items: [
    { href: '/admin/bookings', label: 'Bookings', icon: CalendarCheck, badge: 'payments', tone: 'amber', hint: 'MoMo payments to confirm' },
    { href: '/admin/roster', label: 'Roster', icon: Truck },
    { href: '/admin/check-in', label: 'Check-in', icon: ScanLine },
  ] },
  { label: 'Content', items: [
    { href: '/admin/tours', label: 'Tours', icon: Map },
    { href: '/admin/moderation', label: 'Moderation', icon: ShieldCheck, badge: 'hidden', tone: 'rose', hint: 'hidden tours' },
    { href: '/admin/announcements', label: 'Announcements', icon: Megaphone, badge: 'drafts', tone: 'amber', hint: 'drafts' },
  ] },
  { label: 'Customers', items: [{ href: '/admin/guests', label: 'Guests', icon: Users }] },
];
const BADGE = { amber: 'bg-amber-400 text-amber-950', rose: 'bg-rose-400 text-rose-950' };

export default function Sidebar() {
  const pathname = usePathname();
  const { attention, mobileNav, setMobileNav, logout, payConfig, adminName, adminRole } = useAdmin();
  const isActive = (href) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));

  // Close the drawer on navigation and with Escape.
  useEffect(() => setMobileNav(false), [pathname, setMobileNav]);
  useEffect(() => {
    if (!mobileNav) return undefined;
    const onKey = (e) => e.key === 'Escape' && setMobileNav(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileNav, setMobileNav]);

  const live = payConfig && !payConfig.demo;

  return (
    <>
      {mobileNav && <button type="button" aria-label="Close menu" onClick={() => setMobileNav(false)} className="fixed inset-0 z-30 cursor-default bg-slate-950/60 backdrop-blur-sm lg:hidden" />}
      <aside id="admin-sidebar" aria-label="Admin navigation"
        className={`glass-card glass-card-strong fixed bottom-3 left-3 top-3 z-40 flex w-[17.5rem] flex-col p-4 transition-transform duration-300 ease-out lg:static lg:z-auto lg:m-4 lg:mr-0 lg:translate-x-0 ${mobileNav ? 'translate-x-0' : '-translate-x-[110%]'}`}>
        <div className="mb-4 flex items-center justify-between gap-2">
          <Link href="/admin" className="flex items-center gap-3 rounded-xl p-1 transition hover:bg-white/10">
            <img src="/logo-256.jpg" alt="" width="40" height="40" className="h-10 w-10 rounded-full object-cover ring-2 ring-white/30" />
            <span className="leading-tight">
              <span className="block text-lg font-semibold text-white">Pulse<span className="text-cyan-300">Trips</span></span>
              <span className="block text-[11px] uppercase tracking-[.18em] text-white/70">Team dashboard</span>
            </span>
          </Link>
          <button type="button" aria-label="Close menu" onClick={() => setMobileNav(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/80 transition hover:bg-white/15 lg:hidden"><X size={20} /></button>
        </div>

        <nav className="glass-scroll -mr-2 flex-1 overflow-y-auto pr-2" aria-label="Sections">
          {GROUPS.map((g, gi) => (
            <div key={g.label} className={gi ? 'mt-4' : ''}>
              <p className="m-0 mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[.16em] text-white/70">{g.label}</p>
              <ul className="m-0 grid list-none gap-1 p-0">
                {g.items.map((it, i) => {
                  const active = isActive(it.href);
                  const count = it.badge ? attention[it.badge] : 0;
                  return (
                    <motion.li key={it.href} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * (gi * 3 + i), duration: 0.35 }}>
                      <Link href={it.href} aria-current={active ? 'page' : undefined}
                        className={`group flex min-h-[42px] items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all duration-200 ${active ? 'bg-teal-400/30 text-white shadow-lg shadow-teal-950/30 ring-1 ring-inset ring-teal-200/40' : 'text-white/80 hover:translate-x-1 hover:bg-white/12 hover:text-white'}`}>
                        <it.icon size={19} aria-hidden="true" className={active ? 'text-cyan-200' : 'text-white/70 transition group-hover:scale-110 group-hover:text-cyan-200'} />
                        <span className="flex-1">{it.label}</span>
                        {count > 0 && <span title={`${count} ${it.hint}`} className={`inline-flex min-w-[22px] items-center justify-center rounded-full px-1.5 text-xs font-bold ${BADGE[it.tone]}`}>{count}<span className="sr-only"> {it.hint}</span></span>}
                      </Link>
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Account / status card */}
        <div className="mt-3 rounded-2xl border border-white/20 bg-white/10 p-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 text-base font-semibold text-white ring-2 ring-white/30" aria-hidden="true">{adminName[0]?.toUpperCase()}</span>
            <div className="min-w-0 leading-tight">
              <p className="m-0 truncate text-sm font-semibold text-white">{adminName}</p>
              <p className="m-0 text-xs text-white/80">{adminRole}</p>
            </div>
          </div>
          <p className="m-0 mt-3 flex items-center gap-2 text-xs text-white/80">
            <span className={`h-2 w-2 rounded-full ${live ? 'bg-emerald-400' : 'bg-amber-400'}`} aria-hidden="true" />
            {payConfig ? (live ? `Live payments${payConfig.momoQr ? ' · MoMo QR on' : ''}` : 'Demo payments') : 'Checking payments…'}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link href="/" className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/10 text-xs font-semibold text-white transition hover:bg-white/20"><Globe size={14} aria-hidden="true" /> Website</Link>
            <button type="button" onClick={logout} className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/10 text-xs font-semibold text-white transition hover:bg-rose-400/30"><LogOut size={14} aria-hidden="true" /> Sign out</button>
          </div>
        </div>
      </aside>
    </>
  );
}
