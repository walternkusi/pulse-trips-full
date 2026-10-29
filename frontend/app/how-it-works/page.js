// =============================================================================
// HOW IT WORKS (server component)
// Five booking steps + FAQ. The FAQ is also published as Schema.org FAQPage
// data, which can earn rich results (expandable questions) in Google.
// =============================================================================
import Link from 'next/link';
import Icon from '@/components/Icons';

export const metadata = {
  title: 'How Booking Works',
  description: 'Choose a tour, pick a date with live availability, pay securely by card or mobile money, and get your QR voucher instantly.',
  alternates: { canonical: '/how-it-works' },
};

const STEPS = [
  { icon: 'globe', title: 'Choose your experience', text: 'Browse safaris, treks, day trips and events. Every page shows the full itinerary, inclusions and difficulty.' },
  { icon: 'calendar', title: 'Pick a date & time', text: 'The calendar shows live seat availability. Seats are held for you while you check out.' },
  { icon: 'users', title: 'Customise', text: 'Add children, go private, add hotel pickup, meals or gear. Prices update instantly in your currency.' },
  { icon: 'lock', title: 'Pay securely', text: 'Card, Apple Pay, Google Pay or mobile money (M-Pesa, MTN MoMo, Airtel) on an encrypted page.' },
  { icon: 'bolt', title: 'Get your voucher instantly', text: 'Email + SMS with your reference, QR code, meeting point and what to bring. Show the QR to your guide.' },
];

const FAQ = [
  { q: 'Do I need to print my voucher?', a: 'No. Show the QR code on your phone. You can also print it or save it as a PDF from My booking.' },
  { q: 'Can I cancel or change my date?', a: 'Yes. Free cancellation up to 48 hours before departure, and one free date change up to 24 hours before. See our policies for details.' },
  { q: 'What happens if the weather is bad?', a: 'If we cancel for weather or safety, you get a full refund or a free move to another date: your choice.' },
  { q: 'Which currencies can I pay in?', a: 'USD, EUR, GBP, KES, TZS, RWF, UGX, ZAR and NGN. Switch currency in the header; checkout charges the currency shown.' },
  { q: 'Can you cater for dietary or accessibility needs?', a: 'Yes. Tell us in the "special requirements" box at checkout and your guide will be briefed before the trip.' },
  { q: 'Are tours private or shared?', a: 'Tours are small-group by default. Choose "Make it private" at checkout for your group only.' },
];

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
};

export default function HowItWorks() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <section className="page-hero">
        <div className="wrap">
          <h1>Book in minutes. Travel with confidence.</h1>
          <p>From browsing to boarding, here is exactly what happens.</p>
        </div>
      </section>

      <section className="section">
        <ol className="wrap steps">
          {STEPS.map((s, i) => (
            <li key={s.title} className="step-card">
              <span className="step-badge">{i + 1}</span>
              <span className="why-icon"><Icon name={s.icon} size={24} /></span>
              <h2>{s.title}</h2>
              <p className="muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="section section-tint">
        <div className="wrap narrow">
          <h2>Frequently asked questions</h2>
          <div className="faq">
            {FAQ.map((f) => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}
          </div>
          <p className="center"><Link href="/tours" className="btn btn-lg">Find your experience <Icon name="arrowRight" size={18} /></Link></p>
        </div>
      </section>
    </>
  );
}
