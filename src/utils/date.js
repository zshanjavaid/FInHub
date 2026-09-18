import { addMonths } from 'date-fns';

/** Normalize date to YYYY-MM-DD (handles Firestore Timestamp, serialized timestamp, Date, string) */
export const normalizeDateToYYYYMMDD = (value) => {
  if (value == null || value === '') return '';
  if (typeof value === 'object' && typeof value.toDate === 'function') {
    const d = value.toDate();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  if (typeof value === 'object' && typeof value.seconds === 'number') {
    const d = new Date(value.seconds * 1000);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
  const str = String(value).trim();
  if (str.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) return str.slice(0, 10);
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Return { from, to } as YYYY-MM-DD for the current month */
export const getThisMonthRange = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth();
  const from = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const to = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
};

/** Return { from, to } as YYYY-MM-DD for a calendar month (month is 1–12). */
export const getCalendarMonthRange = (year, month1To12) => {
  const y = Number(year);
  const mo = Number(month1To12);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || mo < 1 || mo > 12) return { from: '', to: '' };
  const from = `${y}-${String(mo).padStart(2, '0')}-01`;
  const lastDay = new Date(y, mo, 0).getDate();
  const to = `${y}-${String(mo).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
};

/** Current month as `YYYY-MM` (for month pickers). */
export const getCurrentYearMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/** Parse `YYYY-MM` → { year, month } with month 1–12, or null. */
export const parseYearMonth = (ym) => {
  if (!ym || typeof ym !== 'string') return null;
  const [ys, ms] = ym.trim().split('-');
  const y = Number(ys);
  const m = Number(ms);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return null;
  return { year: y, month: m };
};

/** Return { from, to } as YYYY-MM-DD for the given year (Jan 1 - Dec 31) */
export const getYearRange = (year) => {
  const y = Number(year);
  if (!Number.isFinite(y)) return { from: '', to: '' };
  return {
    from: `${y}-01-01`,
    to: `${y}-12-31`
  };
};

/** Return { from, to } as YYYY-MM-DD for the previous month */
export const getPreviousMonthRange = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth();
  const prevY = m === 0 ? y - 1 : y;
  const prevM = m === 0 ? 11 : m - 1;
  const from = `${prevY}-${String(prevM + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(prevY, prevM + 1, 0).getDate();
  const to = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
};

/** Previous calendar month as `YYYY-MM`. */
export const getPreviousYearMonth = () => {
  const { from } = getPreviousMonthRange();
  return from.slice(0, 7);
};

export const getMonthRangeFromDate = (dateStr) => {
  const d = normalizeDateToYYYYMMDD(dateStr);
  if (!d) return null;
  const [y, m] = d.split('-').map(Number);
  const from = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to, year: y, month: m - 1 };
};

export const getPreviousMonthRangeFrom = (year, month) => {
  const prevY = month === 0 ? year - 1 : year;
  const prevM = month === 0 ? 11 : month - 1;
  const from = `${prevY}-${String(prevM + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(prevY, prevM + 1, 0).getDate();
  const to = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
};

/** Short month names for charts/labels */
export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Filter a list by date range (inclusive). getDate(item) should return the item's date (any format supported by normalizeDateToYYYYMMDD).
 */
export const filterByDateRange = (list, dateFrom, dateTo, getDate) => {
  if (!list || !Array.isArray(list)) return [];
  let result = list;
  if (dateFrom) {
    const from = normalizeDateToYYYYMMDD(dateFrom) || '';
    result = result.filter((item) => {
      const d = normalizeDateToYYYYMMDD(getDate(item));
      return d && d >= from;
    });
  }
  if (dateTo) {
    const to = normalizeDateToYYYYMMDD(dateTo) || '';
    result = result.filter((item) => {
      const d = normalizeDateToYYYYMMDD(getDate(item));
      return d && d <= to;
    });
  }
  return result;
};

/**
 * True when contract end date is strictly before today (end date has passed).
 */
export const isProjectPastContractEnding = (project, today = new Date()) => {
  const ymd = normalizeDateToYYYYMMDD(project?.contractEnding);
  if (!ymd) return false;
  const todayYmd = normalizeDateToYYYYMMDD(today);
  if (!todayYmd) return false;
  return todayYmd > ymd;
};

/**
 * Active (or unset) projects whose End Date has passed should become inactive.
 */
export const needsAutoInactiveStatus = (project, today = new Date()) => {
  const status = String(project?.projectStatus || 'active').trim().toLowerCase();
  if (status === 'inactive') return false;
  return isProjectPastContractEnding(project, today);
};

/**
 * Project row alert: from `monthsBefore` before contract end through the end date,
 * and for active projects stays on after end date (overdue) until end date or status changes.
 */
export const isProjectContractEndingAlert = (project, monthsBefore = 2) => {
  const ymd = normalizeDateToYYYYMMDD(project?.contractEnding);
  if (!ymd) return false;
  const today = normalizeDateToYYYYMMDD(new Date());
  if (!today) return false;
  const [y, m, d] = ymd.split('-').map(Number);
  const endDay = new Date(y, m - 1, d);
  if (Number.isNaN(endDay.getTime())) return false;
  const windowStart = addMonths(endDay, -monthsBefore);
  const wsY = windowStart.getFullYear();
  const wsM = windowStart.getMonth() + 1;
  const wsD = windowStart.getDate();
  const windowStartYmd = `${wsY}-${String(wsM).padStart(2, '0')}-${String(wsD).padStart(2, '0')}`;

  if (today < windowStartYmd) return false;

  if (today <= ymd) return true;

  // Overdue only while still effectively active (DB lag before auto-inactive)
  const status = String(project?.projectStatus || 'active').trim().toLowerCase();
  return status === 'active';
};
