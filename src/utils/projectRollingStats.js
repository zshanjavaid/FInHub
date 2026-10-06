import { addMonths, startOfDay, format, parseISO } from 'date-fns';
import { getCalendarMonthRange, getPreviousMonthRange, normalizeDateToYYYYMMDD, todayLocalYmd } from './date';
import { isApproved } from '../constants/app';
import { isFreelanceProject } from '../constants/projectTypes';
import { projectInactiveEventYmd } from './transactionsEligibility';

const inRange = (ymd, start, end) => Boolean(ymd && start && end && ymd >= start && ymd <= end);

const projectDisplayName = (p) => {
  const name = String(p?.project || '').trim();
  if (name) return name;
  const client = String(p?.client || '').trim();
  return client || 'Unnamed';
};

const listCurrentWindow = (projects, currStartYmd, currEndYmd) => {
  const onboardProjects = [];
  const endedProjects = [];
  for (const p of projects) {
    const onboard = normalizeDateToYYYYMMDD(p.date);
    const ended = projectInactiveEventYmd(p);
    if (inRange(onboard, currStartYmd, currEndYmd)) {
      onboardProjects.push({
        id: p.id || `${projectDisplayName(p)}-onboard-${onboard}`,
        name: projectDisplayName(p),
        date: onboard
      });
    }
    if (inRange(ended, currStartYmd, currEndYmd)) {
      endedProjects.push({
        id: p.id || `${projectDisplayName(p)}-ended-${ended}`,
        name: projectDisplayName(p),
        date: ended
      });
    }
  }
  onboardProjects.sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));
  endedProjects.sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));
  return {
    onboardCurr: onboardProjects.length,
    endedCurr: endedProjects.length,
    onboardProjects,
    endedProjects
  };
};

const formatRangeLabel = (fromYmd, toYmd) => {
  if (!fromYmd || !toYmd) return '';
  try {
    const start = parseISO(fromYmd);
    const end = parseISO(toYmd);
    if (fromYmd.slice(0, 7) === toYmd.slice(0, 7)) {
      return format(end, 'MMM yyyy');
    }
    if (fromYmd.slice(0, 4) === toYmd.slice(0, 4)) {
      return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
    }
    return `${format(start, 'MMM d, yyyy')} – ${format(end, 'MMM d, yyyy')}`;
  } catch {
    return `${fromYmd} – ${toYmd}`;
  }
};

/** Short tab presets for project activity windows. */
export const ACTIVITY_WINDOW_PRESETS = [
  { id: 'current', label: 'Current' },
  { id: 'last', label: 'Last' },
  { id: '3m', label: '3 Month' },
  { id: '6m', label: '6 Month' },
  { id: '1y', label: '1 Year' }
];

/**
 * @param {'current'|'last'|'3m'|'6m'|'1y'} [windowId]
 * @returns {{ from: string, to: string }}
 */
export const resolveActivityWindowRange = (windowId = '3m', now = new Date()) => {
  const today = startOfDay(now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date());
  const todayYmd = todayLocalYmd(today);
  const y = today.getFullYear();
  const m = today.getMonth() + 1;

  if (windowId === 'current') {
    const { from, to } = getCalendarMonthRange(y, m);
    return { from, to: todayYmd && todayYmd < to ? todayYmd : to };
  }

  if (windowId === 'last') {
    return getPreviousMonthRange(today);
  }

  const monthsBack = windowId === '6m' ? 6 : windowId === '1y' ? 12 : 3;
  return {
    from: normalizeDateToYYYYMMDD(addMonths(today, -monthsBack)),
    to: todayYmd
  };
};

/**
 * Project activity (onboard / ended) for a selected window.
 * @param {object[]} [projects]
 * @param {'current'|'last'|'3m'|'6m'|'1y'} [windowId]
 */
export function computeRollingWindowStats(projects = [], windowId = '3m', now = new Date()) {
  const { from: currStartYmd, to: currEndYmd } = resolveActivityWindowRange(windowId, now);
  const approved = (projects || []).filter((p) => isApproved(p) && !isFreelanceProject(p));
  const window = listCurrentWindow(approved, currStartYmd, currEndYmd);
  const preset = ACTIVITY_WINDOW_PRESETS.find((p) => p.id === windowId);

  return {
    windowId,
    windowLabel: preset?.label || '3 Month',
    rangeLabel: formatRangeLabel(currStartYmd, currEndYmd),
    from: currStartYmd,
    to: currEndYmd,
    onboardCurr: window.onboardCurr,
    endedCurr: window.endedCurr,
    onboardProjects: window.onboardProjects,
    endedProjects: window.endedProjects
  };
}
