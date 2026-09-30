import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProjects } from '../store/projects/projectsSlice';
import {
  createTransaction,
  editTransaction,
  fetchTransactions,
  removeTransaction
} from '../store/transactions/transactionsSlice';
import { fetchExpenses } from '../store/expenses/expensesSlice';
import { syncMonthlyBrokerageExpense } from '../utils/ensureMonthlyBrokerageExpense';
import { useAuth } from '../contexts/AuthContext';
import { usePrivacyHidden } from '../contexts/PrivacyContext';
import { getTargetAmount, setTargetAmount } from '../services/settingsService';
import { formatMoney, signedMoneyClass } from '../utils/format';
import { filterByDateRange, monthSlotsForRange, calendarYearMonthSlots, addIntoMonthSlots, MONTH_NAMES, normalizeDateToYYYYMMDD, expenseDateValue } from '../utils/date';
import { computeNextMonthEstimatedAmount } from '../utils/nextMonthEstimate';
import { transactionNetAfterImpactFund, sumTransactionNetAfterImpactFund, transactionImpactFundAmount, IMPACT_FUND_PERCENT_LABEL } from '../utils/transactionNet';
import { sumExpenseAmountsForAvailable, isMirroredTransactionBrokerageExpense } from '../utils/availableBalance';
import { toNumber } from '../utils/number';
import { matchesSelectedBroker } from '../utils/brokerFilter';
import { EMPTY_TRANSACTION_FORM, transactionToFormValues } from '../utils/formValues';
import { matchesClientProject } from '../utils/projectLookup';
import { buildProjectFilterOptions } from '../utils/projectFilterOptions';
import { projectInactiveEventYmd, projectMatchesStatusInRange } from '../utils/transactionsEligibility';
import { isApproved } from '../constants/app';
import { PROJECT_TYPE_LABELS, PROJECT_TYPE_COLORS } from '../constants/projectTypes';
import { useClientOptions } from '../hooks/useClientOptions';
import { useDateFilter } from '../hooks/useDateFilter';
import PageHeader from '../components/PageHeader';
import PageContainer from '../components/PageContainer';
import Button from '../components/Button';
import FilterBar from '../components/FilterBar';
import BrokerProjectFilters from '../components/BrokerProjectFilters';
import StatCard from '../components/StatCard';
import CalculationInfo from '../components/CalculationInfo';
import ErrorAlert from '../components/ErrorAlert';
import Modal, { modalActionsClass } from '../components/Modal';
import InputField from '../components/InputField';
import TransactionTable from '../components/TransactionTable';
import PortfolioLinks from '../components/PortfolioLinks';
import DeferredMount, { ChartSkeleton } from '../components/DeferredMount';
import { FiDollarSign, FiTarget, FiEdit2, FiBriefcase, FiCreditCard, FiCheckCircle, FiPieChart, FiMinusCircle } from 'react-icons/fi';

const BarChart = lazy(() => import('../components/BarChart'));
const ActiveProjectsYearComparisonChart = lazy(() => import('../components/ActiveProjectsYearComparisonChart'));
const TransactionFormModal = lazy(() => import('../components/TransactionFormModal'));

