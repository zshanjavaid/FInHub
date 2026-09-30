import { useState, useCallback, useMemo } from 'react';
import {
  getYearRange,
  getCalendarMonthRange,
  getCurrentYearMonth,
  getPreviousYearMonth,
  parseYearMonth
} from '../utils/date';

const currentYear = new Date().getFullYear();

/**
 * @param {object} [options]
 * @param {'month'|'yearly'|'range'|'all'} [options.defaultMode] Initial filter mode. Defaults to `'month'`.
 * @param {boolean} [options.defaultToCurrentMonth] If true, same as starting in month view (kept for existing callers).
 * @param {boolean} [options.defaultToPreviousMonth] If true (month mode), initial `selectedMonth` is the previous calendar month.
 */
export const useDateFilter = (options = {}) => {
  const { defaultToCurrentMonth = false, defaultMode: defaultModeOpt, defaultToPreviousMonth = false } = options;

  const initialMode =
    defaultModeOpt != null && defaultModeOpt !== ''
      ? defaultModeOpt
      : defaultToCurrentMonth
        ? 'month'
        : 'month';

  const [dateMode, setDateModeState] = useState(initialMode);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(() =>
    defaultToPreviousMonth ? getPreviousYearMonth() : getCurrentYearMonth()
  );
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const setDateMode = useCallback((mode) => {
    setDateModeState(mode);
    if (mode === 'month') {
      setSelectedMonth((prev) => {
        const parsed = parseYearMonth(prev);
        if (parsed && parsed.year === selectedYear) return prev;
        const now = getCurrentYearMonth();
        const nowParsed = parseYearMonth(now);
        if (nowParsed && nowParsed.year === selectedYear) return now;
        return `${selectedYear}-01`;
      });
    }
    if (mode === 'yearly') {
      const parsed = parseYearMonth(selectedMonth);
      if (parsed) setSelectedYear(parsed.year);
    }
  }, [selectedMonth, selectedYear]);

  const clearAll = useCallback(() => {
    setDateModeState('all');
    setDateFrom('');
    setDateTo('');
    setSelectedYear(currentYear);
    setSelectedMonth(getCurrentYearMonth());
  }, []);

  const effectiveDateFrom = useMemo(() => {
    if (dateMode === 'all') return '';
    if (dateMode === 'yearly') return getYearRange(selectedYear).from;
    if (dateMode === 'month') {
      const ym = parseYearMonth(selectedMonth) ? selectedMonth : getCurrentYearMonth();
      const p = parseYearMonth(ym);
      if (!p) return '';
      return getCalendarMonthRange(p.year, p.month).from;
    }
    return dateFrom || '';
  }, [dateMode, selectedYear, selectedMonth, dateFrom]);

  const effectiveDateTo = useMemo(() => {
    if (dateMode === 'all') return '';
    if (dateMode === 'yearly') return getYearRange(selectedYear).to;
    if (dateMode === 'month') {
      const ym = parseYearMonth(selectedMonth) ? selectedMonth : getCurrentYearMonth();
      const p = parseYearMonth(ym);
      if (!p) return '';
      return getCalendarMonthRange(p.year, p.month).to;
    }
    return dateTo || '';
  }, [dateMode, selectedYear, selectedMonth, dateTo]);

  const setYearly = useCallback((year) => {
    setDateModeState('yearly');
    setSelectedYear(year);
  }, []);

  const setRange = useCallback((from, to) => {
    setDateModeState('range');
    setDateFrom(from || '');
    setDateTo(to || '');
  }, []);

  const setMonth = useCallback((ym) => {
    setDateModeState('month');
    if (ym && parseYearMonth(ym)) {
      setSelectedMonth(ym);
    } else {
      setSelectedMonth(getCurrentYearMonth());
    }
  }, []);

  return {
    dateMode,
    setDateMode,
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    clearAll,
    effectiveDateFrom,
    effectiveDateTo,
    setYearly,
    setRange,
    setMonth
  };
};
