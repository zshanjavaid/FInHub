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
import { getTargetAmount, setTargetAmount } from '../services/settingsService';
import { formatMoney, signedMoneyClass } from '../utils/format';
import { filterByDateRange, monthSlotsForRange, calendarYearMonthSlots, addIntoMonthSlots, MONTH_NAMES, normalizeDateToYYYYMMDD, expenseDateValue } from '../utils/date';
import { computeNextMonthEstimatedAmount } from '../utils/nextMonthEstimate';
import { transactionNetAfterImpactFund, sumTransactionNetAfterImpactFund } from '../utils/transactionNet';
import { sumExpenseAmounts } from '../utils/availableBalance';
import { toNumber, normText } from '../utils/number';
import { EMPTY_TRANSACTION_FORM, transactionToFormValues } from '../utils/formValues';
import { matchesClientProject } from '../utils/projectLookup';
import { isApproved } from '../constants/app';
import { isDashboardActiveProject, DASHBOARD_ACTIVE_PROJECT_TYPES, PROJECT_TYPE_COLORS } from '../constants/projectTypes';
import { useClientOptions } from '../hooks/useClientOptions';
import { useDateFilter } from '../hooks/useDateFilter';
import PageHeader from '../components/PageHeader';
import PageContainer from '../components/PageContainer';
import Button from '../components/Button';
import FilterBar from '../components/FilterBar';
import SearchableDropdown from '../components/SearchableDropdown';
import StatCard from '../components/StatCard';
import ErrorAlert from '../components/ErrorAlert';
import Modal, { modalActionsClass } from '../components/Modal';
import InputField from '../components/InputField';
import TransactionTable from '../components/TransactionTable';
import TransactionFormModal from '../components/TransactionFormModal';
import PortfolioLinks from '../components/PortfolioLinks';
import DeferredMount, { ChartSkeleton } from '../components/DeferredMount';
import { FiDollarSign, FiTarget, FiEdit2, FiBriefcase, FiCreditCard } from 'react-icons/fi';

const BarChart = lazy(() => import('../components/BarChart'));
const ActiveProjectsYearComparisonChart = lazy(() => import('../components/ActiveProjectsYearComparisonChart'));

const Dashboard = () => {
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

  const projectOptions = useMemo(() => {
    const list = projects || [];
    const forBroker = selectedBroker
      ? list.filter(
          (p) => (p.client || '').trim().toLowerCase() === selectedBroker.trim().toLowerCase()
        )
      : list;
    return forBroker
      .filter((p) => p.id)
      .map((p) => ({
        value: p.id,
        label: selectedBroker ? (p.project || p.id) : [p.client, p.project].filter(Boolean).join(' – ') || p.id
      }));
  }, [projects, selectedBroker]);

  const selectedProject = useMemo(() => {
    if (!selectedProjectId || !projects?.length) return null;
    return projects.find((p) => p.id === selectedProjectId) || null;
  }, [selectedProjectId, projects]);

  const filteredTransactions = useMemo(() => {
    let list = transactions || [];
    if (selectedProject) {
      list = list.filter((t) => matchesClientProject(t, selectedProject.client, selectedProject.project));
    } else if (selectedBroker) {
      list = list.filter((t) => (t.client || '').trim().toLowerCase() === selectedBroker.trim().toLowerCase());
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
      const broker = normText(selectedBroker);
      list = list.filter((row) => normText(row.client) === broker);
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

  const activeProjectCount = useMemo(() => {
    return (projects || []).filter((p) => isApproved(p) && isDashboardActiveProject(p)).length;
  }, [projects]);

  const activeProjectCountByType = useMemo(() => {
    const active = (projects || []).filter((p) => isApproved(p) && isDashboardActiveProject(p));
    const byType = {};
    DASHBOARD_ACTIVE_PROJECT_TYPES.forEach((type) => {
      byType[type] = active.filter((p) => (p.projectType || '').trim() === type).length;
    });
    return DASHBOARD_ACTIVE_PROJECT_TYPES.map((type) => ({
      label: type,
      value: byType[type] || 0,
      className: PROJECT_TYPE_COLORS[type] || 'bg-slate-100 text-slate-700'
    })).filter((chip) => chip.value > 0);
  }, [projects]);

  const { inwardPct, expensePct, totalInward, totalExpense, availableAmount } = useMemo(() => {
    const inward = sumTransactionNetAfterImpactFund(approvedTransactions);
    const expense = sumExpenseAmounts(approvedExpenses);
    const mix = inward + expense;
    const pct = mix === 0
      ? { inwardPct: 0, expensePct: 0 }
      : {
          inwardPct: Math.round((inward / mix) * 100),
          expensePct: Math.round((expense / mix) * 100)
        };
    return {
      ...pct,
      totalInward: inward,
      totalExpense: expense,
      availableAmount: inward - expense
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
        selectedBroker,
        selectedProject
      }),
    [projects, transactions, selectedBroker, selectedProject]
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
      const b = selectedBroker.trim().toLowerCase();
      list = list.filter((row) => (row.client || '').trim().toLowerCase() === b);
    }
    return list;
  }, [projects, selectedBroker, selectedProject]);

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
            onChange={(label) => setSelectedProjectId(projectOptions.find((p) => p.label === label)?.value ?? '')}
            options={projectOptions.map((p) => p.label)}
            placeholder={selectedBroker ? 'All Projects' : 'Select broker first'}
            layout="filter"
          />
        </FilterBar>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
          <StatCard
            label="Total Inward"
            value={formatMoney(totalInward)}
            icon={<FiTarget className="w-5 h-5" />}
            valueClassName="text-primary-700"
            iconClassName="text-primary-600"
            borderClassName="border-t-primary-600"
          />
          <StatCard
            label="Total Expense"
            value={formatMoney(totalExpense)}
            icon={<FiCreditCard className="w-5 h-5" />}
            valueClassName="text-red-600"
            iconClassName="text-red-500"
            iconWrapClassName="bg-red-50 ring-1 ring-red-100/80"
            borderClassName="border-t-red-500"
          />
          <StatCard
            label="Available Amount"
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
                    <p className="text-[10px] sm:text-xs font-light uppercase tracking-[0.16em] text-slate-500 leading-tight">
                      Next Month Estimated Amount
                    </p>
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

      <Modal isOpen={isTargetModalOpen} onClose={closeTargetModal} title="Set Target Amount">
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
          <div className={modalActionsClass}>
            <Button variant="secondary" onClick={closeTargetModal} className="w-full sm:flex-1">
              Cancel
            </Button>
            <Button onClick={onSaveTarget} disabled={isSavingTarget} loading={isSavingTarget} className="w-full sm:flex-1">
              {isSavingTarget ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
};

export default Dashboard;
