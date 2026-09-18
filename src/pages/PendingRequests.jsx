import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import DataTable from '../components/DataTable';
import TransactionFormModal from '../components/TransactionFormModal';
import ExpenseFormModal from '../components/ExpenseFormModal';
import ProjectFormModal from '../components/ProjectFormModal';
import { formatMoney } from '../utils/format';
import { isApproved, ENTRY_STATUS } from '../constants/app';
import {
  fetchTransactions,
  approveTransaction,
  editTransaction,
  removeTransaction,
  removeTransactionsBulk
} from '../store/transactions/transactionsSlice';
import { fetchExpenses, approveExpense, editExpense, removeExpense } from '../store/expenses/expensesSlice';
import { fetchProjects, approveProject, editProject, removeProject } from '../store/projects/projectsSlice';
import { useClientOptions } from '../hooks/useClientOptions';
import { EXPENSE_TYPE_LABELS, EXPENSE_TYPE_COLORS, RECURRING_MONTHS_LABELS } from '../constants/expenseTypes';
import { PROJECT_TYPE_OPTIONS, PROJECT_TYPE_COLORS } from '../constants/projectTypes';
import PersonBadge from '../components/PersonBadge';
import { getTaxFormDefaultsFromProject, prepareProjectForFirestore } from '../utils/project';
import { getEffectiveProjectStatus } from '../utils/transactionsEligibility';
import { normalizeDateToYYYYMMDD } from '../utils/date';
import ErrorAlert from '../components/ErrorAlert';
import PageContainer from '../components/PageContainer';
import Tabs from '../components/Tabs';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import ApproveAllConfirmModal from '../components/ApproveAllConfirmModal';

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const displayNetTotal = (t) => {
  if (Number.isFinite(Number(t.totalAmount))) return Number(t.totalAmount);
  return toNumber(t.amount) - toNumber(t.brokerageAmount) - toNumber(t.additionalCharges);
};

const formatBrokerageRate = (t) => {
  const type = String(t?.brokerageType || 'percentage').toLowerCase();
  const value = toNumber(t?.brokerageValue);
  const amount = toNumber(t?.brokerageAmount);
  if (amount === 0 && value === 0) return '-';
  if (type === 'percentage') {
    if (value === 0) return '-';
    return `${value}%`;
  }
  if (value === 0) return '-';
  return formatMoney(value);
};

const formatMoneyOrDash = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return '-';
  return formatMoney(n);
};

const defaultTransactionForm = {
  client: '',
  project: '',
  date: '',
  amount: '',
  brokerageType: 'percentage',
  brokerageValue: '',
  brokerageAmount: '',
  additionalCharges: ''
};

const defaultExpenseForm = {
  expenseName: '',
  date: '',
  expenseType: '',
  amount: '',
  comment: '',
  recurring: false,
  recurringMonths: ''
};

const defaultProjectForm = {
  client: '',
  date: '',
  project: '',
  projectType: '',
  projectStatus: 'active',
  totalMonthlyHours: '',
  hourlyRate: '',
  projectCost: '',
  recruiterName: '',
  lead: '',
  projectManager: '',
  contractEnding: '',
  brokerageType: 'percentage',
  brokerageValue: '',
  taxType: 'percentage',
  taxValue: ''
};

