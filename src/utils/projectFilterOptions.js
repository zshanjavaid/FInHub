import { normText } from './number';

/**
 * Broker-aware project dropdown options.
 * When exactly one broker is selected, labels are project name only (no "Broker – Project").
 * `selectedBrokers` (array) takes precedence over `selectedBroker` (string).
 *
 * @param {object[]} projects
 * @param {object} [options]
 * @param {string} [options.selectedBroker]
 * @param {string[]} [options.selectedBrokers]
 * @param {'identity'|'id'} [options.valueMode] identity = `client|project`, id = Firestore doc id
 * @param {boolean} [options.requireId] drop rows without id (Dashboard)
 * @returns {{ value: string, label: string }[]}
 */
export function buildProjectFilterOptions(projects = [], options = {}) {
  const {
    selectedBroker = '',
    selectedBrokers = null,
    valueMode = 'identity',
    requireId = false
  } = options;

  const brokerList = Array.isArray(selectedBrokers)
    ? selectedBrokers.map((b) => String(b || '').trim()).filter(Boolean)
    : selectedBroker
      ? [String(selectedBroker).trim()]
      : [];
  const brokerKeys = new Set(brokerList.map(normText));
  const singleBroker = brokerList.length === 1;
  const list = Array.isArray(projects) ? projects : [];
  const filtered = brokerKeys.size
    ? list.filter((p) => brokerKeys.has(normText(p?.client)))
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

    const label = singleBroker
      ? project || (valueMode === 'id' ? String(p.id) : 'Unnamed')
      : [client, project].filter(Boolean).join(' – ') ||
        (valueMode === 'id' ? String(p.id) : 'Unnamed');

    byKey.set(value, { value, label });
  }

  return [...byKey.values()].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
  );
}
