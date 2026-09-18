const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const IMPACT_FUND_RATE = 0.02;

/** Net before Impact Fund (stored totalAmount, or amount − brokerage − additional). */
export const transactionNetBeforeImpactFund = (t) => {
  if (t?.totalAmount !== undefined && t?.totalAmount !== null && Number.isFinite(Number(t.totalAmount))) {
    return toNumber(t.totalAmount);
  }
  return toNumber(t?.amount) - toNumber(t?.brokerageAmount) - toNumber(t?.additionalCharges);
};

/** 2% of net before Impact Fund. */
export const transactionImpactFundAmount = (t) => {
  const net = transactionNetBeforeImpactFund(t);
  if (!Number.isFinite(net) || net <= 0) return 0;
  return Number((net * IMPACT_FUND_RATE).toFixed(2));
};

/**
 * Net after Impact Fund — same as Transactions table Total (Net).
 * Prefer this for dashboard / monthly totals that should match the table.
 */
export const transactionNetAfterImpactFund = (t) => {
  const before = transactionNetBeforeImpactFund(t);
  return Number((before - transactionImpactFundAmount(t)).toFixed(2));
};
