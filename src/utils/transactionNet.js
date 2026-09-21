import { roundMoney, toNumber } from './number';

export const IMPACT_FUND_RATE = 0.02;
export const IMPACT_FUND_PERCENT_LABEL = `${Math.round(IMPACT_FUND_RATE * 100)}%`;

/** Amount − brokerage − additional charges (ignores stored totalAmount). */
export const netFromGrossParts = ({ amount, brokerageAmount, additionalCharges } = {}) =>
  toNumber(amount) - toNumber(brokerageAmount) - toNumber(additionalCharges);

/** Net before Impact Fund (stored totalAmount, or amount − brokerage − additional). */
export const transactionNetBeforeImpactFund = (t) => {
  if (t?.totalAmount !== undefined && t?.totalAmount !== null && Number.isFinite(Number(t.totalAmount))) {
    return toNumber(t.totalAmount);
  }
  return netFromGrossParts(t);
};

export const impactFundFromNet = (net) => {
  if (!Number.isFinite(net) || net <= 0) return 0;
  return roundMoney(net * IMPACT_FUND_RATE);
};

/** 2% of net before Impact Fund. */
export const transactionImpactFundAmount = (t) => impactFundFromNet(transactionNetBeforeImpactFund(t));

export const netAfterImpactFundFromParts = (parts) => {
  const before = netFromGrossParts(parts);
  return roundMoney(before - impactFundFromNet(before));
};

/**
 * Net after Impact Fund — same as Transactions table Total (Net).
 * Prefer this for dashboard / monthly totals that should match the table.
 */
export const transactionNetAfterImpactFund = (t) => {
  const before = transactionNetBeforeImpactFund(t);
  return roundMoney(before - impactFundFromNet(before));
};

export const sumTransactionNetAfterImpactFund = (transactions = []) =>
  (transactions || []).reduce((sum, row) => sum + transactionNetAfterImpactFund(row), 0);
