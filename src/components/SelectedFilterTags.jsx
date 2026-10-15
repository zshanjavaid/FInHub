import { FiX } from 'react-icons/fi';

/**
 * Removable filter tags + optional Clear all.
 * `tags`: { id, label, group? }[]
 */
const SelectedFilterTags = ({
  tags = [],
  onRemove,
  onClearAll,
  className = ''
}) => {
  if (!tags.length) return null;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 min-w-0 ${className}`}>
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-1 max-w-full pl-2.5 pr-1 py-1 rounded-full border border-primary-200 bg-primary-50 text-primary-800 text-[11px] sm:text-xs font-semibold"
        >
          {tag.group ? (
            <span className="opacity-60 font-medium shrink-0">{tag.group}</span>
          ) : null}
          <span className="truncate min-w-0">{tag.label}</span>
          <button
            type="button"
            onClick={() => onRemove?.(tag)}
            className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full text-primary-700 hover:bg-primary-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
            aria-label={`Remove ${tag.label}`}
          >
            <FiX className="w-3.5 h-3.5" aria-hidden />
          </button>
        </span>
      ))}
      {onClearAll ? (
        <button
          type="button"
          onClick={onClearAll}
          className="text-[11px] sm:text-xs font-semibold text-slate-500 hover:text-primary-700 px-1.5 py-1 focus:outline-none focus-visible:underline"
        >
          Clear all
        </button>
      ) : null}
    </div>
  );
};

export default SelectedFilterTags;
