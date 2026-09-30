import { isApproved, ENTRY_STATUS } from '../constants/app';
import { fetchExpenses } from '../store/expenses/expensesSlice';
import { transactionHasBrokerageDeduction } from './availableBalance';
import {
  buildMonthlyBrokerageExpenseData,
  findExistingMonthlyBrokerage,
  isBrokerageExpenseRow,
  brokerageExpenseMonthKey,
  monthKeyFromYmd,
  planNewMonthlyBrokerageExpense
} from './csvTransactionImport';
import { roundMoney, toNumber } from './number';
import { findLatestProjectByBrokerAndProject, matchesClientProject } from './projectLookup';
import { normalizeDateToYYYYMMDD } from './date';
import {
  deleteExpense as deleteExpenseService,
  updateExpense as updateExpenseService,
  saveExpense as saveExpenseService
} from '../services/expenseService';

const monthGrossForProject = (
  transactions = [],
  client,
  project,
  monthKey,
  { excludeTxId = null, includeAmount = 0 } = {}
) => {
  let sum = toNumber(includeAmount);
  (transactions || []).forEach((t) => {
    if (!isApproved(t)) return;
    if (excludeTxId && t.id === excludeTxId) return;
    if (!matchesClientProject(t, client, project)) return;
    if (monthKeyFromYmd(t.date) !== monthKey) return;
    sum += toNumber(t.amount);
  });
  return sum;
};

const monthBrokerageSum = (
  transactions = [],
  client,
  project,
  monthKey,
  { excludeTxId = null, include = null } = {}
) => {
  let sum = 0;
  (transactions || []).forEach((t) => {
    if (excludeTxId && t.id === excludeTxId) return;
    if (!matchesClientProject(t, client, project)) return;
    if (monthKeyFromYmd(t.date) !== monthKey) return;
    sum += toNumber(t.brokerageAmount);
  });
  if (
    include &&
    matchesClientProject(include, client, project) &&
    monthKeyFromYmd(include.date) === monthKey
  ) {
    sum += toNumber(include.brokerageAmount);
  }
  return roundMoney(sum);
};

const expenseUpdateFields = (data) => ({
  expenseName: data.expenseName,
  date: data.date,
  expenseType: data.expenseType,
  amount: data.amount,
  comment: data.comment,
  client: data.client,
  project: data.project,
  monthKey: data.monthKey,
  isMonthlyBrokerage: true,
  brokerageType: data.brokerageType,
  brokerageValue: data.brokerageValue,
  status: ENTRY_STATUS.APPROVED
});

const expenseAlreadyMatches = (existing, data) => {
  if (!existing || !data) return false;
  const statusOk =
    existing.status === ENTRY_STATUS.APPROVED ||
    existing.status === undefined ||
    existing.status === null;
  return (
    statusOk &&
    roundMoney(existing.amount) === roundMoney(data.amount) &&
    String(existing.brokerageType || '') === String(data.brokerageType || '') &&
    toNumber(existing.brokerageValue) === toNumber(data.brokerageValue)
  );
};

const bucketKey = (client, project, monthKey) =>
  `${String(client || '').trim().toLowerCase()}|${String(project || '').trim().toLowerCase()}|${monthKey}`;

/**
 * Create a monthly brokerage expense if missing (same as CSV import).
 * Returns the expense payload created, or null.
 */
export const buildMonthlyBrokerageExpenseIfNeeded = ({
  transactionData,
  projects = [],
  transactions = [],
  expenses = [],
  excludeTxId = null,
  createdBy = null
}) => {
  const client = transactionData?.client;
  const project = transactionData?.project;
  const projectRow = findLatestProjectByBrokerAndProject(projects, client, project);
  const monthKey = monthKeyFromYmd(transactionData?.date);
  if (!projectRow || !monthKey) return null;

  // Brokerage on the transaction is already removed from inward — do not also book an expense.
  if (transactionHasBrokerageDeduction(transactionData)) return null;

  const monthGross = monthGrossForProject(transactions, client, project, monthKey, {
    excludeTxId,
    includeAmount: transactionData?.amount
  });

  // Manual add/edit: honor the transaction form. 0% must not create a project-rate expense.
  const txType = transactionData?.brokerageType;
  const txVal = transactionData?.brokerageValue;
  const effectiveProject = {
    ...projectRow,
    brokerageType: txType || projectRow.brokerageType,
    brokerageValue: txVal !== undefined && txVal !== null ? txVal : projectRow.brokerageValue
  };

  return planNewMonthlyBrokerageExpense({
    client,
    project,
    date: transactionData.date,
    projectRow: effectiveProject,
    expenses,
    monthGrossAmount: monthGross,
    createdBy
  });
};

