// Moved unchanged from the old single-page admin; the glass theme (admin.css) restyles it.
'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatAmount } from '@/lib/money';
import Icon from '@/components/Icons';

const usd = (n) => formatAmount(n, 'USD', 'en');
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
const isoDay = (offset = 0) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

// =============================================================================
// CHECK-IN (QR codes on vouchers open /admin?checkin=PT-XXXX)
// =============================================================================
export default function CheckInPanel({ token, initialRef }) {
  const [ref, setRef] = useState(initialRef || '');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const run = useCallback(async (r) => {
    setError(''); setResult(null);
    try { setResult((await api.admin.checkin(token, r.trim().toUpperCase())).booking); } catch (e) { setError(e.message); }
  }, [token]);
  useEffect(() => { if (initialRef) run(initialRef); }, [initialRef, run]);

  return (
    <section className="card narrow-card">
      <h2>Guest check-in</h2>
      <p className="muted small">Scan the QR on the guest&apos;s voucher with your phone camera, or type the reference.</p>
      <form onSubmit={(e) => { e.preventDefault(); run(ref); }} className="promo-row">
        <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="PT-4F9A2C" aria-label="Booking reference" />
        <button className="btn">Check in</button>
      </form>
      {error && <p className="notice notice-err">{error}</p>}
      {result && (
        <div className="notice notice-ok">
          <b>✅ {result.name}</b>: {result.adults + result.children} guest(s), {result.tourName}, {result.date} {result.time}
          {result.notes && <p><b>Needs:</b> {result.notes}</p>}
        </div>
      )}
    </section>
  );
}
