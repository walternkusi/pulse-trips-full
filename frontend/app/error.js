'use client'; // error boundaries must be client components
// ERROR PAGE: shown if a page crashes, e.g. when the API is unreachable.
export default function Error({ reset }) {
  return (
    <div className="wrap section center narrow">
      <h1>We hit a bump in the road.</h1>
      <p className="muted">Our booking system did not respond. Please try again in a moment.</p>
      <p><button className="btn" onClick={reset}>Try again</button></p>
    </div>
  );
}
