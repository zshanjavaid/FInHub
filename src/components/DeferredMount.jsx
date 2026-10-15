import { useInViewOnce } from '../hooks/useInViewOnce';

const ChartSkeleton = ({ className = '' }) => (
  <div
    className={`relative w-full min-w-0 rounded-2xl bg-white shadow-card ring-1 ring-slate-900/[0.04] overflow-hidden ${className}`}
    aria-hidden
  >
    <span className="pointer-events-none absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-primary-600" />
    <div className="px-4 py-4 sm:px-5 sm:py-5 border-b border-slate-100">
      <div className="h-5 w-40 rounded-md bg-slate-100" />
      <div className="mt-2 h-3 w-64 max-w-full rounded-md bg-slate-50" />
    </div>
    <div className="px-4 py-6 sm:px-5 md:px-6 min-h-[220px] sm:min-h-[280px] md:min-h-[360px] flex items-end gap-2">
      {[40, 65, 45, 80, 55, 70, 50, 85, 60, 75, 48, 68].map((h, i) => (
        <div key={i} className="flex-1 rounded-t-md bg-slate-100/90" style={{ height: `${h}%` }} />
      ))}
    </div>
  </div>
);

/**
 * Mounts children only when near the app scrollport (once).
 * Keeps Chart.js / heavy plots out of the initial paint path.
 * Skeleton is static (no pulse) to avoid a flashy swap.
 */
const DeferredMount = ({ children, rootMargin = '320px 0px', fallback = null, className = '' }) => {
  const [ref, inView] = useInViewOnce(rootMargin);
  return (
    <div ref={ref} className={`min-w-0 ${className}`}>
      {inView ? children : fallback ?? <ChartSkeleton />}
    </div>
  );
};

export { ChartSkeleton };
export default DeferredMount;
