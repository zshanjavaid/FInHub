import { usePrivacyHidden } from '../contexts/PrivacyContext';
import { formatMoney, formatMoneyCompact } from '../utils/format';

/**
 * Filter result metrics.
 * items: { key?, label, value, format?: 'raw'|'money'|'compact'|'count', hint?, tone? }[]
 * Pass numeric `value` for money/count so privacy toggles re-render correctly.
 * variant: 'cards' | 'inline' | 'bar'
 */
const TONE = {
  neutral: {
    accent: 'bg-slate-400',
    value: 'text-slate-800',
    chip: 'border-slate-200 bg-slate-50 text-slate-800'
  },
  primary: {
    accent: 'bg-primary-600',
    value: 'text-primary-700',
    chip: 'border-primary-200 bg-primary-50 text-primary-800'
  },
  warn: {
    accent: 'bg-amber-500',
    value: 'text-amber-800',
    chip: 'border-amber-200 bg-amber-50 text-amber-900'
  },
  info: {
    accent: 'bg-sky-500',
    value: 'text-sky-800',
    chip: 'border-sky-200 bg-sky-50 text-sky-900'
  }
};

const formatItemValue = (item, hidden) => {
  const fmt = item.format || 'raw';
  const raw = item.value;
  if (fmt === 'count') {
    const n = Number(raw);
    if (!Number.isFinite(n)) return '—';
    return hidden ? '••' : String(Math.round(n));
  }
  if (fmt === 'money') return formatMoney(raw);
  if (fmt === 'compact') return formatMoneyCompact(raw);
  if (hidden && typeof raw === 'number') return '••';
  return raw ?? '—';
};

const FilterSummaryStats = ({ items = [], className = '', variant = 'inline' }) => {
  const hidden = usePrivacyHidden();
  const list = (items || []).filter((i) => i && i.label != null);
  if (!list.length) return null;

  if (variant === 'bar') {
    return (
      <div className={`flex flex-wrap items-end gap-x-6 gap-y-2 min-w-0 ${className}`}>
        {list.map((item) => {
          const tone = TONE[item.tone] || TONE.neutral;
          const value = formatItemValue(item, hidden);
          const isPrimary =
            item.tone === 'primary' || item.key === 'total' || item.key === 'net';
          return (
            <div key={item.key || item.label} className="min-w-0" title={item.hint || undefined}>
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {item.label}
              </p>
              <p
                className={`fh-money mt-1 font-mono font-bold tabular-nums tracking-tight leading-none ${
                  isPrimary ? 'text-2xl sm:text-3xl' : 'text-lg sm:text-xl'
                } ${hidden && item.format !== 'count' ? 'text-slate-400' : tone.value}`}
                aria-label={hidden && item.format !== 'count' ? 'Hidden' : undefined}
              >
                {value}
              </p>
            </div>
          );
        })}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`flex flex-wrap items-center justify-start sm:justify-end gap-1.5 sm:gap-2.5 min-w-0 ${className}`}>
        {list.map((item) => {
          const tone = TONE[item.tone] || TONE.neutral;
          const value = formatItemValue(item, hidden);
          const isMoney = item.format === 'money' || item.format === 'compact';
          const emphasize = isMoney && (item.tone === 'primary' || item.key === 'total' || item.key === 'net');
          return (
            <span
              key={item.key || item.label}
              className={`inline-flex items-baseline gap-1.5 max-w-full rounded-xl border font-bold tabular-nums ${tone.chip} ${
                emphasize
                  ? 'px-3 py-2 sm:px-3.5 sm:py-2.5'
                  : 'px-2.5 py-1.5 text-[11px] sm:text-xs'
              }`}
              title={item.hint || undefined}
            >
              <span
                className={`opacity-70 font-semibold uppercase tracking-wide shrink-0 ${
                  emphasize ? 'text-[10px] sm:text-[11px]' : ''
                }`}
              >
                {item.label}
              </span>
              <span
                className={`fh-money font-mono tracking-tight ${
                  emphasize ? 'text-lg sm:text-xl md:text-2xl leading-none' : ''
                } ${hidden && item.format !== 'count' ? 'text-slate-400' : ''}`}
                aria-label={hidden && item.format !== 'count' ? 'Hidden' : undefined}
              >
                {value}
              </span>
            </span>
          );
        })}
      </div>
    );
  }

  const cols =
    list.length === 1
      ? 'grid-cols-1'
      : list.length === 2
        ? 'grid-cols-2'
        : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';

  return (
    <div className={`grid ${cols} gap-3 sm:gap-4 min-w-0 ${className}`}>
      {list.map((item) => {
        const tone = TONE[item.tone] || TONE.neutral;
        const value = formatItemValue(item, hidden);
        return (
          <div
            key={item.key || item.label}
            className="relative bg-white rounded-2xl shadow-card ring-1 ring-slate-900/[0.04] min-w-0 overflow-hidden"
          >
            <span
              className={`pointer-events-none absolute inset-x-0 top-0 h-0.5 rounded-t-2xl ${tone.accent}`}
              aria-hidden
            />
            <div className="px-3.5 py-3 sm:px-4 sm:py-3.5">
              <p className="text-[11px] sm:text-xs font-medium text-slate-500 tracking-wide">
                {item.label}
              </p>
              <p
                className={`fh-money mt-1.5 text-xl sm:text-2xl font-bold tracking-tight leading-none tabular-nums font-mono ${
                  hidden && item.format !== 'count' ? 'text-slate-400' : tone.value
                }`}
                aria-label={hidden && item.format !== 'count' ? 'Hidden' : undefined}
              >
                {value}
              </p>
              {item.hint ? (
                <p className="mt-1 text-[11px] text-slate-500 truncate">{item.hint}</p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FilterSummaryStats;
