// =============================================================================
// POLICIES PAGE (server component)
// Rendered from the SAME policy object the backend uses to compute refunds
// (GET /api/policies), so what guests read is exactly what they get.
// Sections have anchors (#cancellation, #weather, #privacy...) for deep links.
// =============================================================================
import Link from 'next/link';
import Icon from '@/components/Icons';
import { api } from '@/lib/api';

export const metadata = {
  title: 'Cancellation, Refund & Weather Policy',
  description: 'Clear rules for cancellations, refunds, rescheduling and weather: free cancellation up to 48 hours before departure.',
  alternates: { canonical: '/policies' },
};

export default async function Policies() {
  const { policy } = await api.getPolicies();
  const free = policy.refundTiers[0];

  return (
    <>
      <section className="page-hero">
        <div className="wrap">
          <h1>Booking policies</h1>
          <p>Plain-language rules, no surprises. Summary: <b>free cancellation up to {free.hoursBefore} hours</b> before departure, and a full refund if we cancel.</p>
        </div>
      </section>

      <div className="wrap section policy-layout">
        {/* In-page navigation (sticky on desktop) */}
        <nav className="policy-toc" aria-label="On this page">
          <a href="#cancellation">Cancellations & refunds</a>
          <a href="#reschedule">Rescheduling</a>
          <a href="#weather">Weather & safety</a>
          <a href="#timeline">Refund timeline</a>
          <a href="#payments">Payments</a>
          <a href="#privacy">Privacy & cookies</a>
        </nav>

        <div className="prose">
          <section id="cancellation">
            <h2><Icon name="calendar" /> Cancellations & refunds</h2>
            <p>Cancel online in seconds from <Link href="/bookings">My booking</Link>. Your refund depends on how long before departure you cancel:</p>
            <table className="policy-table">
              <thead><tr><th scope="col">When you cancel</th><th scope="col">Refund</th></tr></thead>
              <tbody>
                {policy.refundTiers.map((tier) => (
                  <tr key={tier.label}><td>{tier.label}</td><td><b className={tier.percent ? 'ok-text' : 'err-text'}>{tier.percent}%</b></td></tr>
                ))}
              </tbody>
            </table>
            <p className="small muted">Times are measured against the departure time in the destination&apos;s local time zone, as shown on your voucher.</p>
          </section>

          <section id="reschedule">
            <h2><Icon name="arrowRight" /> Rescheduling</h2>
            <ul>
              <li>You may change your date <b>{policy.reschedule.freeChanges} time{policy.reschedule.freeChanges > 1 ? 's' : ''} free of charge</b>, up to <b>{policy.reschedule.minHoursBefore} hours</b> before departure.</li>
              <li>The new date must have enough seats available. Seasonal price differences are waived.</li>
              <li>Further changes, or changes closer to departure, are handled case by case. Just message us.</li>
            </ul>
          </section>

          <section id="weather">
            <h2><Icon name="shield" /> Weather & safety cancellations</h2>
            <p>Your safety comes first. If we cancel because of weather, road conditions, park closures or any safety concern, you always choose:</p>
            <ul>{policy.weather.options.map((o) => <li key={o}><b>{o}</b></li>)}</ul>
            <p>Whenever possible we decide at least <b>{policy.weather.noticeHours} hours</b> before departure and notify you by email, SMS and WhatsApp.</p>
          </section>

          <section id="timeline">
            <h2><Icon name="clock" /> Refund timeline</h2>
            <table className="policy-table">
              <thead><tr><th scope="col">Payment method</th><th scope="col">Arrives in</th></tr></thead>
              <tbody>{policy.refundTimeline.map((r) => <tr key={r.method}><td>{r.method}</td><td>{r.days}</td></tr>)}</tbody>
            </table>
            <p>Refunds go back to the original payment method. {policy.contactNote}</p>
          </section>

          <section id="payments">
            <h2><Icon name="lock" /> Payments & currency</h2>
            <ul>
              <li>Pay by card (Visa, Mastercard, Amex), Apple Pay, Google Pay or mobile money (M-Pesa, MTN MoMo, Airtel Money).</li>
              <li>Payments are processed by PCI-DSS certified providers; we never see or store card numbers.</li>
              <li>You are charged in the currency shown at checkout. Prices include taxes and fees.</li>
            </ul>
          </section>

          <section id="privacy">
            <h2><Icon name="info" /> Privacy & cookies</h2>
            <p>We use your details only to deliver your booking (vouchers, guide manifests) and, if you opt in, to send offers. Special requirements you share (diet, accessibility) are visible only to the staff running your trip.</p>
            <p>Analytics cookies (Google Analytics) load only after you accept them in the cookie banner. You can request a copy or deletion of your data at any time via the <Link href="/contact">contact page</Link>.</p>
          </section>
        </div>
      </div>
    </>
  );
}
