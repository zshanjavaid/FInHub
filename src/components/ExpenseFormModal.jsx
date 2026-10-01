import { useMemo } from 'react';
import FormModal from './FormModal';
import { FiFileText, FiDollarSign, FiMessageSquare, FiCalendar } from 'react-icons/fi';
import {
  RECURRING_PERIOD_FORM_OPTIONS,
  collectExpenseTypeLabels,
  resolveExpenseTypeInput
} from '../constants/expenseTypes';
import { EMPTY_EXPENSE_FORM } from '../utils/formValues';
import { todayLocalYmd } from '../utils/date';

const ExpenseFormModal = ({
  isOpen,
  onClose,
  title,
  initialValues = EMPTY_EXPENSE_FORM,
  onSubmit,
  isSaving = false,
  expenses = []
}) => {
  const today = todayLocalYmd();
  const normalizedInitialValues = {
    ...EMPTY_EXPENSE_FORM,
    ...(initialValues || {}),
    date: (initialValues && initialValues.date) ? initialValues.date : today
  };

  const typeOptions = useMemo(() => {
    const labels = collectExpenseTypeLabels(expenses, { includeBuiltins: true }).map((t) => t.label);
    const initial = String(normalizedInitialValues.expenseType || '').trim();
    if (initial && !labels.includes(initial)) labels.push(initial);
    return labels;
  }, [expenses, normalizedInitialValues.expenseType]);

  const fields = useMemo(() => [
    {
      type: 'text',
      name: 'expenseName',
      label: 'Expense Name',
      required: true,
      icon: <FiFileText className="w-5 h-5 text-gray-400" />
    },
    {
      type: 'date',
      name: 'date',
      label: 'Date',
      required: true,
      defaultValue: today
    },
    {
      type: 'searchable-dropdown',
      name: 'expenseType',
      label: 'Type of Expense',
      required: true,
      options: typeOptions,
      placeholder: 'Select or type a new type…',
      icon: <FiFileText className="w-5 h-5 text-gray-400" />,
      colSpan: (form) => form.expenseType === 'Software Tool' ? 4 : 1
    },
    {
      type: 'checkbox',
      name: 'recurring',
      label: 'Recurring',
      showWhen: (form) => form.expenseType === 'Software Tool'
    },
    {
      type: 'searchable-dropdown',
      name: 'recurringMonths',
      label: 'Recurring period',
      required: true,
      options: RECURRING_PERIOD_FORM_OPTIONS.map(opt => opt.label),
      placeholder: 'Type or select period...',
      icon: <FiCalendar className="w-5 h-5 text-gray-400" />,
      showWhen: (form) => form.expenseType === 'Software Tool' && !!form.recurring
    },
    {
      type: 'number',
      name: 'amount',
      label: 'Expense Amount',
      required: true,
      min: 0.01,
      icon: <FiDollarSign className="w-5 h-5 text-gray-400" />,
      fullWidth: (form) => form.expenseType === 'Software Tool' && !form.recurring
    },
    {
      type: 'textarea',
      name: 'comment',
      label: 'Comment/Remark',
      fullWidth: true,
      rows: 4,
      icon: <FiMessageSquare className="w-5 h-5 text-gray-400" />
    }
  ], [today, typeOptions]);

  const handleSubmit = async (values) => {
    const resolved = resolveExpenseTypeInput(values.expenseType);
    const isRecurring = resolved.label === 'Software Tool' && !!values.recurring && !!values.recurringMonths;
    const expenseData = {
      ...values,
      expenseType: resolved.value || values.expenseType || '',
      amount: Number(values.amount) || 0,
      ...(isRecurring && {
        recurring: true,
        recurringMonths: (RECURRING_PERIOD_FORM_OPTIONS.find(opt => opt.label === values.recurringMonths)?.value ?? Number(values.recurringMonths)) || 0
      })
    };
    if (!isRecurring) {
      delete expenseData.recurringMonths;
      delete expenseData.recurring;
    }
    await onSubmit?.(expenseData);
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      fields={fields}
      initialValues={normalizedInitialValues}
      onSubmit={handleSubmit}
      isSaving={isSaving}
    />
  );
};

export default ExpenseFormModal;
