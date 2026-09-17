import { FiChevronDown } from 'react-icons/fi';
import ModernDatePicker from './ModernDatePicker';

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 12 }, (_, i) => currentYear - 5 + i);

const filterLabelClass = 'text-sm font-semibold mb-2 text-slate-700 capitalize tracking-wide block';

const filterSelectClass =
  'w-full h-10 min-w-0 px-3 py-2 pr-10 text-sm text-slate-800 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 bg-white appearance-none cursor-pointer';

const datePickerClass = 'filter-date-field w-full min-w-0';

const DateFilterControls = ({
  dateMode,
  setDateMode,
  selectedYear,
  setSelectedYear,
  selectedMonth,
  setMonth,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  className = ''
}) => {
  const pill = (isActive) =>
    `w-full h-9 px-2 sm:px-3 rounded-md text-sm font-semibold transition-colors duration-150 border xl:w-auto xl:whitespace-nowrap ${
      isActive
        ? 'bg-white text-primary-700 shadow-sm border-slate-200/70'
        : 'text-slate-600 border-transparent hover:text-slate-800'
    }`;

  return (
    <div className={`flex flex-col min-w-0 w-full overflow-hidden ${className}`}>
      <label className={filterLabelClass}>Date</label>

      {/* Stack by default; side-by-side only when the Date column is wide enough */}
      <div className="flex flex-col gap-2 w-full min-w-0 xl:flex-row xl:flex-wrap xl:items-center xl:gap-2">
        <div className="grid grid-cols-3 gap-0.5 p-0.5 w-full min-w-0 rounded-xl bg-slate-100/90 border border-slate-200/80 xl:w-auto xl:shrink-0 xl:inline-flex">
          <button type="button" onClick={() => setDateMode('month')} className={pill(dateMode === 'month')}>
            Month
          </button>
          <button type="button" onClick={() => setDateMode('yearly')} className={pill(dateMode === 'yearly')}>
            Yearly
          </button>
          <button type="button" onClick={() => setDateMode('range')} className={pill(dateMode === 'range')}>
            Range
          </button>
        </div>

        {/* Reserved slot: same footprint for month / yearly / range (avoids layout jump) */}
        <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 xl:min-w-0 xl:flex-1">
          {dateMode === 'month' && (
            <div className="col-span-3 min-w-0">
              <ModernDatePicker
                label=""
                value={selectedMonth}
                onChange={setMonth}
                granularity="month"
                placeholder="Select month"
                className={datePickerClass}
              />
            </div>
          )}
          {dateMode === 'yearly' && (
            <div className="relative col-span-3 min-w-0">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className={filterSelectClass}
                aria-label="Year"
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <FiChevronDown className="w-5 h-5 text-slate-400" />
              </div>
            </div>
          )}
          {dateMode === 'range' && (
            <>
              <ModernDatePicker
                label=""
                value={dateFrom}
                onChange={setDateFrom}
                placeholder="Start"
                className={datePickerClass}
              />
              <span className="text-sm font-medium text-slate-400" aria-hidden>
                –
              </span>
              <ModernDatePicker
                label=""
                value={dateTo}
                onChange={setDateTo}
                placeholder="End"
                className={datePickerClass}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DateFilterControls;
