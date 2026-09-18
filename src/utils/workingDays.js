import { normalizeDateToYYYYMMDD, getCalendarMonthRange } from './date';

/** Parse YYYY-MM-DD as local calendar date (avoids UTC shift). */
const parseYmdLocal = (ymd) => {
  const s = normalizeDateToYYYYMMDD(ymd);
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return dt;
};

const toYmdLocal = (dt) => {
  if (!(dt instanceof Date) || Number.isNaN(dt.getTime())) return '';
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** Mon–Fri only (0=Sun … 6=Sat). */
export const isWeekday = (dt) => {
  if (!(dt instanceof Date) || Number.isNaN(dt.getTime())) return false;
  const day = dt.getDay();
  return day >= 1 && day <= 5;
};

/** First Mon–Fri on or after ymd (e.g. Sat/Sun start → next Monday). */
export const firstWeekdayOnOrAfter = (ymd) => {
  const dt = parseYmdLocal(ymd);
  if (!dt) return '';
  const cur = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  for (let i = 0; i < 7; i += 1) {
    if (isWeekday(cur)) return toYmdLocal(cur);
    cur.setDate(cur.getDate() + 1);
  }
  return '';
};

/** Last Mon–Fri on or before ymd (e.g. Sat 30th end → Fri 29th). */
export const lastWeekdayOnOrBefore = (ymd) => {
  const dt = parseYmdLocal(ymd);
  if (!dt) return '';
  const cur = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  for (let i = 0; i < 7; i += 1) {
    if (isWeekday(cur)) return toYmdLocal(cur);
    cur.setDate(cur.getDate() - 1);
  }
  return '';
};

/** Inclusive Mon–Fri count between two YYYY-MM-DD dates. */
export const countWeekdaysInclusive = (fromYmd, toYmd) => {
  const from = parseYmdLocal(fromYmd);
  const to = parseYmdLocal(toYmd);
  if (!from || !to || from > to) return 0;
  let count = 0;
  const cur = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  while (cur <= end) {
    if (isWeekday(cur)) count += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
};

/**
 * Active Mon–Fri span for a project inside a calendar month (YYYY-MM).
 * - Start weekend → next Monday
 * - End weekend → previous Friday
 * Returns null if no overlapping weekdays.
 */
export const getProjectWeekdaySpanInMonth = (project, monthKey) => {
  const mk = String(monthKey || '').slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(mk)) return null;
  const [ys, ms] = mk.split('-').map(Number);
  const { from: monthFrom, to: monthTo } = getCalendarMonthRange(ys, ms);
  if (!monthFrom || !monthTo) return null;

  const startYmd = normalizeDateToYYYYMMDD(project?.date);
  const endYmd = normalizeDateToYYYYMMDD(project?.contractEnding);

  let rangeFrom = monthFrom;
  let rangeTo = monthTo;
  if (startYmd && startYmd > rangeFrom) rangeFrom = startYmd;
  if (endYmd && endYmd < rangeTo) rangeTo = endYmd;
  if (rangeFrom > rangeTo) return null;

  const from = firstWeekdayOnOrAfter(rangeFrom);
  const to = lastWeekdayOnOrBefore(rangeTo);
  if (!from || !to || from > to) return null;
  // Stay inside the month after weekend snap
  if (from < monthFrom || from > monthTo) return null;
  if (to < monthFrom || to > monthTo) return null;
  if (from > to) return null;

  return { from, to, monthFrom, monthTo };
};

/**
 * Prorate a full-month fixed fee by Mon–Fri days worked in that month.
 * fee × (weekdays active in month ÷ weekdays in full month)
 */
export const prorateFixedAmountForMonth = (project, monthKey, fullMonthAmount) => {
  const full = Number(fullMonthAmount);
  if (!Number.isFinite(full) || full <= 0) return 0;

  const span = getProjectWeekdaySpanInMonth(project, monthKey);
  if (!span) return 0;

  const monthWeekdays = countWeekdaysInclusive(span.monthFrom, span.monthTo);
  if (monthWeekdays <= 0) return 0;

  const activeWeekdays = countWeekdaysInclusive(span.from, span.to);
  if (activeWeekdays <= 0) return 0;
  if (activeWeekdays >= monthWeekdays) return Number(full.toFixed(2));

  return Number(((full * activeWeekdays) / monthWeekdays).toFixed(2));
};
