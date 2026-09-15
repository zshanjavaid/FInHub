import { normalizeDateToYYYYMMDD } from './date';

/** Normalize text for fuzzy broker / project matching. */
export const normalizeMatchText = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const tokenize = (value) => normalizeMatchText(value).split(' ').filter(Boolean);

/** Parse Mercury Timestamp / Date like `08-28-2026 12:56:36` → YYYY-MM-DD */
export const parseMercuryTimestampToYmd = (value) => {
  const str = String(value || '').trim();
  if (!str) return '';
  const m = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})(?:\s|$)/);
  if (m) {
    const month = Number(m[1]);
    const day = Number(m[2]);
    const year = Number(m[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const parseAmount = (value) => {
  if (value == null || value === '') return NaN;
  const n = Number(String(value).replace(/[$,\s]/g, '').trim());
  return Number.isFinite(n) ? n : NaN;
};

/** Minimal CSV parser (handles quotes and commas). */
export const parseCsvText = (text) => {
  const input = String(text || '').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    const next = input[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ',') {
      row.push(cell);
      cell = '';
      continue;
    }
    if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    if (ch === '\r') continue;
    cell += ch;
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((r) => r.some((c) => String(c || '').trim() !== ''));
};

const headerKey = (h) => String(h || '').trim().toLowerCase();

/**
 * Parse Mercury bank export into normalized rows.
 * Expected headers include Description, Amount, Bank Description, Timestamp.
 */
export const parseMercuryTransactionCsv = (text) => {
  const matrix = parseCsvText(text);
  if (!matrix.length) return { headers: [], rows: [], error: 'CSV is empty.' };

  const headers = matrix[0].map((h) => String(h || '').trim());
  const indexBy = {};
  headers.forEach((h, i) => {
    indexBy[headerKey(h)] = i;
  });

  const required = ['description', 'amount', 'timestamp'];
  const missing = required.filter((k) => indexBy[k] === undefined);
  if (missing.length) {
    return {
      headers,
      rows: [],
      error: `Missing required column(s): ${missing.join(', ')}. Expected Mercury export format.`
    };
  }

  const get = (cols, name) => {
    const i = indexBy[name];
    return i === undefined ? '' : String(cols[i] ?? '').trim();
  };

  const rows = [];
  for (let r = 1; r < matrix.length; r += 1) {
    const cols = matrix[r];
    const description = get(cols, 'description');
    const amount = parseAmount(get(cols, 'amount'));
    const timestamp = get(cols, 'timestamp') || get(cols, 'date (utc)');
    const date = parseMercuryTimestampToYmd(timestamp);
    if (!description && !Number.isFinite(amount)) continue;
    rows.push({
      rowKey: `csv-${r}`,
      lineNumber: r + 1,
      description,
      amount: Number.isFinite(amount) ? amount : NaN,
      status: get(cols, 'status'),
      bankDescription: get(cols, 'bank description'),
      timestamp,
      date,
      raw: Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? '']))
    });
  }

  return { headers, rows, error: '' };
};

