import { memo, useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { FiTrendingUp } from 'react-icons/fi';
import {
  chartCardClass,
  chartCardHeaderClass,
  chartCardTitleClass,
  chartCardSubtitleClass,
  chartCardIconWrapClass,
  chartPlotWrapClass,
  chartPlotHeightClass
} from '../constants/chartCardStyles';
import { useCompactChart } from '../hooks/useCompactChart';
import {
  themePrimary,
  themeMuted,
  themeGrid,
  buildAxisTickFont,
  buildLegendFont,
  buildLegendPadding
} from '../utils/chartTheme';
import { buildActiveProjectsYearComparison } from '../utils/projectYearComparison';
import { ensureChartJsRegistered } from '../utils/registerChart';

ensureChartJsRegistered();

const COMPLETED_COLOR = '#d97706';
const ALL_TAB = 'all';
const YEAR_LINE_COLORS = ['#0d9488', '#0284c7', '#d97706', '#7c3aed', '#e11d48', '#65a30d'];

const lineDataset = (label, values, color, { fill = false, compact = false, pointIndex = -1 } = {}) => ({
  label,
  data: values,
  borderColor: color,
  backgroundColor: fill
    ? (ctx) => {
        const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height);
        gradient.addColorStop(0, `${color}40`);
        gradient.addColorStop(1, `${color}02`);
        return gradient;
      }
    : 'transparent',
  borderWidth: compact ? 2 : 2.5,
  fill,
  tension: 0.35,
  spanGaps: false,
  pointRadius: (ctx) => (ctx.dataIndex === pointIndex && ctx.raw != null ? (compact ? 5 : 6) : 0),
  pointHoverRadius: compact ? 6 : 8,
  pointBackgroundColor: color,
  pointBorderColor: '#fff',
  pointBorderWidth: 2,
  pointHoverBackgroundColor: color,
  pointHoverBorderColor: '#fff',
  pointHoverBorderWidth: 2
});

const tabClass = (isActive) =>
  `px-3 py-2 rounded-lg text-sm font-semibold transition-colors duration-150 border text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:ring-offset-1 ${
    isActive
      ? 'bg-white text-primary-700 shadow-sm border-slate-200/70'
      : 'text-slate-600 border-transparent hover:text-slate-800 hover:bg-white/60'
  }`;

