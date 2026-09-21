import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { chartFontFamily } from './chartTheme';

let registered = false;

/** Register Chart.js controllers once — safe to call from every chart component. */
export function ensureChartJsRegistered() {
  if (registered) return;
  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Filler,
    Title,
    Tooltip,
    Legend
  );
  ChartJS.defaults.font.family = chartFontFamily;
  ChartJS.defaults.animation = false;
  ChartJS.defaults.transitions.active.animation.duration = 0;
  ChartJS.defaults.resizeDelay = 150;
  registered = true;
}
