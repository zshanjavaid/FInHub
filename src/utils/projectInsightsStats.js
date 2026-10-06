import { differenceInCalendarDays, parseISO } from 'date-fns';
import { isApproved } from '../constants/app';
import { isFreelanceProject } from '../constants/projectTypes';
import { normalizeDateToYYYYMMDD, todayLocalYmd } from './date';
import { getContractExtensions } from './projectContractExtensions';
import { getEffectiveProjectStatus } from './transactionsEligibility';

const rangesOverlap = (start, end, from, to) => {
  if (!start || !end) return false;
  if (from && end < from) return false;
  if (to && start > to) return false;
  return true;
};

const eventInRange = (ymd, from, to) => {
  if (!ymd) return false;
  if (from && ymd < from) return false;
  if (to && ymd > to) return false;
  return true;
};

/** Inclusive calendar-day span converted to months (30.44-day months). */
export const monthsBetweenYmd = (fromYmd, toYmd) => {
  const a = normalizeDateToYYYYMMDD(fromYmd);
  const b = normalizeDateToYYYYMMDD(toYmd);
  if (!a || !b || b < a) return 0;
  try {
    const days = differenceInCalendarDays(parseISO(b), parseISO(a));
    return Math.round((Math.max(0, days) / 30.437) * 10) / 10;
  } catch {
    return 0;
  }
};

export const projectStartYmd = (project) => normalizeDateToYYYYMMDD(project?.date);

export const projectEndYmd = (project, asOfYmd = todayLocalYmd()) => {
  const end = normalizeDateToYYYYMMDD(project?.contractEnding);
  const status = getEffectiveProjectStatus(project);
  if (status === 'active') {
    if (end && asOfYmd && end < asOfYmd) return end;
    return asOfYmd || end || '';
  }
  return end || normalizeDateToYYYYMMDD(project?.inactiveAt) || asOfYmd || '';
};

const median = (nums = []) => {
  const sorted = [...nums].filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10;
  return sorted[mid];
};

const avg = (nums = []) => {
  const list = nums.filter((n) => Number.isFinite(n));
  if (!list.length) return null;
  return Math.round((list.reduce((s, n) => s + n, 0) / list.length) * 10) / 10;
};

const personKey = (name) => String(name || '').trim();

const matchesPersonFilters = (project, lead, projectManager) => {
  if (lead && personKey(project?.lead) !== lead) return false;
  if (projectManager && personKey(project?.projectManager) !== projectManager) return false;
  return true;
};

const buildPersonRollup = (projects, roleField) => {
  const map = new Map();
  projects.forEach((row) => {
    const name = personKey(row[roleField]);
    if (!name) return;
    if (!map.has(name)) {
      map.set(name, {
        name,
        projectCount: 0,
        durations: [],
        extensionCount: 0,
        reasons: new Map(),
        projects: []
      });
    }
    const bucket = map.get(name);
    bucket.projectCount += 1;
    bucket.durations.push(row.durationMonths);
    bucket.extensionCount += row.extensionCount;
    if (row.completedReason) {
      bucket.reasons.set(row.completedReason, (bucket.reasons.get(row.completedReason) || 0) + 1);
    }
    bucket.projects.push(row);
  });

  return [...map.values()]
    .map((b) => {
      let topReason = '';
      let topReasonCount = 0;
      b.reasons.forEach((count, reason) => {
        if (count > topReasonCount) {
          topReason = reason;
          topReasonCount = count;
        }
      });
      return {
        name: b.name,
        projectCount: b.projectCount,
        avgDurationMonths: avg(b.durations),
        extensionCount: b.extensionCount,
        topCompletedReason: topReason || '—',
        topCompletedReasonCount: topReasonCount,
        projects: b.projects.sort((a, b2) => b2.durationMonths - a.durationMonths)
      };
    })
    .sort((a, b) => b.projectCount - a.projectCount || a.name.localeCompare(b.name));
};

/**
 * Project Insights metrics for a date window + optional Lead / PM filters.
 * Excludes freelance. Duration = start → end (active projects use today if end is later).
 */
