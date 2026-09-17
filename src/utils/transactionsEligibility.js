import { addMonths } from 'date-fns';
import { isFreelanceProject } from '../constants/projectTypes';
import { normalizeDateToYYYYMMDD } from './date';

export const isActiveProject = (project) =>
  String(project?.projectStatus || 'active').trim().toLowerCase() === 'active';

/**
 * True if the project was active at any point during [monthStart, monthEnd].
 * Active: started on/before month end, and not ended before month start.
 */
export const wasProjectActiveInMonth = (project, monthStart, monthEnd) =>
  projectStatusInMonth(project, monthStart, monthEnd) === 'active';

/**
 * Status of a project during a calendar month:
 * - 'active' — started by month end and not yet ended
 * - 'inactive' — already ended by month end
 * - null — not started yet that month
 */
export const projectStatusInMonth = (project, monthStart, monthEnd) => {
  const startYmd = normalizeDateToYYYYMMDD(project?.date);
  const rangeStart = normalizeDateToYYYYMMDD(monthStart);
  const rangeEnd = normalizeDateToYYYYMMDD(monthEnd);
  if (!startYmd || !rangeStart || !rangeEnd) return null;
  if (startYmd > rangeEnd) return null;

  const status = String(project?.projectStatus || 'active').trim().toLowerCase();
  if (status === 'active') return 'active';

  const endedYmd = projectInactiveEventYmd(project);
  if (!endedYmd) return 'inactive';
  // Still active during this month if it ended after the month ends
  if (endedYmd > rangeEnd) return 'active';
  return 'inactive';
};

/** End date used for inactive event (matches 3-month activity: inactiveAt, else updatedAt). */
export const projectInactiveEventYmd = (project) => {
  const status = String(project?.projectStatus || 'active').trim().toLowerCase();
  if (status !== 'inactive') return '';
  const fromInactiveAt = normalizeDateToYYYYMMDD(project?.inactiveAt);
  if (fromInactiveAt) return fromInactiveAt;
  return normalizeDateToYYYYMMDD(project?.updatedAt);
};

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

