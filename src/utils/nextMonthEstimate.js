import { isApproved } from '../constants/app';
import { normalizeDateToYYYYMMDD } from './date';
import { countExpectedPayoutsInRange } from './payoutSchedule';
import { isProjectEligibleForAutoGenerateMonth } from './transactionsEligibility';
import { transactionNetAfterImpactFund } from './transactionNet';
import { latestProjectByIdentity, matchesClientProject, projectIdentityKey } from './projectLookup';
import { normText } from './number';

const monthBounds = (year, monthIndex0) => {
  const lastDay = new Date(year, monthIndex0 + 1, 0).getDate();
  const y = String(year);
  const m = String(monthIndex0 + 1).padStart(2, '0');
  return {
    monthKey: `${y}-${m}`,
    from: `${y}-${m}-01`,
    to: `${y}-${m}-${String(lastDay).padStart(2, '0')}`
  };
};

/**
 * Next-month estimate = previous calendar month total inward,
 * minus inward from projects that still have missing expected payouts
 * (weekly=4 / biweekly=2 / monthly=1 via countExpectedPayoutsInRange).
 */
export const computeNextMonthEstimatedAmount = ({
  projects = [],
  transactions = [],
  selectedBroker = '',
  selectedProject = null,
  now = new Date()
} = {}) => {
  const ref = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  const prev = monthBounds(ref.getFullYear(), ref.getMonth() - 1);
  const next = monthBounds(ref.getFullYear(), ref.getMonth() + 1);

  let txs = (transactions || []).filter(isApproved);
  if (selectedProject) {
    txs = txs.filter((t) => matchesClientProject(t, selectedProject.client, selectedProject.project));
  } else if (selectedBroker) {
    const b = normText(selectedBroker);
    txs = txs.filter((t) => normText(t.client) === b);
  }

  const prevMonthTxs = txs.filter((t) => {
    const ymd = normalizeDateToYYYYMMDD(t.date);
    return ymd && ymd >= prev.from && ymd <= prev.to;
  });

  const prevMonthTotal = prevMonthTxs.reduce((s, t) => s + transactionNetAfterImpactFund(t), 0);

  const inwardByProject = new Map();
  const countByProject = new Map();
  prevMonthTxs.forEach((t) => {
    const key = projectIdentityKey(t.client, t.project);
    inwardByProject.set(key, (inwardByProject.get(key) || 0) + transactionNetAfterImpactFund(t));
    countByProject.set(key, (countByProject.get(key) || 0) + 1);
  });

  let projectsList = projects || [];
  if (selectedProject) {
    projectsList = projectsList.filter((p) =>
      matchesClientProject(p, selectedProject.client, selectedProject.project)
    );
  } else if (selectedBroker) {
    const b = normText(selectedBroker);
    projectsList = projectsList.filter((p) => normText(p.client) === b);
  }

  const latestByKey = latestProjectByIdentity(projectsList);
  let missingProjectsInward = 0;

  latestByKey.forEach((p, key) => {
    if (!isProjectEligibleForAutoGenerateMonth(p, prev.from, prev.to)) return;
    const expected = countExpectedPayoutsInRange(p, prev.from, prev.to);
    if (expected <= 0) return;
    const actual = countByProject.get(key) || 0;
    const missing = Math.max(0, expected - actual);
    if (missing <= 0) return;
    missingProjectsInward += inwardByProject.get(key) || 0;
  });

  const estimated = Math.max(0, Number((prevMonthTotal - missingProjectsInward).toFixed(2)));

  return {
    estimated,
    previousMonthTotal: Number(prevMonthTotal.toFixed(2)),
    missingProjectsInward: Number(missingProjectsInward.toFixed(2)),
    previousMonthKey: prev.monthKey,
    nextMonthKey: next.monthKey
  };
};
