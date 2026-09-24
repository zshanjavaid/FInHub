import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { FiUploadCloud, FiFileText, FiCheck, FiAlertTriangle, FiClock } from 'react-icons/fi';
import Modal, { modalActionsClass, modalScrollTableWrapClass, modalScrollTableInnerClass } from './Modal';
import Button from './Button';
import SearchableDropdown from './SearchableDropdown';
import ProjectFormModal from './ProjectFormModal';
import { tableElementClass, tableHeadCellClass, tableBodyCellClass } from '../constants/tableStyles';
import { formatMoney } from '../utils/format';
import { usePrivacyHidden } from '../contexts/PrivacyContext';
import { prepareProjectForFirestore } from '../utils/project';
import { createProject } from '../store/projects/projectsSlice';
import { createTransactionsBulk, editTransaction } from '../store/transactions/transactionsSlice';
import { createExpense, fetchExpenses } from '../store/expenses/expensesSlice';
import { PROJECT_TYPE_OPTIONS } from '../constants/projectTypes';
import { isApproved } from '../constants/app';
import {
  parseMercuryTransactionCsv,
  matchBrokerFromHints,
  findMatchingProject,
  classifyCsvRowsAgainstExisting,
  uniqueCsvProjectNames,
  normalizeMatchText,
  buildImportedTransactionData,
  monthKeyFromYmd,
  findExistingMonthlyBrokerage,
  buildMonthlyBrokerageExpenseData,
  computeImportMonthlyBrokerageAmount
} from '../utils/csvTransactionImport';
import { findLatestProjectByBrokerAndProject } from '../utils/projectLookup';
import { addMonthsLocalYmd, todayLocalYmd } from '../utils/date';

const resolveProjectMatch = (projects, broker, projectName) => {
  if (!broker || !projectName) return { kind: 'missing', project: null };
  const approved = findLatestProjectByBrokerAndProject((projects || []).filter(isApproved), broker, projectName);
  if (approved) return { kind: 'approved', project: approved };
  const any = findLatestProjectByBrokerAndProject(projects, broker, projectName);
  if (any && !isApproved(any)) return { kind: 'pending', project: any };
  return { kind: 'missing', project: null };
};

