import { useMemo } from 'react';
import { FiBarChart2 } from 'react-icons/fi';
import { computeRollingWindowStats } from '../utils/projectRollingStats';
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

/** 3-month onboard / ended activity (all approved projects — ignores page filters). */
const ProjectInsightsSummaryCard = ({ projects = [], activityProjects = null }) => {
  const activitySource = activityProjects != null ? activityProjects : projects;

  const { rangeLabel, onboardCurr, endedCurr } = useMemo(
    () => computeRollingWindowStats(activitySource),
    [activitySource]
  );

  return (
    <div className={`${chartCardClass} overflow-hidden`}>
      <div className={chartCardHeaderClass}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 md:gap-6">
          <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
            <div className={`${chartCardIconWrapClass} bg-primary-100 text-primary-600`}>
              <FiBarChart2 className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <h3 className={chartCardTitleClass}>3-month project activity</h3>
              <p className={chartCardSubtitleClass}>
                Onboard and ended counts for the last 3 months (all projects — not affected by filters).
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

      <div className="px-3 py-3 sm:px-4 md:px-6 sm:py-4 md:py-5 bg-slate-50 border-t border-slate-100">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 md:gap-4">
          <div className="rounded-lg sm:rounded-xl bg-white border border-slate-200 pl-3 pr-3 sm:pl-3.5 sm:pr-4 py-3 sm:py-3.5 border-l-[3px] border-l-primary-600 min-w-0">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-600" aria-hidden />
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-slate-600">
                Onboard
              </span>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-2">
              <StatValue
                value={onboardCurr}
                valueClassName="text-primary-800"
                title="Projects whose start date falls in this window."
              />
            </div>
          </div>

          <div className="rounded-lg sm:rounded-xl bg-white border border-slate-200 pl-3 pr-3 sm:pl-3.5 sm:pr-4 py-3 sm:py-3.5 border-l-[3px] border-l-amber-500 min-w-0">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-amber-900/80">
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
  );
};

export default ProjectInsightsSummaryCard;
