import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiInfo, FiTrendingUp } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import FilterBar from '../components/FilterBar';
import SearchableDropdown from '../components/SearchableDropdown';
import TransactionTable from '../components/TransactionTable';
import TransactionFormModal from '../components/TransactionFormModal';
import ImportTransactionsModal from '../components/ImportTransactionsModal';
import Modal, { modalActionsClass, modalScrollTableWrapClass, modalScrollTableInnerClass } from '../components/Modal';
import DeferredMount, { ChartSkeleton } from '../components/DeferredMount';
import { tableElementClass, tableHeadCellClass, tableBodyCellClass } from '../constants/tableStyles';
import {
  chartCardClass,
  chartCardHeaderClass,
  chartCardTitleClass,
  chartCardIconWrapClass,
  chartPlotWrapClass
} from '../constants/chartCardStyles';
import { fetchProjects } from '../store/projects/projectsSlice';
import { createExpense, fetchExpenses } from '../store/expenses/expensesSlice';
import {
  createTransaction,
  editTransaction,
  fetchTransactions,
  removeTransaction,
  createTransactionsBulk
} from '../store/transactions/transactionsSlice';
import { normalizeDateToYYYYMMDD, filterByDateRange, MONTH_NAMES } from '../utils/date';
import { shortenChartAxisLabel } from '../utils/chartLabels';
import { formatMoney } from '../utils/format';
import { transactionNetAfterImpactFund } from '../utils/transactionNet';
import { isApproved } from '../constants/app';
import { useDateFilter } from '../hooks/useDateFilter';
import { useClientOptions } from '../hooks/useClientOptions';
import ErrorAlert from '../components/ErrorAlert';
import PageContainer from '../components/PageContainer';
import { PAYOUT_OCCURRENCE_LABEL_BY_VALUE } from '../constants/payoutOccurrences';
import { isFreelanceProject } from '../constants/projectTypes';
import {
  isProjectEligibleForAutoGenerateMonth,
  isProjectEligibleForTransactions
} from '../utils/transactionsEligibility';
import { buildExpectedTransactionDatesForMonth, countExpectedPayoutsInRange, getPayoutOccurrenceLabel } from '../utils/payoutSchedule';
import { computeProjectTaxDollars, computeProjectBrokerageDollars } from '../utils/project';
import {
  monthKeyFromYmd,
  planNewMonthlyBrokerageExpense
} from '../utils/csvTransactionImport';
import {
  buildMonthlyBrokerageExpenseIfNeeded,
  findLatestProjectByBrokerAndProject,
  monthGrossForProject
} from '../utils/ensureMonthlyBrokerageExpense';

const BarChart = lazy(() => import('../components/BarChart'));
const LineChartChartJS = lazy(() => import('../components/LineChartChartJS'));

const monthlyTrendInfo = (
  <div className="space-y-2 text-[11px] sm:text-xs text-slate-600 leading-relaxed">
    <p className="font-semibold text-slate-800">How Monthly Trend is calculated</p>
    <p>
      <span className="font-medium text-slate-700">Each transaction net</span>
      <br />
      <span className="font-mono text-[10px] sm:text-[11px] text-slate-700">
        totalAmount
      </span>
      <span className="text-slate-500">, or if missing: </span>
      <span className="font-mono text-[10px] sm:text-[11px] text-slate-700">
        amount − brokerage − additional charges
      </span>
    </p>
    <p>
      <span className="font-medium text-slate-700">Each month</span>
      <br />
      <span className="font-mono text-[10px] sm:text-[11px] text-slate-700">
        Σ (net × 0.98)
      </span>
      <span className="text-slate-500"> after the 2% Impact Fund deduction</span>
    </p>
  </div>
);

const defaultForm = {
  client: '',
  project: '',
  date: '',
  amount: '',
  brokerageType: 'percentage',
  brokerageValue: '',
  brokerageAmount: '',
  additionalCharges: ''
};