const planForBrokerageBucket = ({
  client,
  project,
  monthKey,
  dateHint,
  transactionData,
  previousTransaction,
  projects,
  transactions,
  expenses,
  excludeTxId,
  createdBy
}) => {
  const existing = findExistingMonthlyBrokerage(expenses, { client, project, monthKey });
  const replacement =
    transactionData &&
    matchesClientProject(transactionData, client, project) &&
    monthKeyFromYmd(transactionData.date) === monthKey
      ? transactionData
      : null;
  const prevMatches =
    previousTransaction &&
    matchesClientProject(previousTransaction, client, project) &&
    monthKeyFromYmd(previousTransaction.date) === monthKey;

  const sum = monthBrokerageSum(transactions, client, project, monthKey, {
    excludeTxId,
    include: replacement
  });
  const syncFromTransaction =
    transactionHasBrokerageDeduction(replacement) ||
    (prevMatches && transactionHasBrokerageDeduction(previousTransaction));

  if (syncFromTransaction) {
    const source = replacement || previousTransaction;
    const data = buildMonthlyBrokerageExpenseData({
      client,
      project,
      monthKey,
      amount: sum,
      brokerageType: source?.brokerageType || 'percentage',
      brokerageValue: source?.brokerageValue ?? '',
      createdBy,
      date: source?.date || dateHint
    });
    if (existing) {
      if (expenseAlreadyMatches(existing, data)) return null;
      return { type: 'update', expenseId: existing.id, data: expenseUpdateFields(data) };
    }
    if (sum > 0) return { type: 'create', data };
    return null;
  }

  const createData = buildMonthlyBrokerageExpenseIfNeeded({
    transactionData: replacement || { client, project, date: dateHint },
    projects,
    transactions,
    expenses,
    excludeTxId,
    createdBy
  });
  return createData ? { type: 'create', data: createData } : null;
};

/** Create or update the matching monthly brokerage expense after a transaction save. */
export const planMonthlyBrokerageExpenseSync = ({
  transactionData,
  previousTransaction = null,
  projects = [],
  transactions = [],
  expenses = [],
  excludeTxId = null,
  createdBy = null
} = {}) => {
  const plans = [];
  const seen = new Set();

  const addBucket = (row) => {
    const client = row?.client;
    const project = row?.project;
    const monthKey = monthKeyFromYmd(row?.date);
    if (!client || !project || !monthKey) return;
    const key = bucketKey(client, project, monthKey);
    if (seen.has(key)) return;
    seen.add(key);
    const plan = planForBrokerageBucket({
      client,
      project,
      monthKey,
      dateHint: row.date,
      transactionData,
      previousTransaction,
      projects,
      transactions,
      expenses,
      excludeTxId,
      createdBy
    });
    if (plan) plans.push(plan);
  };

  addBucket(transactionData);
  addBucket(previousTransaction);
  return plans;
};

export const persistMonthlyBrokerageExpensePlans = async (dispatch, plans = []) => {
  if (!plans.length) return;
  // Write directly (no per-row refetch) so callers can't race on expenses.length mid-loop.
  for (const plan of plans) {
    if (plan.type === 'create' && plan.data) {
      await saveExpenseService(plan.data);
    } else if (plan.type === 'update' && plan.expenseId && plan.data) {
      await updateExpenseService(plan.expenseId, plan.data);
    }
  }
  await dispatch(fetchExpenses({ force: true }));
};

export const syncMonthlyBrokerageExpense = async (dispatch, args) => {
  await persistMonthlyBrokerageExpensePlans(dispatch, planMonthlyBrokerageExpenseSync(args));
};

/**
 * Ensure every client/project/month with transaction brokerage has a matching
 * Brokerage expense row (so the Brokerage page matches transaction totals).
 */