const StatChip = ({ label, value, tone = 'neutral' }) => {
  const tones = {
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-primary-50 text-primary-800 border-primary-200',
    muted: 'bg-white text-slate-500 border-slate-200',
    warn: 'bg-amber-50 text-amber-900 border-amber-200',
    danger: 'bg-rose-50 text-rose-800 border-rose-200'
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] sm:text-xs font-bold tabular-nums ${tones[tone] || tones.neutral}`}>
      <span className="opacity-70 font-semibold">{label}</span>
      {value}
    </span>
  );
};

const ImportTransactionsModal = ({
  isOpen,
  onClose,
  projects = [],
  transactions = [],
  expenses = [],
  clientOptions = [],
  user = null
}) => {
  usePrivacyHidden();
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);

  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [rawRows, setRawRows] = useState([]);
  const [broker, setBroker] = useState('');
  const [brokerSource, setBrokerSource] = useState('');
  const [projectMap, setProjectMap] = useState({});
  const [askDecisions, setAskDecisions] = useState({});
  const [selectedAskKeys, setSelectedAskKeys] = useState(() => new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectInitialValues, setProjectInitialValues] = useState(null);
  const [creatingForCsvName, setCreatingForCsvName] = useState('');
  const [openMappingKey, setOpenMappingKey] = useState('');

  const resetState = () => {
    setFileName('');
    setParseError('');
    setSubmitError('');
    setRawRows([]);
    setBroker('');
    setBrokerSource('');
    setProjectMap({});
    setAskDecisions({});
    setSelectedAskKeys(new Set());
    setIsImporting(false);
    setIsDragging(false);
    setIsProjectModalOpen(false);
    setProjectInitialValues(null);
    setCreatingForCsvName('');
    setOpenMappingKey('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    if (!isOpen) resetState();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) dispatch(fetchExpenses());
  }, [isOpen, dispatch]);

  const classifiedRows = useMemo(
    () => classifyCsvRowsAgainstExisting({ csvRows: rawRows, existingTransactions: transactions }),
    [rawRows, transactions]
  );

  const csvProjectNames = useMemo(() => uniqueCsvProjectNames(classifiedRows), [classifiedRows]);

  const approvedProjects = useMemo(() => (projects || []).filter(isApproved), [projects]);

  useEffect(() => {
    if (!broker || !csvProjectNames.length) return;
    setProjectMap((prev) => {
      const next = { ...prev };
      let changed = false;
      csvProjectNames.forEach((name) => {
        const key = normalizeMatchText(name);
        const current = next[key];
        const currentOk = current && resolveProjectMatch(projects, broker, current).kind === 'approved';
        if (currentOk) return;

        const approvedMatch = findMatchingProject({
          description: name,
          broker,
          projects: approvedProjects
        });
        if (approvedMatch?.project) {
          next[key] = approvedMatch.project;
          changed = true;
          return;
        }
        const pendingMatch = findMatchingProject({ description: name, broker, projects });
        if (pendingMatch?.project && !isApproved(pendingMatch)) {
          next[key] = pendingMatch.project;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [broker, csvProjectNames, projects, approvedProjects]);

  const previewRows = useMemo(() => {
    return classifiedRows.map((row) => {
      const key = normalizeMatchText(row.description);
      const mappedProject = projectMap[key] || '';
      let decision = row.importStatus;
      let reason = row.reason || '';

      if (decision === 'ask') {
        const userChoice = askDecisions[row.rowKey];
        if (userChoice === 'keep_both') decision = 'ready';
        else if (userChoice === 'override') decision = 'override';
        else decision = 'ask';
      }

      const match = resolveProjectMatch(projects, broker, mappedProject);
      const needsProjectGate = decision === 'ready' || decision === 'override';

      if (needsProjectGate) {
        if (!mappedProject) {
          decision = 'needs_project';
          reason = 'Map or create a project for this description';
        } else if (match.kind === 'pending') {
          decision = 'pending_project';
          reason = 'Project is pending approval — approve it before importing';
        } else if (match.kind !== 'approved') {
          decision = 'needs_project';
          reason = 'Project not found — create it or pick an existing one';
        } else if (decision === 'override' && !row.existingMatchId) {
          decision = 'ask';
          reason = 'Could not find the existing row to override';
        }
      }

      const previewTx =
        (decision === 'ready' || decision === 'override') && match.kind === 'approved'
          ? buildImportedTransactionData({
              client: broker,
              project: mappedProject,
              date: row.date,
              amount: row.amount,
              projectRow: match.project
            })
          : null;

      return {
        ...row,
        mappedProject,
        decision,
        reason,
        previewTx,
        projectRow: match.kind === 'approved' ? match.project : null
      };
    });
  }, [classifiedRows, projectMap, askDecisions, projects, broker]);

  const counts = useMemo(() => {
    const c = {
      ready: 0,
      skip: 0,
      ask: 0,
      override: 0,
      needs_project: 0,
      pending_project: 0,
      invalid: 0
    };
    previewRows.forEach((r) => {
      c[r.decision] = (c[r.decision] || 0) + 1;
    });
    return c;
  }, [previewRows]);

  const brokeragePlan = useMemo(() => {
    const groups = new Map();
    previewRows.forEach((row) => {
      if (row.decision !== 'ready' && row.decision !== 'override') return;
      if (!row.mappedProject || !row.projectRow) return;
      const monthKey = monthKeyFromYmd(row.date);
      if (!monthKey) return;
      const planKey = `${broker}|${row.mappedProject}|${monthKey}`;
      const prev = groups.get(planKey) || {
        key: planKey,
        client: broker,
        project: row.mappedProject,
        monthKey,
        projectRow: row.projectRow,
        monthGross: 0,
        date: row.date
      };
      prev.monthGross += Number(row.amount) || 0;
      prev.projectRow = row.projectRow;
      if (String(row.date || '') > String(prev.date || '')) prev.date = row.date;
      groups.set(planKey, prev);
    });

    return [...groups.values()]
      .map((g) => {
        const existing = findExistingMonthlyBrokerage(expenses, {
          client: g.client,
          project: g.project,
          monthKey: g.monthKey
        });
        if (existing) {
          return {
            key: g.key,
            client: g.client,
            project: g.project,
            monthKey: g.monthKey,
            amount: Number(existing.amount) || 0,
            status: 'exists'
          };
        }

        const amount = computeImportMonthlyBrokerageAmount(g.projectRow, g.monthGross, g.monthKey, {
          activeFromYmd: g.date
        });
        if (!(amount > 0)) {
          return {
            key: g.key,
            client: g.client,
            project: g.project,
            monthKey: g.monthKey,
            amount: 0,
            status: 'zero'
          };
        }

        return {
          key: g.key,
          client: g.client,
          project: g.project,
          monthKey: g.monthKey,
          amount,
          status: 'new',
          projectRow: g.projectRow,
          date: g.date
        };
      })
      .filter((x) => x.status === 'new' || x.status === 'exists');
  }, [previewRows, expenses, broker]);

  const newBrokerageExpenses = useMemo(
    () => brokeragePlan.filter((b) => b.status === 'new'),
    [brokeragePlan]
  );

  const canImport =
    Boolean(broker) &&
    (counts.ready > 0 || counts.override > 0) &&
    counts.ask === 0 &&
    counts.needs_project === 0 &&
    counts.pending_project === 0 &&
    counts.invalid === 0;

  const applyFile = async (file) => {
    if (!file) return;
    setParseError('');
    setSubmitError('');
    setAskDecisions({});
    setSelectedAskKeys(new Set());
    setProjectMap({});
    setFileName(file.name || '');

    try {
      const text = await file.text();
      const parsed = parseMercuryTransactionCsv(text);
      if (parsed.error) {
        setRawRows([]);
        setParseError(parsed.error);
        return;
      }
      setRawRows(parsed.rows);

      const guessed = matchBrokerFromHints({
        filename: file.name,
        bankDescriptions: parsed.rows.map((r) => r.bankDescription),
        brokerOptions: clientOptions
      });
      setBroker(guessed.broker || '');
      setBrokerSource(guessed.source || '');
    } catch (e) {
      setRawRows([]);
      setParseError(e?.message || 'Failed to read CSV file.');
    }
  };

  const onPickFile = (e) => {
    const file = e.target.files?.[0];
    applyFile(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) applyFile(file);
  };

  const openCreateProject = (csvName) => {
    if (!broker) {
      setSubmitError('Select a broker before creating a project.');
      return;
    }
    const latest = (projects || [])
      .filter((p) => (p.client || '').trim().toLowerCase() === broker.trim().toLowerCase())
      .sort((a, b) => String(b.createdAt || b.date || '').localeCompare(String(a.createdAt || a.date || '')))[0];

    setCreatingForCsvName(csvName);
    setProjectInitialValues({
      client: broker,
      date: todayLocalYmd(),
      project: csvName,
      projectType: latest?.projectType || 'Full time',
      projectStatus: 'active',
      payoutOccurrence: latest?.payoutOccurrence || 'biweekly',
      totalMonthlyHours: latest?.totalMonthlyHours ?? '',
      hourlyRate: latest?.hourlyRate ?? '',
      projectCost: latest?.projectCost ?? '',
      recruiterName: latest?.recruiterName || '',
      lead: latest?.lead || '',
      projectManager: latest?.projectManager || '',
      contractEnding: addMonthsLocalYmd(6),
      brokerageType: latest?.brokerageType || 'percentage',
      brokerageValue: latest?.brokerageValue ?? '',
      taxType: latest?.taxType || 'percentage',
      taxValue: latest?.taxValue ?? ''
    });
    setIsProjectModalOpen(true);
  };

  const onCreateProject = async (values) => {
    const payload = prepareProjectForFirestore(values);
    const projectData = user?.uid ? { ...payload, createdBy: user.uid } : payload;
    await dispatch(createProject(projectData)).unwrap();
    const key = normalizeMatchText(creatingForCsvName || values.project);
    if (key) {
      setProjectMap((prev) => ({ ...prev, [key]: values.project }));
    }
    setIsProjectModalOpen(false);
    setCreatingForCsvName('');
  };

  const buildTransactionPayloads = () => {
    const creates = [];
    const overrides = [];
    previewRows.forEach((row) => {
      if (row.decision !== 'ready' && row.decision !== 'override') return;
      const match = resolveProjectMatch(projects, broker, row.mappedProject);
      if (match.kind !== 'approved') return;
      const data = buildImportedTransactionData({
        client: broker,
        project: row.mappedProject,
        date: row.date,
        amount: row.amount,
        projectRow: match.project,
        createdBy: user?.uid || null
      });
      if (row.decision === 'override' && row.existingMatchId) {
        overrides.push({
          transactionId: row.existingMatchId,
          transactionData: {
            client: data.client,
            project: data.project,
            date: data.date,
            amount: data.amount,
            brokerageType: data.brokerageType,
            brokerageValue: data.brokerageValue,
            brokerageAmount: data.brokerageAmount,
            additionalCharges: data.additionalCharges,
            totalAmount: data.totalAmount
          }
        });
      } else if (row.decision === 'ready') {
        creates.push(data);
      }
    });
    return { creates, overrides };
  };

  const onConfirmImport = async () => {
    if (!canImport) return;
    setIsImporting(true);
    setSubmitError('');
    try {
      const { creates, overrides } = buildTransactionPayloads();
      if (!creates.length && !overrides.length) {
        setSubmitError('Nothing to import.');
        return;
      }

      for (const item of overrides) {
        await dispatch(editTransaction(item)).unwrap();
      }
      if (creates.length) {
        await dispatch(createTransactionsBulk(creates)).unwrap();
      }

      for (const item of newBrokerageExpenses) {
        const expenseData = buildMonthlyBrokerageExpenseData({
          client: item.client,
          project: item.project,
          monthKey: item.monthKey,
          amount: item.amount,
          brokerageType: item.projectRow?.brokerageType || 'percentage',
          brokerageValue: item.projectRow?.brokerageValue ?? '',
          createdBy: user?.uid || null,
          date: item.date
        });
        await dispatch(createExpense(expenseData)).unwrap();
      }

      onClose();
    } catch (e) {
      setSubmitError(e?.message || 'Failed to import transactions.');
    } finally {
      setIsImporting(false);
    }
  };

  const projectOptionsForBroker = useMemo(() => {
    if (!broker) return [];
    return [
      ...new Set(
        approvedProjects
          .filter((p) => (p.client || '').trim().toLowerCase() === broker.trim().toLowerCase())
          .map((p) => (p.project || '').trim())
          .filter(Boolean)
      )
    ].sort((a, b) => a.localeCompare(b));
  }, [approvedProjects, broker]);

  const askRows = useMemo(() => {
    const rows = previewRows.filter((r) => r.importStatus === 'ask');
    return [...rows].sort((a, b) => {
      const aDecided = askDecisions[a.rowKey] === 'override' || askDecisions[a.rowKey] === 'keep_both';
      const bDecided = askDecisions[b.rowKey] === 'override' || askDecisions[b.rowKey] === 'keep_both';
      if (aDecided !== bDecided) return aDecided ? -1 : 1;
      return 0;
    });
  }, [previewRows, askDecisions]);

  const undecidedAskKeys = useMemo(
    () => askRows.filter((r) => !askDecisions[r.rowKey]).map((r) => r.rowKey),
    [askRows, askDecisions]
  );

  const allUndecidedSelected =
    undecidedAskKeys.length > 0 && undecidedAskKeys.every((k) => selectedAskKeys.has(k));

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
      const next = new Set(prev);
      undecidedAskKeys.forEach((k) => next.add(k));
      return next;
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

  const importPreviewRows = useMemo(
    () => previewRows.filter((r) => r.decision === 'ready' || r.decision === 'override'),
    [previewRows]
  );

  const actionLabel = () => {
    const parts = [];
    if (counts.ready > 0) parts.push(`Add ${counts.ready}`);
    if (counts.override > 0) parts.push(`Override ${counts.override}`);
    if (newBrokerageExpenses.length > 0) parts.push(`${newBrokerageExpenses.length} brokerage`);
    return parts.length ? parts.join(' · ') : 'Import';
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Import transactions" panelClassName="max-w-5xl">
        <div className="space-y-4 min-w-0">
          <div className="rounded-xl border border-slate-200/80 bg-white shadow-card relative z-30">
            <div className="px-3.5 py-2.5 sm:px-4 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2 rounded-t-xl">
              <div className="h-1 w-8 rounded-full bg-primary-500" />
              <p className="text-sm font-bold text-slate-800">CSV file & broker</p>
            </div>
            <div className="p-3.5 sm:p-4 space-y-3 relative z-10">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                className={`w-full rounded-xl border-2 border-dashed px-4 py-6 sm:py-7 text-center transition-colors ${
                  isDragging
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-slate-200 bg-slate-50/50 hover:border-primary-300 hover:bg-primary-50/40'
                }`}
              >
                <FiUploadCloud className={`w-8 h-8 mx-auto mb-2 ${isDragging ? 'text-primary-600' : 'text-primary-500'}`} />
                <p className="text-sm font-semibold text-slate-800">
                  {fileName ? 'Replace CSV file' : 'Drop Mercury CSV here or click to browse'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {fileName || 'Same export format as bank CSV downloads'}
                </p>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={onPickFile}
                className="hidden"
              />

              <SearchableDropdown
                label="Broker"
                value={broker}
                onChange={(v) => {
                  setBroker(v);
                  setBrokerSource('manual');
                  setProjectMap({});
                }}
                options={clientOptions}
                placeholder="Select or type broker..."
                className="relative z-20"
              />
              {brokerSource && broker ? (
                <p className="text-xs text-primary-700 flex items-center gap-1.5">
                  <FiCheck className="w-3.5 h-3.5 shrink-0" />
                  Auto-matched from {brokerSource === 'filename' ? 'file name' : 'bank description'}
                </p>
              ) : null}
            </div>
          </div>

          {parseError ? (
            <div className="rounded-xl border border-rose-200/80 bg-rose-50/80 px-4 py-3 text-sm text-rose-900 shadow-card flex gap-2">
              <FiAlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="font-semibold">{parseError}</p>
            </div>
          ) : null}
          {submitError ? (
            <div className="rounded-xl border border-rose-200/80 bg-rose-50/80 px-4 py-3 text-sm text-rose-900 shadow-card flex gap-2">
              <FiAlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="font-semibold">{submitError}</p>
            </div>
          ) : null}

          {csvProjectNames.length > 0 && broker ? (
            <div className="rounded-xl border border-slate-200/80 bg-white shadow-card relative z-20">
              <div className="px-3.5 py-2.5 sm:px-4 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2 rounded-t-xl">
                <div className="h-1 w-8 rounded-full bg-primary-500" />
                <p className="text-sm font-bold text-slate-800">Project mapping</p>
              </div>
              <div className="p-3.5 sm:p-4 space-y-2.5 relative isolate">
                <p className="text-xs text-slate-500">
                  Only approved projects can be imported. Pending projects must be approved first.
                </p>
                {csvProjectNames.map((name, idx) => {
                  const key = normalizeMatchText(name);
                  const mapped = projectMap[key] || '';
                  const mappedMatch = mapped ? resolveProjectMatch(projects, broker, mapped) : { kind: 'missing' };
                  const autoMatch = !mapped
                    ? findMatchingProject({ description: name, broker, projects: approvedProjects })
                    : null;
                  const displayKind = mapped
                    ? mappedMatch.kind
                    : autoMatch
                      ? 'approved'
                      : resolveProjectMatch(projects, broker, name).kind;
                  const isDropdownOpen = openMappingKey === key;
                  const stackZ = isDropdownOpen ? 80 : csvProjectNames.length - idx + 5;
                  return (
                    <div
                      key={key}
                      style={{ zIndex: stackZ }}
                      className={`flex flex-col sm:flex-row sm:items-end gap-2 rounded-xl border p-2.5 sm:p-3 relative ${
                        displayKind === 'pending'
                          ? 'border-amber-200/80 bg-gradient-to-r from-amber-50/90 to-white'
                          : 'border-slate-200/80 bg-gradient-to-r from-slate-50/80 to-white'
                      }`}
                    >
                      <div className="flex-1 min-w-0 flex items-start gap-2">
                        <div
                          className={`mt-0.5 shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center ${
                            displayKind === 'pending'
                              ? 'bg-amber-50 border-amber-200'
                              : 'bg-primary-50 border-primary-100'
                          }`}
                        >
                          {displayKind === 'pending' ? (
                            <FiClock className="w-4 h-4 text-amber-600" />
                          ) : (
                            <FiFileText className="w-4 h-4 text-primary-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400">CSV Description</p>
                          <p className="text-sm font-semibold text-slate-800 truncate">{name}</p>
                          {displayKind === 'approved' ? (
                            <p className="text-[11px] text-primary-700 mt-0.5 flex items-center gap-1">
                              <FiCheck className="w-3 h-3" /> Matched approved project
                            </p>
                          ) : displayKind === 'pending' ? (
                            <p className="text-[11px] text-amber-800 mt-0.5 leading-snug">
                              Pending approval — approve this project before importing
                            </p>
                          ) : (
                            <p className="text-[11px] text-amber-700 mt-0.5">Needs mapping or create</p>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 relative">
                        <SearchableDropdown
                          label="Project"
                          value={mapped}
                          onChange={(v) => {
                            const exact = projectOptionsForBroker.find(
                              (opt) => opt.toLowerCase() === String(v || '').trim().toLowerCase()
                            );
                            setProjectMap((prev) => ({ ...prev, [key]: exact || v }));
                          }}
                          onOpenChange={(open) => setOpenMappingKey(open ? key : '')}
                          options={projectOptionsForBroker}
                          placeholder="Select approved project..."
                        />
                      </div>
                      {displayKind === 'missing' ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="shrink-0"
                          onClick={() => openCreateProject(name)}
                        >
                          Create project
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {previewRows.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                <StatChip label="New" value={counts.ready} tone="success" />
                <StatChip label="Override" value={counts.override} tone="warn" />
                <StatChip label="Skip" value={counts.skip} tone="muted" />
                <StatChip label="Decide" value={counts.ask} tone="warn" />
                {counts.needs_project > 0 ? (
                  <StatChip label="Need project" value={counts.needs_project} tone="danger" />
                ) : null}
                {counts.pending_project > 0 ? (
                  <StatChip label="Pending" value={counts.pending_project} tone="warn" />
                ) : null}
                {newBrokerageExpenses.length > 0 ? (
                  <StatChip label="Brokerage" value={newBrokerageExpenses.length} tone="success" />
                ) : null}
              </div>

              {askRows.length > 0 ? (
                <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 shadow-card overflow-hidden">
                  <div className="px-3.5 py-2.5 sm:px-4 border-b border-amber-100 flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-1 w-8 rounded-full bg-amber-500 shrink-0" />
                      <p className="text-sm font-bold text-amber-950">Same date & amount already exists</p>
                    </div>
                    {selectedAskKeys.size > 0 ? (
                      <div className="flex flex-wrap gap-1.5 sm:ml-auto">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => applyAskDecision([...selectedAskKeys], 'override')}
                        >
                          Override selected ({selectedAskKeys.size})
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => applyAskDecision([...selectedAskKeys], 'keep_both')}
                        >
                          Keep both selected ({selectedAskKeys.size})
                        </Button>
                      </div>
                    ) : null}
                  </div>
                  <div className="p-3 sm:p-3.5 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-amber-900/80">
                      <label className="inline-flex items-center gap-2 font-semibold text-amber-950 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allUndecidedSelected}
                          onChange={toggleSelectAllAsk}
                          disabled={undecidedAskKeys.length === 0}
                          className="rounded border-amber-300 text-primary-600 focus:ring-primary-500"
                        />
                        Select all undecided
                      </label>
                      <span className="sm:ml-auto">
                        Override replaces that row. Keep both adds another transaction.
                      </span>
                    </div>
                    {askRows.map((row) => {
                      const choice = askDecisions[row.rowKey];
                      const decided = choice === 'override' || choice === 'keep_both';
                      const checked = selectedAskKeys.has(row.rowKey);
                      return (
                        <div
                          key={row.rowKey}
                          className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-xl border px-3 py-2.5 ${
                            decided
                              ? 'border-primary-200 bg-primary-50/40'
                              : 'border-amber-200/70 bg-white'
                          }`}
                        >
                          <label className="flex items-start sm:items-center gap-2 flex-1 min-w-0 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={decided}
                              onChange={() => toggleAskSelected(row.rowKey)}
                              className="mt-0.5 sm:mt-0 rounded border-slate-300 text-primary-600 focus:ring-primary-500 disabled:opacity-40"
                            />
                            <span className="min-w-0 text-sm text-slate-700">
                              <span className="font-semibold text-slate-900">{row.date}</span>
                              <span className="text-slate-400 mx-1.5">·</span>
                              <span className="font-semibold tabular-nums">{formatMoney(row.amount)}</span>
                              {row.mappedProject ? (
                                <>
                                  <span className="text-slate-400 mx-1.5">·</span>
                                  <span className="truncate">{row.mappedProject}</span>
                                </>
                              ) : null}
                              {decided ? (
                                <span className="ml-2 inline-flex px-1.5 py-0.5 rounded-full border border-primary-200 bg-white text-primary-800 text-[10px] font-bold">
                                  {choice === 'override' ? 'Override' : 'Keep both'}
                                </span>
                              ) : null}
                            </span>
                          </label>
                          <div className="flex flex-wrap gap-1.5 shrink-0 sm:pl-0 pl-6">
                            <Button
                              size="sm"
                              variant={choice === 'override' ? 'primary' : 'secondary'}
                              onClick={() => applyAskDecision([row.rowKey], 'override')}
                            >
                              Override
                            </Button>
                            <Button
                              size="sm"
                              variant={choice === 'keep_both' ? 'primary' : 'secondary'}
                              onClick={() => applyAskDecision([row.rowKey], 'keep_both')}
                            >
                              Keep both
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {brokeragePlan.length > 0 ? (
                <div className="rounded-xl border border-slate-200/80 bg-white shadow-card overflow-hidden relative z-0">
                  <div className="px-3.5 py-2.5 sm:px-4 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2">
                    <div className="h-1 w-8 rounded-full bg-primary-500 shrink-0" />
                    <p className="text-sm font-bold text-slate-800">Monthly brokerage expenses</p>
                  </div>
                  <div className="p-3 sm:p-3.5 space-y-2">
                    <p className="text-xs text-slate-500">
                      One brokerage expense per project per month. Already-added months are left as-is.
                    </p>
                    {brokeragePlan.map((item) => (
                      <div
                        key={item.key}
                        className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 px-3 py-2.5 text-sm"
                      >
                        <div className="flex-1 min-w-0 text-slate-700">
                          <span className="font-semibold text-slate-900">{item.project}</span>
                          <span className="text-slate-400 mx-1.5">·</span>
                          <span>{item.monthKey}</span>
                          <span className="text-slate-400 mx-1.5">·</span>
                          <span className="font-semibold tabular-nums">{formatMoney(item.amount)}</span>
                        </div>
                        {item.status === 'new' ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full border border-primary-200 bg-primary-50 text-primary-800 text-[10px] sm:text-xs font-bold">
                            Will add
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full border border-slate-200 bg-white text-slate-600 text-[10px] sm:text-xs font-bold">
                            Already added
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {importPreviewRows.length > 0 ? (
                <div className="rounded-xl border border-slate-200/80 bg-white shadow-card overflow-hidden relative z-0">
                  <div className="px-3.5 py-2.5 sm:px-4 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2">
                    <div className="h-1 w-8 rounded-full bg-primary-500 shrink-0" />
                    <p className="text-sm font-bold text-slate-800">
                      Preview ({importPreviewRows.length})
                    </p>
                  </div>
                  <div className={`${modalScrollTableWrapClass} border-0 rounded-none shadow-none`}>
                    <div className={`${modalScrollTableInnerClass} overflow-x-auto`}>
                      <table className={`${tableElementClass} min-w-[32rem]`}>
                        <thead className="bg-slate-100 border-b border-slate-200">
                          <tr>
                            <th className={tableHeadCellClass('text-left')}>Broker</th>
                            <th className={tableHeadCellClass('text-left')}>Project</th>
                            <th className={tableHeadCellClass('text-left')}>Date</th>
                            <th className={tableHeadCellClass('text-right')}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importPreviewRows.map((row, idx) => (
                            <tr key={row.rowKey} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                              <td className={`${tableBodyCellClass('text-left')} font-semibold text-slate-800`}>
                                {broker || '—'}
                              </td>
                              <td className={`${tableBodyCellClass('text-left')} max-w-[10rem] truncate`} title={row.mappedProject}>
                                {row.mappedProject || '—'}
                              </td>
                              <td className={tableBodyCellClass('text-left')}>{row.date || '—'}</td>
                              <td className={`${tableBodyCellClass('text-right')} tabular-nums font-semibold`}>
                                {formatMoney(row.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white/70 px-4 py-8 text-center shadow-card">
                  <p className="text-sm font-semibold text-slate-700">Nothing to import yet</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Resolve project mapping or duplicate decisions above.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white/70 px-4 py-10 text-center shadow-card">
              <FiUploadCloud className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">No CSV loaded yet</p>
              <p className="text-xs text-slate-500 mt-1">Upload a Mercury export to review a full preview.</p>
            </div>
          )}

          <div className={modalActionsClass}>
            <Button variant="secondary" onClick={onClose} className="w-full sm:flex-1" disabled={isImporting}>
              Close
            </Button>
            <Button
              onClick={onConfirmImport}
              className="w-full sm:flex-1"
              disabled={!canImport || isImporting}
            >
              {isImporting ? 'Importing…' : actionLabel()}
            </Button>
          </div>
        </div>
      </Modal>

      <ProjectFormModal
        key={creatingForCsvName || 'import-project'}
        isOpen={isProjectModalOpen}
        onClose={() => {
          setIsProjectModalOpen(false);
          setCreatingForCsvName('');
        }}
        title="Create project for import"
        clientOptions={clientOptions}
        projectTypeOptions={PROJECT_TYPE_OPTIONS}
        initialValues={projectInitialValues || undefined}
        onSubmit={onCreateProject}
        isSaving={false}
        projects={projects}
      />
    </>
  );
};

export default ImportTransactionsModal;
