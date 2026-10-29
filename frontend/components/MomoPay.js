'use client';
// =============================================================================
// MTN MoMo "SCAN TO PAY" SCREEN
// Shown after booking when the guest chose Mobile money and the shop has a
// MoMo pay code. Our QR is a fixed pay code, so it cannot carry the price:
// the guest enters the exact amount shown here, then sends us the transaction
// ID from MTN's confirmation SMS. Staff check it and confirm in /admin.
// =============================================================================
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { usePrefs } from './Providers';
import Icon from './Icons';

export default function MomoPay({ booking, onAnother }) {
  const { t, money } = usePrefs();
  const { payCode, amountRwf } = booking.payment.momo;
  const [transactionId, setTransactionId] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(Boolean(booking.payment.proof));

  const holdUntil = new Date(booking.holdExpiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const manageHref = `/bookings?ref=${booking.reference}&email=${encodeURIComponent(booking.email)}`;

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api.submitMomoProof(booking.reference, booking.email, { transactionId, payerPhone });
      setSent(true);
    } catch (err) { setError(err.message); }
    setBusy(false);
  }

  if (sent) {
    return (
      <div className="booking-card success-card" id="book" role="status">
        <div className="success-icon"><Icon name="check" size={30} strokeWidth={2.5} /></div>
        <h2>{t('momo.thanks')}</h2>
        <p>{t('momo.thanksSub', { email: booking.email })}</p>
        <p className="ref-big">{booking.reference}</p>
        <Link href={manageHref} className="btn btn-block">{t('momo.track')}</Link>
        <button className="btn btn-ghost btn-block" onClick={onAnother}>{t('book.another')}</button>
      </div>
    );
  }

  return (
    <div className="booking-card momo-card" id="book">
      <h2>{t('momo.title')}</h2>
      <p className="muted small">{t('momo.hold', { time: holdUntil })}</p>

      <p className="momo-amount">{money(amountRwf, 'RWF')}</p>
      <p className="small muted">{t('momo.exact')}</p>

      <img className="momo-qr" src="/momo-pay-qr.png" alt={t('momo.qrAlt', { code: payCode })} width="280" height="397" />
      <p className="center"><b>{t('momo.code')}: {payCode}</b></p>

      <ol className="momo-steps small">
        <li>{t('momo.step1')}</li>
        <li>{t('momo.step2', { amount: money(amountRwf, 'RWF') })}</li>
        <li>{t('momo.step3')}</li>
        <li>{t('momo.step4')}</li>
      </ol>

      <form onSubmit={submit}>
        <label className="field">{t('momo.txId')}
          <input required minLength={6} maxLength={24} autoComplete="off" inputMode="numeric" placeholder="e.g. 31234567890" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} />
        </label>
        <label className="field">{t('momo.payerPhone')} <span className="opt">({t('common.optional')})</span>
          <input type="tel" autoComplete="tel" inputMode="tel" placeholder="+250 788 000 000" value={payerPhone} onChange={(e) => setPayerPhone(e.target.value)} />
        </label>
        <button className="btn btn-lg btn-block" disabled={busy}>{busy ? t('book.processing') : t('momo.paid')}</button>
        {error && <p className="notice notice-err" role="alert">{error}</p>}
      </form>
      <p className="tiny muted center">{t('momo.note', { ref: booking.reference })}</p>
    </div>
  );
}
