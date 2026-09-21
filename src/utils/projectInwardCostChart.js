import { isApproved } from '../constants/app';
import { filterByDateRange } from './date';
import { toNumber, roundMoney } from './number';
import { computeProjectBrokerageDollars, computeProjectTaxDollars } from './project';
import { latestProjectByIdentity, projectIdentityKey } from './projectLookup';
import { transactionNetAfterImpactFund } from './transactionNet';

/**
 * Rows for inward (approved transactions) vs project costs (brokerage $, tax $, project cost)
 * using the latest approved project row per broker + project name.
 * When dateFrom and dateTo are both set, transactions are limited to that inclusive range; otherwise all time.
 */
export function buildProjectInwardCostChartRows(projects, transactions, dateFrom = null, dateTo = null) {
  const approvedProjects = (projects || []).filter(isApproved).filter((p) => {
    const c = (p.client || '').trim();
    const pr = (p.project || '').trim();
    return c && pr;
  });
  const latestByKey = latestProjectByIdentity(approvedProjects);

  let txList = (transactions || []).filter(isApproved);
  if (dateFrom && dateTo) {
    txList = filterByDateRange(txList, dateFrom, dateTo, (t) => t.date);
  }

  const inwardByKey = new Map();
  for (const t of txList) {
    const c = (t.client || '').trim();
    const pr = (t.project || '').trim();
    if (!c || !pr) continue;
    const k = projectIdentityKey(c, pr);
    inwardByKey.set(k, (inwardByKey.get(k) || 0) + transactionNetAfterImpactFund(t));
  }

  const keys = new Set(latestByKey.keys());
  const rows = [];
  for (const k of keys) {
    const inward = inwardByKey.get(k) || 0;
    const p = latestByKey.get(k);
    let brokerage = 0;
    let tax = 0;
    let projectCost = 0;
    if (p) {
      brokerage = roundMoney(computeProjectBrokerageDollars(p));
      tax = roundMoney(computeProjectTaxDollars(p));
      const pc = p.projectCost;
      projectCost = pc === '' || pc == null ? 0 : roundMoney(toNumber(pc));
    }
    const costTotal = brokerage + tax + projectCost;
    if (inward <= 0 && costTotal <= 0) continue;
    rows.push({
      key: k,
      label: [p?.client, p?.project].filter(Boolean).join(' – ') || 'Other',
      inward,
      brokerage,
      tax,
      projectCost,
      costTotal
    });
  }

  rows.sort(
    (a, b) =>
      Math.max(b.inward, b.costTotal) - Math.max(a.inward, a.costTotal)
  );

  return rows;
}