const PendingRequests = () => {
  const dispatch = useDispatch();
  const { user } = useAuth();

  const transactions = useSelector((state) => state.transactions.items);
  const expenses = useSelector((state) => state.expenses.items);
  const projects = useSelector((state) => state.projects.items);
  const isLoadingT = useSelector((state) => state.transactions.isLoading);
  const isLoadingE = useSelector((state) => state.expenses.isLoading);
  const isLoadingP = useSelector((state) => state.projects.isLoading);
  const errorT = useSelector((state) => state.transactions.error);
  const errorE = useSelector((state) => state.expenses.error);
  const errorP = useSelector((state) => state.projects.error);

  const clientOptions = useClientOptions(projects);

  const [editingTransactionId, setEditingTransactionId] = useState(null);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [initialValuesTransaction, setInitialValuesTransaction] = useState(defaultTransactionForm);
  const [initialValuesExpense, setInitialValuesExpense] = useState(defaultExpenseForm);
  const [initialValuesProject, setInitialValuesProject] = useState(defaultProjectForm);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isResetTxOpen, setIsResetTxOpen] = useState(false);
  const [isResettingTx, setIsResettingTx] = useState(false);

  const pendingTransactions = useMemo(
    () => (transactions || []).filter((t) => !isApproved(t)),
    [transactions]
  );

  const pendingTransactionsSorted = useMemo(() => {
    const list = [...(pendingTransactions || [])];
    list.sort((a, b) => {
      const da = normalizeDateToYYYYMMDD(a?.date) || '';
      const db = normalizeDateToYYYYMMDD(b?.date) || '';
      if (da !== db) {
        if (!da) return 1;
        if (!db) return -1;
        return da.localeCompare(db);
      }
      const ca = String(a?.client || '').localeCompare(String(b?.client || ''), undefined, { sensitivity: 'base' });
      if (ca !== 0) return ca;
      return String(a?.project || '').localeCompare(String(b?.project || ''), undefined, { sensitivity: 'base' });
    });
    return list;
  }, [pendingTransactions]);
  const pendingExpenses = useMemo(
    () => (expenses || []).filter((e) => !isApproved(e)),
    [expenses]
  );
  const pendingProjects = useMemo(
    () => (projects || []).filter((p) => !isApproved(p)),
    [projects]
  );

  const currentUserId = user?.uid ?? null;

  const resettablePendingTransactionIds = useMemo(
    () =>
      pendingTransactions
        .filter(
          (t) =>
            t?.status === ENTRY_STATUS.PENDING &&
            t?.createdBy &&
            t.createdBy === currentUserId &&
            t?.autoGenerated
        )
        .map((t) => t.id)
        .filter(Boolean),
    [pendingTransactions, currentUserId]
  );

  useEffect(() => {
    document.title = 'Pending Requests | FinHub';
  }, []);

  useEffect(() => {
    dispatch(fetchTransactions());
    dispatch(fetchExpenses());
    dispatch(fetchProjects());
  }, [dispatch]);

  const canApprovePending = () => !!currentUserId;

  const onApproveTransaction = async (id) => {
    if (!currentUserId) return;
    await dispatch(approveTransaction({ transactionId: id, approvedBy: currentUserId })).unwrap();
  };
  const onApproveExpense = async (id) => {
    if (!currentUserId) return;
    await dispatch(approveExpense({ expenseId: id, approvedBy: currentUserId })).unwrap();
  };
  const onApproveProject = async (id) => {
    if (!currentUserId) return;
    await dispatch(approveProject({ projectId: id, approvedBy: currentUserId })).unwrap();
  };

  const [approvingAll, setApprovingAll] = useState({ t: false, e: false, p: false });
  const [approveAllConfirm, setApproveAllConfirm] = useState(null);
  const [activeTab, setActiveTab] = useState('transactions');

  const approvableTransactionIds = pendingTransactions.map((t) => t.id).filter(Boolean);
  const approvableExpenseIds = pendingExpenses.map((e) => e.id).filter(Boolean);
  const approvableProjectIds = pendingProjects.map((p) => p.id).filter(Boolean);

  const onApproveAllTransactions = async () => {
    if (!currentUserId || approvableTransactionIds.length === 0) return;
    setApprovingAll((prev) => ({ ...prev, t: true }));
    try {
      await Promise.all(
        approvableTransactionIds.map((id) =>
          dispatch(approveTransaction({ transactionId: id, approvedBy: currentUserId })).unwrap()
        )
      );
    } finally {
      setApprovingAll((prev) => ({ ...prev, t: false }));
    }
  };

  const onResetMyAutoGeneratedTransactions = async () => {
    if (!currentUserId || resettablePendingTransactionIds.length === 0) return;
    setIsResettingTx(true);
    try {
      await dispatch(removeTransactionsBulk(resettablePendingTransactionIds)).unwrap();
    } finally {
      setIsResettingTx(false);
      setIsResetTxOpen(false);
    }
  };
  const onApproveAllExpenses = async () => {
    if (!currentUserId || approvableExpenseIds.length === 0) return;
    setApprovingAll((prev) => ({ ...prev, e: true }));
    try {
      await Promise.all(
        approvableExpenseIds.map((id) =>
          dispatch(approveExpense({ expenseId: id, approvedBy: currentUserId })).unwrap()
        )
      );
    } finally {
      setApprovingAll((prev) => ({ ...prev, e: false }));
    }
  };
  const onApproveAllProjects = async () => {
    if (!currentUserId || approvableProjectIds.length === 0) return;
    setApprovingAll((prev) => ({ ...prev, p: true }));
    try {
      await Promise.all(
        approvableProjectIds.map((id) =>
          dispatch(approveProject({ projectId: id, approvedBy: currentUserId })).unwrap()
        )
      );
    } finally {
      setApprovingAll((prev) => ({ ...prev, p: false }));
    }
  };

  const isInitialLoadingT = isLoadingT && !(transactions?.length);
  const isInitialLoadingE = isLoadingE && !(expenses?.length);
  const isInitialLoadingP = isLoadingP && !(projects?.length);

  const openEditTransaction = (transaction) => {
    setEditingTransaction(transaction || null);
    setInitialValuesTransaction({
      ...defaultTransactionForm,
      client: transaction.client || '',
      project: transaction.project || '',
      date: transaction.date || '',
      amount: transaction.amount ?? '',
      brokerageType: transaction.brokerageType || 'percentage',
      brokerageValue: transaction.brokerageValue ?? '',
      brokerageAmount: transaction.brokerageAmount ?? '',
      additionalCharges: transaction.additionalCharges ?? ''
    });
    setEditingTransactionId(transaction.id);
  };

  const openEditExpense = (expense) => {
    const expenseTypeLabel = EXPENSE_TYPE_LABELS[expense.expenseType?.toLowerCase()] || expense.expenseType || '';
    setInitialValuesExpense({
      ...defaultExpenseForm,
      expenseName: expense.expenseName || '',
      date: expense.date || '',
      expenseType: expenseTypeLabel,
      amount: expense.amount ?? '',
      comment: expense.comment || '',
      recurring: !!expense.recurring,
      recurringMonths: RECURRING_MONTHS_LABELS[expense.recurringMonths] ?? expense.recurringMonths ?? ''
    });
    setEditingExpenseId(expense.id);
  };

  const openEditProject = (project) => {
    setInitialValuesProject({
      ...defaultProjectForm,
      client: project.client || '',
      date: project.date || '',
      project: project.project || '',
      projectType: project.projectType || '',
      projectStatus: project.projectStatus || 'active',
      totalMonthlyHours: project.totalMonthlyHours || '',
      hourlyRate: project.hourlyRate || '',
      projectCost:
        project.projectCost != null && project.projectCost !== '' ? String(project.projectCost) : '',
      recruiterName: project.recruiterName || '',
      lead: project.lead || '',
      projectManager: project.projectManager || '',
      contractEnding: project.contractEnding || '',
      brokerageType: project.brokerageType || 'percentage',
      brokerageValue: project.brokerageValue || '',
      ...getTaxFormDefaultsFromProject(project)
    });
    setEditingProjectId(project.id);
  };

  const closeEditTransaction = () => {
    setEditingTransactionId(null);
    setEditingTransaction(null);
  };
  const closeEditExpense = () => setEditingExpenseId(null);
  const closeEditProject = () => setEditingProjectId(null);

  const submitEditTransaction = async (transactionData) => {
    if (!editingTransactionId) return;
    await dispatch(editTransaction({ transactionId: editingTransactionId, transactionData })).unwrap();
    setEditingTransactionId(null);
    setEditingTransaction(null);
  };

  const submitEditExpense = async (expenseData) => {
    if (!editingExpenseId) return;
    await dispatch(editExpense({ expenseId: editingExpenseId, expenseData })).unwrap();
    setEditingExpenseId(null);
  };

  const submitEditProject = async (projectData) => {
    if (!editingProjectId) return;
    await dispatch(
      editProject({ projectId: editingProjectId, projectData: prepareProjectForFirestore(projectData) })
    ).unwrap();
    setEditingProjectId(null);
  };

  const onDeleteTransaction = async (id) => {
    await dispatch(removeTransaction(id)).unwrap();
  };

  const onDeleteExpense = async (id) => {
    await dispatch(removeExpense(id)).unwrap();
  };

  const onDeleteProject = async (id) => {
    await dispatch(removeProject(id)).unwrap();
  };

  const transactionColumns = [
    { key: 'client', label: 'Broker' },
    { key: 'project', label: 'Project Name' },
    { key: 'date', label: 'Date' },
    { key: 'amount', label: 'Amount', render: (v) => formatMoney(v) },
    {
      key: 'brokerageDisplay',
      label: 'Brokerage',
      render: (_, t) => formatBrokerageRate(t)
    },
    { key: 'brokerageAmount', label: 'Brokerage Amount', render: (v) => formatMoneyOrDash(v) },
    { key: 'additionalCharges', label: 'Additional Charges', render: (v) => formatMoneyOrDash(v) },
    {
      key: 'totalAmount',
      label: 'Total (Net)',
      render: (_, t) => formatMoney(displayNetTotal(t))
    }
  ];

  const expenseColumns = [
    {
      key: 'expenseName',
      label: 'Expense Name',
      render: (v) => {
        const raw = String(v || '').trim();
        return raw.replace(/^Brokerage\s*[–-]\s*/i, '') || raw || '-';
      }
    },
    { key: 'date', label: 'Date' },
    {
      key: 'expenseType',
      label: 'Type',
      render: (value, row) => {
        if (!value) return '-';
        const key = value?.toLowerCase();
        let label = EXPENSE_TYPE_LABELS[key] || value;
        if (key === 'software_tool' && row.recurring && row.recurringMonths) {
          const period = RECURRING_MONTHS_LABELS[row.recurringMonths] ?? `${row.recurringMonths} months`;
          label = `Software Tool (${period})`;
        }
        if (key === 'brokerage') {
          const stored = String(row?.brokerageType || '').trim().toLowerCase();
          let kind = stored === 'fixed' || stored === 'percentage' ? stored : '';
          let rateVal = row?.brokerageValue;
          if (!kind) {
            const c = String(row?.client || '').trim().toLowerCase();
            const pName = String(row?.project || '').trim().toLowerCase();
            const p = (projects || []).find(
              (x) =>
                String(x?.client || '').trim().toLowerCase() === c &&
                String(x?.project || '').trim().toLowerCase() === pName
            );
            if (p) {
              kind = String(p.brokerageType || 'percentage').trim().toLowerCase() === 'fixed' ? 'fixed' : 'percentage';
              rateVal = p.brokerageValue;
            }
          }
          if (kind) {
            const n = Number(rateVal);
            if (Number.isFinite(n) && n !== 0) {
              label = kind === 'fixed' ? `Brokerage · Fixed ${formatMoney(n)}` : `Brokerage · ${n}%`;
            } else {
              label = `Brokerage · ${kind === 'fixed' ? 'Fixed' : 'Percentage'}`;
            }
          }
        }
        const colorClass = EXPENSE_TYPE_COLORS[key] || 'bg-gray-100 text-gray-800';
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold ${colorClass}`}>
            {label}
          </span>
        );
      }
    },
    { key: 'amount', label: 'Amount', render: (v) => formatMoney(v) },
    { key: 'comment', label: 'Comment/Remark' }
  ];

  const projectColumns = [
    { key: 'client', label: 'Broker' },
    { key: 'project', label: 'Project Name' },
    { key: 'lead', label: 'Lead', render: (value) => <PersonBadge name={value} /> },
    { key: 'projectManager', label: 'Project Manager', render: (value) => <PersonBadge name={value} /> },
    { key: 'date', label: 'Date' },
    {
      key: 'projectType',
      label: 'Project Type',
      render: (value) => {
        if (!value) return '-';
        const colorClass = PROJECT_TYPE_COLORS[value] || 'bg-gray-100 text-gray-800';
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorClass}`}>
            {value}
          </span>
        );
      }
    },
    {
      key: 'projectStatus',
      label: 'Status',
      render: (_, project) => {
        const isActive = getEffectiveProjectStatus(project) === 'active';
        const colorClass = isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700';
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorClass}`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        );
      }
    },
    { key: 'totalMonthlyHours', label: 'Monthly Hours' },
    { key: 'hourlyRate', label: 'Hourly Rate' },
    { key: 'projectCost', label: 'Project Cost', render: (v) => formatMoney(v) },
    { key: 'recruiterName', label: 'Recruiter Name' },
    { key: 'contractEnding', label: 'End Date' },
    {
      key: 'brokerage',
      label: 'Brokerage',
      render: (_, project) => {
        if (!project.brokerageValue) return '-';
        return project.brokerageType === 'percentage'
          ? `${project.brokerageValue}%`
          : `$${project.brokerageValue}`;
      }
    },
    {
      key: 'taxDisplay',
      label: 'Tax',
      render: (_, project) => {
        if (project.taxType === 'percentage' && project.taxValue !== '' && project.taxValue != null) {
          return `${project.taxValue}%`;
        }
        if (project.taxType === 'fixed' && project.taxValue !== '' && project.taxValue != null) {
          return formatMoney(project.taxValue);
        }
        const n = Number(project.taxAmount);
        if (project.taxAmount === '' || project.taxAmount == null || !Number.isFinite(n) || n === 0) return '-';
        return formatMoney(n);
      }
    }
  ];

  const pendingTabs = [
    { id: 'transactions', label: 'Transactions', shortLabel: 'Trans.', badge: pendingTransactions.length },
    { id: 'expenses', label: 'Expenses', badge: pendingExpenses.length },
    { id: 'projects', label: 'Projects', badge: pendingProjects.length }
  ];

  return (
    <PageContainer>
      <PageHeader title="Pending Requests" />

      <ErrorAlert messages={[errorT, errorE, errorP].filter(Boolean)} />

      <div className="space-y-0">
        <Tabs tabs={pendingTabs} activeId={activeTab} onChange={setActiveTab}>
          {activeTab === 'transactions' && (
            <DataTable
              data={pendingTransactionsSorted}
              columns={transactionColumns}
              title="Pending Transactions"
              isLoading={isInitialLoadingT}
              onEdit={(item) => openEditTransaction(item)}
              onApprove={(id) => onApproveTransaction(id)}
              onDelete={onDeleteTransaction}
              getCanApprove={canApprovePending}
              searchConfig={{ enabled: true, placeholder: 'Search by broker, project, date...', searchFields: ['client', 'project', 'date'] }}
              filters={[]}
              emptyTitle="No pending transactions"
              emptyDescription="Pending transactions will appear here for review"
              titleActions={
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  {resettablePendingTransactionIds.length > 0 ? (
                    <Button
                      variant="danger"
                      onClick={() => setIsResetTxOpen(true)}
                      disabled={isResettingTx}
                      size="sm"
                    >
                      {isResettingTx ? 'Resetting…' : `Reset my auto-generated (${resettablePendingTransactionIds.length})`}
                    </Button>
                  ) : null}
                  {approvableTransactionIds.length > 0 ? (
                    <Button onClick={() => setApproveAllConfirm('transactions')} disabled={approvingAll.t} size="sm">
                      {approvingAll.t ? 'Approving…' : `Approve all (${approvableTransactionIds.length})`}
                    </Button>
                  ) : null}
                </div>
              }
            />
          )}
          {activeTab === 'expenses' && (
            <DataTable
              data={pendingExpenses}
              columns={expenseColumns}
              title="Pending Expenses"
              isLoading={isInitialLoadingE}
              onEdit={(item) => openEditExpense(item)}
              onApprove={(id) => onApproveExpense(id)}
              onDelete={onDeleteExpense}
              getCanApprove={canApprovePending}
              searchConfig={{ enabled: true, placeholder: 'Search by name, type, date...', searchFields: ['expenseName', 'expenseType', 'date'] }}
              filters={[]}
              emptyTitle="No pending expenses"
              emptyDescription="Pending expenses will appear here for review"
              titleActions={
                approvableExpenseIds.length > 0 ? (
                  <Button onClick={() => setApproveAllConfirm('expenses')} disabled={approvingAll.e} size="sm">
                    {approvingAll.e ? 'Approving…' : `Approve all (${approvableExpenseIds.length})`}
                  </Button>
                ) : null
              }
            />
          )}
          {activeTab === 'projects' && (
            <DataTable
              data={pendingProjects}
              columns={projectColumns}
              title="Pending Projects"
              isLoading={isInitialLoadingP}
              onEdit={(item) => openEditProject(item)}
              onApprove={(id) => onApproveProject(id)}
              onDelete={onDeleteProject}
              getCanApprove={canApprovePending}
              searchConfig={{
                enabled: true,
                placeholder: 'Search by broker, project, lead, manager, date...',
                searchFields: ['client', 'project', 'lead', 'projectManager', 'date']
              }}
              filters={[]}
              emptyTitle="No pending projects"
              emptyDescription="Pending projects will appear here for review"
              titleActions={
                approvableProjectIds.length > 0 ? (
                  <Button onClick={() => setApproveAllConfirm('projects')} disabled={approvingAll.p} size="sm">
                    {approvingAll.p ? 'Approving…' : `Approve all (${approvableProjectIds.length})`}
                  </Button>
                ) : null
              }
            />
          )}
        </Tabs>
      </div>

      <TransactionFormModal
        key={editingTransactionId ? `tx-${editingTransactionId}` : 'pending-tx-new'}
        isOpen={!!editingTransactionId}
        onClose={closeEditTransaction}
        title="Edit Transaction"
        initialValues={initialValuesTransaction}
        onSubmit={submitEditTransaction}
        isSaving={isLoadingT}
        projects={projects}
        clientOptions={clientOptions}
        transactions={transactions}
        editingTransactionId={editingTransactionId}
        editingTransaction={editingTransaction}
      />

      <ExpenseFormModal
        key={editingExpenseId ? `expense-${editingExpenseId}` : 'pending-expense-new'}
        isOpen={!!editingExpenseId}
        onClose={closeEditExpense}
        title="Edit Expense"
        initialValues={initialValuesExpense}
        onSubmit={submitEditExpense}
        isSaving={isLoadingE}
      />

      <ProjectFormModal
        key={editingProjectId ? `project-${editingProjectId}` : 'pending-project-new'}
        isOpen={!!editingProjectId}
        onClose={closeEditProject}
        title="Edit Project"
        clientOptions={clientOptions}
        projectTypeOptions={PROJECT_TYPE_OPTIONS}
        initialValues={initialValuesProject}
        onSubmit={submitEditProject}
        isSaving={isLoadingP}
        projects={projects}
      />

      <DeleteConfirmModal
        isOpen={isResetTxOpen}
        onClose={() => setIsResetTxOpen(false)}
        onConfirm={onResetMyAutoGeneratedTransactions}
        title="Reset auto-generated transactions"
        message="Delete your pending auto-generated transactions so you can generate them again with updated rules."
        isDeleting={isResettingTx}
      />

      <ApproveAllConfirmModal
        isOpen={approveAllConfirm === 'transactions'}
        onClose={() => setApproveAllConfirm(null)}
        onConfirm={onApproveAllTransactions}
        count={approvableTransactionIds.length}
        entityLabel="transactions"
        isApproving={approvingAll.t}
      />
      <ApproveAllConfirmModal
        isOpen={approveAllConfirm === 'expenses'}
        onClose={() => setApproveAllConfirm(null)}
        onConfirm={onApproveAllExpenses}
        count={approvableExpenseIds.length}
        entityLabel="expenses"
        isApproving={approvingAll.e}
      />
      <ApproveAllConfirmModal
        isOpen={approveAllConfirm === 'projects'}
        onClose={() => setApproveAllConfirm(null)}
        onConfirm={onApproveAllProjects}
        count={approvableProjectIds.length}
        entityLabel="projects"
        isApproving={approvingAll.p}
      />
    </PageContainer>
  );
};

export default PendingRequests;
