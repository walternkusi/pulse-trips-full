'use client';
// =============================================================================
// LIGHT / DARK SWITCH
// The first visit follows the visitor's device setting (and keeps following it live until they
// choose). Choosing here is remembered in this browser. The matching colours are set before the
// page paints by the tiny script in app/layout.js, so there is no white flash in dark mode.
// =============================================================================
import { useEffect, useState } from 'react';
import Icon from './Icons';
import { usePrefs } from './Providers';

const KEY = 'pt-theme';

export default function ThemeToggle({ withLabel = false, className = '' }) {
  const { t } = usePrefs();
  const [theme, setTheme] = useState(null); // unknown until mounted, so server and browser render the same HTML

  const apply = (next, remember) => {
    document.documentElement.dataset.theme = next;
    setTheme(next);
    if (remember) { try { localStorage.setItem(KEY, next); } catch { /* private mode: just don't remember */ } }
  };

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme || 'light');
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const follow = (e) => { try { if (localStorage.getItem(KEY)) return; } catch { /* ignore */ } apply(e.matches ? 'dark' : 'light', false); };
    mq.addEventListener('change', follow);
    return () => mq.removeEventListener('change', follow);
  }, []);

  const dark = theme === 'dark';
  const label = dark ? t('theme.light') : t('theme.dark');
  return (
    <button type="button" className={`theme-toggle ${withLabel ? 'with-label' : ''} ${className}`} onClick={() => apply(dark ? 'light' : 'dark', true)} aria-label={label} title={label}>
      <span className="theme-icon" aria-hidden="true"><Icon name={dark ? 'sun' : 'moon'} size={20} /></span>
      {withLabel && <span>{label}</span>}
    </button>
  );
}
