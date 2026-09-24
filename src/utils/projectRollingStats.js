import { addMonths, startOfDay, format } from 'date-fns';
import { normalizeDateToYYYYMMDD } from './date';
import { isApproved } from '../constants/app';
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

/**
 * Rolling 3-month window ending today (counts + project name lists).
 */
export function computeRollingWindowStats(projects = []) {
  const today = startOfDay(new Date());
  const currStart = addMonths(today, -3);
  const currEnd = today;

  const currStartYmd = normalizeDateToYYYYMMDD(currStart);
  const currEndYmd = normalizeDateToYYYYMMDD(currEnd);

  const approved = (projects || []).filter(isApproved);
  const window = listCurrentWindow(approved, currStartYmd, currEndYmd);

  return {
    rangeLabel: `${format(currStart, 'MMM d')} – ${format(currEnd, 'MMM d, yyyy')}`,
    onboardCurr: window.onboardCurr,
    endedCurr: window.endedCurr,
    onboardProjects: window.onboardProjects,
    endedProjects: window.endedProjects
  };
}
