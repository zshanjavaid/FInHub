export const PROJECT_INACTIVE_REASON_OPTIONS = [
  { value: 'Conversion Failure', label: 'Conversion Failure' },
  { value: 'Identity Failure', label: 'Identity Failure' },
  { value: 'Unable to Extend', label: 'Unable to Extend' },
  { value: 'Team Sacked', label: 'Team Sacked' },
  { value: 'IP Leak', label: 'IP Leak' },
  { value: 'Other', label: 'Other' }
];

export const PROJECT_INACTIVE_REASON_VALUES = PROJECT_INACTIVE_REASON_OPTIONS.map((o) => o.value);

/** Split stored reason into form dropdown + optional Other text. */
export const inactiveReasonToFormValues = (storedReason = '') => {
  const reason = String(storedReason || '').trim();
  if (!reason) return { inactiveReason: '', inactiveReasonOther: '' };
  if (PROJECT_INACTIVE_REASON_VALUES.includes(reason) && reason !== 'Other') {
    return { inactiveReason: reason, inactiveReasonOther: '' };
  }
  return { inactiveReason: 'Other', inactiveReasonOther: reason === 'Other' ? '' : reason };
};
