import { MONTH_NAMES, normalizeDateToYYYYMMDD } from './date';
import {
  wasProjectInactivatedInMonth,
  uniqueProjectsForTrend,
  projectInactiveEventYmd
} from './transactionsEligibility';

const monthBounds = (year, monthIndex0) => {
  const lastDay = new Date(year, monthIndex0 + 1, 0).getDate();
  const y = String(year);
  const m = String(monthIndex0 + 1).padStart(2, '0');
  return {
    from: `${y}-${m}-01`,
    to: `${y}-${m}-${String(lastDay).padStart(2, '0')}`
  };
};

const yearBounds = (year, currentYear, currentMonth) => {
  const from = `${year}-01-01`;
  const endMonth = year === currentYear ? currentMonth : 11;
  const lastDay = new Date(year, endMonth + 1, 0).getDate();
  const to = `${year}-${String(endMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
};

/** Active headcount in a calendar month. */
export const countActiveProjectsInMonth = (projects, year, monthIndex0) => {
  const uniqueProjects = uniqueProjectsForTrend(projects);
  const { from: ms, to: me } = monthBounds(year, monthIndex0);
  let active = 0;

  uniqueProjects.forEach((p) => {
    const startYmd = normalizeDateToYYYYMMDD(p?.date);
    if (!startYmd || startYmd > me) return;

    if (wasProjectInactivatedInMonth(p, ms, me)) return;

    const status = String(p?.projectStatus || 'active').trim().toLowerCase();
    if (status === 'active') {
      active += 1;
      return;
    }

    const endedYmd = projectInactiveEventYmd(p);
    if (endedYmd && endedYmd > me) active += 1;
  });

  return active;
};

/** Projects marked inactive in a calendar month. */
export const countCompletedProjectsInMonth = (projects, year, monthIndex0) => {
  const uniqueProjects = uniqueProjectsForTrend(projects);
  const { from: ms, to: me } = monthBounds(year, monthIndex0);
  let completed = 0;
  uniqueProjects.forEach((p) => {
    if (wasProjectInactivatedInMonth(p, ms, me)) completed += 1;
  });
  return completed;
};

/**
 * Year totals:
 * - totalProjects: unique projects that existed during the year
 * - completedProjects: unique projects inactivated during that year
 */
export const countYearProjectTotals = (projects, year, currentYear, currentMonth) => {
  const uniqueProjects = uniqueProjectsForTrend(projects);
  const { from, to } = yearBounds(year, currentYear, currentMonth);
  let totalProjects = 0;
  let completedProjects = 0;

  uniqueProjects.forEach((p) => {
    const startYmd = normalizeDateToYYYYMMDD(p?.date);
    if (!startYmd || startYmd > to) return;

    const status = String(p?.projectStatus || 'active').trim().toLowerCase();
    const endedYmd = projectInactiveEventYmd(p);

    // Ended before this year began → never existed in this year
    if (status === 'inactive' && endedYmd && endedYmd < from) return;

    totalProjects += 1;

    if (endedYmd && endedYmd >= from && endedYmd <= to) {
      completedProjects += 1;
    }
  });

  return { totalProjects, completedProjects };
};

const yearFromYmd = (ymd) => {
  if (!ymd || ymd.length < 4) return null;
  const y = Number(ymd.slice(0, 4));
  return Number.isFinite(y) ? y : null;
};

const earliestProjectYear = (projects = [], currentYear) => {
  let minYear = currentYear;
  uniqueProjectsForTrend(projects).forEach((p) => {
    const startY = yearFromYmd(normalizeDateToYYYYMMDD(p?.date));
    if (startY != null && startY < minYear) minYear = startY;
    const endY = yearFromYmd(projectInactiveEventYmd(p));
    if (endY != null && endY < minYear) minYear = endY;
  });
  return minYear;
};

/**
 * Per-year monthly Active + Completed series for every year that has data.
 * Current year stops at the current month.
 */
export const buildActiveProjectsYearComparison = (projects = [], now = new Date()) => {
  const ref = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  const currentYear = ref.getFullYear();
  const currentMonth = ref.getMonth();
  const startYear = earliestProjectYear(projects, currentYear);

  const series = [];
  for (let year = startYear; year <= currentYear; year += 1) {
    const active = [];
    const completed = [];
    for (let m = 0; m < 12; m += 1) {
      if (year === currentYear && m > currentMonth) {
        active.push(null);
        completed.push(null);
        continue;
      }
      active.push(countActiveProjectsInMonth(projects, year, m));
      completed.push(countCompletedProjectsInMonth(projects, year, m));
    }

    const hasData =
      active.some((n) => n != null && n > 0) || completed.some((n) => n != null && n > 0);
    if (!hasData) continue;

    const { totalProjects, completedProjects } = countYearProjectTotals(
      projects,
      year,
      currentYear,
      currentMonth
    );

    let latestActive = active[year === currentYear ? currentMonth : 11];
    if (latestActive == null) {
      for (let i = active.length - 1; i >= 0; i -= 1) {
        if (active[i] != null) {
          latestActive = active[i];
          break;
        }
      }
    }

    series.push({
      year,
      label: String(year),
      active,
      completed,
      totalProjects,
      completedProjects,
      latestActive: latestActive == null ? 0 : latestActive,
      isCurrent: year === currentYear
    });
  }

  const years = series.map((s) => s.year).sort((a, b) => b - a);
  const byYear = Object.fromEntries(series.map((s) => [s.year, s]));

  return {
    labels: MONTH_NAMES.map((n) => n.slice(0, 3)),
    fullLabels: [...MONTH_NAMES],
    years,
    byYear,
    series: years.map((y) => byYear[y]),
    currentYear,
    currentMonth,
    defaultYear: years.includes(currentYear) ? currentYear : years[0] || currentYear
  };
};
