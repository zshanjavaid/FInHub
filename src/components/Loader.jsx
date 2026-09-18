/**
 * FinHub branded loader — animated chart bars + trend line.
 * sizes: sm | md | lg
 */
const SIZE = {
  sm: { box: 'w-10 h-10', bars: 'gap-[3px]', barW: 'w-1.5', heights: ['h-3', 'h-5', 'h-4', 'h-6'], ring: 'w-10 h-10' },
  md: { box: 'w-14 h-14', bars: 'gap-1', barW: 'w-2', heights: ['h-4', 'h-7', 'h-5', 'h-8'], ring: 'w-14 h-14' },
  lg: { box: 'w-20 h-20', bars: 'gap-1.5', barW: 'w-2.5', heights: ['h-6', 'h-10', 'h-7', 'h-12'], ring: 'w-20 h-20' }
};

const Loader = ({ className = '', size = 'md', label = null }) => {
  const s = SIZE[size] || SIZE.md;

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-12 ${className}`}
      role="status"
      aria-live="polite"
      aria-label={label || 'Loading'}
    >
      <div className={`relative ${s.box} flex items-center justify-center`}>
        {/* Soft pulse halo */}
        <span className="absolute inset-0 rounded-2xl bg-primary-500/10 finhub-loader-halo" aria-hidden />

        {/* Orbit ring */}
        <span
          className={`absolute ${s.ring} rounded-2xl border border-primary-200/80 finhub-loader-ring`}
          aria-hidden
        />

        {/* Chart bars */}
        <div className={`relative z-10 flex items-end justify-center ${s.bars} h-[70%]`}>
          {s.heights.map((h, i) => (
            <span
              key={i}
              className={`${s.barW} ${h} rounded-sm bg-gradient-to-t from-primary-700 to-primary-400 finhub-loader-bar`}
              style={{ animationDelay: `${i * 0.12}s` }}
              aria-hidden
            />
          ))}
        </div>

        {/* Sweeping trend line accent */}
        <svg
          className="absolute inset-[18%] z-20 pointer-events-none finhub-loader-line"
          viewBox="0 0 40 40"
          fill="none"
          aria-hidden
        >
          <path
            d="M4 28 L14 18 L22 24 L36 8"
            stroke="currentColor"
            className="text-primary-500"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="48"
            strokeDashoffset="48"
          />
        </svg>
      </div>

      {label ? (
        <p className="text-xs sm:text-sm font-medium text-slate-500 tracking-wide animate-pulse">{label}</p>
      ) : (
        <span className="sr-only">Loading</span>
      )}
    </div>
  );
};

export default Loader;
