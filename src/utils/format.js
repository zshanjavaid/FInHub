import { getPrivacyHidden, maskSensitiveText } from '../privacy/privacyStore';

/**
 * Format amount for display: no decimals when whole number, otherwise 2 decimals.
 * When privacy mode is on, digits become • but length/punctuation stay so spacing
 * does not jump (works with tabular-nums / mono).
 */
export const formatMoney = (v) => {
  const n = Number(v);
  let formatted;
  if (!Number.isFinite(n)) formatted = '-';
  else if (Number.isInteger(n) || Math.abs(n % 1) < 1e-9) formatted = `$${Math.round(n)}`;
  else formatted = `$${n.toFixed(2)}`;

  return getPrivacyHidden() ? maskSensitiveText(formatted) : formatted;
};

/** Compact money for StatCards: $1.20K / $3.40M. Tables keep formatMoney. */
export const formatMoneyCompact = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) {
    return getPrivacyHidden() ? maskSensitiveText('-') : '-';
  }
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  let formatted;
  if (abs >= 1_000_000) formatted = `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  else if (abs >= 1_000) formatted = `${sign}$${(abs / 1_000).toFixed(2)}K`;
  else if (Number.isInteger(abs) || Math.abs(abs % 1) < 1e-9) formatted = `${sign}$${Math.round(abs)}`;
  else formatted = `${sign}$${abs.toFixed(2)}`;

  return getPrivacyHidden() ? maskSensitiveText(formatted) : formatted;
};

export const signedMoneyClass = (v, positiveClass = 'text-primary-600') => {
  if (getPrivacyHidden()) return 'text-slate-500';
  const n = Number(v);
  return Number.isFinite(n) && n < 0 ? 'text-red-600' : positiveClass;
};
