import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { FiFileText, FiCheck } from 'react-icons/fi';
import Modal, { modalActionsClass, modalScrollTableWrapClass, modalScrollTableInnerClass } from './Modal';
import Button from './Button';
import SearchableDropdown from './SearchableDropdown';
import {
  SKIP_IMPORT_LABEL,
  ImportCsvStatChip,
  ImportCsvSection,
  ImportCsvAlert,
  ImportCsvDropzone,
  ImportCsvAskDuplicates,
  ImportCsvEmptyState,
  ImportCsvMappingRow
} from './importCsv/ImportCsvShared';
import { tableElementClass, tableHeadCellClass, tableBodyCellClass } from '../constants/tableStyles';
import { formatMoney } from '../utils/format';
import { usePrivacyHidden } from '../contexts/PrivacyContext';
import {
  collectExpenseTypeLabels,
  resolveExpenseTypeInput,
  slugifyExpenseType
} from '../constants/expenseTypes';
import { fetchExpenses, editExpense } from '../store/expenses/expensesSlice';
import { saveExpense as saveExpenseService } from '../services/expenseService';
import {
  parseMercuryExpenseCsv,
  buildImportedExpenseData,
  isExpenseImportRowReady,
  classifyExpenseCsvRowsAgainstExisting
} from '../utils/csvExpenseImport';
import { normalizeMatchText } from '../utils/csvTransactionImport';

const SKIP_TYPE_LABEL = SKIP_IMPORT_LABEL;