/** Turn `faisal-hanif-llc-transactions-aug-2026.csv` into searchable broker text. */
export const brokerHintFromFilename = (filename) => {
  const base = String(filename || '')
    .replace(/^.*[\\/]/, '')
    .replace(/\.csv$/i, '');
  const cleaned = base
    .replace(/[-_]?transactions?.*$/i, '')
    .replace(/[-_]?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[-_]?\d{2,4}$/i, '')
    .replace(/[-_]?\d{4}[-_]?(0?[1-9]|1[0-2])$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim();
  return cleaned;
};

const scoreBrokerMatch = (brokerName, haystack) => {
  const brokerNorm = normalizeMatchText(brokerName);
  const hayNorm = normalizeMatchText(haystack);
  if (!brokerNorm || !hayNorm) return 0;
  if (hayNorm.includes(brokerNorm) || brokerNorm.includes(hayNorm)) return 100;

  const brokerTokens = tokenize(brokerName).filter((t) => t.length > 1);
  if (!brokerTokens.length) return 0;
  const hayTokens = new Set(tokenize(haystack));
  const hit = brokerTokens.filter((t) => hayTokens.has(t) || hayNorm.includes(t)).length;
  if (hit === 0) return 0;
  const ratio = hit / brokerTokens.length;
  if (ratio >= 0.7) return Math.round(70 + ratio * 20);
  if (hit >= 2) return 40 + hit * 5;
  return 0;
};

export const matchBrokerFromHints = ({ filename = '', bankDescriptions = [], brokerOptions = [] }) => {
  const options = (brokerOptions || []).map((b) => String(b || '').trim()).filter(Boolean);
  if (!options.length) return { broker: '', score: 0, source: '' };

  const filenameHint = brokerHintFromFilename(filename);
  const bankBlob = (bankDescriptions || []).filter(Boolean).join(' | ');

  let best = { broker: '', score: 0, source: '' };
  options.forEach((broker) => {
    const fileScore = scoreBrokerMatch(broker, filenameHint);
    if (fileScore > best.score) best = { broker, score: fileScore, source: 'filename' };
    const bankScore = scoreBrokerMatch(broker, bankBlob);
    if (bankScore > best.score) best = { broker, score: bankScore, source: 'bankDescription' };
  });

  if (best.score < 40) return { broker: '', score: 0, source: '' };
  return best;
};

export const findMatchingProject = ({ description, broker, projects = [] }) => {
  const desc = String(description || '').trim();
  if (!desc) return null;
  const descNorm = normalizeMatchText(desc);
  const list = (projects || []).filter((p) => {
    if (!broker) return true;
    return (p.client || '').trim().toLowerCase() === broker.trim().toLowerCase();
  });

  const exact = list.find((p) => normalizeMatchText(p.project) === descNorm);
  if (exact) return exact;

  const contains = list.find((p) => {
    const pn = normalizeMatchText(p.project);
    return pn && (pn.includes(descNorm) || descNorm.includes(pn));
  });
  return contains || null;
};

const amountKey = (amount) => Number(Number(amount).toFixed(2));

export const dupeKey = (dateYmd, amount) => `${dateYmd}|${amountKey(amount)}`;

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const computeBrokerageAmount = ({ amount, brokerageType, brokerageValue }) => {
  const a = toNumber(amount);
  const b = toNumber(brokerageValue);
  if (String(brokerageType || 'percentage').toLowerCase() === 'percentage') return (a * b) / 100;
  return b;
};

/**
 * Same field shape as manual Add Transaction — never writes extra CSV metadata
 * and never mutates existing documents.
 */
export const buildImportedTransactionData = ({
  client,
  project,
  date,
  amount,
  projectRow = null,
  createdBy = null
}) => {
  const gross = toNumber(amount);
  const brokerageType = projectRow?.brokerageType || 'percentage';
  const brokerageValue = toNumber(projectRow?.brokerageValue);
  const brokerageAmount = Number(
    computeBrokerageAmount({ amount: gross, brokerageType, brokerageValue }).toFixed(2)
  );
  const additionalCharges = 0;
  const totalAmount = Number((gross - brokerageAmount - additionalCharges).toFixed(2));

  const data = {
    client: String(client || '').trim(),
    project: String(project || '').trim(),
    date: normalizeDateToYYYYMMDD(date) || String(date || '').slice(0, 10),
    amount: gross,
    brokerageType,
    brokerageValue,
    brokerageAmount,
    additionalCharges,
    totalAmount
  };

  if (createdBy) data.createdBy = createdBy;
  return data;
};

/**
 * Classify CSV rows vs existing transactions by date+amount occupancy.
 * Read-only against existing data — never updates or deletes.
 * - Within existing count → auto skip
 * - Beyond existing count → ask (possible intentional duplicate)
 * - No existing → import (ready) once project is mapped
 */
export const classifyCsvRowsAgainstExisting = ({ csvRows = [], existingTransactions = [] }) => {
  const existingCounts = new Map();
  (existingTransactions || []).forEach((t) => {
    const date = normalizeDateToYYYYMMDD(t?.date);
    const amount = Number(t?.amount);
    if (!date || !Number.isFinite(amount)) return;
    const key = dupeKey(date, amount);
    existingCounts.set(key, (existingCounts.get(key) || 0) + 1);
  });

  const usedCounts = new Map();
  return (csvRows || []).map((row) => {
    const date = row.date;
    const amount = row.amount;
    if (!date || !Number.isFinite(amount)) {
      return { ...row, importStatus: 'invalid', reason: 'Missing date or amount' };
    }
    const key = dupeKey(date, amount);
    const existing = existingCounts.get(key) || 0;
    const used = usedCounts.get(key) || 0;
    if (used < existing) {
      usedCounts.set(key, used + 1);
      return { ...row, importStatus: 'skip', reason: 'Already in your data — left unchanged' };
    }
    usedCounts.set(key, used + 1);
    if (existing > 0) {
      return {
        ...row,
        importStatus: 'ask',
        reason: `Same date and amount already exists. Add another row?`
      };
    }
    return { ...row, importStatus: 'ready', reason: '' };
  });
};

export const uniqueCsvProjectNames = (rows = []) => {
  const names = [];
  const seen = new Set();
  (rows || []).forEach((r) => {
    const name = String(r.description || '').trim();
    if (!name) return;
    const key = normalizeMatchText(name);
    if (seen.has(key)) return;
    seen.add(key);
    names.push(name);
  });
  return names;
};