const Transactions = () => {
  const dispatch = useDispatch();
  const { user } = useAuth();

  const projects = useSelector((state) => state.projects.items);
  const transactions = useSelector((state) => state.transactions.items);
  const expenses = useSelector((state) => state.expenses.items);
  const isLoading = useSelector((state) => state.transactions.isLoading);
  const error = useSelector((state) => state.transactions.error);

  const dateFilter = useDateFilter({ defaultToPreviousMonth: false });
  const { effectiveDateFrom: dateFrom, effectiveDateTo: dateTo } = dateFilter;
  const [selectedBroker, setSelectedBroker] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [initialValues, setInitialValues] = useState(defaultForm);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [isImportOpen, setIsImportOpen] = useState(false);

  const filteredTransactions = useMemo(() => {
    let list = filterByDateRange(transactions || [], dateFrom, dateTo, (t) => t.date);
    if (selectedBroker) list = list.filter((t) => (t.client || '').trim() === selectedBroker);
    if (selectedProjectId) {
      const [client, project] = selectedProjectId.split('|');
      list = list.filter((t) => (t.client || '').trim() === client && (t.project || '').trim() === project);
    }
    return list;
  }, [transactions, dateFrom, dateTo, selectedBroker, selectedProjectId]);

  const approvedForCharts = useMemo(
    () => (filteredTransactions || []).filter(isApproved),
    [filteredTransactions]
  );
  const approvedForTable = useMemo(
    () => (filteredTransactions || []).filter(isApproved),
    [filteredTransactions]
  );

  const monthBuckets = useMemo(() => {
    if (!dateFrom || !dateTo) return [];
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    if (!(start <= end)) return [];
    const months = [];
    const d = new Date(start.getFullYear(), start.getMonth(), 1);
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
    while (d <= endMonth) {
      months.push({ year: d.getFullYear(), month: d.getMonth() });
      d.setMonth(d.getMonth() + 1);
    }
    return months;
  }, [dateFrom, dateTo]);

  const generationPlan = useMemo(() => {
    if (!dateFrom || !dateTo || monthBuckets.length === 0) {
      return { items: [], totalToCreate: 0 };
    }

    const approvedProjects = (projects || [])
      .filter(isApproved)
      .filter((p) => !isFreelanceProject(p));
    const latestByKey = new Map();
    approvedProjects.forEach((p) => {
      const client = (p.client || '').trim();
      const projectName = (p.project || '').trim();
      if (!client || !projectName) return;
      const key = `${client}|${projectName}`;
      const prev = latestByKey.get(key);
      if (!prev) {
        latestByKey.set(key, p);
        return;
      }
      const prevDate = prev.createdAt || prev.date || '';
      const nextDate = p.createdAt || p.date || '';
      if (String(nextDate).localeCompare(String(prevDate)) > 0) latestByKey.set(key, p);
    });

    const allTx = transactions || [];
    const txByKeyMonth = new Map();
    allTx.forEach((t) => {
      const client = (t.client || '').trim();
      const projectName = (t.project || '').trim();
      if (!client || !projectName) return;
      const ymd = normalizeDateToYYYYMMDD(t.date);
      if (!ymd) return;
      const monthKey = ymd.slice(0, 7);
      const key = `${client}|${projectName}|${monthKey}`;
      const arr = txByKeyMonth.get(key) || [];
      arr.push(t);
      txByKeyMonth.set(key, arr);
    });

    const items = [];
    let totalToCreate = 0;

    latestByKey.forEach((p, key) => {
      const [client, projectName] = key.split('|');
      monthBuckets.forEach((m) => {
        const monthKey = `${m.year}-${String(m.month + 1).padStart(2, '0')}`;
        const monthStart = `${monthKey}-01`;
        const lastDay = new Date(m.year, m.month + 1, 0).getDate();
        const monthEnd = `${monthKey}-${String(lastDay).padStart(2, '0')}`;

        if (!isProjectEligibleForAutoGenerateMonth(p, monthStart, monthEnd)) return;

        const expected = countExpectedPayoutsInRange(p, monthStart, monthEnd);
        if (expected <= 0) return;

        const existing = txByKeyMonth.get(`${client}|${projectName}|${monthKey}`) || [];
        const missing = Math.max(0, expected - existing.length);
        if (missing <= 0) return;

        const cadenceLabel = getPayoutOccurrenceLabel(p, PAYOUT_OCCURRENCE_LABEL_BY_VALUE);
        items.push({ key: `${key}|${monthKey}`, client, project: projectName, monthKey, missing, cadenceLabel, projectRow: p, existing });
        totalToCreate += missing;
      });
    });

    items.sort((a, b) => b.missing - a.missing || a.client.localeCompare(b.client) || a.project.localeCompare(b.project));
    return { items, totalToCreate };
  }, [projects, transactions, dateFrom, dateTo, monthBuckets]);

  const generationRangeLabel = useMemo(() => {
    if (!dateFrom || !dateTo) return '';
    const sameMonth = String(dateFrom).slice(0, 7) === String(dateTo).slice(0, 7);
    return sameMonth ? `Month: ${String(dateFrom).slice(0, 7)}` : `Range: ${dateFrom} → ${dateTo}`;
  }, [dateFrom, dateTo]);

  const monthlyTrendData = useMemo(() => {
    const list = approvedForCharts;
    let labels = [];
    let monthsRange = [];
    if (dateFrom && dateTo) {
      const start = new Date(dateFrom);
      const end = new Date(dateTo);
      if (start <= end) {
        const startYear = start.getFullYear();
        const startMonth = start.getMonth();
        const endYear = end.getFullYear();
        const endMonth = end.getMonth();
        const sameYear = startYear === endYear;
        for (let y = startYear; y <= endYear; y++) {
          const mStart = y === startYear ? startMonth : 0;
          const mEnd = y === endYear ? endMonth : 11;
          for (let m = mStart; m <= mEnd; m++) {
            labels.push(sameYear ? MONTH_NAMES[m] : `${MONTH_NAMES[m]} ${String(y).slice(-2)}`);
            monthsRange.push({ year: y, month: m });
          }
        }
        const monthlyTotals = new Array(monthsRange.length).fill(0);
        list.forEach((t) => {
          const tDate = normalizeDateToYYYYMMDD(t.date);
          if (!tDate) return;
          const d = new Date(tDate);
          const idx = monthsRange.findIndex((r) => r.year === d.getFullYear() && r.month === d.getMonth());
          if (idx === -1) return;
          monthlyTotals[idx] += transactionNetAfterImpactFund(t);
        });
        return {
          labels,
          values: monthlyTotals.map((n) => Number(n.toFixed(2))),
          isSingleMonth: monthsRange.length === 1
        };
      }
    }
    return { labels: [], values: [], isSingleMonth: false };
  }, [approvedForCharts, dateFrom, dateTo]);

  const projectChartData = useMemo(() => {
    const list = approvedForCharts;
    const byProject = {};
    list.forEach((t) => {
      const label = [t.client, t.project].filter(Boolean).join(' – ') || 'Other';
      byProject[label] = (byProject[label] || 0) + transactionNetAfterImpactFund(t);
    });
    const fullLabels = Object.keys(byProject).sort();
    const labels = fullLabels.map((k) => shortenChartAxisLabel(k));
    const values = fullLabels.map((k) => byProject[k]);
    return {
      labels,
      fullLabels,
      data: [{ label: 'Amount', values, color: '#0d9488' }]
    };
  }, [approvedForCharts]);

  useEffect(() => {
    document.title = 'Transactions | FinHub';
  }, []);

  useEffect(() => {
    dispatch(fetchProjects());
    dispatch(fetchTransactions());
    dispatch(fetchExpenses());
  }, [dispatch]);

  const eligibleProjectsForTx = useMemo(
    () => (projects || []).filter((p) => isProjectEligibleForTransactions(p, 2)),
    [projects]
  );

  const clientOptions = useClientOptions(eligibleProjectsForTx);
  const allClientOptions = useClientOptions(projects);

  const projectOptions = useMemo(() => {
    const list = eligibleProjectsForTx;
    const filtered = selectedBroker ? list.filter((p) => (p.client || '').trim() === selectedBroker) : list;
    return filtered.map((p) => ({
      value: `${(p.client || '').trim()}|${(p.project || '').trim()}`,
      label: [p.client, p.project].filter(Boolean).join(' – ') || 'Unnamed'
    }));
  }, [eligibleProjectsForTx, selectedBroker]);

  const openAddModal = () => {
    setEditingTransactionId(null);
    setEditingTransaction(null);
    setInitialValues(defaultForm);
    setIsModalOpen(true);
  };

  const openGenerateModal = () => {
    setGenerateError('');
    setIsGenerateOpen(true);
  };

  const closeGenerateModal = () => setIsGenerateOpen(false);

  const openEditModal = (transaction, transactionId) => {
    setEditingTransactionId(transactionId);
    setEditingTransaction(transaction || null);
    setInitialValues({
      ...defaultForm,
      client: transaction.client || '',
      project: transaction.project || '',
      date: transaction.date || '',
      amount: transaction.amount ?? '',
      brokerageType: transaction.brokerageType || 'percentage',
      brokerageValue: transaction.brokerageValue ?? '',
      brokerageAmount: transaction.brokerageAmount ?? '',
      additionalCharges: transaction.additionalCharges ?? ''
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
  };

  /** Same as CSV import: one monthly brokerage expense per client/project/month. */
  const ensureMonthlyBrokerageExpense = async (transactionData, { excludeTxId = null } = {}) => {
    const expenseData = buildMonthlyBrokerageExpenseIfNeeded({
      transactionData,
      projects,
      transactions,
      expenses,
      excludeTxId,
      createdBy: user?.uid || null
    });
    if (!expenseData) return;
    await dispatch(createExpense(expenseData)).unwrap();
  };

  const onSubmit = async (transactionData) => {
    if (editingTransactionId) {
      await dispatch(
        editTransaction({ transactionId: editingTransactionId, transactionData })
      ).unwrap();
      await ensureMonthlyBrokerageExpense(transactionData, { excludeTxId: editingTransactionId });
      setEditingTransactionId(null);
    } else {
      const payload = user?.uid ? { ...transactionData, createdBy: user.uid } : transactionData;
      await dispatch(createTransaction(payload)).unwrap();
      await ensureMonthlyBrokerageExpense(payload);
    }

    setIsModalOpen(false);
    setEditingTransaction(null);
  };

  const onDelete = async (transactionId) => {
    await dispatch(removeTransaction(transactionId)).unwrap();
  };

  const toNumber = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const computeBrokerageAmountFromProject = (project, grossAmount, monthKey = '') => {
    const type = String(project?.brokerageType || 'percentage').trim().toLowerCase();
    const val = toNumber(project?.brokerageValue);
    if (type === 'percentage') return grossAmount * (val / 100);
    if (monthKey) return computeProjectBrokerageDollars(project, { monthKey });
    return val;
  };

  const payoutShareCount = (project) => {
    const key = String(project?.payoutOccurrence || 'biweekly').trim().toLowerCase();
    if (key === 'weekly') return 4;
    if (key === 'monthly') return 1;
    return 2;
  };

  const splitCurrency = (total, parts) => {
    const n = Math.max(1, Math.floor(parts));
    const cents = Math.round(total * 100);
    const base = Math.floor(cents / n);
    let rem = cents - base * n;
    const out = [];
    for (let i = 0; i < n; i += 1) {
      const c = base + (rem > 0 ? 1 : 0);
      if (rem > 0) rem -= 1;
      out.push(c / 100);
    }
    return out;
  };

  const buildAutoTransactionsPayload = () => {
    const items = generationPlan.items;
    if (!items.length) return [];
    const out = [];
    items.forEach((it) => {
      const p = it.projectRow;
      if (isFreelanceProject(p)) return;
      const gross = toNumber(p?.totalMonthlyHours) * toNumber(p?.hourlyRate);
      const brokerageAmount = computeBrokerageAmountFromProject(p, gross, it.monthKey);
      const tax = computeProjectTaxDollars(p);
      const projectCost = toNumber(p?.projectCost);
      const additionalCharges = Number((tax + projectCost).toFixed(2));
      const totalAmount = Number((gross - brokerageAmount - additionalCharges).toFixed(2));
      const shareCount = payoutShareCount(p);

      const existingRows = it.existing || [];
      const sumExisting = (pick) =>
        existingRows.reduce((s, t) => s + toNumber(pick(t)), 0);
      const existingGrossSum = sumExisting((t) => t.amount);
      const existingBrokerageSum = sumExisting((t) => t.brokerageAmount);
      const existingAdditionalSum = sumExisting((t) => t.additionalCharges);
      const existingTotalSum = sumExisting((t) => t.totalAmount);

      const targetGrossRem = Math.max(0, Number(gross.toFixed(2)) - existingGrossSum);
      const targetBrokerageRem = Math.max(0, Number(brokerageAmount.toFixed(2)) - existingBrokerageSum);
      const targetAdditionalRem = Math.max(0, additionalCharges - existingAdditionalSum);
      const targetTotalRem = Math.max(0, totalAmount - existingTotalSum);

      const grossParts = splitCurrency(targetGrossRem, it.missing);
      const brokerageParts = splitCurrency(targetBrokerageRem, it.missing);
      const additionalParts = splitCurrency(targetAdditionalRem, it.missing);

      const existingDates = new Set((it.existing || []).map((t) => normalizeDateToYYYYMMDD(t?.date)).filter(Boolean));
      const slots = buildExpectedTransactionDatesForMonth(p, it.monthKey).filter((d) => !existingDates.has(d));
      const startYmd = normalizeDateToYYYYMMDD(p?.date);
      const monthStartYmd = `${it.monthKey}-01`;
      const defaultBase = startYmd && startYmd.slice(0, 7) === it.monthKey ? startYmd : monthStartYmd;

      let need = it.missing;
      let idx = 0;
      let newTotalRunning = 0;
      while (need > 0) {
        const base = slots[idx] || defaultBase;
        let date = base;
        let bump = 0;
        while ((existingDates.has(date) || (startYmd && date < startYmd)) && bump < 31) {
          bump += 1;
          const dd = Math.min(new Date(Number(it.monthKey.slice(0, 4)), Number(it.monthKey.slice(5, 7)), 0).getDate(), Number(defaultBase.slice(8, 10)) + bump);
          date = `${it.monthKey}-${String(dd).padStart(2, '0')}`;
        }
        existingDates.add(date);

        const i = it.missing - need;
        const rowGross = grossParts[i] ?? 0;
        const rowBrokerage = brokerageParts[i] ?? 0;
        const rowAdditional = additionalParts[i] ?? 0;
        let rowTotal = Number((rowGross - rowBrokerage - rowAdditional).toFixed(2));
        if (i === it.missing - 1) {
          rowTotal = Number((targetTotalRem - newTotalRunning).toFixed(2));
        } else {
          newTotalRunning += rowTotal;
        }

        out.push({
          client: it.client,
          project: it.project,
          date,
          amount: Number(rowGross.toFixed(2)),
          brokerageType: p?.brokerageType || 'percentage',
          brokerageValue: toNumber(p?.brokerageValue),
          brokerageAmount: Number(rowBrokerage.toFixed(2)),
          additionalCharges: Number(rowAdditional.toFixed(2)),
          totalAmount: rowTotal,
          autoGenerated: true,
          payoutShareCount: shareCount
        });
        need -= 1;
        idx += 1;
      }
    });
    return out;
  };

  const onGenerateTransactions = async () => {
    if (!user?.uid) {
      setGenerateError('You must be logged in to generate transactions.');
      return;
    }
    if (!dateFrom || !dateTo) {
      setGenerateError('Select a date range/month first.');
      return;
    }
    if (generationPlan.totalToCreate <= 0) {
      setGenerateError('No transactions to generate for this period.');
      return;
    }

    setIsGenerating(true);
    setGenerateError('');
    try {
      const payload = buildAutoTransactionsPayload().map((t) => ({ ...t, createdBy: user.uid }));
      await dispatch(createTransactionsBulk(payload)).unwrap();

      const expenseSnapshot = [...(expenses || [])];
      const plannedKeys = new Set();
      for (const t of payload) {
        const monthKey = monthKeyFromYmd(t.date);
        const planKey = `${String(t.client || '').trim().toLowerCase()}|${String(t.project || '').trim().toLowerCase()}|${monthKey}`;
        if (!monthKey || plannedKeys.has(planKey)) continue;
        plannedKeys.add(planKey);

        const projectRow = findLatestProjectByBrokerAndProject(projects, t.client, t.project);
        if (!projectRow || isFreelanceProject(projectRow)) continue;

        const existingGross = monthGrossForProject(transactions, t.client, t.project, monthKey);
        const newGross = payload
          .filter((row) => {
            if (monthKeyFromYmd(row.date) !== monthKey) return false;
            if ((row.client || '').trim().toLowerCase() !== String(t.client || '').trim().toLowerCase()) return false;
            return (row.project || '').trim().toLowerCase() === String(t.project || '').trim().toLowerCase();
          })
          .reduce((s, row) => s + (Number(row.amount) || 0), 0);

        const expenseData = planNewMonthlyBrokerageExpense({
          client: t.client,
          project: t.project,
          date: t.date,
          projectRow,
          expenses: expenseSnapshot,
          monthGrossAmount: existingGross + newGross,
          createdBy: user.uid
        });
        if (!expenseData) continue;
        await dispatch(createExpense(expenseData)).unwrap();
        expenseSnapshot.push(expenseData);
      }

      setIsGenerateOpen(false);
    } catch (e) {
      setGenerateError(e?.message || 'Failed to generate transactions.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Transactions"
        actions={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full">
            <Button variant="secondary" onClick={() => setIsImportOpen(true)}>
              Import CSV
            </Button>
            <Button
              variant="secondary"
              onClick={openGenerateModal}
              disabled={!dateFrom || !dateTo || generationPlan.totalToCreate <= 0}
            >
              Generate
            </Button>
            <Button onClick={openAddModal}>Add Transaction</Button>
          </div>
        }
      />

        <FilterBar dateFilter={dateFilter}>
          <SearchableDropdown
            label="Broker"
            value={selectedBroker}
            onChange={(v) => {
              setSelectedBroker(v);
              setSelectedProjectId('');
            }}
            options={clientOptions}
            placeholder="All Brokers"
            layout="filter"
          />
          <SearchableDropdown
            label="Project"
            value={projectOptions.find((p) => p.value === selectedProjectId)?.label ?? ''}
            onChange={(label) => {
              if (!label) {
                setSelectedProjectId('');
                return;
              }
              const match = projectOptions.find((p) => p.label === label);
              if (match) setSelectedProjectId(match.value);
            }}
            options={projectOptions.map((p) => p.label)}
            placeholder={selectedBroker ? 'All Projects' : 'Select broker first'}
            layout="filter"
          />
        </FilterBar>

        <ErrorAlert message={error} />

        {(monthlyTrendData.labels.length > 0 && monthlyTrendData.values.some((v) => v > 0)) || projectChartData.labels.length > 0 ? (
          <DeferredMount>
            <Suspense fallback={<ChartSkeleton />}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-w-0">
                {monthlyTrendData.labels.length > 0 && monthlyTrendData.values.some((v) => v > 0) && (
                  monthlyTrendData.isSingleMonth ? (
                    <div className={`${chartCardClass} flex flex-col !overflow-visible`}>
                      <div className={`${chartCardHeaderClass} flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0 overflow-visible relative z-20`}>
                        <div className={`${chartCardIconWrapClass} bg-primary-100 text-primary-600`}>
                          <FiTrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="min-w-0 flex-1 flex items-center gap-1.5 sm:gap-2">
                          <h3 className={`${chartCardTitleClass} min-w-0 truncate sm:whitespace-normal`}>
                            Monthly Trend
                            <span className="text-slate-500 font-semibold text-sm sm:text-base ml-1.5">
                              · {monthlyTrendData.labels[0]}
                            </span>
                          </h3>
                          <div className="relative group/info shrink-0">
                            <button
                              type="button"
                              className="inline-flex items-center justify-center w-6 h-6 rounded-full text-slate-400 hover:text-primary-600 hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
                              aria-label="How this chart is calculated"
                            >
                              <FiInfo className="w-4 h-4" aria-hidden />
                            </button>
                            <div
                              role="tooltip"
                              className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-[min(18.5rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-slate-200/90 bg-white p-3 text-left shadow-elevated opacity-0 scale-95 transition duration-150 group-hover/info:opacity-100 group-hover/info:scale-100 group-focus-within/info:opacity-100 group-focus-within/info:scale-100"
                            >
                              {monthlyTrendInfo}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className={`${chartPlotWrapClass} flex-1 flex flex-col items-center justify-center min-h-[220px] sm:min-h-[280px] md:min-h-[360px]`}>
                        <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-[0.08em]">
                          Transactions (Net)
                        </p>
                        <p className="mt-3 text-3xl sm:text-4xl md:text-5xl font-bold text-primary-700 tabular-nums tracking-tight">
                          {formatMoney(monthlyTrendData.values[0] || 0)}
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          Total for {monthlyTrendData.labels[0]}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <LineChartChartJS
                      data={[{ label: 'Transactions (Net)', values: monthlyTrendData.values, color: '#0d9488' }]}
                      labels={monthlyTrendData.labels}
                      title="Monthly Trend"
                      info={monthlyTrendInfo}
                    />
                  )
                )}
                {projectChartData.labels.length > 0 && (
                  <BarChart
                    data={projectChartData.data}
                    labels={projectChartData.labels}
                    fullLabels={projectChartData.fullLabels}
                    title="Transactions by Project"
                  />
                )}
              </div>
            </Suspense>
          </DeferredMount>
        ) : null}

        <TransactionTable
          transactions={approvedForTable}
          onDelete={onDelete}
          onEdit={openEditModal}
          isLoading={isLoading}
          title="Transaction Details"
          hideFilters={['client', 'project']}
        />

      <TransactionFormModal
        key={editingTransactionId || 'new'}
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingTransactionId ? 'Edit Transaction' : 'Add Transaction'}
        initialValues={initialValues}
        onSubmit={onSubmit}
        isSaving={isLoading}
        projects={projects}
        clientOptions={clientOptions}
        transactions={transactions}
        editingTransactionId={editingTransactionId}
        editingTransaction={editingTransaction}
      />

      <ImportTransactionsModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        projects={projects}
        transactions={transactions}
        expenses={expenses}
        clientOptions={allClientOptions.length ? allClientOptions : clientOptions}
        user={user}
      />

      <Modal isOpen={isGenerateOpen} onClose={closeGenerateModal} title="Generate transactions" panelClassName="max-w-3xl">
        <div className="space-y-4 min-w-0">
          <div className="rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 sm:px-4 sm:py-3 text-sm text-slate-800 shadow-card">
            <p className="font-semibold">Period</p>
            <p className="text-slate-600 text-xs mt-1">{generationRangeLabel || '—'}</p>
          </div>

          {generateError ? (
            <div className="rounded-xl border border-rose-200/80 bg-rose-50/80 px-4 py-3 text-sm text-rose-900 shadow-card">
              <p className="font-semibold">{generateError}</p>
            </div>
          ) : null}

          {generationPlan.items.length > 0 ? (
            <div className={modalScrollTableWrapClass}>
              <div className={`${modalScrollTableInnerClass} overflow-x-auto`}>
                <table className={`${tableElementClass} min-w-[28rem]`}>
                  <thead className="bg-slate-100 border-b border-slate-200">
                    <tr>
                      <th className={tableHeadCellClass('text-left')}>Broker</th>
                      <th className={tableHeadCellClass('text-left')}>Project</th>
                      <th className={tableHeadCellClass('text-center')}>Month</th>
                      <th className={tableHeadCellClass('text-center')}>Payout</th>
                      <th className={tableHeadCellClass('text-center')}>To create</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generationPlan.items.map((m, idx) => (
                      <tr key={m.key} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className={`${tableBodyCellClass('text-left')} font-semibold text-slate-800`}>{m.client}</td>
                        <td className={tableBodyCellClass('text-left')}>{m.project}</td>
                        <td className={tableBodyCellClass('text-center')}>{m.monthKey}</td>
                        <td className={tableBodyCellClass('text-center')}>{m.cadenceLabel}</td>
                        <td className={tableBodyCellClass('text-center')}>
                          <span className="inline-flex items-center justify-center min-w-7 sm:min-w-8 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-primary-50 text-primary-800 border border-primary-200/70 text-[10px] sm:text-xs font-extrabold tabular-nums">
                            {m.missing}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-600 py-10">
              {dateFrom && dateTo ? 'Nothing to generate for this period.' : 'Select a date range/month first.'}
            </div>
          )}

          <div className={modalActionsClass}>
            <Button variant="secondary" onClick={closeGenerateModal} className="w-full sm:flex-1">
              Cancel
            </Button>
            <Button
              onClick={onGenerateTransactions}
              className="w-full sm:flex-1"
              disabled={isGenerating || generationPlan.totalToCreate <= 0}
            >
              {isGenerating ? 'Generating…' : `Generate (${generationPlan.totalToCreate})`}
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
};

export default Transactions;

