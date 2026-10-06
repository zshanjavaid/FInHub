import { EXPENSE_TYPE_LABELS, RECURRING_MONTHS_LABELS, formatExpenseTypeLabel } from '../constants/expenseTypes';
import { inactiveReasonToFormValues } from '../constants/projectInactiveReasons';
import { getTaxFormDefaultsFromProject } from './project';

export const EMPTY_TRANSACTION_FORM = {
  client: '',
  project: '',
  date: '',
  amount: '',
  brokerageType: 'percentage',
  brokerageValue: '',
  brokerageAmount: '',
  additionalCharges: ''
};

export const transactionToFormValues = (transaction = {}) => ({
  ...EMPTY_TRANSACTION_FORM,
  client: transaction.client || '',
  project: transaction.project || '',
  date: transaction.date || '',
  amount: transaction.amount ?? '',
  brokerageType: transaction.brokerageType || 'percentage',
  brokerageValue: transaction.brokerageValue ?? '',
  brokerageAmount: transaction.brokerageAmount ?? '',
  additionalCharges: transaction.additionalCharges ?? ''
});

export const EMPTY_EXPENSE_FORM = {
  expenseName: '',
  date: '',
  expenseType: '',
  amount: '',
  comment: '',
  recurring: false,
  recurringMonths: ''
};

export const expenseToFormValues = (expense = {}) => {
  const expenseTypeLabel =
    EXPENSE_TYPE_LABELS[expense.expenseType?.toLowerCase()] ||
    formatExpenseTypeLabel(expense.expenseType) ||
    expense.expenseType ||
    '';
  return {
    ...EMPTY_EXPENSE_FORM,
    expenseName: expense.expenseName || '',
    date: expense.date || '',
    expenseType: expenseTypeLabel,
    amount: expense.amount ?? '',
    comment: expense.comment || '',
    recurring: !!expense.recurring,
    recurringMonths: RECURRING_MONTHS_LABELS[expense.recurringMonths] ?? expense.recurringMonths ?? ''
  };
};

export const EMPTY_PROJECT_FORM = {
  client: '',
  date: '',
  project: '',
  projectType: 'Full time',
  projectStatus: 'active',
  payoutOccurrence: 'biweekly',
  totalMonthlyHours: '',
  hourlyRate: '',
  projectCost: '',
  recruiterName: '',
  lead: '',
  projectManager: '',
  contractEnding: '',
  inactiveReason: '',
  inactiveReasonOther: '',
  brokerageType: 'percentage',
  brokerageValue: '',
  taxType: 'percentage',
  taxValue: ''
};

export const projectToFormValues = (project = {}) => ({
  ...EMPTY_PROJECT_FORM,
  client: project.client || '',
  date: project.date || '',
  project: project.project || '',
  projectType: project.projectType || '',
  projectStatus: project.projectStatus || 'active',
  payoutOccurrence: project.payoutOccurrence || 'biweekly',
  totalMonthlyHours: project.totalMonthlyHours || '',
  hourlyRate: project.hourlyRate || '',
  projectCost:
    project.projectCost != null && project.projectCost !== '' ? String(project.projectCost) : '',
  recruiterName: project.recruiterName || '',
  lead: project.lead || '',
  projectManager: project.projectManager || '',
  contractEnding: project.contractEnding || '',
  ...inactiveReasonToFormValues(project.inactiveReason),
  brokerageType: project.brokerageType || 'percentage',
  brokerageValue: project.brokerageValue || '',
  ...getTaxFormDefaultsFromProject(project)
});