export const planReconcileMonthlyBrokerageFromTransactions = ({
  transactions = [],
  expenses = [],
  createdBy = null
} = {}) => {
  const buckets = new Map();

  (transactions || []).forEach((t) => {
    if (!isApproved(t)) return;
    const amount = toNumber(t.brokerageAmount);
    if (amount <= 0) return;
    const client = t.client;
    const project = t.project;
    const monthKey = monthKeyFromYmd(t.date);
    if (!client || !project || !monthKey) return;
    const key = bucketKey(client, project, monthKey);
    const prev = buckets.get(key) || {
      client,
      project,
      monthKey,
      date: t.date,
      sum: 0,
      brokerageType: t.brokerageType || 'percentage',
      brokerageValue: t.brokerageValue ?? ''
    };
    prev.sum = roundMoney(prev.sum + amount);
    const prevDate = normalizeDateToYYYYMMDD(prev.date) || '';
    const nextDate = normalizeDateToYYYYMMDD(t.date) || '';
    if (nextDate && nextDate >= prevDate) {
      prev.date = t.date;
      prev.brokerageType = t.brokerageType || prev.brokerageType;
      prev.brokerageValue = t.brokerageValue ?? prev.brokerageValue;
    }
    buckets.set(key, prev);
  });

  const plans = [];
  for (const b of buckets.values()) {
    const existing = findExistingMonthlyBrokerage(expenses, {
      client: b.client,
      project: b.project,
      monthKey: b.monthKey
    });
    const data = buildMonthlyBrokerageExpenseData({
      client: b.client,
      project: b.project,
      monthKey: b.monthKey,
      amount: b.sum,
      brokerageType: b.brokerageType,
      brokerageValue: b.brokerageValue,
      createdBy,
      date: b.date
    });
    if (existing) {
      if (expenseAlreadyMatches(existing, data)) continue;
      plans.push({ type: 'update', expenseId: existing.id, data: expenseUpdateFields(data) });
    } else if (b.sum > 0) {
      plans.push({ type: 'create', data });
    }
  }
  return plans;
};

export const reconcileMonthlyBrokerageFromTransactions = async (dispatch, args) => {
  await persistMonthlyBrokerageExpensePlans(
    dispatch,
    planReconcileMonthlyBrokerageFromTransactions(args)
  );
};

/**
 * Remove duplicate monthly brokerage rows created by a raced backfill.
 * Keeps one row per client/project/month (prefer approved), deletes the rest.
 * Approves every kept monthly brokerage row that is still pending.
 */
export const planCleanupDuplicateMonthlyBrokerageExpenses = (expenses = []) => {
  const byBucket = new Map();
  (expenses || []).forEach((e) => {
    if (!isBrokerageExpenseRow(e)) return;
    const monthKey = brokerageExpenseMonthKey(e);
    if (!monthKey || !e.client || !e.project || !e.id) return;
    const key = bucketKey(e.client, e.project, monthKey);
    if (!byBucket.has(key)) byBucket.set(key, []);
    byBucket.get(key).push(e);
  });

  const deleteIds = [];
  const approveIds = [];
  const keptIds = new Set();

  for (const list of byBucket.values()) {
    if (list.length === 0) continue;
    const sorted = [...list].sort((a, b) => {
      const aOk = isApproved(a) ? 1 : 0;
      const bOk = isApproved(b) ? 1 : 0;
      if (bOk !== aOk) return bOk - aOk;
      const amountDiff = toNumber(b.amount) - toNumber(a.amount);
      if (amountDiff !== 0) return amountDiff;
      return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
    });
    const keep = sorted[0];
    keptIds.add(keep.id);
    if (!isApproved(keep)) approveIds.push(keep.id);
    for (const row of sorted.slice(1)) {
      deleteIds.push(row.id);
    }
  }

  // Also approve any other pending monthly brokerage rows (no client/project key).
  (expenses || []).forEach((e) => {
    if (!e?.id || keptIds.has(e.id) || deleteIds.includes(e.id)) return;
    if (!isBrokerageExpenseRow(e) || isApproved(e)) return;
    approveIds.push(e.id);
  });

  return { deleteIds, approveIds };
};

let cleanupInFlight = null;

export const cleanupDuplicateMonthlyBrokerageExpenses = async (dispatch, expenses = []) => {
  if (cleanupInFlight) return cleanupInFlight;
  cleanupInFlight = (async () => {
    const { deleteIds, approveIds } = planCleanupDuplicateMonthlyBrokerageExpenses(expenses);
    for (const id of approveIds) {
      await updateExpenseService(id, { status: ENTRY_STATUS.APPROVED });
    }
    for (const id of deleteIds) {
      await deleteExpenseService(id);
    }
    if (deleteIds.length || approveIds.length) {
      await dispatch(fetchExpenses({ force: true }));
    }
    return { deleted: deleteIds.length, approved: approveIds.length };
  })().finally(() => {
    cleanupInFlight = null;
  });
  return cleanupInFlight;
};

export { findLatestProjectByBrokerAndProject, monthGrossForProject, monthKeyFromYmd };
