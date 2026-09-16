import { useMemo } from 'react';
import { FiBarChart2 } from 'react-icons/fi';
import { computeRollingWindowStats } from '../utils/projectRollingStats';
import ProjectInwardCostBar from './ProjectInwardCostBar';
import LineChartChartJS from './LineChartChartJS';
import { MONTH_NAMES, normalizeDateToYYYYMMDD } from '../utils/date';
import {
  chartCardClass,
  chartCardHeaderClass,
  chartCardTitleClass,
  chartCardSubtitleClass,
  chartCardIconWrapClass
} from '../constants/chartCardStyles';

const StatValue = ({ value, valueClassName = 'text-slate-900', title }) => (
  <div className="flex items-baseline tabular-nums" title={title}>
    <span className={`text-lg sm:text-xl font-bold tracking-tight leading-none ${valueClassName}`}>{value}</span>
  </div>
);

const buildMonthlyTrend = (projects = [], dateFrom = '', dateTo = '') => {
  const from = normalizeDateToYYYYMMDD(dateFrom);
  const to = normalizeDateToYYYYMMDD(dateTo);

  if (from && to && from.slice(0, 4) === to.slice(0, 4)) {
    const year = Number(from.slice(0, 4));
    const counts = new Array(12).fill(0);
    (projects || []).forEach((p) => {
      const ymd = normalizeDateToYYYYMMDD(p?.date);
      if (!ymd || Number(ymd.slice(0, 4)) !== year) return;
      const m = Number(ymd.slice(5, 7));
      if (m >= 1 && m <= 12) counts[m - 1] += 1;
    });
    return { labels: MONTH_NAMES, values: counts, titleYear: year };
  }

  if (from && to && from <= to) {
    const labels = [];
    const values = [];
    const cursor = new Date(Number(from.slice(0, 4)), Number(from.slice(5, 7)) - 1, 1);
    const end = new Date(Number(to.slice(0, 4)), Number(to.slice(5, 7)) - 1, 1);
    const countByMonth = new Map();
    (projects || []).forEach((p) => {
      const ymd = normalizeDateToYYYYMMDD(p?.date);
      if (!ymd) return;
      const key = ymd.slice(0, 7);
      countByMonth.set(key, (countByMonth.get(key) || 0) + 1);
    });
    while (cursor <= end) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth();
      const key = `${y}-${String(m + 1).padStart(2, '0')}`;
      labels.push(`${MONTH_NAMES[m]} ${String(y).slice(-2)}`);
      values.push(countByMonth.get(key) || 0);
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return { labels, values, titleYear: null };
  }

  const year = new Date().getFullYear();
  const counts = new Array(12).fill(0);
  (projects || []).forEach((p) => {
    const ymd = normalizeDateToYYYYMMDD(p?.date);
    if (!ymd || Number(ymd.slice(0, 4)) !== year) return;
    const m = Number(ymd.slice(5, 7));
    if (m >= 1 && m <= 12) counts[m - 1] += 1;
  });
  return { labels: MONTH_NAMES, values: counts, titleYear: year };
};

/**
 * Charts use the same filtered projects/transactions as the table (broker, type, status, dates).
 */
const ProjectInsightsSummaryCard = ({
  projects = [],
  transactions = [],
  dateFrom = '',
  dateTo = ''
}) => {
  const { rangeLabel, onboardCurr, endedCurr } = useMemo(
    () => computeRollingWindowStats(projects),
    [projects]
  );

  const monthlyTrend = useMemo(
    () => buildMonthlyTrend(projects, dateFrom, dateTo),
    [projects, dateFrom, dateTo]
  );

  const hasMonthlyCount = monthlyTrend.values.some((n) => n > 0);
  const trendTitle = monthlyTrend.titleYear
    ? `Monthly Trends · ${monthlyTrend.titleYear}`
    : 'Monthly Trends';

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      <div className={`${chartCardClass} border-t-4 border-t-primary-500 overflow-hidden`}>
        <div className={chartCardHeaderClass}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 md:gap-6">
            <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
              <div className={`${chartCardIconWrapClass} bg-primary-100 text-primary-600`}>
                <FiBarChart2 className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <h3 className={chartCardTitleClass}>3-month project activity</h3>
                <p className={chartCardSubtitleClass}>
                  Onboard and ended project counts for the current window (uses filtered projects).
                </p>
              </div>
            </div>
            <div className="sm:text-right shrink-0 w-full sm:w-auto">
              <p
                className="text-xs sm:text-sm font-semibold text-slate-700 tabular-nums tracking-tight"
                title="Current rolling window"
              >
                {rangeLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="px-3 py-3 sm:px-4 md:px-6 sm:py-4 md:py-5 bg-slate-100/60 border-t border-slate-200/80">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 md:gap-4">
            <div className="rounded-lg sm:rounded-xl bg-white/90 border border-slate-200/80 shadow-sm ring-1 ring-slate-100/80 pl-3 pr-3 sm:pl-3.5 sm:pr-4 py-3 sm:py-3.5 border-l-[3px] border-l-primary-500 min-w-0">
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <span className="h-1.5 w-1.5 rounded-full bg-primary-500 ring-2 ring-primary-500/25" aria-hidden />
                <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.12em] sm:tracking-[0.14em] text-slate-600">
                  Onboard
                </span>
              </div>
              <div className="rounded-lg bg-slate-50/95 border border-slate-100 px-2.5 py-2">
                <StatValue
                  value={onboardCurr}
                  valueClassName="text-primary-800"
                  title="Projects whose start date falls in this window."
                />
              </div>
            </div>

            <div className="rounded-lg sm:rounded-xl bg-white/90 border border-slate-200/80 shadow-sm ring-1 ring-slate-100/80 pl-3 pr-3 sm:pl-3.5 sm:pr-4 py-3 sm:py-3.5 border-l-[3px] border-l-amber-500 min-w-0">
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 ring-2 ring-amber-500/25" aria-hidden />
                <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.12em] sm:tracking-[0.14em] text-amber-900/80">
                  Ended
                </span>
              </div>
              <div className="rounded-lg bg-amber-50/80 border border-amber-100/90 px-2.5 py-2">
                <StatValue
                  value={endedCurr}
                  valueClassName="text-amber-900"
                  title="Projects marked inactive in this window (inactive date; older rows may use last update)."
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-w-0">
        <div className="min-w-0">
          <ProjectInwardCostBar
            projects={projects}
            transactions={transactions}
            dateFrom={dateFrom || null}
            dateTo={dateTo || null}
            showDateFilter={false}
          />
        </div>
        <div className="min-w-0">
          {hasMonthlyCount ? (
            <LineChartChartJS
              data={[{ label: 'Projects', values: monthlyTrend.values, color: '#10b981' }]}
              labels={monthlyTrend.labels}
              title={trendTitle}
            />
          ) : (
            <div className={`${chartCardClass} border-t-4 border-t-primary-500`}>
              <div className={`${chartCardHeaderClass} min-w-0`}>
                <h3 className={chartCardTitleClass}>{trendTitle}</h3>
                <p className={chartCardSubtitleClass}>Project count by month for the current filters.</p>
              </div>
              <div className="px-3 py-8 sm:px-4 sm:py-10 text-center text-xs sm:text-sm text-slate-500">
                No projects for these filters.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectInsightsSummaryCard;
