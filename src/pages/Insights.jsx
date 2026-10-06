import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiActivity, FiClock, FiLayers, FiRefreshCw, FiUser } from 'react-icons/fi';
import { fetchProjects } from '../store/projects/projectsSlice';
import { useDateFilter } from '../hooks/useDateFilter';
import { usePrivacyHidden } from '../contexts/PrivacyContext';
import { LEAD_OPTIONS, PROJECT_MANAGER_OPTIONS } from '../constants/projectAssignments';
import { buildProjectInsights } from '../utils/projectInsightsStats';
import { maskSensitiveText } from '../privacy/privacyStore';
import PageHeader from '../components/PageHeader';
import PageContainer from '../components/PageContainer';
import FilterBar from '../components/FilterBar';
import SearchableDropdown from '../components/SearchableDropdown';
import StatCard from '../components/StatCard';
import ErrorAlert from '../components/ErrorAlert';
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

const InsightRankCard = ({
  title,
  subtitle,
  icon,
  iconWrapClass,
  barClass,
  accentDotClass,
  emptyLabel,
  rows
}) => (
  <div className={`${chartCardClass} overflow-hidden h-full flex flex-col`}>
    <div className={chartCardHeaderClass}>
      <div className="flex items-start gap-2.5 min-w-0">
        <div className={`${chartCardIconWrapClass} ${iconWrapClass}`}>{icon}</div>
        <div className="min-w-0">
          <h3 className={chartCardTitleClass}>{title}</h3>
          <p className={chartCardSubtitleClass}>{subtitle}</p>
        </div>
      </div>
    </div>
    <div className="flex-1 px-3.5 py-3 sm:px-5 sm:py-4 bg-slate-50/60 border-t border-slate-100">
      {!rows.length ? (
        <p className="text-sm text-slate-500 py-2">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((row, index) => (
            <li
              key={row.key}
              className="rounded-xl bg-white border border-slate-200/80 px-3 py-2.5 sm:px-3.5 sm:py-3 min-w-0"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold tabular-nums ${
                    index === 0
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate" title={row.label}>
                        {row.label}
                      </p>
                      {row.meta ? (
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">{row.meta}</p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold tabular-nums font-mono text-slate-900 leading-none">
                        {row.value}
                      </p>
                      {row.valueHint ? (
                        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400 mt-1">
                          {row.valueHint}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barClass}`}
                      style={{ width: `${row.widthPct}%` }}
                    />
                  </div>
                  {row.chips?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {row.chips.map((chip) => (
                        <span
                          key={chip}
                          className="inline-flex items-center gap-1 rounded-md bg-slate-50 border border-slate-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600"
                        >
                          <span className={`h-1 w-1 rounded-full ${accentDotClass}`} aria-hidden />
                          {chip}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  </div>
);

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
          <div className={`${chartCardIconWrapClass} bg-primary-100 text-primary-600`}>
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

      <div className="px-3.5 pt-3 sm:px-5 sm:pt-4 bg-slate-50/70 border-t border-slate-100">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
          {summaryStats.map((stat) => (
            <div
              key={stat.key}
              className={`rounded-xl bg-white border border-slate-200/80 border-l-[3px] px-3 py-2.5 min-w-0 ${toneClass[stat.tone]}`}
            >
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                {stat.label}
              </p>
              <p className="mt-1 text-sm sm:text-base font-bold tabular-nums font-mono truncate" title={stat.value}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-3.5 py-3 sm:px-5 sm:py-4 overflow-x-auto">
        <table className="w-full min-w-[52rem] text-left text-xs sm:text-sm">
          <thead>
            <tr className="text-[10px] sm:text-xs font-light text-slate-500 uppercase tracking-[0.12em]">
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
                    {privacyHidden ? '····' : p.end || '—'}
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
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 max-w-[11rem] truncate"
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

const Insights = () => {
  const privacyHidden = usePrivacyHidden();
  const dispatch = useDispatch();
  const projects = useSelector((state) => state.projects.items);
  const error = useSelector((state) => state.projects.error);
  const dateFilter = useDateFilter({ defaultMode: 'month' });
  const { effectiveDateFrom: dateFrom, effectiveDateTo: dateTo } = dateFilter;
  const [selectedLead, setSelectedLead] = useState('');
  const [selectedPm, setSelectedPm] = useState('');

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

  const { summary, activeTimeline, completedReasons, extensionsByLead, byLead, byProjectManager } =
    insights;

  const durationChart = useMemo(() => {
    const fullNames = activeTimeline.map((r) =>
      privacyHidden ? maskSensitiveText(r.name) : r.name
    );
    const fullLabels = activeTimeline.map((r, i) =>
      privacyHidden
        ? fullNames[i]
        : `${r.name} · ${r.start} → ${r.end} · Lead ${r.lead}`
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

  const extensionLeadRows = useMemo(() => {
    const max = Math.max(...extensionsByLead.map((r) => r.extensionCount || 0), 1);
    return extensionsByLead.map((r) => ({
      key: r.lead,
      label: privacyHidden ? maskSensitiveText(r.lead) : r.lead,
      meta: privacyHidden ? null : `${r.projectCount} project${r.projectCount === 1 ? '' : 's'} in view`,
      value: privacyHidden ? '····' : String(r.extensionCount),
      valueHint: 'extensions',
      widthPct: Math.max(8, Math.round(((r.extensionCount || 0) / max) * 100)),
      chips: privacyHidden
        ? null
        : [`${r.projectCount} project${r.projectCount === 1 ? '' : 's'}`]
    }));
  }, [extensionsByLead, privacyHidden]);

  const completedReasonRows = useMemo(() => {
    const max = Math.max(...completedReasons.map((r) => r.count || 0), 1);
    const total = completedReasons.reduce((s, r) => s + (r.count || 0), 0) || 1;
    return completedReasons.map((r) => {
      const share = Math.round(((r.count || 0) / total) * 100);
      return {
        key: r.reason,
        label: privacyHidden ? maskSensitiveText(r.reason) : r.reason,
        meta: privacyHidden ? null : `Avg life ${formatMonths(r.avgDurationMonths)}`,
        value: privacyHidden ? '····' : String(r.count),
        valueHint: 'projects',
        widthPct: Math.max(8, Math.round(((r.count || 0) / max) * 100)),
        chips: privacyHidden
          ? null
          : [`${share}% of completed`, `Avg ${formatMonths(r.avgDurationMonths)}`]
      };
    });
  }, [completedReasons, privacyHidden]);

  const selectedLeadPerson = useMemo(
    () => (selectedLead ? byLead.find((p) => p.name === selectedLead) : null),
    [byLead, selectedLead]
  );
  const selectedPmPerson = useMemo(
    () => (selectedPm ? byProjectManager.find((p) => p.name === selectedPm) : null),
    [byProjectManager, selectedPm]
  );

  return (
    <PageContainer>
      <PageHeader
        title="Insights"
        subtitle="Project life, extensions, and Lead / PM tenure"
      />

      <FilterBar dateFilter={dateFilter}>
        <SearchableDropdown
          label="Lead"
          value={selectedLead}
          onChange={setSelectedLead}
          options={LEAD_OPTIONS.map((o) => o.label)}
          placeholder="All Leads"
          layout="filter"
        />
        <SearchableDropdown
          label="Project Manager"
          value={selectedPm}
          onChange={setSelectedPm}
          options={PROJECT_MANAGER_OPTIONS.map((o) => o.label)}
          placeholder="All PMs"
          layout="filter"
        />
      </FilterBar>

      <ErrorAlert message={error} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          label="Avg project life"
          value={formatMonths(summary.avgLifeMonths)}
          icon={<FiClock className="w-5 h-5" />}
          iconClassName="text-primary-600"
          borderClassName="border-t-primary-600"
          hint={
            <p className="text-xs text-slate-500">
              Median {formatMonths(summary.medianLifeMonths)} · {summary.projectCount} projects
            </p>
          }
        />
        <StatCard
          label="Extensions in range"
          value={String(summary.totalExtensions ?? 0)}
          icon={<FiRefreshCw className="w-5 h-5" />}
          iconClassName="text-sky-600"
          borderClassName="border-t-sky-500"
          hint={
            <p className="text-xs text-slate-500">
              Avg {summary.avgExtensionsPerProject ?? '—'} / project ·{' '}
              {summary.pctExtended != null ? `${summary.pctExtended}%` : '—'} extended
            </p>
          }
        />
        <StatCard
          label="Avg extension length"
          value={formatMonths(summary.avgExtensionLengthMonths)}
          icon={<FiLayers className="w-5 h-5" />}
          iconClassName="text-violet-600"
          borderClassName="border-t-violet-500"
          hint={<p className="text-xs text-slate-500">From prior end date to new end date</p>}
        />
        <StatCard
          label="Active now (in range)"
          value={String(summary.activeCount ?? 0)}
          icon={<FiActivity className="w-5 h-5" />}
          iconClassName="text-emerald-600"
          borderClassName="border-t-emerald-500"
          hint={
            <p className="text-xs text-slate-500">{summary.completedCount} completed in view</p>
          }
        />
      </div>

      <DeferredMount fallback={<ChartSkeleton />}>
        <Suspense fallback={<ChartSkeleton />}>
          <div className="min-w-0">
            {activeTimeline.length ? (
              <BarChart
                title="Active project duration"
                labels={durationChart.labels}
                fullLabels={durationChart.fullLabels}
                data={durationChart.data}
                headerRight={
                  <p className="text-xs text-slate-500 font-medium">Months open · freelance excluded</p>
                }
              />
            ) : (
              <div className={`${chartCardClass} p-6 text-sm text-slate-500`}>
                No active projects in this range.
              </div>
            )}
          </div>
        </Suspense>
      </DeferredMount>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 items-stretch">
        <InsightRankCard
          title="Extensions by Lead"
          subtitle="Who extended contracts in this range"
          icon={<FiRefreshCw className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden />}
          iconWrapClass="bg-sky-100 text-sky-700"
          barClass="bg-gradient-to-r from-sky-600 to-sky-400"
          accentDotClass="bg-sky-500"
          emptyLabel="No extensions in this range."
          rows={extensionLeadRows}
        />
        <InsightRankCard
          title="Completed reasons"
          subtitle="Why projects ended · share and average life"
          icon={<FiLayers className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden />}
          iconWrapClass="bg-amber-100 text-amber-700"
          barClass="bg-gradient-to-r from-amber-500 to-amber-400"
          accentDotClass="bg-amber-500"
          emptyLabel="No completed projects with reasons in this range."
          rows={completedReasonRows}
        />
      </div>

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
