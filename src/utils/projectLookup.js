import { normText } from './number';
import { getEffectiveProjectStatus } from './transactionsEligibility';

export const projectIdentityKey = (client, project) => `${normText(client)}|${normText(project)}`;

export const matchesClientProject = (row, client, project) =>
  normText(row?.client) === normText(client) && normText(row?.project) === normText(project);

const projectRecency = (p) => String(p?.updatedAt || p?.createdAt || p?.date || '');

const projectActiveRank = (p) => (getEffectiveProjectStatus(p) === 'active' ? 1 : 0);

/** Prefer active row, then most recently updated (for broker + project name). */
export const findLatestProjectByBrokerAndProject = (projects = [], broker, projectName) => {
  if (!broker || !projectName || !projects?.length) return null;
  const matches = projects
    .filter((p) => matchesClientProject(p, broker, projectName))
    .sort((a, b) => {
      const activeDiff = projectActiveRank(b) - projectActiveRank(a);
      if (activeDiff !== 0) return activeDiff;
      return projectRecency(b).localeCompare(projectRecency(a));
    });
  return matches[0] || null;
};

/** Latest project row per broker + project name (active preferred). */
export const latestProjectByIdentity = (projects = []) => {
  const map = new Map();
  (projects || []).forEach((p) => {
    const client = String(p?.client || '').trim();
    const name = String(p?.project || '').trim();
    if (!client || !name) return;
    const key = projectIdentityKey(client, name);
    const prev = map.get(key);
    if (!prev) {
      map.set(key, p);
      return;
    }
    const activeDiff = projectActiveRank(p) - projectActiveRank(prev);
    if (activeDiff > 0 || (activeDiff === 0 && projectRecency(p).localeCompare(projectRecency(prev)) > 0)) {
      map.set(key, p);
    }
  });
  return map;
};