const Dashboard = () => {
  usePrivacyHidden();
  const dispatch = useDispatch();

  const projects = useSelector((state) => state.projects.items);
  const transactions = useSelector((state) => state.transactions.items);
  const expenses = useSelector((state) => state.expenses.items);
  const isLoading = useSelector((state) => state.transactions.isLoading);
  const projectsError = useSelector((state) => state.projects.error);
  const transactionsError = useSelector((state) => state.transactions.error);
  const expensesError = useSelector((state) => state.expenses.error);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [initialValues, setInitialValues] = useState(EMPTY_TRANSACTION_FORM);
  const [selectedBroker, setSelectedBroker] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const dateFilter = useDateFilter({ defaultToCurrentMonth: true });
  const { effectiveDateFrom: dateFrom, effectiveDateTo: dateTo } = dateFilter;
  const [targetAmount, setTargetAmountState] = useState(null);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [targetInputValue, setTargetInputValue] = useState('');
  const [isSavingTarget, setIsSavingTarget] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    document.title = 'Overview | FinHub';
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    getTargetAmount(user.uid).then(setTargetAmountState);
  }, [user?.uid]);

  useEffect(() => {
    dispatch(fetchProjects());
    dispatch(fetchTransactions());
    dispatch(fetchExpenses());
  }, [dispatch]);

  const clientOptions = useClientOptions(projects);

  const projectOptions = useMemo(
    () =>
      buildProjectFilterOptions(projects, {
        selectedBroker,
        valueMode: 'id',
        requireId: true
      }),
    [projects, selectedBroker]
  );

  const selectedProject = useMemo(() => {
    if (!selectedProjectId || !projects?.length) return null;
    return projects.find((p) => p.id === selectedProjectId) || null;
  }, [selectedProjectId, projects]);

  const filteredTransactions = useMemo(() => {
    let list = transactions || [];
    if (selectedProject) {
      list = list.filter((t) => matchesClientProject(t, selectedProject.client, selectedProject.project));
    } else if (selectedBroker) {
      list = list.filter((t) => matchesSelectedBroker(t, selectedBroker));
    }
    return filterByDateRange(list, dateFrom, dateTo, (t) => t.date);
  }, [transactions, selectedProject, selectedBroker, dateFrom, dateTo]);

  const approvedTransactions = useMemo(
    () => (filteredTransactions || []).filter(isApproved),
    [filteredTransactions]
  );
  const approvedExpenses = useMemo(() => {
    let list = (expenses || []).filter(isApproved);
    if (selectedProject) {
      list = list.filter((row) => matchesClientProject(row, selectedProject.client, selectedProject.project));
    } else if (selectedBroker) {
      list = list.filter((row) => matchesSelectedBroker(row, selectedBroker));
    }
    return filterByDateRange(list, dateFrom, dateTo, expenseDateValue);
  }, [expenses, selectedProject, selectedBroker, dateFrom, dateTo]);

  const openAddModal = () => {
    setEditingTransactionId(null);
    setEditingTransaction(null);
    setInitialValues(EMPTY_TRANSACTION_FORM);
    setIsModalOpen(true);
  };

  const openEditModal = (transaction, transactionId) => {
    setEditingTransactionId(transactionId);
    setEditingTransaction(transaction || null);
    setInitialValues(transactionToFormValues(transaction));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
  };

  const onSubmit = async (transactionData) => {
    const payload = user?.uid ? { ...transactionData, createdBy: user.uid } : transactionData;
    const saved = editingTransactionId ? transactionData : payload;
    if (editingTransactionId) {
      await dispatch(
        editTransaction({ transactionId: editingTransactionId, transactionData })
      ).unwrap();
    } else {
      await dispatch(createTransaction(payload)).unwrap();
    }
    await syncMonthlyBrokerageExpense(dispatch, {
      transactionData: saved,
      previousTransaction: editingTransaction,
      projects,
      transactions,
      expenses,
      excludeTxId: editingTransactionId || null,
      createdBy: user?.uid || null
    });
    setEditingTransactionId(null);

    setIsModalOpen(false);
    setEditingTransaction(null);
  };

  const onDelete = async (transactionId) => {
    await dispatch(removeTransaction(transactionId)).unwrap();
  };

  const openTargetModal = () => {
    setTargetInputValue(targetAmount != null ? String(targetAmount) : '');
    setIsTargetModalOpen(true);
  };

  const closeTargetModal = () => setIsTargetModalOpen(false);

  const onSaveTarget = async () => {
    if (!user?.uid) return;
    setIsSavingTarget(true);
    try {
      const value = await setTargetAmount(user.uid, targetInputValue);
      setTargetAmountState(value);
      closeTargetModal();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingTarget(false);
    }
  };

  const chartData = useMemo(() => {
    const fillSeries = (slots) => {
      const inward = new Array(slots.length).fill(0);
      const expense = new Array(slots.length).fill(0);
      approvedTransactions.forEach((transaction) => {
        addIntoMonthSlots(inward, transaction.date, transactionNetAfterImpactFund(transaction), slots);
      });
      approvedExpenses.forEach((row) => {
        if (isMirroredTransactionBrokerageExpense(row, approvedTransactions)) return;
        addIntoMonthSlots(expense, expenseDateValue(row), toNumber(row.amount), slots);
      });
      return { inward, expense };
    };

    if (dateFrom && dateTo) {
      const range = monthSlotsForRange(dateFrom, dateTo);
      if (!range.valid) {
        return {
          labels: MONTH_NAMES,
          inward: new Array(12).fill(0),
          expense: new Array(12).fill(0)
        };
      }
      return { labels: range.labels, ...fillSeries(range.slots) };
    }

    const ymds = [];
    approvedTransactions.forEach((t) => {
      const d = normalizeDateToYYYYMMDD(t.date);
      if (d) ymds.push(d);
    });
    approvedExpenses.forEach((row) => {
      const d = normalizeDateToYYYYMMDD(expenseDateValue(row));
      if (d) ymds.push(d);
    });
    if (ymds.length === 0) {
      const yearSlots = calendarYearMonthSlots();
      return { labels: yearSlots.labels, inward: new Array(12).fill(0), expense: new Array(12).fill(0) };
    }
    ymds.sort();
    const span = monthSlotsForRange(ymds[0], ymds[ymds.length - 1]);
    if (!span.valid) {
      const yearSlots = calendarYearMonthSlots();
      return { labels: yearSlots.labels, ...fillSeries(yearSlots.slots) };
    }
    return { labels: span.labels, ...fillSeries(span.slots) };
  }, [approvedTransactions, approvedExpenses, dateFrom, dateTo]);

  const activeProjectsForStats = useMemo(() => {
    // Card shows all types (incl. Freelance); staffed-only logic stays in isDashboardActiveProject.
    let list = (projects || []).filter(
      (p) => isApproved(p) && projectMatchesStatusInRange(p, 'active', dateFrom, dateTo)
    );
    if (selectedProject) {
      list = list.filter((p) =>
        matchesClientProject(p, selectedProject.client, selectedProject.project)
      );
    } else if (selectedBroker) {
      list = list.filter((p) => matchesSelectedBroker(p, selectedBroker));
    }
    return list;
  }, [projects, selectedBroker, selectedProject, dateFrom, dateTo]);

  const activeProjectCount = activeProjectsForStats.length;

  const activeProjectCountByType = useMemo(() => {
    const byType = {};
    PROJECT_TYPE_LABELS.forEach((type) => {
      byType[type] = activeProjectsForStats.filter((p) => (p.projectType || '').trim() === type).length;
    });
    return PROJECT_TYPE_LABELS.map((type) => ({
      label: type,
      value: byType[type] || 0,
      className: PROJECT_TYPE_COLORS[type] || 'bg-slate-100 text-slate-700'
    })).filter((chip) => chip.value > 0);
  }, [activeProjectsForStats]);

  const {
    inwardPct,
    expensePct,
    totalInward,
    totalExpense,
    availableAmount,
    grossRevenue,
    totalDeductions,
    deductionBreakdown,
    topClientConcentration
  } = useMemo(() => {
      const inward = sumTransactionNetAfterImpactFund(approvedTransactions);
      const expense = sumExpenseAmountsForAvailable(approvedExpenses, approvedTransactions);
      const mix = inward + expense;
      const pct =
        mix === 0
          ? { inwardPct: 0, expensePct: 0 }
          : {
              inwardPct: Math.round((inward / mix) * 100),
              expensePct: Math.round((expense / mix) * 100)
            };

      let gross = 0;
      let brokerage = 0;
      let additionalCharges = 0;
      let impactFund = 0;
      const byClient = new Map();
      for (const t of approvedTransactions || []) {
        const amount = toNumber(t.amount);
        gross += amount;
        brokerage += toNumber(t.brokerageAmount);
        additionalCharges += toNumber(t.additionalCharges);
        impactFund += transactionImpactFundAmount(t);
        if (amount > 0) {
          const client = String(t.client || '').trim() || 'Unknown';
          byClient.set(client, (byClient.get(client) || 0) + amount);
        }
      }

      let topClient = null;
      let topAmt = 0;
      for (const [client, amt] of byClient) {
        if (amt > topAmt) {
          topAmt = amt;
          topClient = client;
        }
      }
      const concentrationPct = gross > 0 ? Math.round((topAmt / gross) * 100) : 0;
      const deductions = Math.max(0, gross - inward);

      return {
        ...pct,
        totalInward: inward,
        totalExpense: expense,
        availableAmount: inward - expense,
        grossRevenue: gross,
        totalDeductions: deductions,
        deductionBreakdown: {
          brokerage,
          additionalCharges,
          impactFund
        },
        topClientConcentration: { pct: concentrationPct, client: topClient, amount: topAmt }
      };
    }, [approvedTransactions, approvedExpenses]);

  const chartSeries = useMemo(
    () => [
      { label: `Inward (${inwardPct}%)`, values: chartData.inward, color: '#0d9488' },
      { label: `Expense (${expensePct}%)`, values: chartData.expense, color: '#ef4444' }
    ],
    [chartData, inwardPct, expensePct]
  );

  const nextMonthEstimate = useMemo(
    () =>
      computeNextMonthEstimatedAmount({
        projects,
        transactions,
        expenses,
        selectedBroker,
        selectedProject
      }),
    [projects, transactions, expenses, selectedBroker, selectedProject]
  );

  const projectsForAnnualChart = useMemo(() => {
    let list = (projects || []).filter(isApproved);
    if (selectedProject) {
      const c = (selectedProject.client || '').trim().toLowerCase();
      const p = (selectedProject.project || '').trim().toLowerCase();
      list = list.filter(
        (row) =>
          (row.client || '').trim().toLowerCase() === c &&
          (row.project || '').trim().toLowerCase() === p
      );
    } else if (selectedBroker) {
      list = list.filter((row) => matchesSelectedBroker(row, selectedBroker));
    }
    return list;
  }, [projects, selectedBroker, selectedProject]);

  const projectsCompletedInRange = useMemo(() => {
    const endLimit = dateTo || (!dateFrom ? normalizeDateToYYYYMMDD(new Date()) : '');
    return projectsForAnnualChart.filter((p) => {
      const ended = projectInactiveEventYmd(p);
      if (!ended) return false;
      if (dateFrom && ended < dateFrom) return false;
      if (endLimit && ended > endLimit) return false;
      return true;
    }).length;
  }, [projectsForAnnualChart, dateFrom, dateTo]);

  return (
    <PageContainer>
      <PageHeader
        title="Overview"
        actions={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={openTargetModal}
              className="inline-flex items-center justify-center gap-2 h-10 px-3.5 rounded-lg border border-slate-200/90 bg-white text-slate-700 hover:border-primary-300 hover:bg-primary-50/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
              aria-label={targetAmount != null ? 'Edit target' : 'Set target'}
            >
              <span className="text-[10px] font-light uppercase tracking-[0.16em] text-slate-500">Target</span>
              <span className="text-sm font-bold tabular-nums font-mono text-slate-800">
                {targetAmount != null && targetAmount > 0 ? formatMoney(targetAmount) : 'Set'}
              </span>
              <FiEdit2 className="w-4 h-4 text-primary-600" />
            </button>
            <Button onClick={openAddModal}>Add Transaction</Button>
          </div>
        }
      />

        <PortfolioLinks />

        <FilterBar dateFilter={dateFilter}>
          <BrokerProjectFilters
            brokerOptions={clientOptions}
            selectedBroker={selectedBroker}
            onBrokerChange={setSelectedBroker}
            showProject
            projectOptions={projectOptions}
            selectedProjectValue={selectedProjectId}
            onProjectChange={setSelectedProjectId}
          />
        </FilterBar>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
          <StatCard
            label="Gross Revenue"
            calculation={
              <div className="space-y-2">
                <p>Sum of transaction amounts before deductions.</p>
                <ul className="space-y-1 tabular-nums font-mono">
                  <li className="flex items-center justify-between gap-4">
                    <span>Gross Revenue</span>
                    <span className="font-semibold text-slate-800">{formatMoney(grossRevenue)}</span>
                  </li>
                </ul>
              </div>
            }
            value={formatMoney(grossRevenue)}
            icon={<FiDollarSign className="w-5 h-5" />}
            valueClassName="text-emerald-700"
            iconClassName="text-emerald-600"
            iconWrapClassName="bg-emerald-50 ring-1 ring-emerald-100/80"
            borderClassName="border-t-emerald-600"
          />
          <StatCard
            label="Total Deductions"
            calculation={
              <div className="space-y-2">
                <p>Taken off Gross Revenue to get Total Inward.</p>
                <ul className="space-y-1 tabular-nums font-mono">
                  <li className="flex items-center justify-between gap-4">
                    <span>Brokerage fee</span>
                    <span className="font-semibold text-slate-800">{formatMoney(deductionBreakdown.brokerage)}</span>
                  </li>
                  <li className="flex items-center justify-between gap-4">
                    <span>Additional charges</span>
                    <span className="font-semibold text-slate-800">{formatMoney(deductionBreakdown.additionalCharges)}</span>
                  </li>
                  <li className="flex items-center justify-between gap-4">
                    <span>Impact Fund ({IMPACT_FUND_PERCENT_LABEL})</span>
                    <span className="font-semibold text-slate-800">{formatMoney(deductionBreakdown.impactFund)}</span>
                  </li>
                  <li className="flex items-center justify-between gap-4 border-t border-slate-100 pt-1">
                    <span>Total Deductions</span>
                    <span className="font-semibold text-slate-800">{formatMoney(totalDeductions)}</span>
                  </li>
                </ul>
              </div>
            }
            value={formatMoney(totalDeductions)}
            icon={<FiMinusCircle className="w-5 h-5" />}
            valueClassName="text-violet-700"
            iconClassName="text-violet-600"
            iconWrapClassName="bg-violet-50 ring-1 ring-violet-100/80"
            borderClassName="border-t-violet-600"
          />
          <StatCard
            label="Total Inward"
            calculation={
              <div className="space-y-2">
                <p>Gross Revenue − Total Deductions.</p>
                <ul className="space-y-1 tabular-nums font-mono">
                  <li className="flex items-center justify-between gap-4">
                    <span>Gross Revenue</span>
                    <span className="font-semibold text-slate-800">{formatMoney(grossRevenue)}</span>
                  </li>
                  <li className="flex items-center justify-between gap-4">
                    <span>Total Deductions</span>
                    <span className="font-semibold text-slate-800">−{formatMoney(totalDeductions)}</span>
                  </li>
                  <li className="flex items-center justify-between gap-4 border-t border-slate-100 pt-1">
                    <span>Total Inward</span>
                    <span className="font-semibold text-slate-800">{formatMoney(totalInward)}</span>
                  </li>
                </ul>
              </div>
            }
            value={formatMoney(totalInward)}
            icon={<FiTarget className="w-5 h-5" />}
            valueClassName="text-primary-700"
            iconClassName="text-primary-600"
            borderClassName="border-t-primary-600"
          />
          <StatCard
            label="Total Expense"
            calculation={
              <div className="space-y-2">
                <p>Sum of expense records, excluding brokerage already taken off transactions (that part is in Total Deductions).</p>
                <ul className="space-y-1 tabular-nums font-mono">
                  <li className="flex items-center justify-between gap-4">
                    <span>Total Expense</span>
                    <span className="font-semibold text-slate-800">{formatMoney(totalExpense)}</span>
                  </li>
                </ul>
              </div>
            }
            value={formatMoney(totalExpense)}
            icon={<FiCreditCard className="w-5 h-5" />}
            valueClassName="text-red-600"
            iconClassName="text-red-500"
            iconWrapClassName="bg-red-50 ring-1 ring-red-100/80"
            borderClassName="border-t-red-500"
          />
          <StatCard
            label="Available Amount"
            calculation={
              <div className="space-y-2">
                <p>Total Inward − Total Expense.</p>
                <ul className="space-y-1 tabular-nums font-mono">
                  <li className="flex items-center justify-between gap-4">
                    <span>Total Inward</span>
                    <span className="font-semibold text-slate-800">{formatMoney(totalInward)}</span>
                  </li>
                  <li className="flex items-center justify-between gap-4">
                    <span>Total Expense</span>
                    <span className="font-semibold text-slate-800">−{formatMoney(totalExpense)}</span>
                  </li>
                  <li className="flex items-center justify-between gap-4 border-t border-slate-100 pt-1">
                    <span>Available Amount</span>
                    <span className="font-semibold text-slate-800">{formatMoney(availableAmount)}</span>
                  </li>
                </ul>
              </div>
            }
            value={formatMoney(availableAmount)}
            icon={<FiDollarSign className="w-5 h-5" />}
            valueClassName={signedMoneyClass(availableAmount)}
            iconClassName={availableAmount < 0 ? 'text-red-500' : 'text-primary-600'}
            iconWrapClassName={
              availableAmount < 0
                ? 'bg-red-50 ring-1 ring-red-100/80'
                : 'bg-primary-50 ring-1 ring-primary-100/80'
            }
            borderClassName={availableAmount < 0 ? 'border-t-red-500' : 'border-t-primary-600'}
          />
          <StatCard
            label="Active Projects"
            value={activeProjectCount}
            icon={<FiBriefcase className="w-5 h-5" />}
            valueClassName="text-primary-600"
            iconClassName="text-primary-600"
            borderClassName="border-t-primary-600"
            chips={activeProjectCountByType}
          />
          <StatCard
            label="Projects Completed"
            value={projectsCompletedInRange}
            icon={<FiCheckCircle className="w-5 h-5" />}
            valueClassName="text-slate-800"
            iconClassName="text-slate-600"
            iconWrapClassName="bg-slate-100 ring-1 ring-slate-200/80"
            borderClassName="border-t-slate-500"
          />
          <StatCard
            label="Top Client Concentration"
            calculation={
              <div className="space-y-2">
                <p>Largest client’s revenue ÷ Gross Revenue × 100.</p>
                <ul className="space-y-1 tabular-nums font-mono">
                  <li className="flex items-center justify-between gap-4">
                    <span>{topClientConcentration.client || 'Top client'}</span>
                    <span className="font-semibold text-slate-800">{formatMoney(topClientConcentration.amount || 0)}</span>
                  </li>
                  <li className="flex items-center justify-between gap-4">
                    <span>Gross Revenue</span>
                    <span className="font-semibold text-slate-800">{formatMoney(grossRevenue)}</span>
                  </li>
                  <li className="flex items-center justify-between gap-4 border-t border-slate-100 pt-1">
                    <span>Concentration</span>
                    <span className="font-semibold text-slate-800">{topClientConcentration.pct}%</span>
                  </li>
                </ul>
              </div>
            }
            value={`${topClientConcentration.pct}%`}
            icon={<FiPieChart className="w-5 h-5" />}
            valueClassName="text-amber-800"
            iconClassName="text-amber-600"
            iconWrapClassName="bg-amber-50 ring-1 ring-amber-100/80"
            borderClassName="border-t-amber-500"
            hint={
              topClientConcentration.client ? (
                <p className="text-xs font-light text-slate-500 truncate">
                  Client: {topClientConcentration.client}
                </p>
              ) : (
                <p className="text-xs font-light text-slate-500">No inward in range</p>
              )
            }
          />
        </div>

        <ErrorAlert messages={[projectsError, transactionsError, expensesError].filter(Boolean)} />

        <DeferredMount>
          <Suspense fallback={<ChartSkeleton />}>
            <ActiveProjectsYearComparisonChart projects={projectsForAnnualChart} />
          </Suspense>
        </DeferredMount>

        <DeferredMount>
          <Suspense fallback={<ChartSkeleton />}>
            <div className="min-w-0">
              <BarChart
                data={chartSeries}
                labels={chartData.labels}
                title="Monthly Comparison"
                headerRight={
                  <div className="min-w-0">
                    <div className="flex items-center justify-end gap-1">
                      <p className="text-[10px] sm:text-xs font-light uppercase tracking-[0.16em] text-slate-500 leading-tight">
                        Next Month Estimated Amount
                      </p>
                      <CalculationInfo label="Next Month Estimated Amount">
                        <div className="space-y-2">
                          <p>
                            Previous month’s Available Amount + new-project income (after brokerage and additional charges), then minus 30% tax.
                          </p>
                          <ul className="space-y-1 tabular-nums font-mono">
                            <li className="flex items-center justify-between gap-4">
                              <span>Prev. available ({nextMonthEstimate.previousMonthKey})</span>
                              <span className="font-semibold text-slate-800">{formatMoney(nextMonthEstimate.previousMonthAvailable)}</span>
                            </li>
                            <li className="flex items-center justify-between gap-4">
                              <span>New-project income</span>
                              <span className="font-semibold text-slate-800">{formatMoney(nextMonthEstimate.newProjectsBeforeTax)}</span>
                            </li>
                            <li className="flex items-center justify-between gap-4 pl-2 text-slate-500">
                              <span>Gross</span>
                              <span>{formatMoney(nextMonthEstimate.newProjectsGross)}</span>
                            </li>
                            <li className="flex items-center justify-between gap-4 pl-2 text-slate-500">
                              <span>Brokerage fee</span>
                              <span>−{formatMoney(nextMonthEstimate.newProjectsBrokerage)}</span>
                            </li>
                            <li className="flex items-center justify-between gap-4 pl-2 text-slate-500">
                              <span>Additional charges</span>
                              <span>−{formatMoney(nextMonthEstimate.newProjectsAdditionalCharges)}</span>
                            </li>
                            <li className="flex items-center justify-between gap-4">
                              <span>Before tax</span>
                              <span className="font-semibold text-slate-800">{formatMoney(nextMonthEstimate.beforeTax)}</span>
                            </li>
                            <li className="flex items-center justify-between gap-4">
                              <span>Tax (30%)</span>
                              <span className="font-semibold text-slate-800">−{formatMoney(nextMonthEstimate.taxAmount)}</span>
                            </li>
                            <li className="flex items-center justify-between gap-4 border-t border-slate-100 pt-1">
                              <span>Estimated ({nextMonthEstimate.nextMonthKey})</span>
                              <span className="font-semibold text-slate-800">{formatMoney(nextMonthEstimate.estimated)}</span>
                            </li>
                          </ul>
                        </div>
                      </CalculationInfo>
                    </div>
                    <p className={`mt-0.5 text-sm sm:text-base font-bold tabular-nums font-mono ${signedMoneyClass(nextMonthEstimate.estimated, 'text-emerald-600')}`}>
                      {formatMoney(nextMonthEstimate.estimated)}
                    </p>
                  </div>
                }
              />
            </div>
          </Suspense>
        </DeferredMount>

        <TransactionTable
          transactions={approvedTransactions}
          onDelete={onDelete}
          onEdit={openEditModal}
          isLoading={isLoading}
          title={
            selectedProject
              ? `Transactions – ${[selectedProject.client, selectedProject.project].filter(Boolean).join(' – ')}`
              : selectedBroker
                ? `Transactions – ${selectedBroker}`
                : 'Recent Transactions'
          }
          hideFilters={['client', 'project']}
        />

      {isModalOpen ? (
        <Suspense fallback={null}>
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
        </Suspense>
      ) : null}

      <Modal isOpen={isTargetModalOpen} onClose={closeTargetModal} title="Set Target Amount"
        footer={
          <div className={modalActionsClass}>
            <Button variant="secondary" onClick={closeTargetModal} className="w-full sm:flex-1">
              Cancel
            </Button>
            <Button onClick={onSaveTarget} disabled={isSavingTarget} loading={isSavingTarget} className="w-full sm:flex-1">
              {isSavingTarget ? 'Saving…' : 'Save'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 min-w-0">
          <InputField
            label="Target Amount"
            type="number"
            min="0"
            step="1"
            value={targetInputValue}
            onChange={(e) => setTargetInputValue(e.target.value)}
            placeholder="Enter target amount"
          />
        </div>
      </Modal>
    </PageContainer>
  );
};

export default Dashboard;
