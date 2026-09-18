import { isApproved } from '../constants/app';
import { normalizeDateToYYYYMMDD } from './date';
import { countExpectedPayoutsInRange } from './payoutSchedule';
import { isProjectEligibleForAutoGenerateMonth } from './transactionsEligibility';
import { transactionNetAfterImpactFund } from './transactionNet';

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const projectKey = (client, project) =>
  `${String(client || '').trim().toLowerCase()}|${String(project || '').trim().toLowerCase()}`;

/** Same net inward as Dashboard Monthly Comparison / Transactions table Total (Net). */
export const transactionNetInward = (t) => transactionNetAfterImpactFund(t);

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

const latestProjectByKey = (projects = []) => {
  const map = new Map();
  (projects || []).forEach((p) => {
    const client = (p.client || '').trim();
    const name = (p.project || '').trim();
    if (!client || !name) return;
    const key = projectKey(client, name);
    const prev = map.get(key);
    if (!prev) {
      map.set(key, p);
      return;
    }
    const prevDate = prev.createdAt || prev.date || '';
    const nextDate = p.createdAt || p.date || '';
    if (String(nextDate).localeCompare(String(prevDate)) > 0) map.set(key, p);
  });
  return map;
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
    const c = (selectedProject.client || '').trim().toLowerCase();
    const p = (selectedProject.project || '').trim().toLowerCase();
    txs = txs.filter(
      (t) =>
        (t.client || '').trim().toLowerCase() === c &&
        (t.project || '').trim().toLowerCase() === p
    );
  } else if (selectedBroker) {
    const b = selectedBroker.trim().toLowerCase();
    txs = txs.filter((t) => (t.client || '').trim().toLowerCase() === b);
  }

  const prevMonthTxs = txs.filter((t) => {
    const ymd = normalizeDateToYYYYMMDD(t.date);
    return ymd && ymd >= prev.from && ymd <= prev.to;
  });

  const prevMonthTotal = prevMonthTxs.reduce((s, t) => s + transactionNetInward(t), 0);

  const inwardByProject = new Map();
  const countByProject = new Map();
  prevMonthTxs.forEach((t) => {
    const key = projectKey(t.client, t.project);
    inwardByProject.set(key, (inwardByProject.get(key) || 0) + transactionNetInward(t));
    countByProject.set(key, (countByProject.get(key) || 0) + 1);
  });

  let projectsList = projects || [];
  if (selectedProject) {
    projectsList = projectsList.filter(
      (p) =>
        (p.client || '').trim().toLowerCase() === (selectedProject.client || '').trim().toLowerCase() &&
        (p.project || '').trim().toLowerCase() === (selectedProject.project || '').trim().toLowerCase()
    );
  } else if (selectedBroker) {
    const b = selectedBroker.trim().toLowerCase();
    projectsList = projectsList.filter((p) => (p.client || '').trim().toLowerCase() === b);
  }

  const latestByKey = latestProjectByKey(projectsList);
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