const ImportExpensesModal = ({ isOpen, onClose, user = null, expenses = [] }) => {
  usePrivacyHidden();
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);

  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [rows, setRows] = useState([]);
  const [askDecisions, setAskDecisions] = useState({});
  const [selectedAskKeys, setSelectedAskKeys] = useState(() => new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [openMappingKey, setOpenMappingKey] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setFileName('');
      setParseError('');
      setSubmitError('');
      setRows([]);
      setAskDecisions({});
      setSelectedAskKeys(new Set());
      setIsImporting(false);
      setIsDragging(false);
      setOpenMappingKey('');
    }
  }, [isOpen]);

  const typeLabelOptions = useMemo(() => {
    const fromCatalog = collectExpenseTypeLabels(expenses, { includeBuiltins: true }).map((t) => t.label);
    const fromPreview = [];
    rows.forEach((r) => {
      const label = String(r.expenseTypeLabel || '').trim();
      if (
        label &&
        label.toLowerCase() !== SKIP_TYPE_LABEL.toLowerCase() &&
        !fromCatalog.includes(label) &&
        !fromPreview.includes(label)
      ) {
        fromPreview.push(label);
      }
    });
    return [SKIP_TYPE_LABEL, ...fromCatalog, ...fromPreview];
  }, [expenses, rows]);

  const classifiedRows = useMemo(
    () => classifyExpenseCsvRowsAgainstExisting({ csvRows: rows, existingExpenses: expenses }),
    [rows, expenses]
  );

  const previewRows = useMemo(
    () =>
      classifiedRows.map((row) => {
        if (row.skipped) {
          return { ...row, decision: 'skip', reason: 'Skipped' };
        }
        let decision = row.importStatus || 'ready';
        let reason = row.reason || '';
        if (decision === 'ask') {
          const choice = askDecisions[row.rowKey];
          if (choice === 'keep_both') {
            decision = 'ready';
            reason = 'Keep both';
          } else if (choice === 'override') {
            decision = 'override';
            reason = 'Override existing';
          } else {
            decision = 'ask';
          }
        }
        if (decision === 'override' && !row.existingMatchId) {
          decision = 'ask';
          reason = 'Could not find the existing row to override';
        }
        return { ...row, decision, reason };
      }),
    [classifiedRows, askDecisions]
  );

  const counts = useMemo(() => {
    let ready = 0;
    let override = 0;
    let ask = 0;
    let skip = 0;
    let needsType = 0;
    let invalid = 0;
    previewRows.forEach((r) => {
      if (r.decision === 'skip') {
        skip += 1;
        return;
      }
      if (r.decision === 'ask') {
        ask += 1;
        return;
      }
      if (r.importStatus === 'invalid') {
        invalid += 1;
        return;
      }
      const hasType = Boolean(slugifyExpenseType(r.expenseType || r.expenseTypeLabel));
      if ((r.decision === 'ready' || r.decision === 'override') && !hasType) {
        if (
          String(r.expenseName || '').trim() &&
          Number(r.amount) > 0 &&
          r.date
        ) {
          needsType += 1;
        } else {
          invalid += 1;
        }
        return;
      }
      if (r.decision === 'override') override += 1;
      else if (r.decision === 'ready') ready += 1;
      else invalid += 1;
    });
    return {
      ready,
      override,
      ask,
      skip,
      needsType,
      invalid,
      total: previewRows.length
    };
  }, [previewRows]);

  const askRows = useMemo(() => {
    const list = previewRows.filter((r) => r.importStatus === 'ask' && !r.skipped);
    return list.sort((a, b) => {
      const aDecided = askDecisions[a.rowKey] === 'override' || askDecisions[a.rowKey] === 'keep_both';
      const bDecided = askDecisions[b.rowKey] === 'override' || askDecisions[b.rowKey] === 'keep_both';
      if (aDecided === bDecided) return 0;
      return aDecided ? 1 : -1;
    });
  }, [previewRows, askDecisions]);

  const undecidedAskKeys = useMemo(
    () => askRows.filter((r) => !askDecisions[r.rowKey]).map((r) => r.rowKey),
    [askRows, askDecisions]
  );

  const allUndecidedSelected =
    undecidedAskKeys.length > 0 && undecidedAskKeys.every((k) => selectedAskKeys.has(k));

  const importCount = counts.ready + counts.override;
  const canImport =
    importCount > 0 &&
    counts.ask === 0 &&
    counts.needsType === 0 &&
    counts.invalid === 0;

  const csvExpenseNames = useMemo(() => {
    const seen = new Set();
    const names = [];
    rows.forEach((r) => {
      const name = String(r.expenseName || '').trim();
      const key = normalizeMatchText(name);
      if (!key || seen.has(key)) return;
      seen.add(key);
      names.push(name);
    });
    return names;
  }, [rows]);

  const typeByNameKey = useMemo(() => {
    const groups = new Map();
    rows.forEach((r) => {
      const key = normalizeMatchText(r.expenseName);
      if (!key) return;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    });
    const map = {};
    groups.forEach((group, key) => {
      if (group.every((r) => r.skipped)) {
        map[key] = { skip: true, label: SKIP_TYPE_LABEL };
        return;
      }
      const typed = group.find(
        (r) => !r.skipped && slugifyExpenseType(r.expenseType || r.expenseTypeLabel)
      );
      if (typed) {
        const label = String(typed.expenseTypeLabel || '').trim() || typed.expenseType;
        map[key] = {
          skip: false,
          label,
          value: slugifyExpenseType(typed.expenseType || typed.expenseTypeLabel)
        };
      } else {
        map[key] = { skip: false, label: '', value: '' };
      }
    });
    return map;
  }, [rows]);

  const importPreviewRows = useMemo(
    () => previewRows.filter((r) => r.decision === 'ready' || r.decision === 'override'),
    [previewRows]
  );

  const actionLabel = () => {
    const parts = [];
    if (counts.ready > 0) parts.push(`Add ${counts.ready}`);
    if (counts.override > 0) parts.push(`Override ${counts.override}`);
    return parts.length ? parts.join(' · ') : 'Import';
  };

  const applyFile = async (file) => {
    if (!file) return;
    setParseError('');
    setSubmitError('');
    setAskDecisions({});
    setSelectedAskKeys(new Set());
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

  /** Apply type / Skip to every CSV row with the same expense name (like project mapping). */
  const setTypeForName = (expenseName, input) => {
    const nameKey = normalizeMatchText(expenseName);
    if (!nameKey) return;
    const trimmed = String(input || '').trim();
    if (trimmed.toLowerCase() === SKIP_TYPE_LABEL.toLowerCase()) {
      setRows((prev) =>
        prev.map((r) =>
          normalizeMatchText(r.expenseName) === nameKey
            ? {
                ...r,
                skipped: true,
                expenseType: '',
                expenseTypeLabel: '',
                typeMatched: false
              }
            : r
        )
      );
      return;
    }
    if (!trimmed) {
      setRows((prev) =>
        prev.map((r) =>
          normalizeMatchText(r.expenseName) === nameKey
            ? {
                ...r,
                skipped: false,
                expenseType: '',
                expenseTypeLabel: '',
                typeMatched: false
              }
            : r
        )
      );
      return;
    }
    const { value, label } = resolveExpenseTypeInput(input);
    setRows((prev) =>
      prev.map((r) =>
        normalizeMatchText(r.expenseName) === nameKey
          ? {
              ...r,
              skipped: false,
              expenseType: value,
              expenseTypeLabel: label,
              typeMatched: Boolean(value)
            }
          : r
      )
    );
  };

  const toggleAskSelected = (rowKey) => {
    setSelectedAskKeys((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) next.delete(rowKey);
      else next.add(rowKey);
      return next;
    });
  };

  const toggleSelectAllAsk = () => {
    setSelectedAskKeys((prev) => {
      if (allUndecidedSelected) {
        const next = new Set(prev);
        undecidedAskKeys.forEach((k) => next.delete(k));
        return next;
      }
      return new Set([...prev, ...undecidedAskKeys]);
    });
  };

  const applyAskDecision = (rowKeys, choice) => {
    const keys = (rowKeys || []).filter(Boolean);
    if (!keys.length) return;
    setAskDecisions((prev) => {
      const next = { ...prev };
      keys.forEach((k) => {
        next[k] = choice;
      });
      return next;
    });
    setSelectedAskKeys((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => next.delete(k));
      return next;
    });
  };

  const onConfirmImport = async () => {
    if (!canImport) return;
    setIsImporting(true);
    setSubmitError('');
    try {
      const creates = [];
      const overrides = [];
      previewRows.forEach((row) => {
        if (row.decision !== 'ready' && row.decision !== 'override') return;
        if (!isExpenseImportRowReady(row) && row.decision === 'ready') return;
        if (row.decision === 'override' && !slugifyExpenseType(row.expenseType || row.expenseTypeLabel)) {
          return;
        }
        const data = buildImportedExpenseData(row, { createdBy: user?.uid || null });
        if (row.decision === 'override' && row.existingMatchId) {
          overrides.push({
            expenseId: row.existingMatchId,
            expenseData: {
              expenseName: data.expenseName,
              date: data.date,
              expenseType: data.expenseType,
              amount: data.amount,
              comment: data.comment
            }
          });
        } else if (row.decision === 'ready') {
          creates.push(data);
        }
      });

      if (!creates.length && !overrides.length) {
        setSubmitError('Nothing to import.');
        return;
      }

      for (const item of overrides) {
        await dispatch(editExpense(item)).unwrap();
      }
      for (const data of creates) {
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
      title="Import expenses"
      panelClassName="max-w-5xl"
      footer={
        <div className={modalActionsClass}>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="w-full sm:flex-1"
            disabled={isImporting}
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={onConfirmImport}
            className="w-full sm:flex-1"
            disabled={!canImport || isImporting}
          >
            {isImporting ? 'Importing…' : actionLabel()}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 min-w-0">
        <ImportCsvSection title="CSV file" className="relative z-30">
          <div className="p-3.5 sm:p-4 space-y-3 relative z-10">
            <ImportCsvDropzone
              fileName={fileName}
              isDragging={isDragging}
              onBrowse={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={onPickFile}
            />
          </div>
        </ImportCsvSection>

        <ImportCsvAlert message={parseError} />
        <ImportCsvAlert message={submitError} />

        {csvExpenseNames.length > 0 ? (
          <ImportCsvSection title="Type mapping" className="relative z-20">
            <div className="p-2.5 sm:p-3 space-y-1 relative isolate">
              <p className="text-[11px] text-slate-500 leading-snug pb-0.5">
                Map each expense name to a type, or Skip. Type a new category if none match.
              </p>
              {csvExpenseNames.map((name, idx) => {
                const key = normalizeMatchText(name);
                const mapping = typeByNameKey[key] || { skip: false, label: '' };
                const isSkipped = Boolean(mapping.skip);
                const hasType = Boolean(mapping.value || mapping.label);
                const displayKind = isSkipped ? 'skip' : hasType ? 'matched' : 'missing';
                const tone = displayKind === 'skip' ? 'skip' : displayKind === 'missing' ? 'warn' : 'neutral';
                const isDropdownOpen = openMappingKey === key;
                const stackZ = isDropdownOpen ? 80 : csvExpenseNames.length - idx + 5;
                return (
                  <ImportCsvMappingRow
                    key={key}
                    title={name}
                    tone={tone}
                    stackZ={stackZ}
                    icon={
                      <FiFileText
                        className={`w-3.5 h-3.5 ${
                          displayKind === 'skip'
                            ? 'text-slate-500'
                            : displayKind === 'missing'
                              ? 'text-amber-600'
                              : 'text-primary-600'
                        }`}
                      />
                    }
                    statusNode={
                      displayKind === 'skip' ? (
                        <span className="text-[10px] font-semibold text-slate-500">Skip</span>
                      ) : displayKind === 'matched' ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-primary-700">
                          <FiCheck className="w-3 h-3" />
                          Typed
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-amber-700">Needs type</span>
                      )
                    }
                  >
                    <div className="sm:w-[min(100%,18rem)] sm:shrink-0 min-w-0 relative">
                      <SearchableDropdown
                        label=""
                        layout="filter"
                        value={isSkipped ? SKIP_TYPE_LABEL : mapping.label || ''}
                        onChange={(v) => setTypeForName(name, v)}
                        onOpenChange={(open) => setOpenMappingKey(open ? key : '')}
                        options={typeLabelOptions}
                        placeholder="Type or Skip..."
                      />
                    </div>
                  </ImportCsvMappingRow>
                );
              })}
            </div>
          </ImportCsvSection>
        ) : null}

        {previewRows.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-1.5">
              <ImportCsvStatChip label="New" value={counts.ready} tone="success" />
              <ImportCsvStatChip label="Override" value={counts.override} tone="warn" />
              <ImportCsvStatChip label="Skip" value={counts.skip} tone="muted" />
              <ImportCsvStatChip label="Decide" value={counts.ask} tone="info" />
              {counts.needsType > 0 ? (
                <ImportCsvStatChip label="Need type" value={counts.needsType} tone="danger" />
              ) : null}
              {counts.invalid > 0 ? (
                <ImportCsvStatChip label="Invalid" value={counts.invalid} tone="danger" />
              ) : null}
            </div>

            <ImportCsvAskDuplicates
              askRows={askRows}
              askDecisions={askDecisions}
              selectedAskKeys={selectedAskKeys}
              undecidedAskKeys={undecidedAskKeys}
              allUndecidedSelected={allUndecidedSelected}
              onToggleSelectAll={toggleSelectAllAsk}
              onToggleRow={toggleAskSelected}
              onApplyDecision={applyAskDecision}
              keepBothNoun="expense"
              getRowLabel={(row) => row.expenseName || null}
            />

            {importPreviewRows.length > 0 ? (
              <ImportCsvSection
                title={`Preview (${importPreviewRows.length})`}
                className="relative z-0"
              >
                <div className={`${modalScrollTableWrapClass} border-0 rounded-none shadow-none`}>
                  <div className={`${modalScrollTableInnerClass} overflow-x-auto`}>
                    <table className={`${tableElementClass} min-w-[32rem]`}>
                      <thead className="bg-slate-100 border-b border-slate-200">
                        <tr>
                          <th className={tableHeadCellClass('text-left')}>Date</th>
                          <th className={tableHeadCellClass('text-left')}>Expense</th>
                          <th className={tableHeadCellClass('text-left')}>Type</th>
                          <th className={tableHeadCellClass('text-right')}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreviewRows.map((row, idx) => (
                          <tr
                            key={row.rowKey}
                            className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
                          >
                            <td className={tableBodyCellClass('text-left')}>{row.date || '—'}</td>
                            <td
                              className={`${tableBodyCellClass('text-left')} max-w-[12rem] truncate font-semibold text-slate-800`}
                              title={row.expenseName}
                            >
                              {row.expenseName || '—'}
                            </td>
                            <td className={tableBodyCellClass('text-left')}>
                              {row.expenseTypeLabel || row.expenseType || '—'}
                            </td>
                            <td
                              className={`${tableBodyCellClass('text-right')} tabular-nums font-semibold`}
                            >
                              {formatMoney(row.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </ImportCsvSection>
            ) : (
              <ImportCsvEmptyState
                title="Nothing to import yet"
                hint="Resolve type mapping or duplicate decisions above."
              />
            )}
          </>
        ) : (
          <ImportCsvEmptyState />
        )}
      </div>
    </Modal>
  );
};

export default ImportExpensesModal;
