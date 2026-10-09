import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiActivity, FiAlertTriangle, FiClock, FiLayers, FiRefreshCw, FiUser } from 'react-icons/fi';
import { fetchProjects } from '../store/projects/projectsSlice';
import { useDateFilter } from '../hooks/useDateFilter';
import { usePrivacyHidden } from '../contexts/PrivacyContext';
import { LEAD_OPTIONS, PROJECT_MANAGER_OPTIONS, mergeAssignmentNames } from '../constants/projectAssignments';
import { inactiveReasonBadgeClass } from '../constants/projectInactiveReasons';
import { buildProjectInsights } from '../utils/projectInsightsStats';
import { maskSensitiveText } from '../privacy/privacyStore';
import PageHeader from '../components/PageHeader';
import PageContainer from '../components/PageContainer';
import FilterBar from '../components/FilterBar';
import SearchableDropdown from '../components/SearchableDropdown';
import StatCard from '../components/StatCard';
import ErrorAlert from '../components/ErrorAlert';
import Tabs from '../components/Tabs';
import DeferredMount, { ChartSkeleton } from '../components/DeferredMount';
import {
  chartCardClass,
  chartCardHeaderClass,
  chartCardTitleClass,
  chartCardSubtitleClass,
  chartCardIconWrapClass
} from '../constants/chartCardStyles';

const BarChart = lazy(() => import('../components/BarChart'));

const formatMonths = (value) => {
  if (value == null || !Number.isFinite(value)) return '—';
  if (value >= 12) {
    const years = Math.round((value / 12) * 10) / 10;
    return `${value} mo · ~${years} yr`;
  }
  return `${value} mo`;
};

