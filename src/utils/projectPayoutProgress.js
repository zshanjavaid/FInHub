import { isApproved } from '../constants/app';
import { getCalendarMonthRange, normalizeDateToYYYYMMDD, todayLocalYmd } from './date';
import { matchesClientProject } from './projectLookup';
import { countExpectedPayoutsInRange } from './payoutSchedule';

/** Approved transactions for a project inside [from, to] (YYYY-MM-DD). */
export const countReceivedPayoutsInRange = (transactions = [], project, rangeFrom, rangeTo) => {
  const from = normalizeDateToYYYYMMDD(rangeFrom);
  const to = normalizeDateToYYYYMMDD(rangeTo);
  if (!from || !to) return 0;
  const client = project?.client;
  const name = project?.project;
  if (!client || !name) return 0;

  let count = 0;
  (transactions || []).forEach((t) => {
    if (!isApproved(t)) return;
    if (!matchesClientProject(t, client, name)) return;
    const ymd = normalizeDateToYYYYMMDD(t.date);
    if (!ymd || ymd < from || ymd > to) return;
    count += 1;
  });
  return count;
};

/** Month window for payout progress, or project start → end for "all". */
export const resolvePayoutProgressRange = (project, mode = 'month', monthKey = '') => {
  if (mode === 'all') {
    const from = normalizeDateToYYYYMMDD(project?.date);
    const endRaw = normalizeDateToYYYYMMDD(project?.contractEnding);
    const to = endRaw || todayLocalYmd();
    if (!from || !to || from > to) return { from: '', to: '' };
    return { from, to };
  }

  const mk = String(monthKey || '').slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(mk)) return { from: '', to: '' };
  const [y, m] = mk.split('-').map(Number);
  return getCalendarMonthRange(y, m);
};

/**
 * @returns {{ received: number, expected: number, label: string }}
 */
export const getProjectPayoutProgress = (
  project,
  transactions = [],
  { mode = 'month', monthKey = '' } = {}
) => {
  const { from, to } = resolvePayoutProgressRange(project, mode, monthKey);
  if (!from || !to) {
    return { received: 0, expected: 0, label: '—' };
  }

  const expected = countExpectedPayoutsInRange(project, from, to);
  const received = countReceivedPayoutsInRange(transactions, project, from, to);

  if (expected <= 0 && received <= 0) {
    return { received: 0, expected: 0, label: '—' };
  }

  return {
    received,
    expected,
    label: `${received}/${expected}`
  };
};
