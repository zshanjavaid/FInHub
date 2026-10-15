import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { FiFileText, FiCheck, FiClock } from 'react-icons/fi';
import Modal, { modalActionsClass, modalScrollTableWrapClass, modalScrollTableInnerClass } from './Modal';
import Button from './Button';
import SearchableDropdown from './SearchableDropdown';
import ProjectFormModal from './ProjectFormModal';
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
import { getEffectiveProjectStatus } from '../utils/transactionsEligibility';

const OPTION_SEP = ' · ';
const SKIP_MAPPING_LABEL = SKIP_IMPORT_LABEL;

const toProjectOptionLabel = (client, project) =>
  `${String(client || '').trim()}${OPTION_SEP}${String(project || '').trim()}`;

const normalizeBrokerKey = (broker) => String(broker || '').trim().toLowerCase();

const isBrokerSelected = (selectedBrokers = [], broker) => {
  const key = normalizeBrokerKey(broker);
  if (!key) return false;
  return (selectedBrokers || []).some((b) => normalizeBrokerKey(b) === key);
};

const resolveProjectMatch = (projects, broker, projectName) => {
  if (!broker || !projectName) return { kind: 'missing', project: null };
  const approved = findLatestProjectByBrokerAndProject((projects || []).filter(isApproved), broker, projectName);
  if (approved) return { kind: 'approved', project: approved };
  const any = findLatestProjectByBrokerAndProject(projects, broker, projectName);
  if (any && !isApproved(any)) return { kind: 'pending', project: any };
  return { kind: 'missing', project: null };
};

