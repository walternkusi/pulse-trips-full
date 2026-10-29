// Booking pages are personal: never indexed by search engines.
export const metadata = { title: 'My booking', robots: { index: false, follow: false } };
export default function BookingsLayout({ children }) { return children; }