const ActiveProjectsYearComparisonChart = ({ projects = [], className = '' }) => {
  const compact = useCompactChart();
  const comparison = useMemo(() => buildActiveProjectsYearComparison(projects), [projects]);
  const [selectedTab, setSelectedTab] = useState(ALL_TAB);

  const isAll = selectedTab === ALL_TAB;
  const selectedYear =
    !isAll && comparison.years.includes(selectedTab) ? selectedTab : comparison.defaultYear;
  const selected = !isAll ? comparison.byYear[selectedYear] || null : null;

  const seriesChrono = useMemo(
    () => [...(comparison.series || [])].sort((a, b) => a.year - b.year),
    [comparison.series]
  );

  const yearColorMap = useMemo(() => {
    const map = {};
    seriesChrono.forEach((s, i) => {
      map[s.year] = YEAR_LINE_COLORS[i % YEAR_LINE_COLORS.length];
    });
    return map;
  }, [seriesChrono]);

  const hasData = isAll
    ? seriesChrono.some(
        (s) =>
          (s.active || []).some((n) => n != null && n > 0) ||
          (s.completed || []).some((n) => n != null && n > 0)
      )
    : Boolean(
        selected &&
          ((selected.active || []).some((n) => n != null && n > 0) ||
            (selected.completed || []).some((n) => n != null && n > 0))
      );

  const chartData = useMemo(() => {
    const pointIndex = comparison.currentMonth;

    if (isAll) {
      return {
        labels: comparison.labels,
        datasets: seriesChrono.map((s) =>
          lineDataset(String(s.year), (s.active || []).map((n) => (n == null ? null : n)), yearColorMap[s.year] || themePrimary, {
            fill: false,
            compact,
            pointIndex: s.isCurrent ? pointIndex : -1
          })
        )
      };
    }

    if (!selected) return { labels: comparison.labels, datasets: [] };

    const endIdx = selected.isCurrent ? comparison.currentMonth : 11;
    const labels = comparison.labels.slice(0, endIdx + 1);
    const yearColor = yearColorMap[selected.year] || themePrimary;

    return {
      labels,
      datasets: [
        lineDataset('Total projects', (selected.active || []).slice(0, endIdx + 1), yearColor, {
          fill: true,
          compact,
          pointIndex: selected.isCurrent ? pointIndex : endIdx
        }),
        lineDataset('Completed projects', (selected.completed || []).slice(0, endIdx + 1), COMPLETED_COLOR, {
          fill: false,
          compact,
          pointIndex: selected.isCurrent ? pointIndex : endIdx
        })
      ]
    };
  }, [isAll, selected, seriesChrono, yearColorMap, comparison.labels, comparison.currentMonth, compact]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 4, right: compact ? 4 : 8, bottom: 2, left: 2 } },
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: {
          position: 'top',
          align: compact ? 'center' : 'end',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: buildLegendPadding(compact),
            color: '#1e293b',
            font: buildLegendFont(compact),
            boxWidth: compact ? 8 : 12
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          titleColor: '#f8fafc',
          bodyColor: '#e2e8f0',
          padding: compact ? 10 : 14,
          titleFont: { size: compact ? 11 : 13, weight: 'bold' },
          bodyFont: { size: compact ? 11 : 13 },
          borderColor: 'rgba(13, 148, 136, 0.35)',
          borderWidth: 1,
          cornerRadius: 12,
          displayColors: true,
          boxPadding: 6,
          callbacks: {
            title: (items) => {
              const i = items?.[0]?.dataIndex;
              if (i == null) return '';
              return comparison.fullLabels[i] || comparison.labels[i] || '';
            },
            label: (ctx) => {
              if (isAll) {
                const year = Number(ctx.dataset.label);
                const s = comparison.byYear[year];
                const total = ctx.parsed?.y;
                const completed = s?.completed?.[ctx.dataIndex];
                return `${year}: ${total == null ? '—' : total} total · ${completed == null ? '—' : completed} completed`;
              }
              const v = ctx.parsed?.y;
              return `${ctx.dataset.label}: ${v == null ? '—' : v}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grace: '8%',
          grid: { color: themeGrid, drawBorder: false, lineWidth: 1, borderDash: [4, 4] },
          ticks: {
            color: themeMuted,
            font: buildAxisTickFont(compact),
            padding: compact ? 6 : 12,
            maxTicksLimit: compact ? 5 : 6,
            precision: 0
          }
        },
        x: {
          grid: { display: false },
          ticks: {
            color: themeMuted,
            font: buildAxisTickFont(compact),
            padding: compact ? 6 : 12,
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: compact ? 6 : 12
          },
          title: {
            display: !compact,
            text: 'Month',
            color: themeMuted,
            font: { size: 11, weight: '600' },
            padding: { top: 4 }
          }
        }
      }
    }),
    [comparison.fullLabels, comparison.labels, comparison.byYear, compact, isAll]
  );

  return (
    <div className={`${chartCardClass} flex flex-col ${className}`}>
      <div className={`${chartCardHeaderClass} shrink-0`}>
        <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
          <div className={`${chartCardIconWrapClass} bg-primary-100 text-primary-600`}>
            <FiTrendingUp className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h3 className={chartCardTitleClass}>
              {isAll ? 'Annual project comparison' : `Annual projects · ${selectedYear}`}
            </h3>
            <p className={chartCardSubtitleClass}>
              {comparison.years.length
                ? isAll
                  ? 'Compare active totals by month across years.'
                  : `Monthly total vs completed for ${selectedYear}.`
                : 'No yearly project history yet.'}
            </p>
          </div>
        </div>

        {comparison.years.length > 0 ? (
          <div
            className="mt-4 inline-flex max-w-full flex-wrap gap-0.5 p-0.5 rounded-xl bg-slate-100"
            role="tablist"
            aria-label="Select year view"
          >
            <button
              type="button"
              role="tab"
              aria-selected={isAll}
              onClick={() => setSelectedTab(ALL_TAB)}
              className={`${tabClass(isAll)} min-w-[4.25rem] self-stretch`}
            >
              All
            </button>
            {comparison.years.map((year) => {
              const s = comparison.byYear[year];
              const active = !isAll && year === selectedYear;
              const swatch = yearColorMap[year] || themePrimary;
              return (
                <button
                  key={year}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedTab(year)}
                  className={`${tabClass(active)} min-w-[8rem]`}
                >
                  <span className="flex items-center gap-1.5 leading-tight">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-white"
                      style={{ backgroundColor: swatch }}
                      aria-hidden
                    />
                    {year}
                  </span>
                  <span className="mt-0.5 block text-[10px] font-semibold tabular-nums text-slate-500 leading-tight">
                    <span className="text-slate-800">{s?.totalProjects ?? 0}</span>
                    {' total · '}
                    <span className="text-amber-700">{s?.completedProjects ?? 0}</span>
                    {' completed'}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className={`${chartPlotWrapClass} flex-1 flex flex-col min-h-0`}>
        {hasData ? (
          <div className={`${chartPlotHeightClass} flex-1`}>
            <Line data={chartData} options={options} />
          </div>
        ) : (
          <div className="px-3 py-10 text-center text-xs sm:text-sm text-slate-500">
            No project history for this view.
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(ActiveProjectsYearComparisonChart);
