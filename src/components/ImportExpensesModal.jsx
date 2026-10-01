import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { FiUploadCloud, FiFileText, FiAlertTriangle } from 'react-icons/fi';
import Modal, { modalActionsClass, modalScrollTableWrapClass, modalScrollTableInnerClass } from './Modal';
import Button from './Button';
import SearchableDropdown from './SearchableDropdown';
import { tableElementClass, tableHeadCellClass, tableBodyCellClass } from '../constants/tableStyles';
import { formatMoney } from '../utils/format';
import { usePrivacyHidden } from '../contexts/PrivacyContext';
import {
  collectExpenseTypeLabels,
  resolveExpenseTypeInput
} from '../constants/expenseTypes';
import { fetchExpenses } from '../store/expenses/expensesSlice';
import { saveExpense as saveExpenseService } from '../services/expenseService';
import {
  parseMercuryExpenseCsv,
  buildImportedExpenseData,
  isExpenseImportRowReady,
  matchExpenseTypeByNameWords
} from '../utils/csvExpenseImport';

const StatChip = ({ label, value, tone = 'neutral' }) => {
  const tones = {
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-primary-50 text-primary-800 border-primary-200',
    warn: 'bg-amber-50 text-amber-900 border-amber-200',
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

const ImportExpensesModal = ({ isOpen, onClose, user = null, expenses = [] }) => {
  usePrivacyHidden();
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);

  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [rows, setRows] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFileName('');
      setParseError('');
      setSubmitError('');
      setRows([]);
      setIsImporting(false);
      setIsDragging(false);
    }
  }, [isOpen]);

  const typeLabelOptions = useMemo(() => {
    const fromCatalog = collectExpenseTypeLabels(expenses, { includeBuiltins: true }).map((t) => t.label);
    const fromPreview = [];
    rows.forEach((r) => {
      const label = String(r.expenseTypeLabel || '').trim();
      if (label && !fromCatalog.includes(label) && !fromPreview.includes(label)) {
        fromPreview.push(label);
      }
    });
    return [...fromCatalog, ...fromPreview];
  }, [expenses, rows]);

  const counts = useMemo(() => {
    let ready = 0;
    let needsType = 0;
    let invalid = 0;
    rows.forEach((r) => {
      if (isExpenseImportRowReady(r)) ready += 1;
      else if (
        !String(r.expenseType || r.expenseTypeLabel || '').trim() &&
        String(r.expenseName || '').trim() &&
        Number(r.amount) > 0 &&
        r.date
      ) {
        needsType += 1;
      } else invalid += 1;
    });
    return { ready, needsType, invalid, total: rows.length };
  }, [rows]);

  const canImport = counts.ready > 0 && counts.needsType === 0 && counts.invalid === 0;

  const applyFile = async (file) => {
    if (!file) return;
    setParseError('');
    setSubmitError('');
    setFileName(file.name || '');
    try {
      const text = await file.text();
      const labelByValue = Object.fromEntries(
        collectExpenseTypeLabels(expenses, { includeBuiltins: true }).map((t) => [t.value, t.label])
      );
      const parsed = parseMercuryExpenseCsv(text, { expenses, labelByValue });
      if (parsed.error) {
        setRows([]);
        setParseError(parsed.error);
        return;
      }
      setRows(parsed.rows);
    } catch (e) {
      setRows([]);
      setParseError(e?.message || 'Failed to read CSV file.');
    }
  };

  const onPickFile = (e) => {
    applyFile(e.target.files?.[0]);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) applyFile(file);
  };

  const setRowType = (rowKey, input) => {
    const { value, label } = resolveExpenseTypeInput(input);
    setRows((prev) =>
      prev.map((r) => {
        if (r.rowKey === rowKey) {
          return {
            ...r,
            expenseType: value,
            expenseTypeLabel: label,
            typeMatched: Boolean(value)
          };
        }
        // If this row still needs a type and its name matches the typed category, auto-fill.
        if (value && !String(r.expenseType || '').trim()) {
          const hit = matchExpenseTypeByNameWords(r.expenseName, [{ value, label }]);
          if (hit === value) {
            return {
              ...r,
              expenseType: value,
              expenseTypeLabel: label,
              typeMatched: true
            };
          }
        }
        return r;
      })
    );
  };

  const onConfirmImport = async () => {
    if (!canImport) return;
    setIsImporting(true);
    setSubmitError('');
    try {
      const readyRows = rows.filter(isExpenseImportRowReady);
      for (const row of readyRows) {
        const data = buildImportedExpenseData(row, { createdBy: user?.uid || null });
        await saveExpenseService(data);
      }
      await dispatch(fetchExpenses({ force: true }));
      onClose?.();
    } catch (e) {
      setSubmitError(e?.message || 'Import failed.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Expenses"
      panelClassName="max-w-5xl"
      footer={
        <div className={modalActionsClass}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isImporting}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirmImport} disabled={!canImport || isImporting}>
            {isImporting ? 'Importing…' : `Import ${counts.ready || 0}`}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div
          className={`rounded-2xl border-2 border-dashed p-5 transition-colors ${
            isDragging ? 'border-primary-400 bg-primary-50/50' : 'border-slate-200 bg-slate-50/80'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-white border border-slate-200 text-primary-600 shrink-0">
              <FiUploadCloud className="w-5 h-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800">Drop Mercury expense CSV here</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Type a new category if none match — it is saved with the expense and reused on the next import.
              </p>
              {fileName ? (
                <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                  <FiFileText className="w-3.5 h-3.5" aria-hidden />
                  {fileName}
                </p>
              ) : null}
            </div>
            <div className="shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={onPickFile}
              />
              <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                Choose file
              </Button>
            </div>
          </div>
        </div>

        {parseError ? (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">
            <FiAlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
            <span>{parseError}</span>
          </div>
        ) : null}
        {submitError ? (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">
            <FiAlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
            <span>{submitError}</span>
          </div>
        ) : null}

        {rows.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-2">
              <StatChip label="Rows" value={counts.total} />
              <StatChip label="Ready" value={counts.ready} tone="success" />
              <StatChip label="Need type" value={counts.needsType} tone="warn" />
              <StatChip label="Invalid" value={counts.invalid} tone="danger" />
            </div>

            <div className={modalScrollTableWrapClass}>
              <div className={modalScrollTableInnerClass}>
                <table className={tableElementClass}>
                  <thead>
                    <tr>
                      <th className={tableHeadCellClass('text-left')}>Date</th>
                      <th className={tableHeadCellClass('text-left')}>Expense Name</th>
                      <th className={tableHeadCellClass('text-left')}>Type</th>
                      <th className={tableHeadCellClass('text-right')}>Amount</th>
                      <th className={tableHeadCellClass('text-left')}>Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const ready = isExpenseImportRowReady(row);
                      return (
                        <tr key={row.rowKey} className={!ready ? 'bg-amber-50/40' : undefined}>
                          <td className={`${tableBodyCellClass('text-left')} whitespace-nowrap tabular-nums`}>
                            {row.date || '—'}
                          </td>
                          <td className={`${tableBodyCellClass('text-left')}`}>
                            <span className="font-medium text-slate-800">{row.expenseName || '—'}</span>
                          </td>
                          <td className={`${tableBodyCellClass('text-left')} min-w-[10rem]`}>
                            <SearchableDropdown
                              label=""
                              value={row.expenseTypeLabel || ''}
                              onChange={(label) => setRowType(row.rowKey, label)}
                              options={typeLabelOptions}
                              placeholder="Select or type new…"
                              layout="full"
                              className="min-w-[9.5rem]"
                            />
                          </td>
                          <td className={`${tableBodyCellClass('text-right')} tabular-nums font-mono`}>
                            {Number.isFinite(row.amount) ? formatMoney(row.amount) : '—'}
                          </td>
                          <td
                            className={`${tableBodyCellClass('text-left')} max-w-[14rem] truncate text-slate-500`}
                            title={row.comment}
                          >
                            {row.comment || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  );
};

export default ImportExpensesModal;
