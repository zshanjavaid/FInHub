export const PROJECT_INACTIVE_REASON_OPTIONS = [
  { value: 'Conversion Failure', label: 'Conversion Failure' },
  { value: 'Identity Failure', label: 'Identity Failure' },
  { value: 'Incompetency', label: 'Incompetency' },
  { value: 'Unable to Extend', label: 'Unable to Extend' },
  { value: 'Team Sacked', label: 'Team Sacked' },
  { value: 'IP Leak', label: 'IP Leak' },
  { value: 'Ended Before', label: 'Ended Before' },
  { value: 'Other', label: 'Other' }
];

export const PROJECT_INACTIVE_REASON_VALUES = PROJECT_INACTIVE_REASON_OPTIONS.map((o) => o.value);

/** Badge colors per completed reason (Projects table, Insights). */
export const PROJECT_INACTIVE_REASON_BADGE_CLASS = {
  'Conversion Failure': 'bg-orange-50 text-orange-800 border-orange-200/80',
  'Identity Failure': 'bg-rose-50 text-rose-800 border-rose-200/80',
  Incompetency: 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200/80',
  'Unable to Extend': 'bg-sky-50 text-sky-800 border-sky-200/80',
  'Team Sacked': 'bg-red-50 text-red-800 border-red-200/80',
  'IP Leak': 'bg-violet-50 text-violet-800 border-violet-200/80',
  'Ended Before': 'bg-stone-100 text-stone-800 border-stone-200/80',
  Other: 'bg-slate-100 text-slate-700 border-slate-200/80',
  Unspecified: 'bg-amber-50 text-amber-800 border-amber-200/80'
};

const DEFAULT_REASON_BADGE_CLASS = 'bg-amber-50 text-amber-800 border-amber-200/80';

export const inactiveReasonBadgeClass = (reason = '') =>
  PROJECT_INACTIVE_REASON_BADGE_CLASS[String(reason || '').trim()] || DEFAULT_REASON_BADGE_CLASS;

/** Split stored reason into form dropdown + optional Other text. */
export const inactiveReasonToFormValues = (storedReason = '') => {
  const reason = String(storedReason || '').trim();
  if (!reason) return { inactiveReason: '', inactiveReasonOther: '' };
  if (PROJECT_INACTIVE_REASON_VALUES.includes(reason) && reason !== 'Other') {
    return { inactiveReason: reason, inactiveReasonOther: '' };
  }
  return { inactiveReason: 'Other', inactiveReasonOther: reason === 'Other' ? '' : reason };
};
