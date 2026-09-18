import { addMonths, startOfDay, format } from 'date-fns';
import { normalizeDateToYYYYMMDD } from './date';
import { isApproved } from '../constants/app';
import { projectInactiveEventYmd } from './transactionsEligibility';

const inRange = (ymd, start, end) => Boolean(ymd && start && end && ymd >= start && ymd <= end);

const countCurrentWindow = (projects, currStartYmd, currEndYmd) => {
  let onboardCurr = 0;
  let endedCurr = 0;
  for (const p of projects) {
    const onboard = normalizeDateToYYYYMMDD(p.date);
    const ended = projectInactiveEventYmd(p);
    if (inRange(onboard, currStartYmd, currEndYmd)) onboardCurr += 1;
    if (inRange(ended, currStartYmd, currEndYmd)) endedCurr += 1;
  }
  return { onboardCurr, endedCurr };
};

/**
 * Rolling 3-month window ending today (counts only; no prior-window comparison).
 */
export function computeRollingWindowStats(projects = []) {
  const today = startOfDay(new Date());
  const currStart = addMonths(today, -3);
  const currEnd = today;

  const currStartYmd = normalizeDateToYYYYMMDD(currStart);
  const currEndYmd = normalizeDateToYYYYMMDD(currEnd);

  const approved = (projects || []).filter(isApproved);
  const counts = countCurrentWindow(approved, currStartYmd, currEndYmd);

  return {
    rangeLabel: `${format(currStart, 'MMM d')} – ${format(currEnd, 'MMM d, yyyy')}`,
    onboardCurr: counts.onboardCurr,
    endedCurr: counts.endedCurr
  };
}

/** Same calendar window as rolling stats: last 3 months through today (inclusive YYYY-MM-DD). */
export function getRollingThreeMonthWindowYmd() {
  const today = startOfDay(new Date());
  const currStart = addMonths(today, -3);
  const currEnd = today;
  return {
    from: normalizeDateToYYYYMMDD(currStart),
    to: normalizeDateToYYYYMMDD(currEnd)
  };
}
