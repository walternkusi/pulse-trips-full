// =============================================================================
// FREE TRAVEL GUIDE (lead magnet)
// Offered in the newsletter pop-up. "Download PDF" uses the browser's print
// dialog (Save as PDF); print styles in globals.css strip the site chrome.
// ✏️ Keep the facts current: visa and health rules change. Always link to
//    official sources.
// =============================================================================
import Link from 'next/link';
import PrintButton from '@/components/PrintButton';

export const metadata = {
  title: 'Free East & Southern Africa Travel Guide',
  description: 'Practical tips for Kenya, Tanzania and South Africa: visas, money and mobile payments, health, packing, etiquette and the best time to go.',
  alternates: { canonical: '/travel-guide' },
};

const BEST_TIME = [
  { place: 'Serengeti (Tanzania)', best: 'Jun–Oct for river crossings; Jan–Feb for calving season' },
  { place: 'Kilimanjaro (Tanzania)', best: 'Jan–Mar and Jun–Oct (driest months)' },
  { place: 'Amboseli & Nairobi (Kenya)', best: 'Jun–Oct and Jan–Feb' },
  { place: 'Cape Town (South Africa)', best: 'Nov–Mar for beaches; Jun–Aug for whales and quiet roads' },
];

export default function TravelGuide() {
  return (
    <div className="wrap section narrow guide">
      <div className="guide-head">
        <p className="kicker">Pulse Trips · Free guide</p>
        <h1>East & Southern Africa travel guide</h1>
        <p className="lead">Everything first-timers ask us before a safari, trek or city trip.</p>
        <PrintButton />
      </div>

      <div className="prose">
        <h2>1. Visas & entry</h2>
        <ul>
          <li><b>Kenya</b>: electronic travel authorisation (eTA) before arrival, via the official government portal.</li>
          <li><b>Tanzania</b>: e-visa available online; apply at least two weeks ahead.</li>
          <li><b>South Africa</b>: many nationalities are visa-exempt for short stays; check the Department of Home Affairs.</li>
          <li>The <b>East Africa Tourist Visa</b> covers Kenya, Rwanda and Uganda in one permit.</li>
        </ul>

        <h2>2. Money & payments</h2>
        <ul>
          <li>Mobile money is king: <b>M-Pesa</b> (Kenya, Tanzania) and <b>MTN MoMo</b> (Rwanda, Uganda) work almost everywhere.</li>
          <li>Cards are accepted in hotels, malls and lodges; carry some cash for markets and tips.</li>
          <li>Tipping guides and drivers is customary (roughly USD 10–20 per guest per day on safari).</li>
        </ul>

        <h2>3. Health</h2>
        <ul>
          <li>Yellow-fever certificates may be required when arriving from endemic countries.</li>
          <li>Talk to a travel clinic about malaria prevention 4–6 weeks before departure.</li>
          <li>Travel insurance with medical evacuation cover is strongly recommended (add it at checkout).</li>
        </ul>

        <h2>4. Packing for safari & treks</h2>
        <ul>
          <li>Neutral colours (khaki, olive, beige); avoid bright white and dark blue/black, which attract tsetse flies.</li>
          <li>Layers: mornings on game drives and high altitude are cold.</li>
          <li>Soft duffel bags fit small bush planes better than hard suitcases.</li>
        </ul>

        <h2>5. Etiquette</h2>
        <ul>
          <li>Always ask before photographing people, especially in Maasai communities.</li>
          <li>Plastic bags are banned in Kenya, Tanzania and Rwanda: bring reusable bags.</li>
          <li>Learn a few words: <i>Jambo</i> (hello), <i>Asante</i> (thank you), <i>Karibu</i> (welcome).</li>
        </ul>

        <h2>6. Best time to go</h2>
        <table className="policy-table">
          <thead><tr><th scope="col">Destination</th><th scope="col">Best months</th></tr></thead>
          <tbody>{BEST_TIME.map((r) => <tr key={r.place}><td>{r.place}</td><td>{r.best}</td></tr>)}</tbody>
        </table>

        <p className="no-print"><Link href="/tours" className="btn">Browse experiences</Link></p>
      </div>
    </div>
  );
}
