import { FiChevronDown, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import ModernDatePicker from './ModernDatePicker';
import { getCurrentYearMonth, parseYearMonth } from '../utils/date';

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 12 }, (_, i) => currentYear - 5 + i);
const YEAR_MIN = YEAR_OPTIONS[0];
const YEAR_MAX = YEAR_OPTIONS[YEAR_OPTIONS.length - 1];

const filterLabelClass =
  'text-[11px] font-light mb-1.5 text-slate-500 uppercase tracking-[0.16em] block';

const filterSelectClass =
  'w-full h-10 min-w-0 px-3 py-2 pr-10 text-sm text-slate-800 border border-slate-200/90 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-0 focus-visible:ring-0 bg-white appearance-none cursor-pointer';

const datePickerClass = 'filter-date-field w-full min-w-0';

const navBtnClass =
  'inline-flex items-center justify-center w-10 h-10 shrink-0 rounded-xl border border-slate-200/90 bg-white text-slate-600 hover:border-primary-300 hover:text-primary-700 hover:bg-primary-50/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 disabled:opacity-40 disabled:pointer-events-none';

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
    `w-full h-9 px-2 sm:px-3 rounded-lg text-sm font-semibold transition-colors duration-150 border outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ring-0 xl:w-auto xl:whitespace-nowrap ${
      isActive
        ? 'bg-primary-600 text-white shadow-sm border-primary-600'
        : 'text-slate-600 border-transparent hover:text-slate-800 hover:bg-white/70'
    }`;

  const currentYearMonth = getCurrentYearMonth();
  const canGoNextMonth = (selectedMonth || currentYearMonth) < currentYearMonth;

  const shiftMonth = (delta) => {
    const parsed = parseYearMonth(selectedMonth) || parseYearMonth(currentYearMonth);
    if (!parsed) return;
    const d = new Date(parsed.year, parsed.month - 1 + delta, 1);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    // Do not allow navigating past the current calendar month.
    if (next > currentYearMonth) return;
    setMonth(next);
  };

  const shiftYear = (delta) => {
    const next = Number(selectedYear) + delta;
    if (!Number.isFinite(next) || next < YEAR_MIN || next > YEAR_MAX) return;
    setSelectedYear(next);
  };

  return (
    <div className={`flex flex-col min-w-0 w-full overflow-visible ${className}`}>
      <label className={filterLabelClass}>Date</label>

      <div className="flex flex-col gap-2 w-full min-w-0 xl:flex-row xl:flex-wrap xl:items-center xl:gap-2">
        <div className="grid grid-cols-3 gap-0.5 p-0.5 w-full min-w-0 rounded-xl bg-slate-100/90 ring-1 ring-slate-200/60 xl:w-auto xl:shrink-0 xl:inline-flex">
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
            <div className="col-span-3 flex items-center gap-2 min-w-0">
              <button
                type="button"
                className={navBtnClass}
                aria-label="Previous month"
                onClick={() => shiftMonth(-1)}
              >
                <FiChevronLeft className="w-5 h-5" aria-hidden />
              </button>
              <div className="min-w-0 flex-1">
                <ModernDatePicker
                  label=""
                  value={selectedMonth}
                  onChange={setMonth}
                  granularity="month"
                  maxDate={currentYearMonth}
                  placeholder="Select month"
                  className={datePickerClass}
                />
              </div>
              <button
                type="button"
                className={navBtnClass}
                aria-label="Next month"
                disabled={!canGoNextMonth}
                onClick={() => shiftMonth(1)}
              >
                <FiChevronRight className="w-5 h-5" aria-hidden />
              </button>
            </div>
          )}
          {dateMode === 'yearly' && (
            <div className="col-span-3 flex items-center gap-2 min-w-0">
              <button
                type="button"
                className={navBtnClass}
                aria-label="Previous year"
                disabled={Number(selectedYear) <= YEAR_MIN}
                onClick={() => shiftYear(-1)}
              >
                <FiChevronLeft className="w-5 h-5" aria-hidden />
              </button>
              <div className="relative min-w-0 flex-1">
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
              <button
                type="button"
                className={navBtnClass}
                aria-label="Next year"
                disabled={Number(selectedYear) >= YEAR_MAX}
                onClick={() => shiftYear(1)}
              >
                <FiChevronRight className="w-5 h-5" aria-hidden />
              </button>
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
