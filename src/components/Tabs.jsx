import { Press } from '../motion';

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
      <nav
        className={`grid ${tabGridColsClass(tabs.length)} gap-0.5 p-0.5 w-full min-w-0 rounded-xl bg-slate-100/90 ring-1 ring-slate-200/60`}
        role="tablist"
      >
        {tabs.map((tab) => {
          const isActive = activeId === tab.id;
          return (
            <Press
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={`w-full h-9 px-2 sm:px-3 rounded-lg text-sm font-semibold transition-colors duration-150 border outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ring-0 inline-flex items-center justify-center gap-1.5 min-w-0 ${
                isActive
                  ? 'bg-white text-primary-700 shadow-sm border-slate-200/80'
                  : 'text-slate-600 border-transparent hover:text-slate-800 hover:bg-white/70'
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
            </Press>
          );
        })}
      </nav>
      <div role="tabpanel" className="pt-4 sm:pt-6 min-w-0">
        {children}
      </div>
    </div>
  );
};

export default Tabs;
