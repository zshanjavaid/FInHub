/**
 * FinHub icon — ascending growth bars + peak accent (no arrow).
 * Motion in index.css (finhub-logo-*).
 */
export const LogoMark = ({ size = 28, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`finhub-logo-mark ${className}`}
    aria-hidden
  >
    {/* Strictly ascending bars = growth */}
    <rect className="finhub-logo-col finhub-logo-col--a" x="5.5" y="17" width="6" height="9.5" rx="2" fill="currentColor" opacity="0.7" />
    <rect className="finhub-logo-col finhub-logo-col--b" x="13" y="11.5" width="6" height="15" rx="2" fill="currentColor" opacity="0.88" />
    <rect className="finhub-logo-col finhub-logo-col--c" x="20.5" y="6.5" width="6" height="20" rx="2" fill="currentColor" />

    {/* Dark peak accent on tallest bar */}
    <circle className="finhub-logo-peak" cx="23.5" cy="6.5" r="2.6" fill="#042f2e" />
    <circle className="finhub-logo-peak-core" cx="23.5" cy="6.5" r="1.05" fill="#5eead4" />
  </svg>
);

const ICON_SIZES = {
  sm: { box: 'w-9 h-9', mark: 20 },
  md: { box: 'w-11 h-11 sm:w-12 sm:h-12', mark: 26 },
  lg: { box: 'w-16 h-16 sm:w-20 sm:h-20', mark: 42 }
};

/** Animated app-icon only (shared by Logo + Loader). */
export const LogoIcon = ({ size = 'md', className = '', light = false }) => {
  const s = ICON_SIZES[size] || ICON_SIZES.md;

  return (
    <div className={`finhub-logo-mark-wrap relative ${s.box} shrink-0 ${className}`}>
      <span className="finhub-logo-ring" aria-hidden />
      <div
        className={`finhub-logo-icon relative z-[1] ${s.box} rounded-[22%] overflow-hidden flex items-center justify-center ${
          light ? 'ring-1 ring-white/20' : ''
        }`}
      >
        <span className="finhub-logo-bg absolute inset-0" aria-hidden />
        <span className="finhub-logo-shine absolute inset-0" aria-hidden />
        <LogoMark size={s.mark} className="text-white relative z-10" />
      </div>
    </div>
  );
};

const Logo = ({ className = '', variant = 'default', compact = false }) => {
  const isLight = variant === 'light';
  const textClass = isLight ? 'text-white' : 'text-slate-800';
  const subClass = isLight ? 'text-teal-200/90' : 'text-primary-600';
  const titleClass = compact ? 'text-lg' : 'text-2xl';
  const subTitleClass = compact ? 'text-[9px]' : 'text-[10px]';

  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 ${className}`}>
      <LogoIcon size={compact ? 'sm' : 'md'} light={isLight} />
      <div className="flex flex-col min-w-0">
        <span className={`finhub-logo-wordmark ${titleClass} font-extrabold leading-none tracking-tight ${textClass}`}>
          FinHub
        </span>
        <span
          className={`finhub-logo-tagline mt-0.5 ${subTitleClass} font-light uppercase tracking-[0.22em] ${subClass}`}
        >
          Projects
        </span>
      </div>
    </div>
  );
};

export default Logo;
