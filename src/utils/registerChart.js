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
  ChartJS.defaults.transitions.resize.animation.duration = 0;
  ChartJS.defaults.resizeDelay = 250;
  // Cap DPR so retina canvases stay sharp enough without 3× paint cost while scrolling.
  ChartJS.defaults.devicePixelRatio = Math.min(
    typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
    1.5
  );
  // Avoid clearing to transparent (white flash) when Chart.js redraws.
  ChartJS.defaults.backgroundColor = '#ffffff';
  registered = true;
}
