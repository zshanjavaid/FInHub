/** Coerce to a finite number, otherwise 0. */
export const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Money rounded to 2 decimal places. */
export const roundMoney = (v) => Number(toNumber(v).toFixed(2));

/** Trimmed lowercase string for identity matching. */
export const normText = (s) => String(s || '').trim().toLowerCase();
