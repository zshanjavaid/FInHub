import { isProjectPastContractEnding } from '../utils/date';

export const PROJECT_TYPE_OPTIONS = [
  { value: 'Full time', label: 'Full time' },
  { value: 'Part time', label: 'Part time' },
  { value: 'Contract', label: 'Contract' },
  { value: 'Freelance', label: 'Freelance' }
];

export const PROJECT_TYPE_LABELS = PROJECT_TYPE_OPTIONS.map((o) => o.label);

export const DASHBOARD_ACTIVE_PROJECT_TYPES = ['Full time', 'Part time', 'Contract'];

export const isFreelanceProject = (project) =>
  String(project?.projectType || '').trim().toLowerCase() === 'freelance';

/** Active on Dashboard: not inactive, End Date not passed, and non-freelance type. */
export const isDashboardActiveProject = (project) => {
  const status = String(project?.projectStatus || 'active').trim().toLowerCase();
  if (status === 'inactive') return false;
  if (isProjectPastContractEnding(project)) return false;
  const type = (project?.projectType || '').trim();
  return DASHBOARD_ACTIVE_PROJECT_TYPES.includes(type);
};

export const PROJECT_TYPE_COLORS = {
  'Full time': 'bg-blue-100 text-blue-800',
  'Part time': 'bg-green-100 text-green-800',
  Contract: 'bg-purple-100 text-purple-800',
  Freelance: 'bg-amber-100 text-amber-800'
};

export const countProjectsByType = (projects = []) => {
  const counts = Object.fromEntries(PROJECT_TYPE_OPTIONS.map((o) => [o.value, 0]));
  let unset = 0;
  projects.forEach((p) => {
    const type = String(p?.projectType || '').trim();
    if (!type) {
      unset += 1;
      return;
    }
    if (counts[type] !== undefined) counts[type] += 1;
    else counts[type] = (counts[type] || 0) + 1;
  });
  return { counts, unset, total: projects.length };
};
