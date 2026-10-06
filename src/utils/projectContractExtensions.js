import { normalizeDateToYYYYMMDD } from './date';

/** Normalize stored contract extension history. */
export const getContractExtensions = (projectOrList) => {
  const list = Array.isArray(projectOrList)
    ? projectOrList
    : projectOrList?.contractExtensions;
  if (!Array.isArray(list)) return [];
  return list
    .map((entry) => {
      const from = normalizeDateToYYYYMMDD(entry?.from);
      const to = normalizeDateToYYYYMMDD(entry?.to);
      if (!from || !to) return null;
      const at = String(entry?.at || '').trim();
      return { from, to, ...(at ? { at } : {}) };
    })
    .filter(Boolean);
};

export const hasContractExtensions = (project) => getContractExtensions(project).length > 0;

/**
 * Append one extension when the user opted in and the End Date actually changed.
 * Returns the updated history array (does not mutate).
 */
export const appendContractExtension = (existing, { from, to, at } = {}) => {
  const prev = normalizeDateToYYYYMMDD(from);
  const next = normalizeDateToYYYYMMDD(to);
  if (!prev || !next || prev === next) return getContractExtensions(existing);
  return [
    ...getContractExtensions(existing),
    { from: prev, to: next, at: at || new Date().toISOString() }
  ];
};

/** Short hover / title lines for extension history (newest last). */
export const formatContractExtensionHistory = (project) => {
  const history = getContractExtensions(project);
  if (!history.length) return '';
  return history.map((e, i) => `${i + 1}. ${e.from} → ${e.to}`).join('\n');
};
