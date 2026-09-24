import { getPrivacyHidden, PRIVACY_MASK } from '../privacy/privacyStore';

/**
 * Format amount for display: no decimals when whole number, otherwise 2 decimals.
 * When privacy mode is on, returns a mask so callers cannot leak balances.
 */
export const formatMoney = (v) => {
  if (getPrivacyHidden()) return PRIVACY_MASK;
  const n = Number(v);
  if (!Number.isFinite(n)) return '-';
  if (Number.isInteger(n) || Math.abs(n % 1) < 1e-9) return `$${Math.round(n)}`;
  return `$${n.toFixed(2)}`;
};

export const signedMoneyClass = (v, positiveClass = 'text-primary-600') => {
  if (getPrivacyHidden()) return 'text-slate-500';
  const n = Number(v);
  return Number.isFinite(n) && n < 0 ? 'text-red-600' : positiveClass;
};
