const Logo = ({ className = '', variant = 'default', compact = false }) => {
  const isLight = variant === 'light';
  const textClass = isLight ? 'text-white' : 'text-slate-800';
  const subClass = isLight ? 'text-primary-300' : 'text-primary-600';
  const iconBoxClass = compact ? 'w-9 h-9 rounded-lg' : 'w-12 h-12 rounded-xl';
  const titleClass = compact ? 'text-base' : 'text-xl';
  const subTitleClass = compact ? 'text-[10px]' : 'text-xs';
  const chartIcon = compact ? 20 : 24;
  const badgeSize = compact ? 'w-4 h-4' : 'w-5 h-5';
  const badgeIcon = compact ? 8 : 10;
  const badgeBorder = isLight ? 'border-primary-900' : 'border-white';

  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 ${className}`}>
      <div
        className={`relative ${iconBoxClass} flex items-center justify-center shadow-sm ${
          isLight ? 'bg-primary-500 ring-1 ring-white/15' : 'bg-primary-600'
        }`}
      >
        <svg
          width={chartIcon}
          height={chartIcon}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10"
        >
          <path
            d="M3 18L9 12L13 16L21 8"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M21 8H15L13 10"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div
          className={`absolute -bottom-1 -right-1 ${badgeSize} rounded-full flex items-center justify-center border-2 ${badgeBorder} shadow-sm bg-primary-800`}
        >
          <svg
            width={badgeIcon}
            height={badgeIcon}
            viewBox="0 0 10 10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M5 2V8M3 4H7M3 6H7"
              stroke="white"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
      <div className="flex flex-col min-w-0">
        <span className={`${titleClass} font-bold leading-tight tracking-tight ${textClass}`}>FinHub</span>
        <span className={`${subTitleClass} font-semibold leading-tight uppercase tracking-wider ${subClass}`}>
          Finance Hub
        </span>
      </div>
    </div>
  );
};

export default Logo;
