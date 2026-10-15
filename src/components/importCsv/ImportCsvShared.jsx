import { FiAlertTriangle, FiUploadCloud } from 'react-icons/fi';
import Button from '../Button';
import Checkbox from '../Checkbox';
import { formatMoney } from '../../utils/format';

/** Shared with transaction project mapping + expense type skip. */
export const SKIP_IMPORT_LABEL = "Skip — don't import";

export const ImportCsvStatChip = ({ label, value, tone = 'neutral' }) => {
  const tones = {
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-primary-50 text-primary-800 border-primary-200',
    muted: 'bg-white text-slate-500 border-slate-200',
    warn: 'bg-amber-50 text-amber-900 border-amber-200',
    /** Undecided duplicates — distinct from Override (warn). */
    info: 'bg-sky-50 text-sky-900 border-sky-200',
    danger: 'bg-rose-50 text-rose-800 border-rose-200'
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] sm:text-xs font-bold tabular-nums ${tones[tone] || tones.neutral}`}
    >
      <span className="opacity-70 font-semibold">{label}</span>
      {value}
    </span>
  );
};

/** White card with teal accent bar header — used across CSV import sections. */
export const ImportCsvSection = ({
  title,
  accentClass = 'bg-primary-500',
  headerRight = null,
  className = '',
  children
}) => (
  <div
    className={`rounded-xl border border-slate-200/80 bg-white shadow-card overflow-hidden ${className}`}
  >
    <div className="px-3.5 py-2.5 sm:px-4 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2">
      <div className={`h-1 w-8 rounded-full shrink-0 ${accentClass}`} />
      <p className="text-sm font-bold text-slate-800 min-w-0 flex-1">{title}</p>
      {headerRight}
    </div>
    {children}
  </div>
);

export const ImportCsvAlert = ({ message }) => {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-rose-200/80 bg-rose-50/80 px-4 py-3 text-sm text-rose-900 shadow-card flex gap-2">
      <FiAlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
      <p className="font-semibold">{message}</p>
    </div>
  );
};

export const ImportCsvEmptyState = ({
  title = 'No CSV loaded yet',
  hint = 'Upload a Mercury export to review a full preview.'
}) => (
  <div className="rounded-xl border border-dashed border-slate-200 bg-white/70 px-4 py-10 text-center shadow-card">
    <FiUploadCloud className="w-10 h-10 text-slate-300 mx-auto mb-3" aria-hidden />
    <p className="text-sm font-semibold text-slate-700">{title}</p>
    <p className="text-xs text-slate-500 mt-1">{hint}</p>
  </div>
);

/**
 * Compact mapping row — project mapping + expense type mapping.
 * `tone`: neutral | skip | warn
 */
export const ImportCsvMappingRow = ({
  title,
  statusNode = null,
  icon = null,
  tone = 'neutral',
  stackZ = 1,
  children
}) => {
  const shell =
    tone === 'warn'
      ? 'border-amber-200/70 bg-amber-50/50'
      : tone === 'skip'
        ? 'border-slate-200/70 bg-slate-50/80'
        : 'border-slate-200/70 bg-white';
  const iconWrap =
    tone === 'warn'
      ? 'bg-amber-50 border-amber-200'
      : tone === 'skip'
        ? 'bg-slate-100 border-slate-200'
        : 'bg-primary-50 border-primary-100';
  return (
    <div
      style={{ zIndex: stackZ }}
      className={`flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 rounded-lg border px-2 py-1.5 relative ${shell}`}
    >
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <div
          className={`shrink-0 w-7 h-7 rounded-md border flex items-center justify-center ${iconWrap}`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex flex-col sm:flex-row sm:items-center sm:gap-2">
          <p className="text-sm font-semibold text-slate-800 truncate">{title}</p>
          {statusNode ? <div className="min-w-0 shrink-0">{statusNode}</div> : null}
        </div>
      </div>
      {children}
    </div>
  );
};

export const ImportCsvDropzone = ({
  fileName = '',
  isDragging = false,
  onBrowse,
  onDragOver,
  onDragLeave,
  onDrop,
  emptyHint = 'Same export format as bank CSV downloads',
  titleEmpty = 'Drop Mercury CSV here or click to browse',
  titleFilled = 'Replace CSV file'
}) => (
  <button
    type="button"
    onClick={onBrowse}
    onDragOver={onDragOver}
    onDragLeave={onDragLeave}
    onDrop={onDrop}
    className={`w-full rounded-xl border-2 border-dashed px-4 py-6 sm:py-7 text-center transition-colors ${
      isDragging
        ? 'border-primary-500 bg-primary-50'
        : 'border-slate-200 bg-slate-50/50 hover:border-primary-300 hover:bg-primary-50/40'
    }`}
  >
    <FiUploadCloud
      className={`w-8 h-8 mx-auto mb-2 ${isDragging ? 'text-primary-600' : 'text-primary-500'}`}
      aria-hidden
    />
    <p className="text-sm font-semibold text-slate-800">
      {fileName ? titleFilled : titleEmpty}
    </p>
    <p className="text-xs text-slate-500 mt-1">{fileName || emptyHint}</p>
  </button>
);

/**
 * Same date & amount already exists — Override / Keep both.
 * `getRowLabel(row)` optional extra label after date · amount (project / expense name).
 * `keepBothNoun` e.g. "transaction" | "expense"
 */
export const ImportCsvAskDuplicates = ({
  askRows = [],
  askDecisions = {},
  selectedAskKeys = new Set(),
  undecidedAskKeys = [],
  allUndecidedSelected = false,
  onToggleSelectAll,
  onToggleRow,
  onApplyDecision,
  getRowLabel = null,
  keepBothNoun = 'row'
}) => {
  if (!askRows.length) return null;

  return (
    <div className="rounded-xl border border-sky-200/80 bg-sky-50/40 shadow-card overflow-hidden">
      <div className="px-2.5 sm:px-3 py-2 border-b border-sky-100/80 flex flex-col sm:flex-row sm:items-center gap-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-1 w-6 rounded-full bg-sky-500 shrink-0" />
          <p className="text-sm font-bold text-sky-950">Same date & amount already exists</p>
        </div>
        {selectedAskKeys.size > 0 ? (
          <div className="flex flex-wrap gap-1 sm:ml-auto">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onApplyDecision([...selectedAskKeys], 'override')}
            >
              Override ({selectedAskKeys.size})
            </Button>
            <Button size="sm" onClick={() => onApplyDecision([...selectedAskKeys], 'keep_both')}>
              Keep both ({selectedAskKeys.size})
            </Button>
          </div>
        ) : null}
      </div>
      <div className="p-2 sm:p-2.5 space-y-1">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-[11px] text-sky-900/80 pb-0.5">
          <Checkbox
            size="sm"
            checked={allUndecidedSelected}
            onChange={onToggleSelectAll}
            disabled={undecidedAskKeys.length === 0}
            label="Select all undecided"
            className="text-sky-950 [&_span]:text-[11px] [&_span]:font-semibold [&_span]:text-sky-950"
          />
          <span className="sm:ml-auto text-sky-800/70">
            Override replaces · Keep both adds another {keepBothNoun}
          </span>
        </div>
        {askRows.map((row) => {
          const choice = askDecisions[row.rowKey];
          const decided = choice === 'override' || choice === 'keep_both';
          const checked = selectedAskKeys.has(row.rowKey);
          const extra = typeof getRowLabel === 'function' ? getRowLabel(row) : null;
          return (
            <div
              key={row.rowKey}
              className={`flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 rounded-lg border px-2 py-1.5 ${
                decided
                  ? choice === 'override'
                    ? 'border-amber-200 bg-amber-50/50'
                    : 'border-primary-200 bg-primary-50/40'
                  : 'border-sky-200/70 bg-white'
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Checkbox
                  size="sm"
                  checked={checked}
                  disabled={decided}
                  onChange={() => onToggleRow(row.rowKey)}
                  className="min-w-0 flex-1"
                  label={
                    <span className="min-w-0 text-sm text-slate-700 truncate inline-flex items-center gap-0">
                      <span className="font-semibold text-slate-900">{row.date}</span>
                      <span className="text-slate-400 mx-1">·</span>
                      <span className="font-semibold tabular-nums">{formatMoney(row.amount)}</span>
                      {extra ? (
                        <>
                          <span className="text-slate-400 mx-1">·</span>
                          <span className="truncate">{extra}</span>
                        </>
                      ) : null}
                    </span>
                  }
                />
                {decided ? (
                  <span
                    className={`shrink-0 inline-flex px-1.5 py-0.5 rounded-md border text-[10px] font-bold ${
                      choice === 'override'
                        ? 'border-amber-200 bg-amber-50 text-amber-900'
                        : 'border-primary-200 bg-primary-50 text-primary-800'
                    }`}
                  >
                    {choice === 'override' ? 'Override' : 'Keep both'}
                  </span>
                ) : null}
              </div>
              {!decided ? (
                <div className="flex flex-wrap gap-1 shrink-0 pl-6 sm:pl-0">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onApplyDecision([row.rowKey], 'override')}
                  >
                    Override
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onApplyDecision([row.rowKey], 'keep_both')}
                  >
                    Keep both
                  </Button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};
