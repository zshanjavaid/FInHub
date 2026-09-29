import { isApproved } from '../constants/app';
import { normalizeDateToYYYYMMDD } from './date';
import { countExpectedPayoutsInRange } from './payoutSchedule';
import { isProjectEligibleForAutoGenerateMonth } from './transactionsEligibility';
import { transactionNetAfterImpactFund } from './transactionNet';
import { latestProjectByIdentity, matchesClientProject, projectIdentityKey } from './projectLookup';
import { normText, roundMoney } from './number';

const monthBounds = (year, monthIndex0) => {
  // Normalize so Jan (monthIndex0 - 1) → Dec prior year, Dec + 1 → Jan next year.
  const d = new Date(year, monthIndex0, 1);
  const y = d.getFullYear();
  const m0 = d.getMonth();
  const lastDay = new Date(y, m0 + 1, 0).getDate();
  const m = String(m0 + 1).padStart(2, '0');
  return {
    monthKey: `${y}-${m}`,
    from: `${y}-${m}-01`,
    to: `${y}-${m}-${String(lastDay).padStart(2, '0')}`
  };
};

/** Clip month end to contract end date when the project finishes mid-month. */
const rangeToWithContractEnd = (monthTo, contractEndingYmd) => {
  if (!contractEndingYmd) return monthTo;
  return contractEndingYmd < monthTo ? contractEndingYmd : monthTo;
};

/**
 * Next-month estimate (forward-looking):
 * For each project that had inward last month, take average $ per payout received,
 * then multiply by how many payouts that project is expected to get next month
 * (monthly / biweekly / weekly via countExpectedPayoutsInRange, same as auto-generate).
 *
 * End Date rules:
 * - Ends before next month starts → $0 for that project
 * - Ends mid-month → only payouts that fall on/before End Date
 * - Ends on/after month end → full expected count for the month
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

  const previousMonthTotal = prevMonthTxs.reduce((s, t) => s + transactionNetAfterImpactFund(t), 0);

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
  let estimated = 0;
  let excludedInward = 0;

  latestByKey.forEach((p, key) => {
    const prevInward = inwardByProject.get(key) || 0;
    if (prevInward <= 0) return;

    const actualPrev = countByProject.get(key) || 0;
    if (actualPrev <= 0) return;

    const contractEnd = normalizeDateToYYYYMMDD(p.contractEnding);

    // Finished before next month starts → drop that project's last-month inward.
    if (contractEnd && contractEnd < next.from) {
      excludedInward += prevInward;
      return;
    }

    if (!isProjectEligibleForAutoGenerateMonth(p, next.from, next.to)) {
      excludedInward += prevInward;
      return;
    }

    const nextTo = rangeToWithContractEnd(next.to, contractEnd);
    const nextExpected = countExpectedPayoutsInRange(p, next.from, nextTo);
    if (nextExpected <= 0) {
      excludedInward += prevInward;
      return;
    }

    const perPayout = prevInward / actualPrev;
    estimated += perPayout * nextExpected;
  });

  estimated = Math.max(0, roundMoney(estimated));

  return {
    estimated,
    previousMonthTotal: roundMoney(previousMonthTotal),
    excludedInward: roundMoney(excludedInward),
    // Kept for any older callers that still read this field.
    missingProjectsInward: roundMoney(excludedInward),
    previousMonthKey: prev.monthKey,
    nextMonthKey: next.monthKey
  };
};