const resolveMappedProject = (projects, mapping) => {
  if (mapping?.skip) {
    return { kind: 'skip', project: null, client: '', projectName: '' };
  }
  if (!mapping?.client || !mapping?.project) {
    return { kind: 'missing', project: null, client: '', projectName: '' };
  }
  const match = resolveProjectMatch(projects, mapping.client, mapping.project);
  return {
    kind: match.kind,
    project: match.project,
    client: mapping.client,
    projectName: mapping.project
  };
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
  const [selectedBrokers, setSelectedBrokers] = useState([]);
  const [brokerSource, setBrokerSource] = useState('');
  const [brokerDraft, setBrokerDraft] = useState('');
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
    setSelectedBrokers([]);
    setBrokerSource('');
    setBrokerDraft('');
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

  const projectsForSelectedBrokers = useMemo(
    () =>
      approvedProjects.filter((p) => isBrokerSelected(selectedBrokers, p.client)),
    [approvedProjects, selectedBrokers]
  );

  const projectSelectOptions = useMemo(() => {
    const byKey = new Map();
    projectsForSelectedBrokers.forEach((p) => {
      const client = String(p.client || '').trim();
      const project = String(p.project || '').trim();
      if (!client || !project) return;
      const key = `${normalizeBrokerKey(client)}|${normalizeMatchText(project)}`;
      if (!byKey.has(key)) {
        byKey.set(key, {
          client,
          project,
          label: toProjectOptionLabel(client, project)
        });
      }
    });
    return [...byKey.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [projectsForSelectedBrokers]);

  const projectOptionLabels = useMemo(
    () => [SKIP_MAPPING_LABEL, ...projectSelectOptions.map((o) => o.label)],
    [projectSelectOptions]
  );

  const addBroker = (name) => {
    const next = String(name || '').trim();
    if (!next) return;
    setSelectedBrokers((prev) => {
      if (prev.some((b) => normalizeBrokerKey(b) === normalizeBrokerKey(next))) return prev;
      return [...prev, next];
    });
    setBrokerSource('manual');
    setBrokerDraft('');
  };

  const removeBroker = (name) => {
    const key = normalizeBrokerKey(name);
    setSelectedBrokers((prev) => prev.filter((b) => normalizeBrokerKey(b) !== key));
    setProjectMap((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((mapKey) => {
        if (normalizeBrokerKey(next[mapKey]?.client) === key) delete next[mapKey];
      });
      return next;
    });
    setBrokerSource('manual');
  };

  useEffect(() => {
    if (!selectedBrokers.length || !csvProjectNames.length) return;
    setProjectMap((prev) => {
      const next = { ...prev };
      let changed = false;
      csvProjectNames.forEach((name) => {
        const key = normalizeMatchText(name);
        const current = next[key];
        if (current?.skip) return;
        const currentOk =
          current?.client &&
          current?.project &&
          isBrokerSelected(selectedBrokers, current.client) &&
          resolveMappedProject(projects, current).kind === 'approved';
        if (currentOk) return;

        const approvedMatch = findMatchingProject({
          description: name,
          broker: '',
          projects: projectsForSelectedBrokers
        });
        if (approvedMatch?.project) {
          next[key] = {
            client: String(approvedMatch.client || '').trim(),
            project: String(approvedMatch.project || '').trim()
          };
          changed = true;
          return;
        }

        const pendingPool = (projects || []).filter((p) => isBrokerSelected(selectedBrokers, p.client));
        const pendingMatch = findMatchingProject({ description: name, broker: '', projects: pendingPool });
        if (pendingMatch?.project && !isApproved(pendingMatch)) {
          next[key] = {
            client: String(pendingMatch.client || '').trim(),
            project: String(pendingMatch.project || '').trim()
          };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [selectedBrokers, csvProjectNames, projects, projectsForSelectedBrokers]);

  const previewRows = useMemo(() => {
    return classifiedRows.map((row) => {
      const key = normalizeMatchText(row.description);
      const mapping = projectMap[key] || null;
      const mappedClient = mapping?.skip ? '' : mapping?.client || '';
      const mappedProject = mapping?.skip ? '' : mapping?.project || '';
      let decision = row.importStatus;
      let reason = row.reason || '';

      if (mapping?.skip) {
        decision = 'skip';
        reason = 'Skipped in project mapping';
      } else if (decision === 'ask') {
        const userChoice = askDecisions[row.rowKey];
        if (userChoice === 'keep_both') decision = 'ready';
        else if (userChoice === 'override') decision = 'override';
        else decision = 'ask';
      }

      const match = resolveMappedProject(projects, mapping);
      const needsProjectGate = decision === 'ready' || decision === 'override';

      if (needsProjectGate) {
        if (!mappedClient || !mappedProject) {
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
              client: mappedClient,
              project: mappedProject,
              date: row.date,
              amount: row.amount,
              projectRow: match.project
            })
          : null;

      return {
        ...row,
        mappedClient,
        mappedProject,
        mapping,
        decision,
        reason,
        previewTx,
        projectRow: match.kind === 'approved' ? match.project : null
      };
    });
  }, [classifiedRows, projectMap, askDecisions, projects]);

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
      if (!row.mappedClient || !row.mappedProject || !row.projectRow) return;
      const monthKey = monthKeyFromYmd(row.date);
      if (!monthKey) return;
      const planKey = `${row.mappedClient}|${row.mappedProject}|${monthKey}`;
      const prev = groups.get(planKey) || {
        key: planKey,
        client: row.mappedClient,
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
  }, [previewRows, expenses]);

  const newBrokerageExpenses = useMemo(
    () => brokeragePlan.filter((b) => b.status === 'new'),
    [brokeragePlan]
  );

  const canImport =
    selectedBrokers.length > 0 &&
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
      if (guessed.broker) {
        setSelectedBrokers([guessed.broker]);
        setBrokerSource(guessed.source || '');
      } else {
        setSelectedBrokers([]);
        setBrokerSource('');
      }
      setBrokerDraft('');
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
    if (!selectedBrokers.length) {
      setSubmitError('Select at least one broker before creating a project.');
      return;
    }
    const preferredBroker = selectedBrokers[0];
    const latest = (projects || [])
      .filter((p) => normalizeBrokerKey(p.client) === normalizeBrokerKey(preferredBroker))
      .sort((a, b) => String(b.createdAt || b.date || '').localeCompare(String(a.createdAt || a.date || '')))[0];

    setCreatingForCsvName(csvName);
    setProjectInitialValues({
      client: preferredBroker,
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
    const createdClient = String(values.client || '').trim();
    const createdProject = String(values.project || '').trim();
    if (createdClient) addBroker(createdClient);
    const key = normalizeMatchText(creatingForCsvName || createdProject);
    if (key && createdClient && createdProject) {
      setProjectMap((prev) => ({
        ...prev,
        [key]: { client: createdClient, project: createdProject }
      }));
    }
    setIsProjectModalOpen(false);
    setCreatingForCsvName('');
  };

  const buildTransactionPayloads = () => {
    const creates = [];
    const overrides = [];
    previewRows.forEach((row) => {
      if (row.decision !== 'ready' && row.decision !== 'override') return;
      const match = resolveMappedProject(projects, row.mapping);
      if (match.kind !== 'approved') return;
      const data = buildImportedTransactionData({
        client: row.mappedClient,
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
      <Modal isOpen={isOpen} onClose={onClose} title="Import transactions" panelClassName="max-w-5xl"
        footer={
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
        }
      >
        <div className="space-y-4 min-w-0">
          <ImportCsvSection title="CSV file & brokers" className="relative z-30">
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
                onChange={onPickFile}
                className="hidden"
              />

              <div className="space-y-2">
                <p className="text-xs sm:text-sm font-light text-slate-700 tracking-[0.08em]">
                  Brokers
                </p>
                {selectedBrokers.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedBrokers.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => removeBroker(name)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-800 hover:bg-primary-100"
                        title="Remove broker"
                      >
                        {name}
                        <span aria-hidden className="text-primary-500">
                          ×
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Add every broker that has projects in this CSV.</p>
                )}
                <SearchableDropdown
                  label="Add broker"
                  value={brokerDraft}
                  onChange={(v) => {
                    setBrokerDraft(v);
                    const exact = (clientOptions || []).find(
                      (opt) => String(opt).trim().toLowerCase() === String(v || '').trim().toLowerCase()
                    );
                    if (exact) addBroker(exact);
                  }}
                  options={(clientOptions || []).filter(
                    (opt) => !isBrokerSelected(selectedBrokers, opt)
                  )}
                  placeholder="Select or type another broker..."
                  className="relative z-20"
                />
              </div>
              {brokerSource && selectedBrokers.length > 0 ? (
                <p className="text-xs text-primary-700 flex items-center gap-1.5">
                  <FiCheck className="w-3.5 h-3.5 shrink-0" />
                  Auto-matched from {brokerSource === 'filename' ? 'file name' : 'bank description'} — add more brokers if needed
                </p>
              ) : null}
            </div>
          </ImportCsvSection>

          <ImportCsvAlert message={parseError} />
          <ImportCsvAlert message={submitError} />

          {csvProjectNames.length > 0 && selectedBrokers.length > 0 ? (
            <ImportCsvSection title="Project mapping" className="relative z-20">
              <div className="p-2.5 sm:p-3 space-y-1 relative isolate">
                <p className="text-[11px] text-slate-500 leading-snug pb-0.5">
                  Map each CSV description to Broker · Project, or Skip. Completed / freelance
                  projects are ok; pending ones need approval first.
                </p>
                {csvProjectNames.map((name, idx) => {
                  const key = normalizeMatchText(name);
                  const mapping = projectMap[key] || null;
                  const isSkipped = Boolean(mapping?.skip);
                  const mappedLabel = isSkipped
                    ? SKIP_MAPPING_LABEL
                    : mapping?.client && mapping?.project
                      ? toProjectOptionLabel(mapping.client, mapping.project)
                      : '';
                  const mappedMatch = mapping
                    ? resolveMappedProject(projects, mapping)
                    : { kind: 'missing', project: null };
                  const autoMatch = !mapping
                    ? findMatchingProject({
                        description: name,
                        broker: '',
                        projects: projectsForSelectedBrokers
                      })
                    : null;
                  const displayKind = isSkipped
                    ? 'skip'
                    : mapping
                      ? mappedMatch.kind
                      : autoMatch
                        ? 'approved'
                        : 'missing';
                  const tone =
                    displayKind === 'pending' || displayKind === 'missing'
                      ? 'warn'
                      : displayKind === 'skip'
                        ? 'skip'
                        : 'neutral';
                  const isDropdownOpen = openMappingKey === key;
                  const stackZ = isDropdownOpen ? 80 : csvProjectNames.length - idx + 5;
                  return (
                    <ImportCsvMappingRow
                      key={key}
                      title={name}
                      tone={tone}
                      stackZ={stackZ}
                      icon={
                        displayKind === 'pending' ? (
                          <FiClock className="w-3.5 h-3.5 text-amber-600" />
                        ) : (
                          <FiFileText
                            className={`w-3.5 h-3.5 ${
                              displayKind === 'skip' ? 'text-slate-500' : 'text-primary-600'
                            }`}
                          />
                        )
                      }
                      statusNode={
                        displayKind === 'skip' ? (
                          <span className="text-[10px] font-semibold text-slate-500">Skip</span>
                        ) : displayKind === 'approved' ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-primary-700">
                            <FiCheck className="w-3 h-3" />
                            {mappedMatch.project &&
                            getEffectiveProjectStatus(mappedMatch.project) === 'inactive'
                              ? 'Completed'
                              : 'Matched'}
                          </span>
                        ) : displayKind === 'pending' ? (
                          <span className="text-[10px] font-semibold text-amber-800">Pending</span>
                        ) : (
                          <span className="text-[10px] font-semibold text-amber-700">Needs map</span>
                        )
                      }
                    >
                      <div className="sm:w-[min(100%,18rem)] sm:shrink-0 min-w-0 relative">
                        <SearchableDropdown
                          label=""
                          layout="filter"
                          value={mappedLabel}
                          onChange={(v) => {
                            const trimmed = String(v || '').trim();
                            if (trimmed.toLowerCase() === SKIP_MAPPING_LABEL.toLowerCase()) {
                              setProjectMap((prev) => ({
                                ...prev,
                                [key]: { skip: true }
                              }));
                              return;
                            }
                            const exact = projectSelectOptions.find(
                              (opt) => opt.label.toLowerCase() === trimmed.toLowerCase()
                            );
                            if (exact) {
                              setProjectMap((prev) => ({
                                ...prev,
                                [key]: { client: exact.client, project: exact.project }
                              }));
                              return;
                            }
                            if (!trimmed) {
                              setProjectMap((prev) => {
                                const next = { ...prev };
                                delete next[key];
                                return next;
                              });
                            }
                          }}
                          onOpenChange={(open) => setOpenMappingKey(open ? key : '')}
                          options={projectOptionLabels}
                          placeholder="Broker · Project or Skip..."
                        />
                      </div>
                      {displayKind === 'missing' ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="shrink-0"
                          onClick={() => openCreateProject(name)}
                        >
                          Create
                        </Button>
                      ) : null}
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
                {counts.needs_project > 0 ? (
                  <ImportCsvStatChip label="Need project" value={counts.needs_project} tone="danger" />
                ) : null}
                {counts.pending_project > 0 ? (
                  <ImportCsvStatChip label="Pending" value={counts.pending_project} tone="warn" />
                ) : null}
                {newBrokerageExpenses.length > 0 ? (
                  <ImportCsvStatChip label="Brokerage" value={newBrokerageExpenses.length} tone="success" />
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
                keepBothNoun="transaction"
                getRowLabel={(row) =>
                  row.mappedProject
                    ? row.mappedClient
                      ? toProjectOptionLabel(row.mappedClient, row.mappedProject)
                      : row.mappedProject
                    : null
                }
              />

              {brokeragePlan.length > 0 ? (
                <ImportCsvSection title="Monthly brokerage expenses" className="relative z-0">
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
                </ImportCsvSection>
              ) : null}

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
                                {row.mappedClient || '—'}
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
                </ImportCsvSection>
              ) : (
                <ImportCsvEmptyState
                  title="Nothing to import yet"
                  hint="Resolve project mapping or duplicate decisions above."
                />
              )}
            </>
          ) : (
            <ImportCsvEmptyState />
          )}

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
