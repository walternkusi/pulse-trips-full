'use client';
// =============================================================================
// ADMIN SHELL: glass background, sign-in, sidebar + top bar, and the data every page shares.
// The token lives in sessionStorage (cleared when the tab closes), exactly as before.
// =============================================================================
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MotionConfig, motion } from 'framer-motion';
import { LockKeyhole } from 'lucide-react';
import { api } from '@/lib/api';
import { needsPaymentCheck } from '@/lib/admin-stats';
import { MOCK_ANNOUNCEMENTS } from '@/lib/admin-mock';
import { ConfirmProvider } from '@/components/ConfirmDialog';
import { AdminContext } from './AdminContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { tealBtn } from './PageHeader';

const TOKEN_KEY = 'pt_admin_token';
const THEME_KEY = 'pt_admin_theme';
const NAME = process.env.NEXT_PUBLIC_ADMIN_NAME || 'Admin';
const ROLE = process.env.NEXT_PUBLIC_ADMIN_ROLE || 'Owner';

function Blobs() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="glass-blob a" /><div className="glass-blob b" /><div className="glass-blob c" />
    </div>
  );
}

function Login({ onLogin, theme }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try { await onLogin(input); } catch (err) { setError(err.message); }
    setBusy(false);
  }
  return (
    <div className="glass-root" data-theme={theme}>
      <Blobs />
      <div className="relative flex h-full items-center justify-center p-4">
        <motion.form onSubmit={submit} initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, ease: [0.22, 0.8, 0.3, 1] }} className="glass-card glass-card-strong grid w-full max-w-sm gap-4 p-7">
          <img src="/logo-256.jpg" alt="Pulse Trips" width="64" height="64" className="h-16 w-16 rounded-full object-cover ring-2 ring-white/30" />
          <div>
            <h1 className="m-0 text-2xl font-semibold text-white">Team dashboard</h1>
            <p className="m-0 mt-1 text-sm text-white/70">Sign in with your admin token.</p>
          </div>
          <label className="grid gap-1.5 text-sm font-medium text-white/90" htmlFor="admin-token">Admin token
            <span className="relative block">
              <LockKeyhole size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/70" />
              <input id="admin-token" type="password" required autoComplete="current-password" value={input} onChange={(e) => setInput(e.target.value)}
                className="h-11 w-full rounded-xl border border-white/25 bg-white/10 pl-10 pr-3 text-white outline-none transition hover:border-white/45 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/20" />
            </span>
          </label>
          <button disabled={busy} className={`${tealBtn} w-full disabled:opacity-60`}>{busy ? 'Checking…' : 'Sign in'}</button>
          {error && <p role="alert" className="m-0 rounded-lg bg-rose-400/20 px-3 py-2 text-sm text-rose-100">{error}</p>}
          <Link href="/" className="text-center text-sm text-white/70 transition hover:text-white">← Back to website</Link>
        </motion.form>
      </div>
    </div>
  );
}

export default function AdminShell({ children }) {
  const [booted, setBooted] = useState(false);
  const [token, setToken] = useState('');
  const [theme, setThemeState] = useState('teal');
  const [mobileNav, setMobileNav] = useState(false);
  const [data, setData] = useState({ overview: null, bookings: null, tours: null, payConfig: null });
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState(0);

  const logout = useCallback(() => { try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } setToken(''); setData({ overview: null, bookings: null, tours: null, payConfig: null }); }, []);

  const load = useCallback(async (tok) => {
    setError('');
    try {
      const [overview, bookings, tours, payConfig] = await Promise.all([
        api.admin.overview(tok), api.admin.bookings(tok, {}), api.admin.tours(tok), api.paymentConfig().catch(() => null),
      ]);
      setData({ overview, bookings: bookings.bookings, tours: tours.tours, payConfig });
    } catch (e) {
      if (e.status === 401) logout(); else setError(e.message);
    }
  }, [logout]);

  // Restore the saved token and theme once.
  useEffect(() => {
    let saved = '';
    try { saved = sessionStorage.getItem(TOKEN_KEY) || ''; setThemeState(localStorage.getItem(THEME_KEY) || 'teal'); } catch { /* ignore */ }
    setToken(saved); setBooted(true);
  }, []);
  useEffect(() => { if (token) load(token); }, [token, load]);

  // Announcement drafts (sample data kept in this browser) drive one sidebar badge.
  useEffect(() => {
    const read = () => {
      try { const list = JSON.parse(localStorage.getItem('pt_admin_announcements') || 'null') || MOCK_ANNOUNCEMENTS; setDrafts(list.filter((a) => a.status === 'draft').length); } catch { setDrafts(0); }
    };
    read(); window.addEventListener('pt-announcements', read);
    return () => window.removeEventListener('pt-announcements', read);
  }, []);

  const setTheme = useCallback((t) => { setThemeState(t); try { localStorage.setItem(THEME_KEY, t); } catch { /* ignore */ } }, []);

  async function login(input) {
    await api.admin.overview(input); // throws "Invalid admin token." when wrong
    try { sessionStorage.setItem(TOKEN_KEY, input); } catch { /* ignore */ }
    setToken(input);
  }

  const pendingPayments = useMemo(() => (data.bookings || []).filter(needsPaymentCheck), [data.bookings]);
  const attention = useMemo(() => ({
    payments: pendingPayments.length,
    hidden: (data.tours || []).filter((t) => t.published === false).length,
    drafts,
  }), [pendingPayments, data.tours, drafts]);

  const value = useMemo(() => ({
    token, logout, ...data, error, reload: () => load(token), loading: !data.overview && !error,
    theme, setTheme, mobileNav, setMobileNav, attention, pendingPayments, adminName: NAME, adminRole: ROLE,
  }), [token, logout, data, error, load, theme, setTheme, mobileNav, attention, pendingPayments]);

  if (!booted) return <div className="glass-root" data-theme={theme}><Blobs /></div>;
  if (!token) return <MotionConfig reducedMotion="user"><Login onLogin={login} theme={theme} /></MotionConfig>;

  return (
    <MotionConfig reducedMotion="user">
      <AdminContext.Provider value={value}>
        <div className="glass-root" data-theme={theme}>
          <ConfirmProvider>
          <Blobs />
          <a href="#admin-main" className="absolute left-3 top-[-60px] z-50 rounded-lg bg-white px-4 py-2 font-semibold text-slate-900 focus:top-3">Skip to content</a>
          <div className="relative flex h-full">
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <Topbar />
              <main id="admin-main" tabIndex={-1} className="glass-scroll flex-1 overflow-y-auto px-4 pb-12 pt-6 outline-none sm:px-6 lg:px-8">
                {error && <p role="alert" className="mb-4 rounded-xl bg-rose-400/20 px-4 py-3 text-sm text-rose-100">Could not load data: {error} <button type="button" onClick={value.reload} className="ml-2 font-semibold underline">Retry</button></p>}
                <div className="mx-auto w-full max-w-[1320px]">{children}</div>
              </main>
            </div>
          </div>
          </ConfirmProvider>
        </div>
      </AdminContext.Provider>
    </MotionConfig>
  );
}
