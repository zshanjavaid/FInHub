/** Expense type value (storage) -> display label */
export const EXPENSE_TYPE_LABELS = {
  rent: 'Rent',
  salaries: 'Salaries',
  general: 'General',
  brokerage: 'Brokerage',
  fh: 'FH',
  software_tool: 'Software Tool'
};

/** Display label -> value (for filter dropdown) */
export const EXPENSE_TYPE_LABEL_TO_VALUE = {
  Rent: 'rent',
  Salaries: 'salaries',
  General: 'general',
  Brokerage: 'brokerage',
  FH: 'fh',
  'Software Tool': 'software_tool'
};

/** Labels only, for FilterBar SearchableDropdown */
export const EXPENSE_TYPE_OPTIONS = ['Rent', 'Salaries', 'General', 'Brokerage', 'FH', 'Software Tool'];

/** For form modal: { value, label }[] */
export const EXPENSE_TYPE_FORM_OPTIONS = Object.entries(EXPENSE_TYPE_LABELS).map(([value, label]) => ({ value, label }));

/** Badge colors by type */
export const EXPENSE_TYPE_COLORS = {
  rent: 'bg-red-100 text-red-800',
  salaries: 'bg-blue-100 text-blue-800',
  general: 'bg-gray-100 text-gray-800',
  brokerage: 'bg-emerald-100 text-emerald-800',
  fh: 'bg-amber-100 text-amber-800',
  software_tool: 'bg-violet-100 text-violet-800'
};

/** Recurring period (months) -> display label */
export const RECURRING_MONTHS_LABELS = {
  3: '3 months',
  6: '6 months',
  12: '12 months',
  24: '24 months',
  36: '36 months'
};

/** For form modal: { value, label }[] */
export const RECURRING_PERIOD_FORM_OPTIONS = Object.entries(RECURRING_MONTHS_LABELS).map(([value, label]) => ({
  value: Number(value),
  label
}));
