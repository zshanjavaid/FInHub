import { toNumber, normText } from './number';
import { isBrokerageExpenseRow, brokerageExpenseMonthKey, monthKeyFromYmd } from './csvTransactionImport';

export { isBrokerageExpenseRow };

/** Brokerage already taken off inward (transaction net). */
export const transactionHasBrokerageDeduction = (t) => {
  const amt = toNumber(t?.brokerageAmount);
  if (amt > 0) return true;
  const val = toNumber(t?.brokerageValue);
  return val > 0;
};

/**
 * Count an expense toward Available Amount only if it is not the same
 * brokerage already deducted on a matching transaction.
 */
export const expenseCountsTowardAvailable = (expense, transactions = []) => {
  if (!isBrokerageExpenseRow(expense)) return true;
  const monthKey = brokerageExpenseMonthKey(expense);
  if (!monthKey) return true;
  const alreadyDeducted = (transactions || []).some((t) => {
    if (!transactionHasBrokerageDeduction(t)) return false;
    if (monthKeyFromYmd(t.date) !== monthKey) return false;
    if (normText(expense.client) && normText(t.client) !== normText(expense.client)) return false;
    if (normText(expense.project) && normText(t.project) !== normText(expense.project)) return false;
    return true;
  });
  return !alreadyDeducted;
};

export const expenseAmountTowardAvailable = (expense, transactions = []) =>
  expenseCountsTowardAvailable(expense, transactions) ? toNumber(expense.amount) : 0;
