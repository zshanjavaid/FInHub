import { normText } from './number';

export const projectIdentityKey = (client, project) => `${normText(client)}|${normText(project)}`;

export const matchesClientProject = (row, client, project) =>
  normText(row?.client) === normText(client) && normText(row?.project) === normText(project);

const projectRecency = (p) => String(p?.updatedAt || p?.createdAt || p?.date || '');

/** Latest project row for a broker + project name. */
export const findLatestProjectByBrokerAndProject = (projects = [], broker, projectName) => {
  if (!broker || !projectName || !projects?.length) return null;
  const matches = projects
    .filter((p) => matchesClientProject(p, broker, projectName))
    .sort((a, b) => projectRecency(b).localeCompare(projectRecency(a)));
  return matches[0] || null;
};

/** Latest project row per broker + project name. */
export const latestProjectByIdentity = (projects = []) => {
  const map = new Map();
  (projects || []).forEach((p) => {
    const client = String(p?.client || '').trim();
    const name = String(p?.project || '').trim();
    if (!client || !name) return;
    const key = projectIdentityKey(client, name);
    const prev = map.get(key);
    if (!prev || projectRecency(p).localeCompare(projectRecency(prev)) > 0) {
      map.set(key, p);
    }
  });
  return map;
};
