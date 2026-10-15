import { normText, toNumber, roundMoney } from './number';

/**
 * AND between groups; OR within each group.
 * Empty `selected` (or missing getValue) means the group does not constrain.
 *
 * @param {object[]} rows
 * @param {{ selected?: string[], getValue: (row: object) => string, normalize?: (v: string) => string }[]} groups
 */
export const applyMultiSelectFilters = (rows = [], groups = []) => {
  const list = Array.isArray(rows) ? rows : [];
  if (!groups.length) return list;

  const compiled = groups.map((g) => {
    const selected = (g.selected || []).map((v) => String(v ?? '').trim()).filter(Boolean);
    const normalize = typeof g.normalize === 'function' ? g.normalize : (v) => normText(v);
    const selectedSet = new Set(selected.map(normalize).filter(Boolean));
    return { selectedSet, getValue: g.getValue, normalize };
  });

  return list.filter((row) =>
    compiled.every(({ selectedSet, getValue, normalize }) => {
      if (!selectedSet.size) return true;
      if (typeof getValue !== 'function') return true;
      const raw = getValue(row);
      const key = normalize(raw);
      return key && selectedSet.has(key);
    })
  );
};

/** Unique trimmed labels from rows, sorted. */
export const uniqueFieldValues = (rows = [], getValue, { normalize = null } = {}) => {
  const seen = new Set();
  const out = [];
  (rows || []).forEach((row) => {
    const raw = typeof getValue === 'function' ? getValue(row) : '';
    const label = String(raw || '').trim();
    if (!label) return;
    const key = typeof normalize === 'function' ? normalize(label) : normText(label);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(label);
  });
  return out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
};

/** Toggle value in a selection list (no duplicates). Returns a new array. */
export const toggleSelectedValue = (selected = [], value, { normalize = normText } = {}) => {
  const v = String(value ?? '').trim();
  if (!v) return [...(selected || [])];
  const key = normalize(v);
  const list = Array.isArray(selected) ? selected : [];
  const idx = list.findIndex((x) => normalize(x) === key);
  if (idx >= 0) return list.filter((_, i) => i !== idx);
  return [...list, v];
};

/** Remove one value from selection. */
export const removeSelectedValue = (selected = [], value, { normalize = normText } = {}) => {
  const key = normalize(value);
  return (selected || []).filter((x) => normalize(x) !== key);
};

/** Sum a numeric field over rows (money-safe). */
export const sumField = (rows = [], field = 'amount') =>
  roundMoney(
    (rows || []).reduce((s, row) => s + toNumber(typeof field === 'function' ? field(row) : row?.[field]), 0)
  );

/**
 * Group sums for selected keys only (display labels preserved from selection).
 * @returns {{ key: string, label: string, total: number, count: number }[]}
 */
export const sumBySelectedKeys = (
  rows = [],
  selected = [],
  getValue,
  { normalize = normText, getAmount = null } = {}
) => {
  const labels = (selected || []).map((v) => String(v ?? '').trim()).filter(Boolean);
  if (!labels.length) return [];
  const buckets = new Map(
    labels.map((label) => [normalize(label), { key: normalize(label), label, total: 0, count: 0 }])
  );
  (rows || []).forEach((row) => {
    const key = normalize(typeof getValue === 'function' ? getValue(row) : '');
    const bucket = buckets.get(key);
    if (!bucket) return;
    const amt =
      typeof getAmount === 'function' ? getAmount(row) : toNumber(row?.amount);
    bucket.total = roundMoney(bucket.total + toNumber(amt));
    bucket.count += 1;
  });
  return labels.map((label) => buckets.get(normalize(label))).filter(Boolean);
};

/** Parse URL type param(s): comma-separated and/or repeated. Returns slug list. */
export const parseTypeParams = (searchParams, slugify) => {
  if (!searchParams || typeof slugify !== 'function') return [];
  const raw = [];
  const all = searchParams.getAll?.('type') || [];
  if (all.length) {
    all.forEach((t) => {
      String(t || '')
        .split(',')
        .forEach((part) => raw.push(part));
    });
  } else {
    const single = searchParams.get?.('type');
    if (single) {
      String(single)
        .split(',')
        .forEach((part) => raw.push(part));
    }
  }
  const seen = new Set();
  const out = [];
  raw.forEach((t) => {
    const slug = slugify(t);
    if (!slug || seen.has(slug)) return;
    seen.add(slug);
    out.push(slug);
  });
  return out;
};

/** Write type slugs to URLSearchParams (comma-separated single `type` key). */
export const writeTypeParams = (searchParams, slugs = []) => {
  const next = new URLSearchParams(searchParams);
  next.delete('type');
  const clean = (slugs || []).map((s) => String(s || '').trim()).filter(Boolean);
  if (clean.length) next.set('type', clean.join(','));
  return next;
};

// ponytail: assert self-check — fails loudly if OR/AND semantics break
export const __selfCheckMultiSelectFilter = () => {
  const rows = [
    { id: 1, type: 'bill', name: 'Shopify' },
    { id: 2, type: 'bill', name: 'Comcast' },
    { id: 3, type: 'rent', name: 'Shopify' },
    { id: 4, type: 'rent', name: 'Other' }
  ];
  const byType = applyMultiSelectFilters(rows, [
    { selected: ['bill'], getValue: (r) => r.type },
    { selected: [], getValue: (r) => r.name }
  ]);
  console.assert(byType.length === 2 && byType.every((r) => r.type === 'bill'), 'type-only OR failed');

  const byBoth = applyMultiSelectFilters(rows, [
    { selected: ['bill'], getValue: (r) => r.type },
    { selected: ['Shopify', 'Comcast'], getValue: (r) => r.name }
  ]);
  console.assert(
    byBoth.length === 2 && byBoth.every((r) => r.type === 'bill'),
    'AND between groups failed'
  );

  const toggled = toggleSelectedValue(['a'], 'A');
  console.assert(toggled.length === 0, 'toggle should dedupe case-insensitively');

  const added = toggleSelectedValue(['a'], 'b');
  console.assert(added.length === 2 && added.includes('b'), 'toggle add failed');

  const sumRows = [
    { type: 'bill', amount: 5 },
    { type: 'bill', amount: 7 },
    { type: 'rent', amount: 100 }
  ];
  const sums = sumBySelectedKeys(sumRows, ['bill'], (r) => r.type);
  console.assert(sums.length === 1 && sums[0].total === 12, 'sumBySelectedKeys amount default');
  const custom = sumBySelectedKeys(sumRows, ['bill'], (r) => r.type, {
    getAmount: (r) => toNumber(r.amount) * 2
  });
  console.assert(custom[0]?.total === 24, 'sumBySelectedKeys getAmount failed');

  return true;
};

if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
  try {
    __selfCheckMultiSelectFilter();
  } catch {
    /* ignore in non-browser */
  }
}
