import DateFilterControls from './DateFilterControls';

const FilterBar = ({ children, dateFilter = null, className = '', stats = null, tags = null }) => (
  <div
    className={`relative z-20 bg-white rounded-2xl shadow-card ring-1 ring-slate-900/[0.04] min-w-0 w-full overflow-visible ${className}`}
  >
    <span
      className="pointer-events-none absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-primary-600"
      aria-hidden
    />
    <div className="px-3.5 py-3.5 sm:px-5 sm:py-4 md:px-6 bg-gradient-to-b from-slate-50/70 to-white min-w-0 w-full rounded-b-2xl">
      {stats ? (
        <div className="mb-3.5 pb-3.5 border-b border-slate-200/60 min-w-0">{stats}</div>
      ) : null}

      <div className="flex flex-col md:flex-row md:items-end gap-3 sm:gap-4 min-w-0 w-full filter-bar-fields">
        <div className="flex flex-col sm:flex-row flex-1 gap-3 sm:gap-4 min-w-0 w-full [&>*]:flex-1 [&>*]:min-w-0">
          {children}
        </div>
        {dateFilter ? (
          <DateFilterControls {...dateFilter} className="w-full md:flex-[1.35] md:min-w-0" />
        ) : null}
      </div>

      {tags ? <div className="mt-3 pt-3 border-t border-slate-200/60 min-w-0">{tags}</div> : null}
    </div>
  </div>
);

export default FilterBar;
