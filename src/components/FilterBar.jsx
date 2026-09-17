import DateFilterControls from "./DateFilterControls";

const FilterBar = ({ children, dateFilter = null, className = "", stats = null }) => (
  <div className={`bg-white rounded-2xl shadow-panel border border-slate-200/80 ring-1 ring-slate-200/50 border-t-4 border-t-primary-500 min-w-0 w-full ${className}`}>
    <div className="px-3 py-3 sm:px-4 sm:py-3.5 bg-slate-100/60 rounded-2xl min-w-0 w-full">
      {stats ? <div className="mb-3 pb-3 border-b border-slate-200/70 min-w-0">{stats}</div> : null}

      <div className="flex flex-col md:flex-row md:items-end gap-4 min-w-0 w-full filter-bar-fields">
        <div className="flex flex-col sm:flex-row flex-1 gap-4 min-w-0 w-full [&>*]:flex-1 [&>*]:min-w-0">
          {children}
        </div>
        {dateFilter ? <DateFilterControls {...dateFilter} className="w-full md:flex-[1.35] md:min-w-0" /> : null}
      </div>
    </div>
  </div>
);

export default FilterBar;
