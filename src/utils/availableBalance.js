import { monthKeyFromYmd } from './csvTransactionImport';

const norm = (s) => String(s || '').trim().toLowerCase();

export const isBrokerageExpenseRow = (expense) =>
  !!expense?.isMonthlyBrokerage || String(expense?.expenseType || '').toLowerCase() === 'brokerage';

/** Brokerage already taken off inward (transaction net). */
export const transactionHasBrokerageDeduction = (t) => {
  const amt = Number(t?.brokerageAmount);
  if (Number.isFinite(amt) && amt > 0) return true;
  const val = Number(t?.brokerageValue);
  return Number.isFinite(val) && val > 0;
};

/**
 * Count an expense toward Available Amount only if it is not the same
 * brokerage already deducted on a matching transaction.
 */
export const expenseCountsTowardAvailable = (expense, transactions = []) => {
  if (!isBrokerageExpenseRow(expense)) return true;
  const monthKey = monthKeyFromYmd(expense.date) || String(expense.monthKey || '').slice(0, 7);
  if (!monthKey) return true;
  const client = norm(expense.client);
  const project = norm(expense.project);
  const alreadyDeducted = (transactions || []).some((t) => {
    if (!transactionHasBrokerageDeduction(t)) return false;
    if (monthKeyFromYmd(t.date) !== monthKey) return false;
    if (client && norm(t.client) !== client) return false;
    if (project && norm(t.project) !== project) return false;
    return true;
  });
  return !alreadyDeducted;
};

export const expenseAmountTowardAvailable = (expense, transactions = []) =>
  expenseCountsTowardAvailable(expense, transactions) ? Number(expense.amount) || 0 : 0;
