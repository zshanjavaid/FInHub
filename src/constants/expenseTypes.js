/** Expense type value (storage) -> display label */
export const EXPENSE_TYPE_LABELS = {
  rent: 'Rent',
  salaries: 'Salaries',
  general: 'General',
  brokerage: 'Brokerage',
  fh: 'FH',
  software_tool: 'Software Tool',
  bill: 'Bill'
};

/** Display label -> value (for filter dropdown) */
export const EXPENSE_TYPE_LABEL_TO_VALUE = {
  Rent: 'rent',
  Salaries: 'salaries',
  General: 'general',
  Brokerage: 'brokerage',
  FH: 'fh',
  'Software Tool': 'software_tool',
  Bill: 'bill'
};

/** Labels only, for FilterBar SearchableDropdown */
export const EXPENSE_TYPE_OPTIONS = [
  'Rent',
  'Salaries',
  'General',
  'Brokerage',
  'FH',
  'Software Tool',
  'Bill'
];

/** For form modal: { value, label }[] */
export const EXPENSE_TYPE_FORM_OPTIONS = Object.entries(EXPENSE_TYPE_LABELS).map(([value, label]) => ({ value, label }));

/** Badge colors by type */
export const EXPENSE_TYPE_COLORS = {
  rent: 'bg-red-100 text-red-800',
  salaries: 'bg-blue-100 text-blue-800',
  general: 'bg-gray-100 text-gray-800',
  brokerage: 'bg-emerald-100 text-emerald-800',
  fh: 'bg-amber-100 text-amber-800',
  software_tool: 'bg-violet-100 text-violet-800',
  bill: 'bg-sky-100 text-sky-800'
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

/** Slug storage value from a typed label (e.g. "Cloud Hosting" → cloud_hosting). */
export const slugifyExpenseType = (labelOrValue) => {
  const raw = String(labelOrValue || '').trim();
  if (!raw) return '';
  const lower = raw.toLowerCase();
  if (EXPENSE_TYPE_LABELS[lower]) return lower;
  const labelKey = Object.keys(EXPENSE_TYPE_LABEL_TO_VALUE).find((k) => k.toLowerCase() === lower);
  if (labelKey) return EXPENSE_TYPE_LABEL_TO_VALUE[labelKey];
  return lower
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
};

/** Human label for a stored expense type value. */
export const formatExpenseTypeLabel = (value) => {
  const key = String(value || '').trim().toLowerCase();
  if (!key) return '';
  if (EXPENSE_TYPE_LABELS[key]) return EXPENSE_TYPE_LABELS[key];
  return key
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

/**
 * Resolve typed/selected type input to { value, label }.
 * Allows new categories: typing "Utilities" → value utilities, label Utilities.
 */
export const resolveExpenseTypeInput = (input, extraLabelsByValue = {}) => {
  const raw = String(input || '').trim();
  if (!raw) return { value: '', label: '' };
  const lower = raw.toLowerCase();
  if (EXPENSE_TYPE_LABELS[lower]) {
    return { value: lower, label: EXPENSE_TYPE_LABELS[lower] };
  }
  const builtinLabel = Object.keys(EXPENSE_TYPE_LABEL_TO_VALUE).find((k) => k.toLowerCase() === lower);
  if (builtinLabel) {
    const value = EXPENSE_TYPE_LABEL_TO_VALUE[builtinLabel];
    return { value, label: EXPENSE_TYPE_LABELS[value] || builtinLabel };
  }
  const extraHit = Object.entries(extraLabelsByValue || {}).find(
    ([value, label]) => value === lower || String(label).toLowerCase() === lower
  );
  if (extraHit) {
    return { value: extraHit[0], label: extraHit[1] || formatExpenseTypeLabel(extraHit[0]) };
  }
  const value = slugifyExpenseType(raw);
  return { value, label: formatExpenseTypeLabel(value) || raw };
};

/** Unique type options from expenses + builtins (for dropdowns). */
export const collectExpenseTypeLabels = (expenses = [], { includeBuiltins = true } = {}) => {
  const byValue = new Map();
  if (includeBuiltins) {
    Object.entries(EXPENSE_TYPE_LABELS).forEach(([value, label]) => byValue.set(value, label));
  }
  (expenses || []).forEach((e) => {
    const value = slugifyExpenseType(e?.expenseType);
    if (!value) return;
    if (!byValue.has(value)) byValue.set(value, formatExpenseTypeLabel(value));
  });
  return [...byValue.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
};
