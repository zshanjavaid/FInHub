export const PAYOUT_OCCURRENCE_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'weekly', label: 'Weekly' }
];

export const PAYOUT_OCCURRENCE_LABEL_BY_VALUE = PAYOUT_OCCURRENCE_OPTIONS.reduce((acc, o) => {
  acc[o.value] = o.label;
  return acc;
}, {});
