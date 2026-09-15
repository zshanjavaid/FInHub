import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { FiUploadCloud, FiShield, FiFileText, FiCheck, FiAlertTriangle, FiClock } from 'react-icons/fi';
import Modal, { modalActionsClass, modalScrollTableWrapClass, modalScrollTableInnerClass } from './Modal';
import Button from './Button';
import SearchableDropdown from './SearchableDropdown';
import ProjectFormModal from './ProjectFormModal';
import { tableElementClass, tableHeadCellClass, tableBodyCellClass } from '../constants/tableStyles';
import { formatMoney } from '../utils/format';
import { prepareProjectForFirestore } from '../utils/project';
import { createProject } from '../store/projects/projectsSlice';
import { createTransactionsBulk } from '../store/transactions/transactionsSlice';
import { PROJECT_TYPE_OPTIONS } from '../constants/projectTypes';
import { isApproved } from '../constants/app';
import {
  parseMercuryTransactionCsv,
  matchBrokerFromHints,
  findMatchingProject,
  classifyCsvRowsAgainstExisting,
  uniqueCsvProjectNames,
  normalizeMatchText,
  buildImportedTransactionData
} from '../utils/csvTransactionImport';

const findLatestProject = (projects, broker, projectName) => {
  if (!broker || !projectName) return null;
  const matches = (projects || [])
    .filter(
      (p) =>
        (p.client || '').trim().toLowerCase() === broker.trim().toLowerCase() &&
        (p.project || '').trim().toLowerCase() === projectName.trim().toLowerCase()
    )
    .sort((a, b) => String(b.createdAt || b.date || '').localeCompare(String(a.createdAt || a.date || '')));
  return matches[0] || null;
};

