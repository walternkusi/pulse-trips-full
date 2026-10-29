// =============================================================================
// NOTIFICATIONS (email + SMS)
// Low-level senders used by vouchers, cancellations, newsletter and contact.
// Every message, sent or simulated, is written to the CRM communication
// history, so staff can see exactly what each guest received.
//
//   Email: Resend REST API  (set EMAIL_API_KEY)  – swap for SendGrid/Postmark easily
//   SMS:   Africa's Talking (set AT_API_KEY), or Twilio REST API (set TWILIO_*)
// Without keys, messages are printed to the console instead (handy in development).
// =============================================================================
import { config } from '../config.js';
import { store } from '../data/store.js';

// Escapes user-provided text before putting it into an HTML email.
export const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Sends one email. `attachments`: [{ filename, content (Buffer) }].
export async function sendEmail({ to, subject, html, attachments = [], kind = 'email' }) {
  const entry = { email: to, channel: 'email', kind, subject };
  if (!config.emailApiKey) {
    console.log(`[email:simulated] to=${to} subject="${subject}"`);
    store.logComm({ ...entry, status: 'simulated' });
    return;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.emailApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: config.emailFrom, to, subject, html,
        attachments: attachments.map((a) => ({ filename: a.filename, content: a.content.toString('base64') })),
      }),
    });
    store.logComm({ ...entry, status: res.ok ? 'sent' : `failed (${res.status})` });
  } catch (err) {
    // A failed email must never break a booking: log it and move on.
    console.error('[email] failed', err);
    store.logComm({ ...entry, status: 'failed' });
  }
}

// Sends one SMS. `to` must be in international format, e.g. +254700000000.
export async function sendSms({ to, body, email, kind = 'sms' }) {
  if (!to) return;
  const entry = { email, channel: 'sms', kind, subject: body.slice(0, 60) };
  if (config.atApiKey) {
    try {
      const host = config.atUsername === 'sandbox' ? 'api.sandbox.africastalking.com' : 'api.africastalking.com';
      const res = await fetch(`https://${host}/version1/messaging`, {
        method: 'POST',
        headers: { apiKey: config.atApiKey, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username: config.atUsername, to, message: body, ...(config.atSenderId ? { from: config.atSenderId } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      const recipient = data.SMSMessageData?.Recipients?.[0];
      const ok = res.ok && recipient?.status === 'Success';
      if (!ok) console.error('[sms] Africa\'s Talking', res.status, recipient?.status || data);
      store.logComm({ ...entry, status: ok ? 'sent' : `failed (${recipient?.status || res.status})` });
    } catch (err) {
      console.error('[sms] failed', err);
      store.logComm({ ...entry, status: 'failed' });
    }
    return;
  }
  if (!config.twilioSid || !config.twilioToken || !config.twilioFrom) {
    console.log(`[sms:simulated] to=${to} "${body}"`);
    store.logComm({ ...entry, status: 'simulated' });
    return;
  }
  try {
    const auth = Buffer.from(`${config.twilioSid}:${config.twilioToken}`).toString('base64');
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.twilioSid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: to, From: config.twilioFrom, Body: body }),
    });
    store.logComm({ ...entry, status: res.ok ? 'sent' : `failed (${res.status})` });
  } catch (err) {
    console.error('[sms] failed', err);
    store.logComm({ ...entry, status: 'failed' });
  }
}

// Branded wrapper so every email looks like it comes from the same company.
// Inline styles only: most email clients ignore <style> blocks.
export function emailLayout(title, bodyHtml) {
  return `<!doctype html><html><body style="margin:0;background:#F4F5F9;font-family:Arial,Helvetica,sans-serif;color:#1A2030">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden">
      <tr><td style="background:#151A24;padding:24px 32px;color:#ffffff;font-size:22px;font-weight:bold">
        Pulse<span style="color:#F7931E">Trips</span>
        <div style="font-size:11px;letter-spacing:2px;color:#AEB6C6;font-weight:normal;margin-top:4px">AFRICA · EVENTS · TRAVEL · VIBES</div>
      </td></tr>
      <tr><td style="height:4px;background:linear-gradient(90deg,#C2185B,#E8334A,#F7931E)"></td></tr>
      <tr><td style="padding:32px">
        <h1 style="margin:0 0 16px;font-size:22px;color:#151A24">${escapeHtml(title)}</h1>
        ${bodyHtml}
      </td></tr>
      <tr><td style="padding:16px 32px 32px;font-size:12px;color:#6B7385">
        You received this email because of a booking or request on Pulse Trips.
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}
