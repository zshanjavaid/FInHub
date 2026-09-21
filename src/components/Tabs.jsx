const tabGridColsClass = (count) => {
  if (count <= 1) return 'grid-cols-1';
  if (count === 2) return 'grid-cols-2';
  if (count === 3) return 'grid-cols-3';
  if (count === 4) return 'grid-cols-2 sm:grid-cols-4';
  return 'grid-cols-2 sm:grid-cols-3';
};

const Tabs = ({ tabs = [], activeId, onChange, children }) => {
  return (
    <div className="w-full min-w-0">
      <div className="rounded-xl bg-slate-100 p-1 sm:p-1.5">
        <nav
          className={`grid ${tabGridColsClass(tabs.length)} gap-1 w-full min-w-0 md:flex md:flex-wrap`}
          role="tablist"
        >
          {tabs.map((tab) => {
            const isActive = activeId === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onChange(tab.id)}
                className={`flex flex-1 items-center justify-center gap-1 sm:gap-2 min-w-0 px-2 py-2.5 sm:px-4 sm:py-2.5 text-xs sm:text-sm rounded-lg transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:ring-offset-1 ${
                  isActive
                    ? 'bg-white text-primary-700 shadow-sm font-extrabold'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-white/70 font-light'
                }`}
              >
                <span className="truncate text-center leading-tight min-w-0">
                  {tab.shortLabel ? (
                    <>
                      <span className="sm:hidden">{tab.shortLabel}</span>
                      <span className="hidden sm:inline">{tab.label}</span>
                    </>
                  ) : (
                    tab.label
                  )}
                </span>
                {tab.badge != null && tab.badge > 0 && (
                  <span
                    className={`shrink-0 min-w-[1.25rem] h-5 px-1 flex items-center justify-center text-[10px] sm:text-xs font-bold rounded-full tabular-nums ${
                      isActive ? 'bg-primary-500 text-white' : 'bg-slate-300 text-slate-600'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
      <div role="tabpanel" className="pt-4 sm:pt-6 min-w-0">
        {children}
      </div>
    </div>
  );
};

export default Tabs;
