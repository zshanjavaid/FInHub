import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { FiBarChart2 } from 'react-icons/fi';
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
  themePrimary,
  themeText,
  themeMuted,
  themeGrid,
  buildAxisTickFont,
  buildLegendFont,
  buildLegendPadding
} from '../utils/chartTheme';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const BarChart = ({ data, labels, title = 'Bar Chart' }) => {
  const compact = useCompactChart();

  const chartData = {
    labels: labels,
    datasets: data.map((dataset) => ({
      label: dataset.label,
      data: dataset.values,
      backgroundColor: dataset.color || themePrimary,
      borderColor: dataset.color || themePrimary,
      borderWidth: 0,
      borderRadius: { topLeft: 8, topRight: 8 },
      borderSkipped: false
    }))
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
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
  };

  return (
    <div className={`${chartCardClass} border-t-4 border-t-primary-500`}>
      <div className={`${chartCardHeaderClass} flex items-center gap-2.5 sm:gap-3 min-w-0`}>
        <div className={`${chartCardIconWrapClass} bg-primary-100 text-primary-600`}>
          <FiBarChart2 className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <h3 className={`${chartCardTitleClass} min-w-0 flex-1 truncate sm:whitespace-normal`}>{title}</h3>
      </div>
      <div className={chartPlotWrapClass}>
        <div className={chartPlotHeightClass}>
          <Bar data={chartData} options={options} />
        </div>
      </div>
    </div>
  );
};

export default BarChart;
