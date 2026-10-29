'use client';
// =============================================================================
// CONTACT PAGE
// Contact form (saved to the CRM and forwarded to TEAM_EMAIL) next to quick
// channels: WhatsApp, email and opening hours.
// =============================================================================
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { track } from '@/lib/analytics';
import { usePrefs } from '@/components/Providers';
import Icon from '@/components/Icons';

const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP || '250790631111';
const EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'hello@pulsetrips.example';

export default function Contact() {
  const { t } = usePrefs();
  const [tours, setTours] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', tour: '', message: '' });
  const [status, setStatus] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);

  // Tour list for the "Interested in" dropdown.
  useEffect(() => { api.getTours().then((d) => setTours(d.tours)).catch(() => {}); }, []);
  useEffect(() => { document.title = `${t('nav.contact')} | Pulse Trips`; }, [t]);

  const bind = (k) => ({ value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }) });

  async function send(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.sendMessage(form);
      setStatus({ type: 'ok', text: t('contact.sent') });
      setForm({ name: '', email: '', phone: '', tour: '', message: '' });
      track('contact', { method: 'form' });
    } catch (err) { setStatus({ type: 'error', text: err.message }); }
    setBusy(false);
  }

  return (
    <>
      <section className="page-hero">
        <div className="wrap">
          <h1>{t('contact.title')}</h1>
          <p>{t('contact.sub')}</p>
        </div>
      </section>

      <div className="wrap section contact-layout">
        <form className="card form-card" onSubmit={send}>
          <div className="form-row">
            <label className="field">{t('contact.name')}<input required autoComplete="name" {...bind('name')} /></label>
            <label className="field">{t('book.email')}<input required type="email" autoComplete="email" {...bind('email')} /></label>
          </div>
          <div className="form-row">
            <label className="field">{t('book.phone')} <span className="opt">({t('common.optional')})</span><input type="tel" autoComplete="tel" {...bind('phone')} /></label>
            <label className="field">{t('contact.tour')}
              <select {...bind('tour')}>
                <option value="">{t('contact.none')}</option>
                {tours.map((x) => <option key={x.slug} value={x.name}>{x.name}</option>)}
              </select>
            </label>
          </div>
          <label className="field">{t('contact.message')}<textarea required rows={6} {...bind('message')} /></label>
          <button className="btn" disabled={busy}>{t('contact.send')}</button>
          {status.text && <p className={status.type === 'ok' ? 'notice notice-ok' : 'notice notice-err'} role="status">{status.text}</p>}
        </form>

        <aside className="contact-cards">
          {WHATSAPP && (
            <a className="contact-card" href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener" onClick={() => track('whatsapp_click')}>
              <span className="why-icon wa"><Icon name="whatsapp" size={24} /></span>
              <span><b>WhatsApp</b><small>+{WHATSAPP}</small></span>
            </a>
          )}
          <a className="contact-card" href={`mailto:${EMAIL}`}>
            <span className="why-icon"><Icon name="mail" size={24} /></span>
            <span><b>Email</b><small>{EMAIL}</small></span>
          </a>
          <div className="contact-card">
            <span className="why-icon"><Icon name="clock" size={24} /></span>
            <span><b>{t('contact.hours')}</b><small>Average reply: under 1 hour</small></span>
          </div>
        </aside>
      </div>
    </>
  );
}
