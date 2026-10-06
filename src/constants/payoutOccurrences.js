export const PAYOUT_OCCURRENCE_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'biweekly', label: 'Semi-Monthly' },
  { value: 'weekly', label: 'Weekly' }
];

export const PAYOUT_OCCURRENCE_LABEL_BY_VALUE = PAYOUT_OCCURRENCE_OPTIONS.reduce((acc, o) => {
  acc[o.value] = o.label;
  return acc;
}, {});

/** Normalize stored / free-text payout cadence to monthly | biweekly | weekly. */
export const normalizePayoutOccurrence = (value) => {
  const key = String(value || 'biweekly').trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (key === 'weekly') return 'weekly';
  if (key === 'monthly') return 'monthly';
  // biweekly, semiweekly, semimonthly, etc.
  return 'biweekly';
};
