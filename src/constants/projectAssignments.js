const toSortedOptions = (names) =>
  [...names]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .map((label) => ({ value: label, label }));

export const LEAD_OPTIONS = toSortedOptions(['Abrar', 'Hammad', 'Shahzaib']);

export const PROJECT_MANAGER_OPTIONS = toSortedOptions(['Arsal', 'Abrar', 'Shahzaib', 'Hammad']);

export const PERSON_BADGE_COLORS = {
  Abrar: 'bg-sky-100 text-sky-800',
  Arsal: 'bg-teal-100 text-teal-800',
  Hammad: 'bg-violet-100 text-violet-800',
  Shahzaib: 'bg-amber-100 text-amber-800'
};

/** Fallback palette for typed-in names (stable pick by name hash). */
const PERSON_BADGE_PALETTE = [
  'bg-sky-100 text-sky-800',
  'bg-teal-100 text-teal-800',
  'bg-violet-100 text-violet-800',
  'bg-amber-100 text-amber-800',
  'bg-rose-100 text-rose-800',
  'bg-indigo-100 text-indigo-800',
  'bg-emerald-100 text-emerald-800',
  'bg-fuchsia-100 text-fuchsia-800',
  'bg-cyan-100 text-cyan-800',
  'bg-orange-100 text-orange-800',
  'bg-lime-100 text-lime-800',
  'bg-pink-100 text-pink-800'
];

const hashName = (name) => {
  const s = String(name || '').trim().toLowerCase();
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

export const personBadgeClass = (name = '') => {
  const label = String(name || '').trim();
  if (!label) return 'bg-slate-100 text-slate-700';
  if (PERSON_BADGE_COLORS[label]) return PERSON_BADGE_COLORS[label];
  return PERSON_BADGE_PALETTE[hashName(label) % PERSON_BADGE_PALETTE.length];
};

const optionLabel = (option) => {
  if (typeof option === 'string') return option.trim();
  return String(option?.label || option?.value || '').trim();
};

/** Seed list + names already saved on projects (for type-or-select Lead / PM). */
export const mergeAssignmentNames = (seedOptions = [], projects = [], field = '') => {
  const seed = (seedOptions || []).map(optionLabel).filter(Boolean);
  const fromProjects = (projects || [])
    .map((p) => String(p?.[field] || '').trim())
    .filter(Boolean);
  return [...new Set([...seed, ...fromProjects])].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );
};
