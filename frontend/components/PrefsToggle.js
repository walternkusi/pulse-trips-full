'use client';
// =============================================================================
// LANGUAGE & CURRENCY TOGGLE
// Two compact native <select>s: accessible, keyboard-friendly and use the
// phone's own picker on mobile.
// =============================================================================
import { usePrefs } from './Providers';
import { LANGUAGES, CURRENCIES } from '@/lib/i18n';
import Icon from './Icons';

export default function PrefsToggle({ className = '' }) {
  const { lang, currency, setLang, setCurrency, t, isPending } = usePrefs();
  return (
    <div className={`prefs ${className}`} aria-busy={isPending}>
      <label className="prefs-item">
        <Icon name="globe" size={16} />
        <span className="sr-only">{t('nav.language')}</span>
        <select value={lang} onChange={(e) => setLang(e.target.value)}>
          {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
      </label>
      <label className="prefs-item">
        <span className="sr-only">{t('nav.currency')}</span>
        <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
    </div>
  );
}
