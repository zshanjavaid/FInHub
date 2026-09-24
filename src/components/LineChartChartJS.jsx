import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { FiInfo, FiTrendingUp } from 'react-icons/fi';
import {
  chartCardClass,
  chartCardHeaderClass,
  chartCardTitleClass,
  chartCardIconWrapClass,
  chartPlotWrapClass,
  chartPlotHeightClass
} from '../constants/chartCardStyles';
import { useCompactChart } from '../hooks/useCompactChart';
import { usePrivacyHidden } from '../contexts/PrivacyContext';
import PrivacyChartPlaceholder from './PrivacyChartPlaceholder';
import {
  themeText,
  themeMuted,
  themeGrid,
  buildAxisTickFont,
  buildLegendFont,
  buildLegendPadding
} from '../utils/chartTheme';
import { formatMoney } from '../utils/format';
import { ensureChartJsRegistered } from '../utils/registerChart';

ensureChartJsRegistered();

const LineChartChartJS = ({ data, labels, title = 'Line Chart', headerRight = null, info = null, className = '', stacked = false }) => {
  const compact = useCompactChart();
  const privacyHidden = usePrivacyHidden();

  const chartData = useMemo(() => {
    const fewPoints = (labels || []).length <= 2;
    return {
      labels,
      datasets: (data || []).map((dataset, index) => {
        const color = dataset.color || '#0d9488';
        const values = privacyHidden ? (dataset.values || []).map(() => 0) : dataset.values;
        return {
          label: dataset.label,
          data: values,
          borderColor: color,
          backgroundColor: (ctx) => {
            if (dataset.fill === false) return 'transparent';
            const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height);
            gradient.addColorStop(0, color + (stacked ? '99' : '40'));
            gradient.addColorStop(1, color + (stacked ? '33' : '02'));
            return gradient;
          },
          borderWidth: compact ? 2 : 2.5,
          fill: dataset.fill === false ? false : stacked ? (index === 0 ? 'origin' : '-1') : true,
          tension: fewPoints ? 0 : 0.35,
          borderDash: dataset.dashed ? [6, 4] : [],
          pointRadius: fewPoints ? (compact ? 5 : 6) : 0,
          pointHoverRadius: compact ? 6 : 8,
          pointBackgroundColor: color,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverBackgroundColor: color,
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
          ...(stacked ? { stack: 'monthly' } : {})
        };
      })
    };
  }, [data, labels, compact, stacked, privacyHidden]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: { top: 0, right: compact ? 4 : 8, bottom: 2, left: 2 }
      },
      interaction: {
        intersect: false,
        mode: 'index'
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
          callbacks: {
            label: (item) => {
              const name = item.dataset?.label || '';
              const y = item.parsed?.y;
              return `${name}: ${formatMoney(y)}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          stacked,
          grid: {
            color: themeGrid,
            drawBorder: false,
            lineWidth: 1
          },
          ticks: {
            color: themeMuted,
            font: buildAxisTickFont(compact),
            padding: compact ? 6 : 12,
            maxTicksLimit: compact ? 5 : 6
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: themeMuted,
            font: buildAxisTickFont(compact),
            padding: compact ? 6 : 12,
            maxRotation: compact ? 60 : 45,
            autoSkip: true,
            maxTicksLimit: compact ? 6 : undefined
          }
        }
      }
    }),
    [compact, stacked]
  );

  return (
    <div className={`${chartCardClass} flex flex-col ${info ? '!overflow-visible' : ''} ${className}`}>
      <div className={`${chartCardHeaderClass} flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0 ${info ? 'overflow-visible relative z-20' : ''}`}>
        <div className={`${chartCardIconWrapClass} bg-primary-100 text-primary-600`}>
          <FiTrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div className="min-w-0 flex-1 flex items-center gap-1.5 sm:gap-2">
          <h3 className={`${chartCardTitleClass} min-w-0 truncate sm:whitespace-normal`}>{title}</h3>
          {info ? (
            <div className="relative group/info shrink-0">
              <button
                type="button"
                className="inline-flex items-center justify-center w-6 h-6 rounded-full text-slate-400 hover:text-primary-600 hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
                aria-label="How this chart is calculated"
              >
                <FiInfo className="w-4 h-4" aria-hidden />
              </button>
              <div
                role="tooltip"
                className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-[min(18.5rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-slate-200/90 bg-white p-3 text-left shadow-elevated opacity-0 scale-95 transition duration-150 group-hover/info:opacity-100 group-hover/info:scale-100 group-focus-within/info:opacity-100 group-focus-within/info:scale-100"
              >
                {info}
              </div>
            </div>
          ) : null}
        </div>
        {headerRight ? <div className="shrink-0 text-right ml-auto">{headerRight}</div> : null}
      </div>
      <div className={`${chartPlotWrapClass} flex-1 flex flex-col min-h-0`}>
        {privacyHidden ? (
          <PrivacyChartPlaceholder />
        ) : (
          <div className={`${chartPlotHeightClass} flex-1`}>
            <Line data={chartData} options={options} />
          </div>
        )}
      </div>
    </div>
  );
};

export default LineChartChartJS;
