import { isApproved } from '../constants/app';
import { filterByDateRange } from './date';
import { computeProjectBrokerageDollars, computeProjectTaxDollars } from './project';

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Match Transactions page chart: net before impact fund, then × 0.98. */
export const transactionNetInwardForChart = (t) => {
  const netBefore = Number.isFinite(Number(t.totalAmount))
    ? Number(t.totalAmount)
    : (Number(t.amount) || 0) - (Number(t.brokerageAmount) || 0) - (Number(t.additionalCharges) || 0);
  return netBefore * 0.98;
};

const rowKey = (client, project) =>
  `${String(client || '').trim()}|${String(project || '').trim()}`;

const labelFromKey = (key) => {
  const [c, pr] = key.split('|');
  return [c, pr].filter(Boolean).join(' – ') || 'Other';
};

const latestApprovedProjectByKey = (projects) => {
  const list = [...(projects || [])].filter(isApproved).filter((p) => {
    const c = (p.client || '').trim();
    const pr = (p.project || '').trim();
    return c && pr;
  });
  list.sort((a, b) => {
    const da = a.createdAt || a.date || '';
    const db = b.createdAt || b.date || '';
    return db.localeCompare(da);
  });
  const map = new Map();
  for (const p of list) {
    const k = rowKey(p.client, p.project);
    if (!map.has(k)) map.set(k, p);
  }
  return map;
};

/**
 * Rows for inward (approved transactions) vs project costs (brokerage $, tax $, project cost)
 * using the latest approved project row per broker + project name.
 * When dateFrom and dateTo are both set, transactions are limited to that inclusive range; otherwise all time.
 */
export function buildProjectInwardCostChartRows(projects, transactions, dateFrom = null, dateTo = null) {
  const latestByKey = latestApprovedProjectByKey(projects);

  let txList = (transactions || []).filter(isApproved);
  if (dateFrom && dateTo) {
    txList = filterByDateRange(txList, dateFrom, dateTo, (t) => t.date);
  }

  const inwardByKey = new Map();
  for (const t of txList) {
    const c = (t.client || '').trim();
    const pr = (t.project || '').trim();
    if (!c || !pr) continue;
    const k = rowKey(c, pr);
    inwardByKey.set(k, (inwardByKey.get(k) || 0) + transactionNetInwardForChart(t));
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
      brokerage = Number(computeProjectBrokerageDollars(p).toFixed(2));
      tax = Number(computeProjectTaxDollars(p).toFixed(2));
      const pc = p.projectCost;
      projectCost =
        pc === '' || pc == null ? 0 : Number(toNumber(pc).toFixed(2));
    }
    const costTotal = brokerage + tax + projectCost;
    if (inward <= 0 && costTotal <= 0) continue;
    rows.push({
      key: k,
      label: labelFromKey(k),
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
