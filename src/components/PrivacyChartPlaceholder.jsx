import { FiEyeOff } from 'react-icons/fi';
import { chartPlotHeightClass } from '../constants/chartCardStyles';

const PrivacyChartPlaceholder = ({ className = chartPlotHeightClass }) => (
  <div
    className={`${className} flex flex-col items-center justify-center gap-2 rounded-xl bg-slate-50/80 text-slate-500`}
    role="status"
    aria-live="polite"
  >
    <FiEyeOff className="w-5 h-5 text-slate-400" aria-hidden />
    <p className="text-sm font-light tracking-tight">Hidden for privacy</p>
  </div>
);

export default PrivacyChartPlaceholder;
