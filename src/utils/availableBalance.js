import { toNumber } from './number';

/** Brokerage already taken off inward (transaction net). */
export const transactionHasBrokerageDeduction = (t) => toNumber(t?.brokerageAmount) > 0;

export const sumExpenseAmounts = (expenses = []) =>
  (expenses || []).reduce((sum, row) => sum + toNumber(row.amount), 0);
