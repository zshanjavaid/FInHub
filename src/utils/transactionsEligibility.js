import { addMonths } from 'date-fns';
import { isFreelanceProject } from '../constants/projectTypes';
import { normalizeDateToYYYYMMDD } from './date';

/**
 * When the project leaves the active pool:
 * End Date if set; otherwise inactiveAt/updatedAt when marked inactive.
 */
export const projectLifecycleEndYmd = (project) => {
  const contractEnd = normalizeDateToYYYYMMDD(project?.contractEnding);
  if (contractEnd) return contractEnd;

  const status = String(project?.projectStatus || 'active').trim().toLowerCase();
  if (status !== 'inactive') return '';

  return (
    normalizeDateToYYYYMMDD(project?.inactiveAt) ||
    normalizeDateToYYYYMMDD(project?.updatedAt) ||
    ''
  );
};

/**
 * Status as of a date: Inactive if marked inactive OR End Date has passed.
 * Active until then (matches Projects table + annual chart).
 */
export const getEffectiveProjectStatus = (project, asOf = new Date()) => {
  const stored = String(project?.projectStatus || 'active').trim().toLowerCase();
  if (stored === 'inactive') return 'inactive';

  const endYmd = normalizeDateToYYYYMMDD(project?.contractEnding);
  const asOfYmd = normalizeDateToYYYYMMDD(asOf);
  if (endYmd && asOfYmd && asOfYmd > endYmd) return 'inactive';
  return 'active';
};

export const isActiveProject = (project, asOf = new Date()) =>
  getEffectiveProjectStatus(project, asOf) === 'active';

/**
 * True if the project was active at any point during [monthStart, monthEnd].
 * Active: started on/before month end, and not ended before month start.
 */
export const wasProjectActiveInMonth = (project, monthStart, monthEnd) =>
  projectStatusInMonth(project, monthStart, monthEnd) === 'active';

/**
 * Status of a project during a calendar month:
 * - 'active' — started by month end and still active after month end
 * - 'inactive' — ended on or before month end
 * - null — not started yet that month
 */
export const projectStatusInMonth = (project, monthStart, monthEnd) => {
  const startYmd = normalizeDateToYYYYMMDD(project?.date);
  const rangeStart = normalizeDateToYYYYMMDD(monthStart);
  const rangeEnd = normalizeDateToYYYYMMDD(monthEnd);
  if (!startYmd || !rangeStart || !rangeEnd) return null;
  if (startYmd > rangeEnd) return null;

  const endedYmd = projectLifecycleEndYmd(project);
  if (endedYmd && endedYmd <= rangeEnd) return 'inactive';
  return 'active';
};

/**
 * Completion / ended date (End Date preferred). Alias for chart + inactive filters.
 */
export const projectInactiveEventYmd = (project) => projectLifecycleEndYmd(project);

const projectIdentityKey = (project) =>
  `${String(project?.client || '').trim().toLowerCase()}|${String(project?.project || '').trim().toLowerCase()}`;

/**
 * Unique projects for trend counts.
 * Prefer document id so two real projects with the same broker+name are not merged
 * (that under-count caused Aug 4 + Sep 8 → 11 instead of 12).
 */
export const uniqueProjectsForTrend = (projects = []) => {
  const map = new Map();
  let fallback = 0;
  (projects || []).forEach((p) => {
    if (!p) return;
    const id = p.id != null && String(p.id).trim() !== '' ? String(p.id) : '';
    const key = id ? `id:${id}` : `tmp:${fallback++}:${projectIdentityKey(p)}`;
    map.set(key, p);
  });
  return [...map.values()];
};

/**
 * One row per broker+project (latest by createdAt/date). Use for cost charts, not headcounts.
 */
export const latestProjectsByKey = (projects = []) => {
  const map = new Map();
  (projects || []).forEach((p) => {
    const client = (p?.client || '').trim();
    const name = (p?.project || '').trim();
    if (!client || !name) return;
    const key = projectIdentityKey(p);
    const prev = map.get(key);
    if (!prev) {
      map.set(key, p);
      return;
    }
    const prevDate = String(prev.createdAt || prev.updatedAt || prev.date || '');
    const nextDate = String(p.createdAt || p.updatedAt || p.date || '');
    if (nextDate.localeCompare(prevDate) >= 0) map.set(key, p);
  });
  return [...map.values()];
};

