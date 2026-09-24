import { useMemo } from 'react';
import {
  PROJECT_TYPE_OPTIONS,
  PROJECT_TYPE_COLORS,
  countProjectsByType
} from '../constants/projectTypes';
import { usePrivacyHidden } from '../contexts/PrivacyContext';
import { PRIVACY_MASK } from '../privacy/privacyStore';

const ProjectTypeCountBar = ({ projects = [] }) => {
  const privacyHidden = usePrivacyHidden();
  const { counts, unset, total } = useMemo(() => countProjectsByType(projects), [projects]);

  const display = (n) => (privacyHidden ? PRIVACY_MASK : n);

  return (
    <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end w-full sm:w-auto">
      {PROJECT_TYPE_OPTIONS.map(({ value }) => (
        <span
          key={value}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border border-transparent ${
            PROJECT_TYPE_COLORS[value] || 'bg-slate-100 text-slate-700'
          }`}
        >
          <span>{value}</span>
          <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-white/70 text-[11px] font-extrabold tabular-nums">
            {display(counts[value] ?? 0)}
          </span>
        </span>
      ))}
      {unset > 0 ? (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
          <span>Unset</span>
          <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-white/70 text-[11px] font-extrabold tabular-nums">
            {display(unset)}
          </span>
        </span>
      ) : null}
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-white">
        <span>Total</span>
        <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-white/20 text-[11px] font-extrabold tabular-nums">
          {display(total)}
        </span>
      </span>
    </div>
  );
};

export default ProjectTypeCountBar;
