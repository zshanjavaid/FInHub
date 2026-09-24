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
 * Projects filter:
 * - Active: still running during the range
 *   · currently active (incl. red-alert / upcoming End Date) if timeline overlaps range
 *   · or historically still active at range end (End Date after `to`)
 * - Inactive: actually completed — End Date in range and no longer active
 * - All: existed in the range
 *
 * Example: start Jan, end March → Active in Jan & Feb; Inactive/All in March.
 * Red-alert (End Date within ~2 months, still active) stays under Active + All.
 */
export const projectMatchesStatusInRange = (project, statusFilter, dateFrom, dateTo) => {
  const start = normalizeDateToYYYYMMDD(project?.date);
  const end = projectLifecycleEndYmd(project);
  const from = normalizeDateToYYYYMMDD(dateFrom);
  const to = normalizeDateToYYYYMMDD(dateTo);
  const effectivelyActive = getEffectiveProjectStatus(project) === 'active';

  if (!from && !to) {
    if (statusFilter === 'active') return effectivelyActive;
    if (statusFilter === 'inactive') return !effectivelyActive;
    return true;
  }

  if (!start) return false;
  if (to && start > to) return false;

  const stillActiveAtRangeEnd = Boolean(to) && (!end || end > to);
  const completedInRange =
    Boolean(end) && (!from || end >= from) && (!to || end <= to);
  const existedInRange = (!from || !end || end >= from) && (!to || start <= to);

  if (statusFilter === 'active') {
    // Currently active (red-alert included): show whenever timeline overlaps the range.
    // Historical inactive rows: only months before End Date (still active at range end).
    if (effectivelyActive) return existedInRange;
    return stillActiveAtRangeEnd;
  }
  if (statusFilter === 'inactive') {
    // Don't treat upcoming End Dates as completed while still active
    if (effectivelyActive) return false;
    return completedInRange;
  }
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
