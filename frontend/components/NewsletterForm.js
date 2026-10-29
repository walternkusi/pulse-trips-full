'use client';
// =============================================================================
// NEWSLETTER FORM (lead capture)
// Used in the footer, on the home page and inside the promo pop-up.
// On success the backend returns the welcome code (WELCOME10) and the travel
// guide link, which we show immediately (and it is also emailed).
// =============================================================================
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { track } from '@/lib/analytics';
import { usePrefs } from './Providers';
import Icon from './Icons';

// Remembered so the pop-up doesn't nag people who already signed up.
export const SUBSCRIBED_KEY = 'pt_subscribed';

export default function NewsletterForm({ source = 'footer', variant = 'light', onDone }) {
  const { t } = usePrefs();
  const [email, setEmail] = useState('');
  const [state, setState] = useState({ status: 'idle', error: '', offer: null });
  const [copied, setCopied] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setState({ status: 'busy', error: '', offer: null });
    try {
      const offer = await api.subscribe(email, source);
      setState({ status: 'done', error: '', offer });
      try { localStorage.setItem(SUBSCRIBED_KEY, '1'); } catch { /* private mode */ }
      track('generate_lead', { method: source }); // GA4 lead conversion
      onDone?.(offer);
    } catch (err) {
      setState({ status: 'idle', error: err.message, offer: null });
    }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(state.offer.code); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  }

  // --- Success: show the code + guide download ---
  if (state.status === 'done') {
    return (
      <div className={`news-success ${variant}`} role="status">
        <span className="muted-label">{t('news.code')}</span>
        <div className="promo-code">
          <code>{state.offer.code}</code>
          <button type="button" className="btn btn-sm btn-ghost" onClick={copy}>{copied ? t('news.copied') : t('news.copy')}</button>
        </div>
        <Link href={state.offer.guideUrl} className="link-strong"><Icon name="download" size={16} /> {t('news.guide')}</Link>
      </div>
    );
  }

  // --- Form ---
  return (
    <form className={`news-form ${variant}`} onSubmit={submit} noValidate={false}>
      <label className="sr-only" htmlFor={`news-${source}`}>{t('news.placeholder')}</label>
      <input id={`news-${source}`} type="email" required autoComplete="email" placeholder={t('news.placeholder')} value={email} onChange={(e) => setEmail(e.target.value)} />
      <button className="btn" disabled={state.status === 'busy'}>{state.status === 'busy' ? '…' : t('news.cta')}</button>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
    </form>
  );
}
