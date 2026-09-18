import { LogoIcon } from './Logo';

/**
 * FinHub loader — same animated logo icon as the brand mark.
 * sizes: sm | md | lg
 */
const Loader = ({ className = '', size = 'md', label = null }) => (
  <div
    className={`flex flex-col items-center justify-center gap-3 py-12 ${className}`}
    role="status"
    aria-live="polite"
    aria-label={label || 'Loading'}
  >
    <LogoIcon size={size} />
    {label ? (
      <p className="text-xs sm:text-sm font-medium text-slate-500 tracking-wide animate-pulse">{label}</p>
    ) : (
      <span className="sr-only">Loading</span>
    )}
  </div>
);

export default Loader;
