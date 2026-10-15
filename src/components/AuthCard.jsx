const AuthCard = ({ title, subtitle, children }) => (
  <div className="relative w-full min-w-0 bg-white rounded-2xl shadow-card overflow-hidden ring-1 ring-slate-900/[0.04]">
    <span className="pointer-events-none absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-primary-600" aria-hidden />
    {title && (
      <div className="px-4 pt-5 pb-1 sm:px-6 sm:pt-6 sm:pb-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-[-0.03em] leading-[0.95] text-balance">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-sm font-normal text-slate-500 mt-2.5 max-w-prose leading-relaxed text-pretty">
            {subtitle}
          </p>
        ) : null}
        <div className="mt-3 flex items-center gap-2" aria-hidden>
          <span className="h-0.5 w-8 rounded-full bg-primary-600" />
          <span className="h-px flex-1 max-w-[3.5rem] bg-slate-200" />
        </div>
      </div>
    )}
    <div className="px-4 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-5">{children}</div>
  </div>
);

export default AuthCard;
