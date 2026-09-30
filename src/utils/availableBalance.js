import { isApproved } from '../constants/app';
import { toNumber } from './number';
import { isBrokerageExpenseRow, brokerageExpenseMonthKey, monthKeyFromYmd } from './csvTransactionImport';
import { matchesClientProject } from './projectLookup';

/** Brokerage already taken off inward (transaction net). */
export const transactionHasBrokerageDeduction = (t) => toNumber(t?.brokerageAmount) > 0;

export const sumExpenseAmounts = (expenses = []) =>
  (expenses || []).reduce((sum, row) => sum + toNumber(row.amount), 0);

/** True when this brokerage expense mirrors brokerage already taken on transactions. */
export const isMirroredTransactionBrokerageExpense = (expense, transactions = []) => {
  if (!isBrokerageExpenseRow(expense)) return false;
  const monthKey = brokerageExpenseMonthKey(expense);
  if (!monthKey) return false;
  return (transactions || []).some((t) => {
    if (!isApproved(t)) return false;
    if (toNumber(t.brokerageAmount) <= 0) return false;
    if (monthKeyFromYmd(t.date) !== monthKey) return false;
    return matchesClientProject(t, expense.client, expense.project);
  });
};

/**
 * Expense total for Available Amount: skip monthly brokerage rows that already
 * reduced Total Inward via transaction brokerageAmount (avoid double-count).
 */
export const sumExpenseAmountsForAvailable = (expenses = [], transactions = []) =>
  (expenses || []).reduce((sum, row) => {
    if (isMirroredTransactionBrokerageExpense(row, transactions)) return sum;
    return sum + toNumber(row.amount);
  }, 0);
