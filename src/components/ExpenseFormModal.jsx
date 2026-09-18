import { useMemo } from 'react';
import FormModal from './FormModal';
import { FiFileText, FiDollarSign, FiMessageSquare, FiCalendar } from 'react-icons/fi';
import { EXPENSE_TYPE_FORM_OPTIONS, RECURRING_PERIOD_FORM_OPTIONS } from '../constants/expenseTypes';
import { todayLocalYmd } from '../utils/date';

const defaultForm = {
  expenseName: '',
  date: '',
  expenseType: '',
  amount: '',
  comment: '',
  recurring: false,
  recurringMonths: ''
};

const ExpenseFormModal = ({
  isOpen,
  onClose,
  title,
  initialValues = defaultForm,
  onSubmit,
  isSaving = false
}) => {
  const today = todayLocalYmd();
  const normalizedInitialValues = {
    ...defaultForm,
    ...(initialValues || {}),
    date: (initialValues && initialValues.date) ? initialValues.date : today
  };

  const fields = useMemo(() => [
    {
      type: 'text',
      name: 'expenseName',
      label: 'Expense Name',
      icon: <FiFileText className="w-5 h-5 text-gray-400" />
    },
    {
      type: 'date',
      name: 'date',
      label: 'Date',
      defaultValue: today
    },
    {
      type: 'searchable-dropdown',
      name: 'expenseType',
      label: 'Type of Expense',
      options: EXPENSE_TYPE_FORM_OPTIONS.map(opt => opt.label),
      placeholder: 'Type or select expense type...',
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
      options: RECURRING_PERIOD_FORM_OPTIONS.map(opt => opt.label),
      placeholder: 'Type or select period...',
      icon: <FiCalendar className="w-5 h-5 text-gray-400" />,
      showWhen: (form) => form.expenseType === 'Software Tool' && !!form.recurring
    },
    {
      type: 'number',
      name: 'amount',
      label: 'Expense Amount',
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
  ], [today]);

  const handleSubmit = async (values) => {
    const selectedOption = EXPENSE_TYPE_FORM_OPTIONS.find(opt => opt.label === values.expenseType);
    const isRecurring = values.expenseType === 'Software Tool' && !!values.recurring && !!values.recurringMonths;
    const expenseData = {
      ...values,
      expenseType: selectedOption ? selectedOption.value : values.expenseType || '',
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
