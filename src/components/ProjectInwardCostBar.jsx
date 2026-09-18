import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { FiLayers } from 'react-icons/fi';
import { formatMoney } from '../utils/format';
import { buildProjectInwardCostChartRows } from '../utils/projectInwardCostChart';
import { shortenChartAxisLabel } from '../utils/chartLabels';
import { useDateFilter } from '../hooks/useDateFilter';
import DateFilterControls from './DateFilterControls';
import {
  chartCardClass,
  chartCardHeaderClass,
  chartCardTitleClass,
  chartCardSubtitleClass,
  chartCardIconWrapClass,
  chartPlotHeightClass
} from '../constants/chartCardStyles';
import { useCompactChart } from '../hooks/useCompactChart';
import {
  themeText,
  themeMuted,
  themeGrid,
  buildAxisTickFont,
  buildLegendFont,
  buildLegendPadding
} from '../utils/chartTheme';
import { ensureChartJsRegistered } from '../utils/registerChart';

ensureChartJsRegistered();

const MAX_BARS = 14;

const ProjectInwardCostBar = ({
  projects = [],
  transactions = [],
  dateFrom: dateFromProp = null,
  dateTo: dateToProp = null,
  showDateFilter = true,
  className = ''
}) => {
  const compact = useCompactChart();
  const chartDateFilter = useDateFilter({ defaultMode: 'month' });
  const controlled = dateFromProp != null || dateToProp != null;
  const effectiveDateFrom = controlled ? dateFromProp || '' : chartDateFilter.effectiveDateFrom;
  const effectiveDateTo = controlled ? dateToProp || '' : chartDateFilter.effectiveDateTo;
  const dateMode = controlled ? 'range' : chartDateFilter.dateMode;

  const { chartData, tooltipRowDetails, truncated } = useMemo(() => {
    const from = effectiveDateFrom || null;
    const to = effectiveDateTo || null;
    const rows = buildProjectInwardCostChartRows(projects, transactions, from, to);
    const slice = rows.slice(0, MAX_BARS);
    const labels = slice.map((r) => shortenChartAxisLabel(r.label));
    const inward = slice.map((r) => Number(r.inward.toFixed(2)));
    const totalCost = slice.map((r) => Number(r.costTotal.toFixed(2)));
    const tooltipRowDetails = slice.map((r) => ({
      fullLabel: r.label,
      brokerage: r.brokerage,
      tax: r.tax,
      projectCost: r.projectCost
    }));

    return {
      chartData: {
        labels,
        datasets: [
          {
            label: 'Total cost',
            data: totalCost,
            backgroundColor: '#dc2626',
            borderColor: '#b91c1c',
            borderWidth: 0,
            stack: 'main',
            borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 8, bottomRight: 8 },
            borderSkipped: false
          },
          {
            label: 'Inward',
            data: inward,
            backgroundColor: '#22c55e',
            borderColor: '#16a34a',
            borderWidth: 0,
            stack: 'main',
            borderRadius: { topLeft: 8, topRight: 8, bottomLeft: 0, bottomRight: 0 },
            borderSkipped: false
          }
        ]
      },
      tooltipRowDetails,
      truncated: rows.length > MAX_BARS
    };
  }, [projects, transactions, effectiveDateFrom, effectiveDateTo]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      layout: {
        padding: { top: 0, right: compact ? 4 : 8, bottom: 2, left: 2 }
      },
      plugins: {
        legend: {
          position: 'top',
          align: compact ? 'center' : 'end',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: buildLegendPadding(compact),
            color: themeText,
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
          borderColor: 'rgba(248, 250, 252, 0.12)',
          borderWidth: 1,
          cornerRadius: 12,
          displayColors: true,
          boxPadding: 6,
          itemSort: (a, b) => b.datasetIndex - a.datasetIndex,
          callbacks: {
            title: (items) => {
              const idx = items[0]?.dataIndex;
              if (idx == null || !tooltipRowDetails[idx]) return items[0]?.label || '';
              return tooltipRowDetails[idx].fullLabel;
            },
            label: (ctx) => {
              const v = ctx.parsed?.y;
              if (v == null || !Number.isFinite(v)) return `${ctx.dataset.label}: —`;
              return `${ctx.dataset.label}: ${formatMoney(v)}`;
            },
            afterBody: (items) => {
              const idx = items[0]?.dataIndex;
              if (idx == null || !tooltipRowDetails[idx]) return [];
              const r = tooltipRowDetails[idx];
              const lines = [];
              if (r.brokerage > 0) lines.push(`Brokerage: ${formatMoney(r.brokerage)}`);
              if (r.tax > 0) lines.push(`Tax: ${formatMoney(r.tax)}`);
              if (r.projectCost > 0) lines.push(`Project cost: ${formatMoney(r.projectCost)}`);
              return lines;
            }
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          ticks: {
            color: themeMuted,
            font: buildAxisTickFont(compact),
            padding: compact ? 4 : 8,
            maxRotation: compact ? 55 : 45,
            minRotation: 0,
            autoSkip: true,
            maxTicksLimit: compact ? 6 : undefined
          }
        },
        y: {
          stacked: true,
          beginAtZero: true,
          grid: {
            color: themeGrid,
            drawBorder: false,
            lineWidth: 1
          },
          ticks: {
            color: themeMuted,
            font: buildAxisTickFont(compact),
            padding: compact ? 6 : 10,
            maxTicksLimit: compact ? 5 : 7,
            callback: (value) => (Number.isFinite(value) ? `$${value}` : value)
          }
        }
      }
    }),
    [tooltipRowDetails, compact]
  );

  const hasData =
    chartData.labels.length > 0 &&
    chartData.datasets.some((d) => d.data.some((n) => n > 0));

  return (
    <div className={`${chartCardClass} !border-t-emerald-600 overflow-hidden flex flex-col ${className}`}>
      <div className={`${chartCardHeaderClass} shrink-0`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
          <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className={`${chartCardIconWrapClass} bg-emerald-100 text-emerald-700`}>
              <FiLayers className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <h3 className={chartCardTitleClass}>Inward vs total cost</h3>
              <p className={chartCardSubtitleClass}>
                Total cost: brokerage, tax, project cost. Net inward: filtered by date (after 2% withholding).
              </p>
            </div>
          </div>
          {showDateFilter && !controlled ? (
            <div className="shrink-0 w-full min-w-0 lg:w-auto lg:max-w-[min(100%,42rem)] lg:ml-auto">
              <DateFilterControls {...chartDateFilter} className="xl:items-end" />
            </div>
          ) : null}
        </div>
      </div>
      <div className="px-3 py-3 sm:px-4 md:px-6 sm:py-4 md:py-5 bg-slate-100/60 min-w-0 flex-1 flex flex-col">
        {truncated ? (
          <p className="text-[10px] sm:text-[11px] text-slate-500 mb-2 shrink-0">
            Showing the {MAX_BARS} largest projects by combined total.
          </p>
        ) : null}
        {hasData ? (
          <div className={`${chartPlotHeightClass} flex-1`}>
            <Bar data={chartData} options={options} />
          </div>
        ) : (
          <p className="text-xs sm:text-sm text-slate-500 py-8 sm:py-10 text-center px-2 flex-1 flex items-center justify-center">
            {dateMode !== 'all' && (effectiveDateFrom || effectiveDateTo)
              ? 'No data for this period. Try another range or clear the date filter.'
              : 'No approved transactions or cost data yet.'}
          </p>
        )}
      </div>
    </div>
  );
};

export default ProjectInwardCostBar;