const CompletedReasonsCard = ({ reasons = [], privacyHidden }) => {
  const max = Math.max(...reasons.map((r) => r.count || 0), 1);
  const total = reasons.reduce((s, r) => s + (r.count || 0), 0) || 1;

  return (
    <div className={`${chartCardClass} overflow-hidden h-full flex flex-col`}>
      <div className={chartCardHeaderClass}>
        <div className="flex items-start gap-2.5 min-w-0">
          <div className={`${chartCardIconWrapClass} bg-amber-50 text-amber-700`}>
            <FiLayers className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h3 className={chartCardTitleClass}>Why projects ended</h3>
            <p className={chartCardSubtitleClass}>Reasons with project names</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-3 py-3 sm:px-4 md:px-6 sm:py-4 md:py-5 bg-slate-50 border-t border-slate-100">
        {!reasons.length ? (
          <p className="text-sm text-slate-500 py-1.5">No completed projects with reasons in this range.</p>
        ) : (
          <ul className="space-y-2 sm:space-y-2.5">
            {reasons.map((r) => {
              const share = Math.round(((r.count || 0) / total) * 100);
              const widthPct = Math.max(8, Math.round(((r.count || 0) / max) * 100));
              const badgeClass = inactiveReasonBadgeClass(r.reason);
              const reasonLabel = privacyHidden ? maskSensitiveText(r.reason) : r.reason;
              const projects = r.projects || [];

              return (
                <li
                  key={r.reason}
                  className="rounded-lg sm:rounded-xl bg-white border border-slate-200 px-3 py-2.5 sm:px-3.5 sm:py-3 min-w-0"
                >
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span
                      className={`inline-flex items-center min-w-0 max-w-[50%] px-2 py-0.5 rounded-full text-[11px] font-semibold border truncate ${badgeClass}`}
                      title={r.reason}
                    >
                      {reasonLabel}
                    </span>
                    <div className="shrink-0 flex items-baseline gap-1.5">
                      <span className="text-base font-bold tabular-nums font-mono text-slate-900 leading-none">
                        {privacyHidden ? '····' : r.count}
                      </span>
                      <span className="text-xs font-bold tabular-nums text-amber-700 leading-none">
                        {privacyHidden ? '' : `${share}%`}
                      </span>
                      {!privacyHidden ? (
                        <span className="text-[10px] font-medium tabular-nums text-slate-400 leading-none">
                          · {formatMonths(r.avgDurationMonths)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-1.5 h-1 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  {projects.length ? (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {projects.map((p) => (
                        <span
                          key={p.id || p.name}
                          className={`inline-flex items-center max-w-[9rem] px-1.5 py-0.5 rounded-md text-[10px] font-semibold border truncate ${badgeClass}`}
                          title={p.name}
                        >
                          {privacyHidden ? maskSensitiveText(p.name) : p.name}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

const PersonProjectsTable = ({ person, roleLabel, privacyHidden }) => {
  if (!person) return null;

  const summaryStats = [
    {
      key: 'projects',
      label: 'Projects',
      value: privacyHidden ? '····' : String(person.projectCount ?? 0),
      tone: 'primary'
    },
    {
      key: 'avg',
      label: 'Avg life',
      value: privacyHidden ? '····' : formatMonths(person.avgDurationMonths),
      tone: 'slate'
    },
    {
      key: 'ext',
      label: 'Extensions',
      value: privacyHidden ? '····' : String(person.extensionCount ?? 0),
      tone: 'sky'
    },
    {
      key: 'reason',
      label: 'Top reason',
      value: privacyHidden
        ? '····'
        : person.topCompletedReason && person.topCompletedReason !== '—'
          ? person.topCompletedReason
          : '—',
      tone: 'amber'
    }
  ];

  const toneClass = {
    primary: 'border-l-primary-600 text-primary-900',
    slate: 'border-l-slate-400 text-slate-800',
    sky: 'border-l-sky-500 text-sky-900',
    amber: 'border-l-amber-500 text-amber-950'
  };

  return (
    <div className={`${chartCardClass} overflow-hidden`}>
      <div className={chartCardHeaderClass}>
        <div className="flex items-start gap-2.5 min-w-0">
          <div className={chartCardIconWrapClass}>
            <FiUser className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h3 className={chartCardTitleClass}>
              {privacyHidden ? maskSensitiveText(person.name) : person.name}
              <span className="text-slate-400 font-semibold"> · {roleLabel}</span>
            </h3>
            <p className={chartCardSubtitleClass}>Projects in the current filter range</p>
          </div>
        </div>
      </div>

      <div className="px-3 py-3 sm:px-4 md:px-6 sm:py-4 bg-slate-50 border-t border-slate-100">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {summaryStats.map((stat) => (
            <div
              key={stat.key}
              className={`rounded-lg sm:rounded-xl bg-white border border-slate-200 border-l-[3px] px-3 py-2.5 sm:py-3 min-w-0 ${toneClass[stat.tone]}`}
            >
              <p className="text-[10px] sm:text-[11px] font-light uppercase tracking-[0.16em] text-slate-500">
                {stat.label}
              </p>
              <p className="mt-1 text-sm sm:text-base font-bold tabular-nums font-mono truncate" title={stat.value}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-3 py-3 sm:px-4 md:px-6 sm:py-4 md:py-5 overflow-x-auto bg-white">
        <table className="w-full min-w-[52rem] text-left text-xs sm:text-sm">
          <thead>
            <tr className="text-[10px] sm:text-xs font-light text-slate-500 uppercase tracking-[0.16em]">
              <th className="py-2 pr-3">Project</th>
              <th className="py-2 pr-3">Lead</th>
              <th className="py-2 pr-3">PM</th>
              <th className="py-2 pr-3">Start</th>
              <th className="py-2 pr-3">End</th>
              <th className="py-2 pr-3">Duration</th>
              <th className="py-2 pr-3">Extensions</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2">Reason</th>
            </tr>
          </thead>
          <tbody>
            {person.projects.map((p) => {
              const reason = String(p.completedReason || '').trim();
              return (
                <tr key={p.id || `${p.name}-${p.start}`} className="border-t border-slate-100 text-slate-700">
                  <td className="py-2.5 pr-3 font-medium max-w-[10rem] truncate" title={p.name}>
                    {privacyHidden ? maskSensitiveText(p.name) : p.name}
                  </td>
                  <td className="py-2.5 pr-3">{privacyHidden ? '····' : p.lead}</td>
                  <td className="py-2.5 pr-3">{privacyHidden ? '····' : p.projectManager}</td>
                  <td className="py-2.5 pr-3 tabular-nums whitespace-nowrap">
                    {privacyHidden ? '····' : p.start || '—'}
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums whitespace-nowrap">
                    {privacyHidden ? '····' : p.contractEnd || p.end || '—'}
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums whitespace-nowrap">
                    {formatMonths(p.durationMonths)}
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums">{p.extensionCount}</td>
                  <td className="py-2.5 pr-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        p.isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {p.isActive ? 'Active' : 'Completed'}
                    </span>
                  </td>
                  <td className="py-2.5">
                    {!p.isActive && reason ? (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border max-w-[11rem] truncate ${inactiveReasonBadgeClass(reason)}`}
                        title={reason}
                      >
                        {privacyHidden ? '····' : reason}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const EndingSoonList = ({ endingSoon, privacyHidden }) => (
  <div className={`${chartCardClass} overflow-hidden h-full flex flex-col`}>
    <div className={chartCardHeaderClass}>
      <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
        <div className={`${chartCardIconWrapClass} bg-rose-50 text-rose-700`}>
          <FiAlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <h3 className={chartCardTitleClass}>Ending soon</h3>
          <p className={chartCardSubtitleClass}>Active projects ending in about 2 months</p>
        </div>
      </div>
    </div>
    <div className="flex-1 px-3 py-3 sm:px-4 md:px-6 sm:py-4 md:py-5 bg-slate-50 border-t border-slate-100">
      {!endingSoon.length ? (
        <p className="text-sm text-slate-500 py-2">Nothing ending soon.</p>
      ) : (
        <ul className="space-y-2 sm:space-y-2.5">
          {endingSoon.map((p) => {
            const overdue = p.monthsLeft != null && p.monthsLeft <= 0;
            return (
              <li
                key={p.id || `${p.name}-${p.contractEnd}`}
                className={`rounded-lg sm:rounded-xl bg-white border border-slate-200 border-l-[3px] px-3 py-2.5 sm:px-3.5 sm:py-3 min-w-0 ${
                  overdue ? 'border-l-rose-500' : 'border-l-amber-500'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate" title={p.name}>
                      {privacyHidden ? maskSensitiveText(p.name) : p.name}
                    </p>
                    <p className="text-[11px] font-light text-slate-500 truncate mt-0.5">
                      {privacyHidden
                        ? '····'
                        : `Lead ${p.lead}${p.contractEnd ? ` · ${p.contractEnd}` : ''}`}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold tabular-nums ${
                      overdue
                        ? 'bg-rose-50 text-rose-800 ring-1 ring-rose-100/80'
                        : 'bg-amber-50 text-amber-800 ring-1 ring-amber-100/80'
                    }`}
                  >
                    {privacyHidden ? '····' : overdue ? 'Overdue' : formatMonths(p.monthsLeft)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  </div>
);

/** Active load + extensions + ending soon, for Lead or PM. */
const RoleLoadCard = ({
  roleLabel,
  rows = [],
  privacyHidden,
  iconWrapClass = 'bg-emerald-50 text-emerald-700'
}) => (
  <div className={`${chartCardClass} overflow-hidden h-full flex flex-col`}>
    <div className={chartCardHeaderClass}>
      <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
        <div className={`${chartCardIconWrapClass} ${iconWrapClass}`}>
          <FiUser className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <h3 className={chartCardTitleClass}>By {roleLabel}</h3>
          <p className={chartCardSubtitleClass}>Active projects, extensions, and ending soon</p>
        </div>
      </div>
    </div>
    <div className="flex-1 bg-white border-t border-slate-100 overflow-x-auto">
      {!rows.length ? (
        <p className="text-sm text-slate-500 px-3 py-4 sm:px-4 md:px-6">No {roleLabel}s in this view.</p>
      ) : (
        <table className="w-full min-w-[22rem] text-left text-xs sm:text-sm">
          <thead>
            <tr className="text-[10px] sm:text-[11px] font-light text-slate-500 uppercase tracking-[0.16em] bg-slate-50">
              <th className="py-2.5 pl-3 sm:pl-4 md:pl-6 pr-2">{roleLabel}</th>
              <th className="py-2.5 pr-2 text-right">Active</th>
              <th className="py-2.5 pr-2 text-right">Extensions</th>
              <th className="py-2.5 pr-3 sm:pr-4 md:pr-6 text-right">Ending soon</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-t border-slate-100 text-slate-700">
                <td className="py-2.5 pl-3 sm:pl-4 md:pl-6 pr-2 font-semibold text-slate-800 truncate max-w-[8rem]">
                  {privacyHidden ? maskSensitiveText(r.name) : r.name}
                </td>
                <td className="py-2.5 pr-2 text-right tabular-nums font-bold font-mono text-emerald-800">
                  {privacyHidden ? '····' : r.activeCount}
                </td>
                <td className="py-2.5 pr-2 text-right tabular-nums font-bold font-mono text-sky-800">
                  {privacyHidden ? '····' : r.extensionCount}
                </td>
                <td className="py-2.5 pr-3 sm:pr-4 md:pr-6 text-right">
                  {(r.endingSoonCount || 0) > 0 ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold tabular-nums bg-rose-50 text-rose-800 ring-1 ring-rose-100/80">
                      {privacyHidden ? '····' : r.endingSoonCount}
                    </span>
                  ) : (
                    <span className="text-slate-300 tabular-nums">0</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </div>
);

const Insights = () => {
  const privacyHidden = usePrivacyHidden();
  const dispatch = useDispatch();
  const projects = useSelector((state) => state.projects.items);
  const error = useSelector((state) => state.projects.error);
  const dateFilter = useDateFilter({ defaultMode: 'month' });
  const { effectiveDateFrom: dateFrom, effectiveDateTo: dateTo } = dateFilter;
  const [selectedLead, setSelectedLead] = useState('');
  const [selectedPm, setSelectedPm] = useState('');
  const [tabId, setTabId] = useState('at-risk');

  useEffect(() => {
    document.title = 'Insights | FinHub';
  }, []);

  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

  const insights = useMemo(
    () =>
      buildProjectInsights({
        projects,
        dateFrom,
        dateTo,
        lead: selectedLead,
        projectManager: selectedPm
      }),
    [projects, dateFrom, dateTo, selectedLead, selectedPm]
  );

  const {
    summary,
    activeTimeline,
    completedReasons,
    loadByLead,
    loadByPm,
    endingSoon,
    extensionSplit,
    byLead,
    byProjectManager
  } = insights;

  const durationChart = useMemo(() => {
    const fullNames = activeTimeline.map((r) =>
      privacyHidden ? maskSensitiveText(r.name) : r.name
    );
    const fullLabels = activeTimeline.map((r, i) =>
      privacyHidden
        ? fullNames[i]
        : `${r.name} · ${r.start} → ${r.contractEnd || r.end} · Lead ${r.lead}`
    );
    return {
      labels: fullNames,
      fullLabels,
      data: [
        {
          label: 'Months',
          values: activeTimeline.map((r) => r.durationMonths),
          color: '#0d9488'
        }
      ]
    };
  }, [activeTimeline, privacyHidden]);

  const selectedLeadPerson = useMemo(
    () => (selectedLead ? byLead.find((p) => p.name === selectedLead) : null),
    [byLead, selectedLead]
  );
  const selectedPmPerson = useMemo(
    () => (selectedPm ? byProjectManager.find((p) => p.name === selectedPm) : null),
    [byProjectManager, selectedPm]
  );

  const leadFilterOptions = useMemo(
    () => mergeAssignmentNames(LEAD_OPTIONS, projects, 'lead'),
    [projects]
  );
  const pmFilterOptions = useMemo(
    () => mergeAssignmentNames(PROJECT_MANAGER_OPTIONS, projects, 'projectManager'),
    [projects]
  );

  const tabs = useMemo(
    () => [
      {
        id: 'at-risk',
        label: 'At risk',
        shortLabel: 'Risk',
        badge: summary.endingSoonCount || 0
      },
      { id: 'life', label: 'Project life', shortLabel: 'Life' },
      { id: 'extensions', label: 'Extensions', shortLabel: 'Extend' }
    ],
    [summary.endingSoonCount]
  );

  return (
    <PageContainer>
      <PageHeader
        title="Insights"
        subtitle="What’s ending soon, how long projects last, and extensions"
      />

      <FilterBar dateFilter={dateFilter}>
        <SearchableDropdown
          label="Lead"
          value={selectedLead}
          onChange={setSelectedLead}
          options={leadFilterOptions}
          placeholder="All Leads"
          layout="filter"
        />
        <SearchableDropdown
          label="Project Manager"
          value={selectedPm}
          onChange={setSelectedPm}
          options={pmFilterOptions}
          placeholder="All PMs"
          layout="filter"
        />
      </FilterBar>

      <ErrorAlert message={error} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        <StatCard
          label="Active projects"
          value={String(summary.activeCount ?? 0)}
          icon={<FiActivity className="w-5 h-5" />}
          iconClassName="text-emerald-600"
          iconWrapClassName="bg-emerald-50 ring-1 ring-emerald-100/80"
          borderClassName="border-t-emerald-500"
          hint={
            <p className="text-xs font-light text-slate-500">
              {summary.completedCount} completed in this view
            </p>
          }
        />
        <StatCard
          label="Ending soon"
          value={String(summary.endingSoonCount ?? 0)}
          icon={<FiAlertTriangle className="w-5 h-5" />}
          iconClassName="text-rose-600"
          iconWrapClassName="bg-rose-50 ring-1 ring-rose-100/80"
          borderClassName="border-t-rose-500"
          hint={<p className="text-xs font-light text-slate-500">Within about 2 months</p>}
        />
        <StatCard
          label="How long projects last"
          value={formatMonths(summary.avgLifeMonths)}
          icon={<FiClock className="w-5 h-5" />}
          iconClassName="text-primary-600"
          borderClassName="border-t-primary-600"
          hint={
            <p className="text-xs font-light text-slate-500">
              Median {formatMonths(summary.medianLifeMonths)} · {summary.projectCount} projects
            </p>
          }
        />
      </div>

      <Tabs tabs={tabs} activeId={tabId} onChange={setTabId}>
        {tabId === 'at-risk' ? (
          <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 items-stretch">
              <RoleLoadCard roleLabel="Lead" rows={loadByLead} privacyHidden={privacyHidden} />
              <RoleLoadCard
                roleLabel="PM"
                rows={loadByPm}
                privacyHidden={privacyHidden}
                iconWrapClass="bg-sky-50 text-sky-700"
              />
            </div>
            <EndingSoonList endingSoon={endingSoon} privacyHidden={privacyHidden} />
          </div>
        ) : null}

        {tabId === 'life' ? (
          <div className="space-y-4 sm:space-y-6">
            <DeferredMount fallback={<ChartSkeleton />}>
              <Suspense fallback={<ChartSkeleton />}>
                <div className="min-w-0">
                  {activeTimeline.length ? (
                    <BarChart
                      title="How long active projects have been open"
                      labels={durationChart.labels}
                      fullLabels={durationChart.fullLabels}
                      data={durationChart.data}
                      headerRight={
                        <p className="text-xs text-slate-500 font-medium">Freelance excluded</p>
                      }
                    />
                  ) : (
                    <div className={`${chartCardClass} p-6 text-sm text-slate-500`}>
                      No active projects in this view.
                    </div>
                  )}
                </div>
              </Suspense>
            </DeferredMount>
            <CompletedReasonsCard reasons={completedReasons} privacyHidden={privacyHidden} />
          </div>
        ) : null}

        {tabId === 'extensions' ? (
          <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              <StatCard
                label="Extensions this period"
                value={String(summary.totalExtensions ?? 0)}
                icon={<FiRefreshCw className="w-5 h-5" />}
                iconClassName="text-sky-600"
                iconWrapClassName="bg-sky-50 ring-1 ring-sky-100/80"
                borderClassName="border-t-sky-500"
                hint={
                  <p className="text-xs font-light text-slate-500">
                    {summary.pctExtended != null ? `${summary.pctExtended}%` : '—'} of projects extended
                  </p>
                }
              />
              <StatCard
                label="Avg extension length"
                value={formatMonths(summary.avgExtensionLengthMonths)}
                icon={<FiLayers className="w-5 h-5" />}
                iconClassName="text-violet-600"
                iconWrapClassName="bg-violet-50 ring-1 ring-violet-100/80"
                borderClassName="border-t-violet-500"
                hint={<p className="text-xs font-light text-slate-500">Old end date → new end date</p>}
              />
              <StatCard
                label="Avg per project"
                value={String(summary.avgExtensionsPerProject ?? '—')}
                icon={<FiRefreshCw className="w-5 h-5" />}
                iconClassName="text-sky-600"
                iconWrapClassName="bg-sky-50 ring-1 ring-sky-100/80"
                borderClassName="border-t-sky-500"
                hint={<p className="text-xs font-light text-slate-500">Extensions ÷ projects in view</p>}
              />
            </div>

            <div className={`${chartCardClass} overflow-hidden`}>
              <div className={chartCardHeaderClass}>
                <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                  <div className={`${chartCardIconWrapClass} bg-violet-50 text-violet-700`}>
                    <FiRefreshCw className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h3 className={chartCardTitleClass}>Never extended vs extended</h3>
                    <p className={chartCardSubtitleClass}>Share of projects and average life</p>
                  </div>
                </div>
              </div>
              <div className="px-3 py-3 sm:px-4 md:px-6 sm:py-4 md:py-5 bg-slate-50 border-t border-slate-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 md:gap-4">
                  <div className="rounded-lg sm:rounded-xl bg-white border border-slate-200 border-l-[3px] border-l-slate-400 pl-3 pr-3 sm:pl-3.5 sm:pr-4 py-3 sm:py-3.5 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" aria-hidden />
                        <span className="text-[10px] sm:text-[11px] font-light uppercase tracking-[0.16em] text-slate-600">
                          Never extended
                        </span>
                      </div>
                      <span className="text-base sm:text-lg font-bold tabular-nums font-mono text-slate-800 leading-none">
                        {privacyHidden ? '····' : extensionSplit.neverExtendedCount}
                      </span>
                    </div>
                    <p className="text-xs font-light text-slate-500">
                      {privacyHidden
                        ? '····'
                        : `${extensionSplit.pctNeverExtended ?? '—'}% · avg life ${formatMonths(
                            extensionSplit.neverExtendedAvgLifeMonths
                          )}`}
                    </p>
                  </div>
                  <div className="rounded-lg sm:rounded-xl bg-white border border-slate-200 border-l-[3px] border-l-sky-500 pl-3 pr-3 sm:pl-3.5 sm:pr-4 py-3 sm:py-3.5 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-sky-500 shrink-0" aria-hidden />
                        <span className="text-[10px] sm:text-[11px] font-light uppercase tracking-[0.16em] text-sky-900/80">
                          Extended
                        </span>
                      </div>
                      <span className="text-base sm:text-lg font-bold tabular-nums font-mono text-sky-900 leading-none">
                        {privacyHidden ? '····' : extensionSplit.extendedCount}
                      </span>
                    </div>
                    <p className="text-xs font-light text-slate-500">
                      {privacyHidden
                        ? '····'
                        : `${extensionSplit.pctExtended ?? '—'}% · avg life ${formatMonths(
                            extensionSplit.extendedAvgLifeMonths
                          )}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Tabs>

      {selectedLeadPerson || selectedPmPerson ? (
        <div className="space-y-4 sm:space-y-6">
          {selectedLeadPerson ? (
            <PersonProjectsTable
              person={selectedLeadPerson}
              roleLabel="Lead"
              privacyHidden={privacyHidden}
            />
          ) : null}
          {selectedPmPerson ? (
            <PersonProjectsTable
              person={selectedPmPerson}
              roleLabel="Project Manager"
              privacyHidden={privacyHidden}
            />
          ) : null}
        </div>
      ) : null}
    </PageContainer>
  );
};

export default Insights;
