import { useInViewOnce } from '../hooks/useInViewOnce';

const ChartSkeleton = ({ className = '' }) => (
  <div
    className={`w-full min-w-0 rounded-2xl border border-slate-200/80 bg-white shadow-card overflow-hidden border-t-[3px] border-t-primary-600 ${className}`}
    aria-hidden
  >
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
