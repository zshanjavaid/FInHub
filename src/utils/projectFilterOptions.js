import { normText } from './number';

/**
 * Broker-aware project dropdown options.
 * When a broker is already selected, labels are project name only (no "Broker – Project").
 *
 * @param {object[]} projects
 * @param {object} [options]
 * @param {string} [options.selectedBroker]
 * @param {'identity'|'id'} [options.valueMode] identity = `client|project`, id = Firestore doc id
 * @param {boolean} [options.requireId] drop rows without id (Dashboard)
 * @returns {{ value: string, label: string }[]}
 */
export function buildProjectFilterOptions(projects = [], options = {}) {
  const {
    selectedBroker = '',
    valueMode = 'identity',
    requireId = false
  } = options;

  const broker = normText(selectedBroker);
  const list = Array.isArray(projects) ? projects : [];
  const filtered = broker
    ? list.filter((p) => normText(p?.client) === broker)
    : list;

  const byKey = new Map();
  for (const p of filtered) {
    if (!p) continue;
    if (requireId && (p.id == null || String(p.id).trim() === '')) continue;

    const client = String(p.client || '').trim();
    const project = String(p.project || '').trim();
    if (valueMode === 'identity' && !client && !project) continue;

    const value =
      valueMode === 'id'
        ? String(p.id)
        : `${client}|${project}`;
    if (byKey.has(value)) continue;

    const label = broker
      ? project || (valueMode === 'id' ? String(p.id) : 'Unnamed')
      : [client, project].filter(Boolean).join(' – ') ||
        (valueMode === 'id' ? String(p.id) : 'Unnamed');

    byKey.set(value, { value, label });
  }

  return [...byKey.values()].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
  );
}
