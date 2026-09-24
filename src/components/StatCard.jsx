import { Lift } from '../motion';
import { usePrivacyHidden } from '../contexts/PrivacyContext';
import { PRIVACY_MASK } from '../privacy/privacyStore';

const StatCard = ({
  label,
  value,
  valueClassName = 'text-primary-700',
  icon,
  iconClassName = 'text-primary-700',
  iconWrapClassName = 'bg-primary-50 ring-1 ring-primary-100/80',
  borderClassName = 'border-t-primary-600',
  chips = [],
  hint = null,
  actions = null
}) => {
  const hidden = usePrivacyHidden();
  const displayValue = hidden ? PRIVACY_MASK : value;
  const displayValueClass = hidden ? 'text-slate-400' : valueClassName;
  const displayChips = hidden
    ? chips.map((chip) => ({ ...chip, value: PRIVACY_MASK, className: 'bg-slate-100 text-slate-500' }))
    : chips;

  return (
    <Lift
      className={`bg-white rounded-2xl shadow-card overflow-hidden border border-slate-200/80 border-t-[3px] min-w-0 isolate ${borderClassName} transition-shadow duration-300 hover:shadow-card-hover`}
    >
      <div className="p-4 sm:p-5 md:p-6 flex flex-col gap-3 min-[1250px]:flex-row min-[1250px]:justify-between min-[1250px]:items-start min-[1250px]:gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            {icon && (
              <span
                className={`flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl shrink-0 ${iconWrapClassName} ${iconClassName}`}
              >
                {icon}
              </span>
            )}
            <p className="text-[10px] sm:text-[11px] font-light text-slate-500 uppercase tracking-[0.18em] leading-snug">
              {label}
            </p>
            {actions ? <div className="ml-auto shrink-0">{actions}</div> : null}
          </div>
          <p
            className={`mt-3 sm:mt-4 text-3xl sm:text-4xl font-bold tracking-tight leading-none tabular-nums font-mono ${displayValueClass}`}
            aria-label={hidden ? 'Hidden' : undefined}
          >
            {displayValue}
          </p>
          {hint && !hidden ? <div className="mt-2 min-w-0">{hint}</div> : null}
        </div>
        {displayChips.length > 0 && (
          <div className="flex flex-row flex-wrap gap-1.5 relative min-[1250px]:flex-col min-[1250px]:flex-nowrap min-[1250px]:flex-shrink-0 min-[1250px]:gap-2.5">
            {displayChips.map((chip) => (
              <span
                key={chip.label}
                className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-light whitespace-nowrap min-[1250px]:justify-end tabular-nums ${chip.className || 'bg-slate-100 text-slate-700'}`}
              >
                {chip.label} {chip.value}
              </span>
            ))}
          </div>
        )}
      </div>
    </Lift>
  );
};

export default StatCard;
