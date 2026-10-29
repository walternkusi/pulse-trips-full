// 404 PAGE: friendly dead-end recovery instead of a blank error.
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="wrap section center narrow">
      <p className="kicker">404</p>
      <h1>This trail goes nowhere.</h1>
      <p className="muted">The page you are looking for has moved or never existed.</p>
      <p><Link href="/tours" className="btn">Browse experiences</Link></p>
    </div>
  );
}
