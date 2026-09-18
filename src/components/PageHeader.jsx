const PageHeader = ({ title, subtitle = null, actions = null, meta = null, className = '' }) => (
  <div
    className={`flex flex-col gap-4 sm:gap-5 md:flex-row md:items-end md:justify-between w-full min-w-0 ${className}`}
  >
    <div className="min-w-0 flex-1">
      <h1 className="text-2xl sm:text-3xl md:text-[2.15rem] font-bold text-slate-900 tracking-tight leading-[1.15]">
        {title}
      </h1>
      <div className="mt-3 flex items-center gap-2" aria-hidden>
        <span className="h-0.5 w-8 rounded-full bg-primary-600" />
        <span className="h-px flex-1 max-w-[4rem] bg-slate-200" />
      </div>
      {subtitle ? <div className="mt-3 max-w-prose text-slate-500">{subtitle}</div> : null}
    </div>
    {(meta || actions) && (
      <div className="flex flex-col gap-2 w-full md:w-auto md:items-end md:shrink-0 min-w-0 pb-0.5">
        {meta ? (
          <div className="text-[11px] sm:text-xs text-slate-500 md:text-right max-w-full md:max-w-[16rem] leading-snug">
            {meta}
          </div>
        ) : null}
        {actions ? (
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 w-full md:w-auto md:justify-end [&_button]:w-full sm:[&_button]:w-auto [&_.flex]:flex-col [&_.flex]:sm:flex-row [&_.flex]:gap-2 [&_.flex]:sm:gap-3 [&_.flex]:w-full [&_.flex]:sm:w-auto">
            {actions}
          </div>
        ) : null}
      </div>
    )}
  </div>
);

export default PageHeader;
