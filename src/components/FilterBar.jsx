import DateFilterControls from './DateFilterControls';

const FilterBar = ({ children, dateFilter = null, className = '', stats = null, tags = null }) => (
  <div
    className={`relative z-20 bg-white rounded-2xl shadow-card border border-slate-200/80 border-t-[3px] border-t-primary-600 min-w-0 w-full overflow-visible ${className}`}
  >
    <div className="px-3.5 py-3.5 sm:px-5 sm:py-4 md:px-6 bg-gradient-to-b from-slate-50 to-white min-w-0 w-full rounded-b-2xl">
      {stats ? (
        <div className="mb-3.5 pb-3.5 border-b border-slate-200/70 min-w-0">{stats}</div>
      ) : null}

      <div className="flex flex-col md:flex-row md:items-end gap-3 sm:gap-4 min-w-0 w-full filter-bar-fields">
        <div className="flex flex-col sm:flex-row flex-1 gap-3 sm:gap-4 min-w-0 w-full [&>*]:flex-1 [&>*]:min-w-0">
          {children}
        </div>
        {dateFilter ? (
          <DateFilterControls {...dateFilter} className="w-full md:flex-[1.35] md:min-w-0" />
        ) : null}
      </div>

      {tags ? <div className="mt-3 pt-3 border-t border-slate-200/70 min-w-0">{tags}</div> : null}
    </div>
  </div>
);

export default FilterBar;
