const StatCard = ({
  label,
  value,
  valueClassName = 'text-primary-700',
  icon,
  iconClassName = 'text-primary-700',
  borderClassName = 'border-t-primary-600',
  chips = []
}) => (
  <div
    className={`bg-white rounded-2xl shadow-card overflow-hidden border border-slate-200/80 border-t-[3px] min-w-0 ${borderClassName} transition-shadow duration-300 hover:shadow-card-hover`}
  >
    <div className="p-4 sm:p-5 md:p-6 flex flex-col gap-3 min-[1250px]:flex-row min-[1250px]:justify-between min-[1250px]:items-start min-[1250px]:gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          {icon && (
            <span
              className={`flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary-50 ring-1 ring-primary-100/80 shrink-0 ${iconClassName}`}
            >
              {icon}
            </span>
          )}
          <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-[0.08em] leading-snug">
            {label}
          </p>
        </div>
        <p
          className={`mt-3 sm:mt-4 text-2xl sm:text-3xl font-bold tracking-tight tabular-nums ${valueClassName}`}
        >
          {value}
        </p>
      </div>
      {chips.length > 0 && (
        <div className="flex flex-row flex-wrap gap-1.5 relative min-[1250px]:flex-col min-[1250px]:flex-nowrap min-[1250px]:flex-shrink-0 min-[1250px]:gap-2.5">
          {chips.map((chip) => (
            <span
              key={chip.label}
              className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-semibold whitespace-nowrap min-[1250px]:justify-end ${chip.className || 'bg-slate-100 text-slate-700'}`}
            >
              {chip.label} {chip.value}
            </span>
          ))}
        </div>
      )}
    </div>
  </div>
);

export default StatCard;
