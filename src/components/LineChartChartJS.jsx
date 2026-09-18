import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { FiTrendingUp } from 'react-icons/fi';
import {
  chartCardClass,
  chartCardHeaderClass,
  chartCardTitleClass,
  chartCardIconWrapClass,
  chartPlotWrapClass,
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

const LineChartChartJS = ({ data, labels, title = 'Line Chart', headerRight = null, className = '' }) => {
  const compact = useCompactChart();

  const chartData = useMemo(() => {
    const fewPoints = (labels || []).length <= 2;
    return {
      labels,
      datasets: (data || []).map((dataset) => {
        const color = dataset.color || '#0d9488';
        return {
          label: dataset.label,
          data: dataset.values,
          borderColor: color,
          backgroundColor: (ctx) => {
            const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height);
            gradient.addColorStop(0, color + '40');
            gradient.addColorStop(1, color + '02');
            return gradient;
          },
          borderWidth: compact ? 2 : 2.5,
          fill: true,
          tension: fewPoints ? 0 : 0.35,
          pointRadius: fewPoints ? (compact ? 5 : 6) : 0,
          pointHoverRadius: compact ? 6 : 8,
          pointBackgroundColor: color,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverBackgroundColor: color,
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2
        };
      })
    };
  }, [data, labels, compact]);

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
          boxPadding: 6
        }
      },
      scales: {
        y: {
          beginAtZero: true,
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
    [compact]
  );

  return (
    <div className={`${chartCardClass} flex flex-col ${className}`}>
      <div className={`${chartCardHeaderClass} flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0`}>
        <div className={`${chartCardIconWrapClass} bg-primary-100 text-primary-600`}>
          <FiTrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <h3 className={`${chartCardTitleClass} min-w-0 flex-1 truncate sm:whitespace-normal`}>{title}</h3>
        {headerRight ? <div className="shrink-0 text-right ml-auto">{headerRight}</div> : null}
      </div>
      <div className={`${chartPlotWrapClass} flex-1 flex flex-col min-h-0`}>
        <div className={`${chartPlotHeightClass} flex-1`}>
          <Line data={chartData} options={options} />
        </div>
      </div>
    </div>
  );
};

export default LineChartChartJS;
