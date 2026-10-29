// LOADING STATE: shown instantly while a server page fetches data (feels fast).
export default function Loading() {
  return <div className="wrap section" aria-busy="true"><div className="skeleton" /><div className="skeleton short" /></div>;
}
