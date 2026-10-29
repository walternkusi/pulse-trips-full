'use client';
// =============================================================================
// LIVE CHAT & WHATSAPP WIDGET
// Floating buttons bottom-right:
//   • WhatsApp: opens a chat with a pre-filled message naming the current page
//   • Chat: panel with quick answers, WhatsApp, a "leave a message" form
//     (saved to the CRM via /api/contact) and, if configured, a real live-chat
//     agent through Crisp (set NEXT_PUBLIC_CRISP_ID).
// =============================================================================
import { useEffect, useState } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { usePrefs } from './Providers';
import { api } from '@/lib/api';
import { track } from '@/lib/analytics';
import Icon from './Icons';

const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP || '250790631111';
const CRISP_ID = process.env.NEXT_PUBLIC_CRISP_ID || '';

// Common pre-booking questions answered instantly.
// ✏️ Edit to match your operations.
const FAQ = [
  { q: 'Is hotel pickup included?', a: 'Most tours offer hotel pickup as an add-on at checkout; meeting-point details are in each tour page and your voucher.' },
  { q: 'Can you arrange a custom or private trip?', a: 'Yes. Tick "Make it private" when booking, or message us with your dates and group size for a fully custom itinerary.' },
  { q: 'How fit do I need to be?', a: 'Each tour shows a difficulty level. "Easy" suits everyone; "Challenging" (e.g. Kilimanjaro) needs good fitness and some preparation.' },
  { q: 'Can I pay with M-Pesa or MTN MoMo?', a: 'Yes, choose "Mobile money" at checkout. Cards, Apple Pay and Google Pay are also accepted.' },
];

export default function ChatWidget() {
  const { t } = usePrefs();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState('');
  const [title, setTitle] = useState('');
  const [pageUrl, setPageUrl] = useState('');

  // Page title + address for the WhatsApp pre-filled message (so we know which tour they mean).
  // Read in the browser after render, so server and browser HTML match.
  useEffect(() => { setTitle(document.title); setPageUrl(window.location.href); }, [pathname]);

  if (pathname.startsWith('/admin')) return null;

  // wa.me opens the chat with our number straight away: in the WhatsApp app on phones,
  // WhatsApp Desktop / Web on computers. The message is pre-typed; the guest just taps Send.
  const waText = encodeURIComponent(`Hi Pulse Trips! I have a question about: ${title || 'your trips'}${pageUrl ? ` (${pageUrl})` : ''}`);
  const waHref = `https://wa.me/${WHATSAPP}?text=${waText}`;

  async function send(e) {
    e.preventDefault();
    setStatus('busy');
    try {
      await api.sendMessage({ ...form, source: 'chat', tour: title });
      setStatus('sent');
      track('contact', { method: 'chat' });
    } catch (err) { setStatus(err.message); }
  }

  const openCrisp = () => { window.$crisp?.push(['do', 'chat:open']); setOpen(false); };

  return (
    <>
      {/* Optional real live-chat provider. Swap for Tawk.to / Intercom the same way. */}
      {CRISP_ID && (
        <Script id="crisp" strategy="lazyOnload">
          {`window.$crisp=[];window.CRISP_WEBSITE_ID=${JSON.stringify(CRISP_ID)};(function(){var d=document,s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;d.head.appendChild(s);})();window.$crisp.push(["do","chat:hide"]);`}
        </Script>
      )}

      <div className="fab-stack">
        <a className="fab fab-wa" href={waHref} target="_blank" rel="noopener" aria-label={t('chat.whatsapp')} onClick={() => track('whatsapp_click')}>
          <Icon name="whatsapp" size={26} />
        </a>
        <button className="fab fab-chat" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="chat-panel" aria-label={t('chat.open')}>
          <Icon name={open ? 'x' : 'chat'} size={24} />
        </button>
      </div>

      {open && (
        <section id="chat-panel" className="chat-panel" aria-label={t('chat.open')}>
          <header className="chat-head">
            <img src="/logo-256.jpg" alt="" width="40" height="40" />
            <div>
              <b>{t('chat.title')}</b>
              <p>{t('chat.sub')}</p>
            </div>
          </header>
          <div className="chat-body">
            <a className="btn btn-wa btn-block" href={waHref} target="_blank" rel="noopener" onClick={() => track('whatsapp_click')}>
              <Icon name="whatsapp" size={20} /> {t('chat.whatsapp')}
            </a>
            {CRISP_ID && <button className="btn btn-outline btn-block" onClick={openCrisp}><Icon name="chat" size={18} /> {t('chat.agent')}</button>}

            <h3 className="chat-sub">{t('chat.faq')}</h3>
            {FAQ.map((f) => (
              <details key={f.q} className="chat-faq"><summary>{f.q}</summary><p>{f.a}</p></details>
            ))}

            <h3 className="chat-sub">{t('chat.leave')}</h3>
            {status === 'sent' ? <p className="ok-text" role="status">{t('chat.sent')}</p> : (
              <form onSubmit={send} className="chat-form">
                <input required placeholder={t('contact.name')} aria-label={t('contact.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <input required type="email" placeholder={t('book.email')} aria-label={t('book.email')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <textarea required rows={3} placeholder={t('chat.message')} aria-label={t('chat.message')} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                <button className="btn btn-block" disabled={status === 'busy'}>{t('chat.send')}</button>
                {status && status !== 'busy' && <p className="form-error" role="alert">{status}</p>}
              </form>
            )}
          </div>
        </section>
      )}
    </>
  );
}
