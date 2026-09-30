import { FiEyeOff } from 'react-icons/fi';
import { chartPlotHeightClass } from '../constants/chartCardStyles';

/** Same footprint as the chart plot — opaque so no data shape leaks when privacy is on. */
const PrivacyChartPlaceholder = ({ className = chartPlotHeightClass }) => (
  <div
    className={`${className} flex flex-col items-center justify-center gap-2 rounded-xl bg-slate-50/90 border border-slate-100/80 text-slate-500`}
    role="status"
    aria-live="polite"
  >
    <FiEyeOff className="w-5 h-5 text-slate-400" aria-hidden />
    <p className="text-sm font-light tracking-tight">Hidden for privacy</p>
  </div>
);

export default PrivacyChartPlaceholder;
