import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import FilterBar from '../components/FilterBar';
import MultiSelectFilter from '../components/MultiSelectFilter';
import SelectedFilterTags from '../components/SelectedFilterTags';
import FilterSummaryStats from '../components/FilterSummaryStats';
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
import {
  collectExpenseTypeLabels,
  formatExpenseTypeLabel,
  slugifyExpenseType
} from '../constants/expenseTypes';
import ErrorAlert from '../components/ErrorAlert';
import PageContainer from '../components/PageContainer';
import { EMPTY_EXPENSE_FORM, expenseToFormValues } from '../utils/formValues';
import { cleanupDuplicateMonthlyBrokerageExpenses } from '../utils/ensureMonthlyBrokerageExpense';
import { normText } from '../utils/number';
import {
  applyMultiSelectFilters,
  parseTypeParams,
  removeSelectedValue,
  sumBySelectedKeys,
  sumField,
  uniqueFieldValues,
  writeTypeParams
} from '../utils/multiSelectFilter';

const ExpenseFormModal = lazy(() => import('../components/ExpenseFormModal'));
const ImportExpensesModal = lazy(() => import('../components/ImportExpensesModal'));

const typeSlugToLabel = (slug) => formatExpenseTypeLabel(slug) || slug;

const Expenses = () => {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const expenses = useSelector((state) => state.expenses.items);
  const isLoading = useSelector((state) => state.expenses.isLoading);
  const error = useSelector((state) => state.expenses.error);
  const projects = useSelector((state) => state.projects.items);

  const dateFilter = useDateFilter({ defaultToCurrentMonth: true });
  const { effectiveDateFrom: dateFrom, effectiveDateTo: dateTo } = dateFilter;

  const selectedTypes = useMemo(
    () => parseTypeParams(searchParams, slugifyExpenseType).map(typeSlugToLabel),
    [searchParams]
  );
  const [selectedNames, setSelectedNames] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [initialValues, setInitialValues] = useState(EMPTY_EXPENSE_FORM);
  const repairDoneRef = useRef(false);

  const expensesInDate = useMemo(
    () => filterByDateRange(expenses || [], dateFrom, dateTo, expenseDateValue),
    [expenses, dateFrom, dateTo]
  );

  const onTypesChange = (labels) => {
    const nextLabels = labels || [];
    const slugs = nextLabels.map(slugifyExpenseType).filter(Boolean);
    setSearchParams(writeTypeParams(searchParams, slugs), { replace: true });
    // Keep only names that exist under the newly selected types.
    if (!nextLabels.length) return;
    const typed = applyMultiSelectFilters(expensesInDate, [
      {
        selected: nextLabels,
        getValue: (e) => e?.expenseType,
        normalize: slugifyExpenseType
      }
    ]);
    const allowed = new Set(
      uniqueFieldValues(typed, (e) => e?.expenseName).map((n) => normText(n))
    );
    setSelectedNames((prev) => prev.filter((n) => allowed.has(normText(n))));
  };

  const typeFilterOptions = useMemo(() => {
    const fromExpenses = collectExpenseTypeLabels(expenses, { includeBuiltins: false }).map(
      (t) => t.label
    );
    const extras = selectedTypes.filter((l) => l && !fromExpenses.includes(l));
    return [...fromExpenses, ...extras].sort((a, b) => a.localeCompare(b));
  }, [expenses, selectedTypes]);

  /** Names limited to selected type(s) when any type is selected; otherwise all in date range. */
  const nameFilterOptions = useMemo(() => {
    const pool = selectedTypes.length
      ? applyMultiSelectFilters(expensesInDate, [
          {
            selected: selectedTypes,
            getValue: (e) => e?.expenseType,
            normalize: slugifyExpenseType
          }
        ])
      : expensesInDate;
    return uniqueFieldValues(pool, (e) => e?.expenseName);
  }, [expensesInDate, selectedTypes]);

  /** Drop name tags that are outside the current type scope (incl. URL type changes). */
  const scopedSelectedNames = useMemo(() => {
    if (!selectedTypes.length) return selectedNames;
    const allowed = new Set(nameFilterOptions.map((n) => normText(n)));
    return selectedNames.filter((n) => allowed.has(normText(n)));
  }, [selectedNames, nameFilterOptions, selectedTypes.length]);

  const filteredExpenses = useMemo(
    () =>
      applyMultiSelectFilters(expensesInDate, [
        {
          selected: selectedTypes,
          getValue: (e) => e?.expenseType,
          normalize: slugifyExpenseType
        },
        {
          selected: scopedSelectedNames,
          getValue: (e) => e?.expenseName,
          normalize: normText
        }
      ]),
    [expensesInDate, selectedTypes, scopedSelectedNames]
  );

  const approvedForTable = useMemo(
    () => (filteredExpenses || []).filter(isApproved),
    [filteredExpenses]
  );

  const typeSlugs = useMemo(
    () => selectedTypes.map(slugifyExpenseType).filter(Boolean),
    [selectedTypes]
  );
  const isBrokerageView = typeSlugs.length === 1 && typeSlugs[0] === 'brokerage';

  const filterStats = useMemo(() => {
    const total = sumField(approvedForTable, 'amount');
    const byType = sumBySelectedKeys(approvedForTable, selectedTypes, (e) => e?.expenseType, {
      normalize: slugifyExpenseType
    });
    const byName = sumBySelectedKeys(approvedForTable, scopedSelectedNames, (e) => e?.expenseName, {
      normalize: normText
    });
    return { total, byType, byName };
  }, [approvedForTable, selectedTypes, scopedSelectedNames]);

  const summaryItems = useMemo(() => {
    // Rows omitted — pagination already shows "Showing X–Y of Z".
    const items = [
      { key: 'total', label: 'Total', value: filterStats.total, format: 'compact', tone: 'primary' }
    ];
    if (filterStats.byType.length === 1) {
      items.push({
        key: `type:${filterStats.byType[0].key}`,
        label: filterStats.byType[0].label,
        value: filterStats.byType[0].total,
        format: 'compact',
        tone: 'warn',
        hint: 'Selected type'
      });
    }
    if (filterStats.byName.length > 0 && filterStats.byName.length <= 3) {
      filterStats.byName.forEach((b) => {
        items.push({
          key: `name:${b.key}`,
          label: b.label,
          value: b.total,
          format: 'compact',
          tone: 'info',
          hint: 'Selected name'
        });
      });
    }
    return items;
  }, [filterStats]);

  const filterTags = useMemo(() => {
    const tags = [];
    selectedTypes.forEach((label) => {
      tags.push({ id: `type:${slugifyExpenseType(label)}`, label, group: 'Type', kind: 'type' });
    });
    scopedSelectedNames.forEach((name) => {
      tags.push({ id: `name:${normText(name)}`, label: name, group: 'Name', kind: 'name' });
    });
    return tags;
  }, [selectedTypes, scopedSelectedNames]);

  useEffect(() => {
    document.title = isBrokerageView ? 'Brokerage | FinHub' : 'Expenses | FinHub';
  }, [isBrokerageView]);

  useEffect(() => {
    dispatch(fetchExpenses());
    dispatch(fetchProjects());
    dispatch(fetchTransactions());
  }, [dispatch]);

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
      await dispatch(editExpense({ expenseId: editingExpenseId, expenseData })).unwrap();
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

  const onRemoveTag = (tag) => {
    if (tag.kind === 'type') {
      onTypesChange(removeSelectedValue(selectedTypes, tag.label, { normalize: slugifyExpenseType }));
    } else if (tag.kind === 'name') {
      setSelectedNames((prev) => removeSelectedValue(prev, tag.label, { normalize: normText }));
    }
  };

  const onClearTags = () => {
    onTypesChange([]);
    setSelectedNames([]);
  };

  return (
    <PageContainer>
      <PageHeader
        title={isBrokerageView ? 'Brokerage' : 'Expenses'}
        actions={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            {!isBrokerageView ? (
              <Button variant="secondary" onClick={() => setIsImportOpen(true)}>
                Import CSV
              </Button>
            ) : null}
            <Button onClick={openAddModal}>Add Expense</Button>
          </div>
        }
      />

      <FilterBar
        dateFilter={dateFilter}
        stats={<FilterSummaryStats variant="bar" items={summaryItems} />}
        tags={
          filterTags.length ? (
            <SelectedFilterTags
              tags={filterTags}
              onRemove={onRemoveTag}
              onClearAll={onClearTags}
            />
          ) : null
        }
      >
        <MultiSelectFilter
          label="Type"
          value={selectedTypes}
          onChange={onTypesChange}
          options={typeFilterOptions}
          placeholder="All Types"
          normalize={slugifyExpenseType}
        />
        <MultiSelectFilter
          label="Expense name"
          value={scopedSelectedNames}
          onChange={setSelectedNames}
          options={nameFilterOptions}
          placeholder={selectedTypes.length ? 'Names in selected types' : 'All Names'}
          normalize={normText}
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
            expenses={expenses}
          />
        </Suspense>
      ) : null}

      {isImportOpen ? (
        <Suspense fallback={null}>
          <ImportExpensesModal
            isOpen={isImportOpen}
            onClose={() => setIsImportOpen(false)}
            user={user}
            expenses={expenses}
          />
        </Suspense>
      ) : null}
    </PageContainer>
  );
};

export default Expenses;