export const buildProjectInsights = ({
  projects = [],
  dateFrom = '',
  dateTo = '',
  lead = '',
  projectManager = '',
  asOfYmd = todayLocalYmd()
} = {}) => {
  const from = normalizeDateToYYYYMMDD(dateFrom) || '';
  const to = normalizeDateToYYYYMMDD(dateTo) || '';
  const leadFilter = personKey(lead);
  const pmFilter = personKey(projectManager);

  const base = (projects || [])
    .filter(isApproved)
    .filter((p) => !isFreelanceProject(p))
    .filter((p) => matchesPersonFilters(p, leadFilter, pmFilter));

  const rows = base
    .map((p) => {
      const start = projectStartYmd(p);
      const end = projectEndYmd(p, asOfYmd);
      if (!start || !end) return null;
      if (!rangesOverlap(start, end, from, to)) return null;

      const extensions = getContractExtensions(p);
      const extensionsInRange = extensions.filter((e) => {
        const at = normalizeDateToYYYYMMDD(e.at) || e.to;
        return eventInRange(at, from, to) || rangesOverlap(e.from, e.to, from, to);
      });
      const status = getEffectiveProjectStatus(p);
      const completedReason =
        status !== 'active' ? String(p.inactiveReason || '').trim() || 'Unspecified' : '';

      return {
        id: p.id,
        name: String(p.project || '').trim() || 'Unnamed',
        client: String(p.client || '').trim(),
        lead: personKey(p.lead) || '—',
        projectManager: personKey(p.projectManager) || '—',
        start,
        end,
        status,
        durationMonths: monthsBetweenYmd(start, end),
        extensionCount: extensions.length,
        extensionsInRangeCount: extensionsInRange.length,
        extensionMonths: extensions.reduce((s, e) => s + monthsBetweenYmd(e.from, e.to), 0),
        completedReason,
        isActive: status === 'active'
      };
    })
    .filter(Boolean);

  const durations = rows.map((r) => r.durationMonths);
  const withExtensions = rows.filter((r) => r.extensionCount > 0);
  const totalExtensions = rows.reduce((s, r) => s + r.extensionsInRangeCount, 0);
  const extensionLengths = [];
  rows.forEach((r) => {
    const p = base.find((x) => x.id === r.id);
    getContractExtensions(p).forEach((e) => {
      const at = normalizeDateToYYYYMMDD(e.at) || e.to;
      if (eventInRange(at, from, to) || rangesOverlap(e.from, e.to, from, to)) {
        extensionLengths.push(monthsBetweenYmd(e.from, e.to));
      }
    });
  });

  const reasonMap = new Map();
  rows
    .filter((r) => !r.isActive)
    .forEach((r) => {
      const key = r.completedReason || 'Unspecified';
      if (!reasonMap.has(key)) reasonMap.set(key, { reason: key, count: 0, durations: [] });
      const bucket = reasonMap.get(key);
      bucket.count += 1;
      bucket.durations.push(r.durationMonths);
    });

  const completedReasons = [...reasonMap.values()]
    .map((b) => ({
      reason: b.reason,
      count: b.count,
      avgDurationMonths: avg(b.durations)
    }))
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));

  const activeTimeline = rows
    .filter((r) => r.isActive)
    .sort((a, b) => b.durationMonths - a.durationMonths || a.name.localeCompare(b.name));

  const extensionsByLead = (() => {
    const map = new Map();
    rows.forEach((r) => {
      const name = r.lead === '—' ? '' : r.lead;
      if (!name) return;
      if (!map.has(name)) map.set(name, { lead: name, extensionCount: 0, projectCount: 0 });
      const b = map.get(name);
      b.projectCount += 1;
      b.extensionCount += r.extensionsInRangeCount;
    });
    return [...map.values()].sort((a, b) => b.extensionCount - a.extensionCount || a.lead.localeCompare(b.lead));
  })();

  return {
    rows,
    activeTimeline,
    summary: {
      projectCount: rows.length,
      activeCount: activeTimeline.length,
      completedCount: rows.filter((r) => !r.isActive).length,
      avgLifeMonths: avg(durations),
      medianLifeMonths: median(durations),
      totalExtensions,
      avgExtensionsPerProject: rows.length ? Math.round((totalExtensions / rows.length) * 10) / 10 : null,
      pctExtended: rows.length ? Math.round((withExtensions.length / rows.length) * 1000) / 10 : null,
      avgExtensionLengthMonths: avg(extensionLengths)
    },
    completedReasons,
    extensionsByLead,
    byLead: buildPersonRollup(rows, 'lead'),
    byProjectManager: buildPersonRollup(rows, 'projectManager')
  };
};
