const AuthCard = ({ title, subtitle, children }) => (
  <div className="w-full min-w-0 bg-white rounded-2xl shadow-card overflow-hidden border border-slate-200/80 border-t-[3px] border-t-primary-600">
    {title && (
      <div className="px-4 pt-5 pb-1 sm:px-6 sm:pt-6 sm:pb-2">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
        {subtitle ? <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-prose leading-relaxed">{subtitle}</p> : null}
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