const resolveProjectMatch = (projects, broker, projectName) => {
  if (!broker || !projectName) return { kind: 'missing', project: null };
  const approved = findLatestProject((projects || []).filter(isApproved), broker, projectName);
  if (approved) return { kind: 'approved', project: approved };
  const any = findLatestProject(projects, broker, projectName);
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
  clientOptions = [],
  user = null
}) => {
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
  const [isImporting, setIsImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectInitialValues, setProjectInitialValues] = useState(null);
  const [creatingForCsvName, setCreatingForCsvName] = useState('');

  const resetState = () => {
    setFileName('');
    setParseError('');
    setSubmitError('');
    setRawRows([]);
    setBroker('');
    setBrokerSource('');
    setProjectMap({});
    setAskDecisions({});
    setIsImporting(false);
    setIsDragging(false);
    setIsProjectModalOpen(false);
    setProjectInitialValues(null);
    setCreatingForCsvName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    if (!isOpen) resetState();
  }, [isOpen]);

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
        if (next[key]) return;
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
        if (userChoice === 'include') decision = 'ready';
        else if (userChoice === 'skip') decision = 'skip';
        else decision = 'ask';
      }

      const match = resolveProjectMatch(projects, broker, mappedProject);

      if (decision === 'ready') {
        if (!mappedProject) {
          decision = 'needs_project';
          reason = 'Map or create a project for this description';
        } else if (match.kind === 'pending') {
          decision = 'pending_project';
          reason = 'Project is pending approval — approve it before importing';
        } else if (match.kind !== 'approved') {
          decision = 'needs_project';
          reason = 'Project not found — create it or pick an existing one';
        }
      }

      const previewTx =
        decision === 'ready' && match.kind === 'approved'
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
        previewTx
      };
    });
  }, [classifiedRows, projectMap, askDecisions, projects, broker]);

  const counts = useMemo(() => {
    const c = { ready: 0, skip: 0, ask: 0, needs_project: 0, pending_project: 0, invalid: 0 };
    previewRows.forEach((r) => {
      c[r.decision] = (c[r.decision] || 0) + 1;
    });
    return c;
  }, [previewRows]);

  const canImport =
    Boolean(broker) &&
    counts.ready > 0 &&
    counts.ask === 0 &&
    counts.needs_project === 0 &&
    counts.pending_project === 0 &&
    counts.invalid === 0;

  const applyFile = async (file) => {
    if (!file) return;
    setParseError('');
    setSubmitError('');
    setAskDecisions({});
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

    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    setCreatingForCsvName(csvName);
    setProjectInitialValues({
      client: broker,
      date: new Date().toISOString().slice(0, 10),
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
      contractEnding: d.toISOString().slice(0, 10),
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
    const out = [];
    previewRows.forEach((row) => {
      if (row.decision !== 'ready') return;
      const match = resolveProjectMatch(projects, broker, row.mappedProject);
      if (match.kind !== 'approved') return;
      out.push(
        buildImportedTransactionData({
          client: broker,
          project: row.mappedProject,
          date: row.date,
          amount: row.amount,
          projectRow: match.project,
          createdBy: user?.uid || null
        })
      );
    });
    return out;
  };

  const onConfirmImport = async () => {
    if (!canImport) return;
    setIsImporting(true);
    setSubmitError('');
    try {
      const payload = buildTransactionPayloads();
      if (!payload.length) {
        setSubmitError('Nothing to import.');
        return;
      }
      await dispatch(createTransactionsBulk(payload)).unwrap();
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

  const askRows = useMemo(
    () => previewRows.filter((r) => r.importStatus === 'ask'),
    [previewRows]
  );
  const importPreviewRows = useMemo(
    () => previewRows.filter((r) => r.decision === 'ready'),
    [previewRows]
  );

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Import transactions" panelClassName="max-w-5xl">
        <div className="space-y-4 min-w-0">
          <div className="rounded-xl border border-primary-200/70 bg-gradient-to-br from-primary-50 via-white to-emerald-50/40 px-3.5 py-3 sm:px-4 shadow-card">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-primary-100 border border-primary-200/80 flex items-center justify-center">
                <FiShield className="w-5 h-5 text-primary-700" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">Your existing data stays safe</p>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5 leading-relaxed">
                  Import only <span className="font-semibold text-slate-800">adds new rows</span>. Matching date + amount rows are skipped. Nothing already saved is edited or deleted.
                </p>
              </div>
            </div>
          </div>

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
              <div className="p-3.5 sm:p-4 space-y-2.5 relative z-10">
                <p className="text-xs text-slate-500">
                  Only approved projects can be imported. Pending projects must be approved first.
                </p>
                {csvProjectNames.map((name) => {
                  const key = normalizeMatchText(name);
                  const mapped = projectMap[key] || '';
                  const displayKind = resolveProjectMatch(projects, broker, mapped || name).kind;
                  return (
                    <div
                      key={key}
                      className={`flex flex-col sm:flex-row sm:items-end gap-2 rounded-xl border p-2.5 sm:p-3 relative z-10 ${
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
                      <div className="flex-1 min-w-0 relative z-20">
                        <SearchableDropdown
                          label="Project"
                          value={mapped}
                          onChange={(v) => setProjectMap((prev) => ({ ...prev, [key]: v }))}
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
                <StatChip label="Skip" value={counts.skip} tone="muted" />
                <StatChip label="Decide" value={counts.ask} tone="warn" />
                {counts.needs_project > 0 ? (
                  <StatChip label="Need project" value={counts.needs_project} tone="danger" />
                ) : null}
                {counts.pending_project > 0 ? (
                  <StatChip label="Pending" value={counts.pending_project} tone="warn" />
                ) : null}
              </div>

              {askRows.length > 0 ? (
                <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 shadow-card overflow-hidden">
                  <div className="px-3.5 py-2.5 sm:px-4 border-b border-amber-100 flex items-center gap-2">
                    <div className="h-1 w-8 rounded-full bg-amber-500" />
                    <p className="text-sm font-bold text-amber-950">Same date & amount already exists</p>
                  </div>
                  <div className="p-3 sm:p-3.5 space-y-2">
                    {askRows.map((row) => (
                      <div
                        key={row.rowKey}
                        className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-xl border border-amber-200/70 bg-white px-3 py-2.5"
                      >
                        <div className="flex-1 min-w-0 text-sm text-slate-700">
                          <span className="font-semibold text-slate-900">{row.date}</span>
                          <span className="text-slate-400 mx-1.5">·</span>
                          <span className="font-semibold tabular-nums">{formatMoney(row.amount)}</span>
                          {row.mappedProject ? (
                            <>
                              <span className="text-slate-400 mx-1.5">·</span>
                              <span className="truncate">{row.mappedProject}</span>
                            </>
                          ) : null}
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            variant={askDecisions[row.rowKey] === 'include' ? 'primary' : 'secondary'}
                            onClick={() =>
                              setAskDecisions((prev) => ({ ...prev, [row.rowKey]: 'include' }))
                            }
                          >
                            Add
                          </Button>
                          <Button
                            size="sm"
                            variant={askDecisions[row.rowKey] === 'skip' ? 'primary' : 'secondary'}
                            onClick={() =>
                              setAskDecisions((prev) => ({ ...prev, [row.rowKey]: 'skip' }))
                            }
                          >
                            Skip
                          </Button>
                        </div>
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
                      Preview ({importPreviewRows.length} to add)
                    </p>
                  </div>
                  <div className={`${modalScrollTableWrapClass} border-0 rounded-none shadow-none`}>
                    <div className={`${modalScrollTableInnerClass} overflow-x-auto`}>
                      <table className={`${tableElementClass} min-w-[36rem]`}>
                        <thead className="bg-slate-100 border-b border-slate-200">
                          <tr>
                            <th className={tableHeadCellClass('text-left')}>Broker</th>
                            <th className={tableHeadCellClass('text-left')}>Project</th>
                            <th className={tableHeadCellClass('text-left')}>Date</th>
                            <th className={tableHeadCellClass('text-right')}>Amount</th>
                            <th className={tableHeadCellClass('text-right')}>Brokerage</th>
                            <th className={tableHeadCellClass('text-right')}>Total (Net)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importPreviewRows.map((row, idx) => {
                            const tx = row.previewTx;
                            const netAfterImpact = tx ? Number(tx.totalAmount) * 0.98 : null;
                            return (
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
                                <td className={`${tableBodyCellClass('text-right')} tabular-nums`}>
                                  {tx ? formatMoney(tx.brokerageAmount) : '—'}
                                </td>
                                <td className={`${tableBodyCellClass('text-right')} tabular-nums font-semibold text-primary-800`}>
                                  {netAfterImpact != null ? formatMoney(netAfterImpact) : '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white/70 px-4 py-8 text-center shadow-card">
                  <p className="text-sm font-semibold text-slate-700">Nothing new to import yet</p>
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
              Cancel
            </Button>
            <Button
              onClick={onConfirmImport}
              className="w-full sm:flex-1"
              disabled={!canImport || isImporting}
            >
              {isImporting ? 'Importing…' : `Add ${counts.ready} new transaction${counts.ready === 1 ? '' : 's'}`}
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
