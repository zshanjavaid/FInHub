import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import FilterBar from '../components/FilterBar';
import SearchableDropdown from '../components/SearchableDropdown';
import ExpenseTable from '../components/ExpenseTable';
import {
  createExpense,
  editExpense,
  fetchExpenses,
  removeExpense
} from '../store/expenses/expensesSlice';
import { fetchProjects } from '../store/projects/projectsSlice';
import { fetchTransactions } from '../store/transactions/transactionsSlice';
import { filterByDateRange, expenseDateValue } from '../utils/date';
import { useDateFilter } from '../hooks/useDateFilter';
import { isApproved } from '../constants/app';
import { EXPENSE_TYPE_LABELS, EXPENSE_TYPE_LABEL_TO_VALUE, EXPENSE_TYPE_OPTIONS } from '../constants/expenseTypes';
import ErrorAlert from '../components/ErrorAlert';
import PageContainer from '../components/PageContainer';
import { EMPTY_EXPENSE_FORM, expenseToFormValues } from '../utils/formValues';
import {
  cleanupDuplicateMonthlyBrokerageExpenses
} from '../utils/ensureMonthlyBrokerageExpense';

const ExpenseFormModal = lazy(() => import('../components/ExpenseFormModal'));
const typeParamToLabel = (param) => {
  const raw = String(param || '').trim().toLowerCase();
  if (!raw) return '';
  const fromValue = EXPENSE_TYPE_LABELS[raw];
  if (fromValue) return fromValue;
  const fromLabel = EXPENSE_TYPE_OPTIONS.find((l) => l.toLowerCase() === raw);
  return fromLabel || '';
};

const Expenses = () => {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const expenses = useSelector((state) => state.expenses.items);
  const transactions = useSelector((state) => state.transactions.items);
  const isLoading = useSelector((state) => state.expenses.isLoading);
  const error = useSelector((state) => state.expenses.error);
  const projects = useSelector((state) => state.projects.items);

  const dateFilter = useDateFilter({ defaultToCurrentMonth: true });
  const { effectiveDateFrom: dateFrom, effectiveDateTo: dateTo } = dateFilter;
  const [selectedType, setSelectedType] = useState(() => typeParamToLabel(searchParams.get('type')));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [initialValues, setInitialValues] = useState(EMPTY_EXPENSE_FORM);
  const repairDoneRef = useRef(false);

  useEffect(() => {
    const fromUrl = typeParamToLabel(searchParams.get('type'));
    setSelectedType((prev) => (prev === fromUrl ? prev : fromUrl));
  }, [searchParams]);

  const onTypeChange = (label) => {
    setSelectedType(label || '');
    const next = new URLSearchParams(searchParams);
    if (label) {
      const value = EXPENSE_TYPE_LABEL_TO_VALUE[label];
      if (value) next.set('type', value);
      else next.delete('type');
    } else {
      next.delete('type');
    }
    setSearchParams(next, { replace: true });
  };

  const filteredExpenses = useMemo(() => {
    let list = filterByDateRange(expenses || [], dateFrom, dateTo, expenseDateValue);
    if (selectedType) {
      const typeValue = EXPENSE_TYPE_LABEL_TO_VALUE[selectedType];
      list = list.filter((e) => (e.expenseType || '').toLowerCase() === typeValue);
    }
    return list;
  }, [expenses, dateFrom, dateTo, selectedType]);

  const approvedForTable = useMemo(
    () => (filteredExpenses || []).filter(isApproved),
    [filteredExpenses]
  );

  useEffect(() => {
    document.title = selectedType === 'Brokerage' ? 'Brokerage | FinHub' : 'Expenses | FinHub';
  }, [selectedType]);

  useEffect(() => {
    dispatch(fetchExpenses());
    dispatch(fetchProjects());
    dispatch(fetchTransactions());
  }, [dispatch]);

  // One-shot cleanup of duplicate monthly brokerage rows from a raced backfill.
  useEffect(() => {
    if (repairDoneRef.current) return undefined;
    if (!Array.isArray(expenses) || expenses.length === 0) return undefined;
    repairDoneRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const result = await cleanupDuplicateMonthlyBrokerageExpenses(dispatch, expenses);
        if (!cancelled && (result.deleted || result.approved)) {
          console.info(
            `[FinHub] Cleaned duplicate brokerage expenses: deleted ${result.deleted}, approved ${result.approved}`
          );
        }
      } catch (err) {
        if (!cancelled) {
          repairDoneRef.current = false;
          console.error(err);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch, expenses]);

  const openAddModal = () => {
    setEditingExpenseId(null);
    setInitialValues(EMPTY_EXPENSE_FORM);
    setIsModalOpen(true);
  };

  const openEditModal = (expense, expenseId) => {
    setEditingExpenseId(expenseId);
    setInitialValues(expenseToFormValues(expense));
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const onSubmit = async (expenseData) => {
    if (editingExpenseId) {
      await dispatch(
        editExpense({ expenseId: editingExpenseId, expenseData })
      ).unwrap();
      setEditingExpenseId(null);
    } else {
      const payload = user?.uid ? { ...expenseData, createdBy: user.uid } : expenseData;
      await dispatch(createExpense(payload)).unwrap();
    }

    setIsModalOpen(false);
  };

  const onDelete = async (expenseId) => {
    await dispatch(removeExpense(expenseId)).unwrap();
  };

  return (
    <PageContainer>
      <PageHeader title="Expenses" actions={<Button onClick={openAddModal}>Add Expense</Button>} />

        <FilterBar dateFilter={dateFilter}>
          <SearchableDropdown
            label="Type"
            value={selectedType}
            onChange={onTypeChange}
            options={EXPENSE_TYPE_OPTIONS}
            placeholder="All Types"
            layout="filter"
          />
        </FilterBar>

        <ErrorAlert message={error} />

        <ExpenseTable
          expenses={approvedForTable}
          onDelete={onDelete}
          onEdit={openEditModal}
          isLoading={isLoading}
          title="Expense Details"
          hideFilters={['expenseType']}
          projects={projects}
        />

        {isModalOpen ? (
          <Suspense fallback={null}>
            <ExpenseFormModal
              key={editingExpenseId || 'new'}
              isOpen={isModalOpen}
              onClose={closeModal}
              title={editingExpenseId ? 'Edit Expense' : 'Add Expense'}
              initialValues={initialValues}
              onSubmit={onSubmit}
              isSaving={isLoading}
            />
          </Suspense>
        ) : null}
    </PageContainer>
  );
};

export default Expenses;
