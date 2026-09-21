import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProjects } from '../store/projects/projectsSlice';
import {
  createTransaction,
  editTransaction,
  fetchTransactions,
  removeTransaction
} from '../store/transactions/transactionsSlice';
import { fetchExpenses, createExpense } from '../store/expenses/expensesSlice';
import { buildMonthlyBrokerageExpenseIfNeeded } from '../utils/ensureMonthlyBrokerageExpense';
import { useAuth } from '../contexts/AuthContext';
import { getTargetAmount, setTargetAmount } from '../services/settingsService';
import { formatMoney, signedMoneyClass } from '../utils/format';
import { normalizeDateToYYYYMMDD, MONTH_NAMES } from '../utils/date';
import { computeNextMonthEstimatedAmount } from '../utils/nextMonthEstimate';
import { transactionNetAfterImpactFund } from '../utils/transactionNet';
import { expenseAmountTowardAvailable } from '../utils/availableBalance';
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
import { FiDollarSign, FiTarget, FiEdit2, FiBriefcase } from 'react-icons/fi';

const BarChart = lazy(() => import('../components/BarChart'));
const ActiveProjectsYearComparisonChart = lazy(() => import('../components/ActiveProjectsYearComparisonChart'));


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
  const [initialValues, setInitialValues] = useState(defaultForm);
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
      list = list.filter(
        (t) =>
          (t.client || '').trim().toLowerCase() === (selectedProject.client || '').trim().toLowerCase() &&
          (t.project || '').trim().toLowerCase() === (selectedProject.project || '').trim().toLowerCase()
      );
    } else if (selectedBroker) {
      list = list.filter(
        (t) => (t.client || '').trim().toLowerCase() === selectedBroker.trim().toLowerCase()
      );
    }
    if (dateFrom) {
      const from = normalizeDateToYYYYMMDD(dateFrom);
      list = list.filter((t) => {
        const tDate = normalizeDateToYYYYMMDD(t.date);
        return tDate && tDate >= from;
      });
    }
    if (dateTo) {
      const to = normalizeDateToYYYYMMDD(dateTo);
      list = list.filter((t) => {
        const tDate = normalizeDateToYYYYMMDD(t.date);
        return tDate && tDate <= to;
      });
    }
    return list;
  }, [transactions, selectedProject, selectedBroker, dateFrom, dateTo]);

  const approvedTransactions = useMemo(
    () => (filteredTransactions || []).filter(isApproved),
    [filteredTransactions]
  );
  const approvedExpenses = useMemo(() => (expenses || []).filter(isApproved), [expenses]);

  const openAddModal = () => {
    setEditingTransactionId(null);
    setEditingTransaction(null);
    setInitialValues(defaultForm);
    setIsModalOpen(true);
  };

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

  const onSubmit = async (transactionData) => {
    if (editingTransactionId) {
      await dispatch(
        editTransaction({ transactionId: editingTransactionId, transactionData })
      ).unwrap();
      const expenseData = buildMonthlyBrokerageExpenseIfNeeded({
        transactionData,
        projects,
        transactions,
        expenses,
        excludeTxId: editingTransactionId,
        createdBy: user?.uid || null
      });
      if (expenseData) await dispatch(createExpense(expenseData)).unwrap();
      setEditingTransactionId(null);
    } else {
      const payload = user?.uid ? { ...transactionData, createdBy: user.uid } : transactionData;
      await dispatch(createTransaction(payload)).unwrap();
      const expenseData = buildMonthlyBrokerageExpenseIfNeeded({
        transactionData: payload,
        projects,
        transactions,
        expenses,
        createdBy: user?.uid || null
      });
      if (expenseData) await dispatch(createExpense(expenseData)).unwrap();
    }

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
    let labels = [];
    let monthlyInward = [];
    let monthlyExpense = [];
    let monthsRange = [];

    if (dateFrom && dateTo) {
      const start = new Date(dateFrom);
      const end = new Date(dateTo);
      if (start > end) {
        labels = MONTH_NAMES;
        monthlyInward = new Array(12).fill(0);
        monthlyExpense = new Array(12).fill(0);
      } else {
        const startYear = start.getFullYear();
        const startMonth = start.getMonth();
        const endYear = end.getFullYear();
        const endMonth = end.getMonth();
        const sameYear = startYear === endYear;
        monthsRange = [];
        for (let y = startYear; y <= endYear; y++) {
          const mStart = y === startYear ? startMonth : 0;
          const mEnd = y === endYear ? endMonth : 11;
          for (let m = mStart; m <= mEnd; m++) {
            monthsRange.push({ year: y, month: m });
            labels.push(sameYear ? MONTH_NAMES[m] : `${MONTH_NAMES[m]} ${String(y).slice(-2)}`);
          }
        }
        monthlyInward = new Array(monthsRange.length).fill(0);
        monthlyExpense = new Array(monthsRange.length).fill(0);

        approvedTransactions.forEach((transaction) => {
          const tDate = normalizeDateToYYYYMMDD(transaction.date);
          if (!tDate) return;
          const d = new Date(tDate);
          const idx = monthsRange.findIndex((r) => r.year === d.getFullYear() && r.month === d.getMonth());
          if (idx === -1) return;
          monthlyInward[idx] += transactionNetAfterImpactFund(transaction);
        });

        if (!selectedProject) {
          approvedExpenses.forEach((expense) => {
            const eDate = normalizeDateToYYYYMMDD(expense.date);
            if (!eDate) return;
            const d = new Date(eDate);
            const idx = monthsRange.findIndex((r) => r.year === d.getFullYear() && r.month === d.getMonth());
            if (idx === -1) return;
            monthlyExpense[idx] += expenseAmountTowardAvailable(expense, approvedTransactions);
          });
        }
      }
    } else {
      const currentYear = new Date().getFullYear();
      labels = MONTH_NAMES;
      monthlyInward = new Array(12).fill(0);
      monthlyExpense = new Array(12).fill(0);

      approvedTransactions.forEach((transaction) => {
        const tDate = normalizeDateToYYYYMMDD(transaction.date);
        if (!tDate) return;
        const date = new Date(tDate);
        if (date.getFullYear() === currentYear) {
          const month = date.getMonth();
          monthlyInward[month] += transactionNetAfterImpactFund(transaction);
        }
      });

      if (!selectedProject) {
        approvedExpenses.forEach((expense) => {
          const eDate = normalizeDateToYYYYMMDD(expense.date);
          if (!eDate) return;
          const date = new Date(eDate);
          if (date.getFullYear() === currentYear) {
            const month = date.getMonth();
            monthlyExpense[month] += expenseAmountTowardAvailable(expense, approvedTransactions);
          }
        });
      }
    }

    return {
      labels,
      inward: monthlyInward,
      expense: monthlyExpense
    };
  }, [approvedTransactions, approvedExpenses, selectedProject, dateFrom, dateTo]);

  const activeProjectCount = useMemo(() => {
    return (projects || []).filter(isDashboardActiveProject).length;
  }, [projects]);

  const activeProjectCountByType = useMemo(() => {
    const active = (projects || []).filter(isDashboardActiveProject);
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

  const { inwardPct, expensePct, totalInward, availableAmount } = useMemo(() => {
    const inward = (chartData.inward || []).reduce((s, v) => s + (Number(v) || 0), 0);
    const expense = (chartData.expense || []).reduce((s, v) => s + (Number(v) || 0), 0);
    const total = inward + expense;
    const pct = total === 0 ? { inwardPct: 0, expensePct: 0 } : {
      inwardPct: Math.round((inward / total) * 100),
      expensePct: Math.round((expense / total) * 100)
    };
    return {
      ...pct,
      totalInward: inward,
      totalExpense: expense,
      availableAmount: inward - expense
    };
  }, [chartData]);

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
      <PageHeader title="Overview" actions={<Button onClick={openAddModal}>Add Transaction</Button>} />

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <StatCard
            label="Available Amount"
            value={formatMoney(availableAmount)}
            icon={<FiDollarSign className="w-5 h-5" />}
            valueClassName={signedMoneyClass(availableAmount)}
            iconClassName={availableAmount < 0 ? 'text-red-500' : 'text-primary-600'}
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
          <div className="bg-white rounded-2xl shadow-card overflow-hidden border border-slate-200/80 border-t-[3px] border-t-primary-600 p-4 sm:p-5 md:p-6 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <span className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-primary-100 text-primary-600 shrink-0">
                  <FiTarget className="w-4 h-4 sm:w-5 sm:h-5" />
                </span>
                <p className="text-[10px] sm:text-[11px] font-light text-slate-500 uppercase tracking-[0.18em] leading-snug">
                  Total Inward / Target
                </p>
              </div>
              <button
                type="button"
                onClick={openTargetModal}
                className="p-2 rounded-xl hover:bg-primary-100 text-primary-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
                aria-label={targetAmount != null ? 'Edit target' : 'Set target'}
              >
                <FiEdit2 className="w-5 h-5" />
              </button>
            </div>
            <p className="mt-3 sm:mt-4 text-2xl sm:text-3xl font-bold tracking-tight leading-none tabular-nums font-mono">
              {targetAmount != null && targetAmount > 0 ? (
                <>
                  <span className={totalInward >= targetAmount ? 'text-emerald-600' : 'text-red-600'}>
                    {formatMoney(totalInward)}
                  </span>
                  <span className="text-slate-500 font-normal"> / </span>
                  <span className="text-slate-700">{formatMoney(targetAmount)}</span>
                </>
              ) : (
                <>
                  <span className={signedMoneyClass(totalInward)}>{formatMoney(totalInward)}</span>
                  <span className="block text-sm font-normal text-slate-500 mt-1">Set a target amount to track progress</span>
                </>
              )}
            </p>
          </div>
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
