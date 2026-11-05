// Shimmering glass placeholder shown while data loads.
export default function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`glass-shimmer ${className}`} />;
}
export function CardSkeleton({ className = 'h-32' }) {
  return <div role="status" aria-label="Loading" className={`glass-card ${className}`}><div className="glass-shimmer h-full w-full !rounded-2xl" /></div>;
}