/** True only in the calendar month the project start date falls in. */
export const wasProjectStartedInMonth = (project, monthStart, monthEnd) => {
  const startYmd = normalizeDateToYYYYMMDD(project?.date);
  const rangeStart = normalizeDateToYYYYMMDD(monthStart);
  const rangeEnd = normalizeDateToYYYYMMDD(monthEnd);
  if (!startYmd || !rangeStart || !rangeEnd) return false;
  return startYmd >= rangeStart && startYmd <= rangeEnd;
};

/** True only in the calendar month the project was marked inactive / ended. */
export const wasProjectInactivatedInMonth = (project, monthStart, monthEnd) => {
  const rangeStart = normalizeDateToYYYYMMDD(monthStart);
  const rangeEnd = normalizeDateToYYYYMMDD(monthEnd);
  if (!rangeStart || !rangeEnd) return false;
  const endedYmd = projectInactiveEventYmd(project);
  if (!endedYmd) return false;
  return endedYmd >= rangeStart && endedYmd <= rangeEnd;
};

/**
 * Projects filter (keep this simple — matches chart):
 * - Active: still active at range end (start ≤ to, End Date empty or after to)
 * - Inactive: End Date / completion falls inside [from, to]
 * - All: project existed in the range (started by to, not ended before from)
 *
 * Example: start Jan, end March → Active in Jan & Feb; Inactive/All in March; not Active in March.
 */
export const projectMatchesStatusInRange = (project, statusFilter, dateFrom, dateTo) => {
  const start = normalizeDateToYYYYMMDD(project?.date);
  const end = projectLifecycleEndYmd(project);
  const from = normalizeDateToYYYYMMDD(dateFrom);
  const to = normalizeDateToYYYYMMDD(dateTo);

  if (!from && !to) {
    const status = getEffectiveProjectStatus(project);
    if (statusFilter === 'active') return status === 'active';
    if (statusFilter === 'inactive') return status === 'inactive';
    return true;
  }

  if (!start) return false;
  if (to && start > to) return false;

  const stillActiveAtRangeEnd = Boolean(to) && (!end || end > to);
  const completedInRange =
    Boolean(end) && (!from || end >= from) && (!to || end <= to);
  const existedInRange = (!from || !end || end >= from) && (!to || start <= to);

  if (statusFilter === 'active') return stillActiveAtRangeEnd;
  if (statusFilter === 'inactive') return completedInRange;
  return existedInRange;
};

export const isProjectEligibleForAutoGenerateMonth = (project, monthStart, monthEnd) => {
  if (!project || isFreelanceProject(project)) return false;

  const startYmd = normalizeDateToYYYYMMDD(project.date);
  const rangeStart = normalizeDateToYYYYMMDD(monthStart);
  const rangeEnd = normalizeDateToYYYYMMDD(monthEnd);
  if (!startYmd || !rangeStart || !rangeEnd) return false;
  if (rangeEnd < startYmd) return false;

  const contractEnd = normalizeDateToYYYYMMDD(project.contractEnding);
  if (contractEnd && rangeStart > contractEnd) return false;

  const status = String(project.projectStatus || 'active').trim().toLowerCase();
  if (status === 'active') return true;

  if (status === 'inactive') {
    const inactiveAt = normalizeDateToYYYYMMDD(project.inactiveAt);
    if (!inactiveAt) return !contractEnd || rangeStart <= contractEnd;
    const monthKey = rangeStart.slice(0, 7);
    const inactiveMonth = inactiveAt.slice(0, 7);
    return monthKey <= inactiveMonth;
  }

  return true;
};

export const isProjectEligibleForTransactions = (project, monthsAfterInactive = 2) => {
  if (!project) return false;
  if (isFreelanceProject(project)) return false;
  const status = String(project.projectStatus || 'active').trim().toLowerCase();
  if (status === 'active') return true;
  if (status !== 'inactive') return true;

  const inactiveAt = normalizeDateToYYYYMMDD(project.inactiveAt);
  if (!inactiveAt) return false;

  const [y, m, d] = inactiveAt.split('-').map(Number);
  const inactiveDate = new Date(y, (m || 1) - 1, d || 1);
  if (Number.isNaN(inactiveDate.getTime())) return false;

  const until = addMonths(inactiveDate, monthsAfterInactive);
  const untilYmd = `${until.getFullYear()}-${String(until.getMonth() + 1).padStart(2, '0')}-${String(until.getDate()).padStart(2, '0')}`;
  const todayYmd = normalizeDateToYYYYMMDD(new Date());
  if (!todayYmd) return false;
  return todayYmd <= untilYmd;
};

