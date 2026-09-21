import { isApproved } from '../constants/app';
import { createExpense, editExpense } from '../store/expenses/expensesSlice';
import { transactionHasBrokerageDeduction } from './availableBalance';
import {
  buildMonthlyBrokerageExpenseData,
  findExistingMonthlyBrokerage,
  monthKeyFromYmd,
  planNewMonthlyBrokerageExpense
} from './csvTransactionImport';
import { roundMoney, toNumber } from './number';
import { findLatestProjectByBrokerAndProject, matchesClientProject } from './projectLookup';

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
  brokerageValue: data.brokerageValue
});

const expenseAlreadyMatches = (existing, data) => {
  if (!existing || !data) return false;
  return (
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
  for (const plan of plans) {
    if (plan.type === 'create' && plan.data) {
      await dispatch(createExpense(plan.data)).unwrap();
    } else if (plan.type === 'update' && plan.expenseId && plan.data) {
      await dispatch(editExpense({ expenseId: plan.expenseId, expenseData: plan.data })).unwrap();
    }
  }
};

export const syncMonthlyBrokerageExpense = async (dispatch, args) => {
  await persistMonthlyBrokerageExpensePlans(dispatch, planMonthlyBrokerageExpenseSync(args));
};

export { findLatestProjectByBrokerAndProject, monthGrossForProject, monthKeyFromYmd };
