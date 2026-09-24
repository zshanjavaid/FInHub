import { useMemo } from 'react';
import { FiBarChart2, FiBriefcase, FiCheckCircle } from 'react-icons/fi';
import { computeRollingWindowStats } from '../utils/projectRollingStats';
import { usePrivacyHidden } from '../contexts/PrivacyContext';
import { PRIVACY_MASK } from '../privacy/privacyStore';
import {
  chartCardClass,
  chartCardHeaderClass,
  chartCardTitleClass,
  chartCardSubtitleClass,
  chartCardIconWrapClass
} from '../constants/chartCardStyles';

const ProjectNamePills = ({ items, tone = 'primary', emptyLabel = 'None in this window', privacyHidden }) => {
  if (privacyHidden) {
    return (
      <div className="mt-2.5 space-y-1.5">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-full bg-slate-100/90 px-2 py-1.5 border border-slate-100"
          >
            <span className="h-6 w-6 rounded-full bg-slate-200 shrink-0" aria-hidden />
            <span className="text-sm text-slate-400 font-medium truncate">{PRIVACY_MASK}</span>
          </div>
        ))}
      </div>
    );
  }

  if (!items.length) {
    return <p className="mt-2.5 text-xs text-slate-500">{emptyLabel}</p>;
  }

  const iconWrap =
    tone === 'amber'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-primary-100 text-primary-700';
  const rowClass =
    tone === 'amber'
      ? 'bg-amber-50/90 border-amber-100/90 text-amber-950'
      : 'bg-primary-50/80 border-primary-100/90 text-primary-950';
  const Icon = tone === 'amber' ? FiCheckCircle : FiBriefcase;

  return (
    <ul className="mt-2.5 space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
      {items.map((item) => (
        <li key={item.id}>
          <div
            className={`flex items-center gap-2 rounded-full border px-2 py-1.5 min-w-0 ${rowClass}`}
            title={item.name}
          >
            <span className={`flex h-6 w-6 items-center justify-center rounded-full shrink-0 ${iconWrap}`}>
              <Icon className="w-3.5 h-3.5" aria-hidden />
            </span>
            <span className="text-sm font-medium truncate leading-tight">{item.name}</span>
          </div>
        </li>
      ))}
    </ul>
  );
};

/** 3-month onboard / ended activity (all approved projects — ignores page filters). */
const ProjectInsightsSummaryCard = ({ projects = [], activityProjects = null }) => {
  const privacyHidden = usePrivacyHidden();
  const activitySource = activityProjects != null ? activityProjects : projects;

  const { rangeLabel, onboardCurr, endedCurr, onboardProjects, endedProjects } = useMemo(
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
                Project names onboarded or ended in the last 3 months (all projects — not affected by filters).
              </p>
            </div>
          </div>
          <div className="sm:text-right shrink-0 w-full sm:w-auto">
            <p
              className="text-xs sm:text-sm font-light text-slate-700 tabular-nums tracking-wide"
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
            <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-1.5 w-1.5 rounded-full bg-primary-600 shrink-0" aria-hidden />
                <span className="text-[10px] sm:text-[11px] font-light uppercase tracking-[0.16em] text-slate-600">
                  Onboard
                </span>
              </div>
              <span
                className={`text-base sm:text-lg font-bold tabular-nums font-mono leading-none ${
                  privacyHidden ? 'text-slate-400' : 'text-primary-800'
                }`}
                title="Projects whose start date falls in this window."
              >
                {privacyHidden ? PRIVACY_MASK : onboardCurr}
              </span>
            </div>
            <ProjectNamePills
              items={onboardProjects}
              tone="primary"
              emptyLabel="No projects onboarded in this window"
              privacyHidden={privacyHidden}
            />
          </div>

          <div className="rounded-lg sm:rounded-xl bg-white border border-slate-200 pl-3 pr-3 sm:pl-3.5 sm:pr-4 py-3 sm:py-3.5 border-l-[3px] border-l-amber-500 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" aria-hidden />
                <span className="text-[10px] sm:text-[11px] font-light uppercase tracking-[0.16em] text-amber-900/80">
                  Ended
                </span>
              </div>
              <span
                className={`text-base sm:text-lg font-bold tabular-nums font-mono leading-none ${
                  privacyHidden ? 'text-slate-400' : 'text-amber-900'
                }`}
                title="Projects whose End Date falls in this window (inactive / completed)."
              >
                {privacyHidden ? PRIVACY_MASK : endedCurr}
              </span>
            </div>
            <ProjectNamePills
              items={endedProjects}
              tone="amber"
              emptyLabel="No projects ended in this window"
              privacyHidden={privacyHidden}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectInsightsSummaryCard;
