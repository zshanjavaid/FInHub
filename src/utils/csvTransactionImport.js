import { normalizeDateToYYYYMMDD, todayLocalYmd } from './date';
import { computeProjectBrokerageDollars } from './project';
import { firstWeekdayOnOrAfter } from './workingDays';
import { isApproved } from '../constants/app';

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

/** Strip trailing codes like -1234 / 1234 so Bernard-1234 can match Bernard Nickels… */
const stripMatchNoise = (value) =>
  String(value || '')
    .replace(/[-_]?\d{2,}(?=\s|$)/g, ' ')
    .replace(/\b\d+\b/g, ' ')
    .trim();

const scoreProjectMatch = (description, projectName) => {
  const rawDesc = String(description || '').trim();
  const cleanedDesc = stripMatchNoise(rawDesc) || rawDesc;
  const descNorm = normalizeMatchText(cleanedDesc);
  const projNorm = normalizeMatchText(projectName);
  if (!descNorm || !projNorm) return 0;

  if (normalizeMatchText(rawDesc) === projNorm || descNorm === projNorm) return 100;
  if (projNorm.includes(descNorm) || descNorm.includes(projNorm)) {
    const shorter = Math.min(descNorm.length, projNorm.length);
    const longer = Math.max(descNorm.length, projNorm.length);
    return Math.round(85 + (shorter / longer) * 14);
  }

  const alphaOnly = (t) => /^[a-z]+$/i.test(t) && t.length > 1;
  const descTokens = tokenize(cleanedDesc).filter(alphaOnly);
  const projTokens = tokenize(projectName).filter(alphaOnly);
  if (!descTokens.length || !projTokens.length) return 0;

  let tokenHits = 0;
  descTokens.forEach((dt) => {
    const hit = projTokens.some(
      (pt) =>
        pt === dt ||
        pt.includes(dt) ||
        dt.includes(pt) ||
        (dt.length >= 3 && pt.startsWith(dt.slice(0, Math.min(4, dt.length))))
    );
    if (hit) tokenHits += 1;
  });
  // Score against description tokens so "Bernard" vs long project name still ranks high
  const tokenScore = (tokenHits / descTokens.length) * 80;

  const compactDesc = descNorm.replace(/\s+/g, '');
  const compactProj = projNorm.replace(/\s+/g, '');
  let prefix = 0;
  const maxPrefix = Math.min(compactDesc.length, compactProj.length);
  while (prefix < maxPrefix && compactDesc[prefix] === compactProj[prefix]) prefix += 1;
  const prefixScore = maxPrefix > 0 ? (prefix / maxPrefix) * 55 : 0;

  // First meaningful word exact match (Bernard ↔ Bernard Nickels…)
  const firstDesc = descTokens[0];
  const firstProj = projTokens[0];
  const firstWordBonus =
    firstDesc && firstProj && (firstDesc === firstProj || firstProj.startsWith(firstDesc) || firstDesc.startsWith(firstProj))
      ? 35
      : 0;

  return Math.round(Math.max(tokenScore + firstWordBonus * 0.5, prefixScore + firstWordBonus, tokenScore));
};

/**
 * Auto-match CSV Description to the best project name (exact, partial, or highest similarity).
 */
export const findMatchingProject = ({ description, broker, projects = [], minScore = 40 } = {}) => {
  const desc = String(description || '').trim();
  if (!desc) return null;

  const list = (projects || []).filter((p) => {
    if (!broker) return true;
    return (p.client || '').trim().toLowerCase() === broker.trim().toLowerCase();
  });
  if (!list.length) return null;

  let best = null;
  let bestScore = 0;
  list.forEach((p) => {
    const score = scoreProjectMatch(desc, p.project);
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  });

  if (!best || bestScore < minScore) return null;
  return best;
};

/**
 * Duplicate match key for amount: ignore cents so a manual rounded entry (300)
 * matches a bank/CSV amount like 300.45 on the same date.
 */
const amountKey = (amount) => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
};

export const dupeKey = (dateYmd, amount) => `${dateYmd}|${amountKey(amount)}`;

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * CSV import stores the bank amount as-is.
 * Brokerage is handled once per project/month as an expense — not on each transaction.
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
  const data = {
    client: String(client || '').trim(),
    project: String(project || '').trim(),
    date: normalizeDateToYYYYMMDD(date) || String(date || '').slice(0, 10),
    amount: gross,
    brokerageType: projectRow?.brokerageType || 'percentage',
    brokerageValue: 0,
    brokerageAmount: 0,
    additionalCharges: 0,
    totalAmount: gross
  };

  if (createdBy) data.createdBy = createdBy;
  return data;
};

export const monthKeyFromYmd = (dateYmd) => {
  const d = normalizeDateToYYYYMMDD(dateYmd) || String(dateYmd || '').slice(0, 10);
  return d.length >= 7 ? d.slice(0, 7) : '';
};

export const brokerageExpenseMonthKey = (expense) => {
  if (expense?.monthKey) return String(expense.monthKey).slice(0, 7);
  return monthKeyFromYmd(expense?.date);
};

export const isMonthlyBrokerageExpense = (expense, { client, project, monthKey }) => {
  if (!expense) return false;
  const mk = brokerageExpenseMonthKey(expense);
  if (!mk || mk !== monthKey) return false;

  const eClient = (expense.client || '').trim().toLowerCase();
  const eProject = (expense.project || '').trim().toLowerCase();
  const c = (client || '').trim().toLowerCase();
  const p = (project || '').trim().toLowerCase();

  if (expense.isMonthlyBrokerage && eClient === c && eProject === p) return true;

  if (String(expense.expenseType || '').toLowerCase() === 'brokerage' && eClient === c && eProject === p) {
    return true;
  }

  return false;
};

export const findExistingMonthlyBrokerage = (expenses = [], { client, project, monthKey }) =>
  (expenses || []).find((e) => isMonthlyBrokerageExpense(e, { client, project, monthKey })) || null;

/** First day of YYYY-MM as expense date (fallback for historical months). */
export const monthStartDate = (monthKey) => {
  const mk = String(monthKey || '').slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(mk)) return '';
  return `${mk}-01`;
};

/** Prefer transaction/create date; keep it inside monthKey so month filters still work. */
export const resolveMonthlyBrokerageExpenseDate = (monthKey, dateHint = null) => {
  const mk = String(monthKey || '').slice(0, 7);
  const hint = normalizeDateToYYYYMMDD(dateHint);
  const today = todayLocalYmd();

  if (hint && (!mk || hint.slice(0, 7) === mk)) return hint;
  if (mk && today.slice(0, 7) === mk) return today;
  if (mk && /^\d{4}-\d{2}$/.test(mk)) return monthStartDate(mk);
  return today;
};

export const buildMonthlyBrokerageExpenseData = ({
  client,
  project,
  monthKey,
  amount,
  brokerageType = 'percentage',
  brokerageValue = '',
  createdBy = null,
  date = null
}) => {
  const type = String(brokerageType || 'percentage').trim().toLowerCase() === 'fixed' ? 'fixed' : 'percentage';
  const mk = String(monthKey || '').slice(0, 7);
  const data = {
    expenseName: String(project || '').trim() || 'Untitled project',
    date: resolveMonthlyBrokerageExpenseDate(mk, date),
    expenseType: 'brokerage',
    amount: Number(Number(amount).toFixed(2)),
    comment: `Monthly brokerage for ${client} / ${project} (${mk})`,
    client: String(client || '').trim(),
    project: String(project || '').trim(),
    monthKey: mk,
    isMonthlyBrokerage: true,
    brokerageType: type,
    brokerageValue: brokerageValue === '' || brokerageValue == null ? '' : Number(brokerageValue)
  };
  if (createdBy) data.createdBy = createdBy;
  return data;
};

/**
 * Monthly brokerage for import:
 * 1) Fixed: prorated by Mon–Fri days in `monthKey` (start/end clipped to month)
 * 2) Else project hours × rate × brokerage % when available
 * 3) Else percentage of that month's imported transaction total
 */
export const computeImportMonthlyBrokerageAmount = (projectRow, monthGrossAmount = 0, monthKey = '', options = {}) => {
  const type = String(projectRow?.brokerageType || 'percentage').trim().toLowerCase();
  const val = toNumber(projectRow?.brokerageValue);
  const mk = String(monthKey || '').slice(0, 7);

  if (type === 'fixed') {
    if (!(val > 0)) return 0;
    if (mk && /^\d{4}-\d{2}$/.test(mk)) {
      return Number(
        computeProjectBrokerageDollars(projectRow, {
          monthKey: mk,
          activeFromYmd: options.activeFromYmd
        }).toFixed(2)
      );
    }
    return Number(val.toFixed(2));
  }

  const fromProject = Number(computeProjectBrokerageDollars(projectRow).toFixed(2));
  if (fromProject > 0) return fromProject;

  if (!(val > 0)) return 0;
  const gross = toNumber(monthGrossAmount);
  if (!(gross > 0)) return 0;
  return Number((gross * (val / 100)).toFixed(2));
};

/**
 * Build a new monthly brokerage expense payload if one does not already exist
 * for this client/project/month (same rule as CSV import).
 */
export const planNewMonthlyBrokerageExpense = ({
  client,
  project,
  date,
  projectRow = null,
  expenses = [],
  monthGrossAmount = 0,
  createdBy = null
}) => {
  const c = String(client || '').trim();
  const p = String(project || '').trim();
  const monthKey = monthKeyFromYmd(date);
  if (!c || !p || !monthKey || !projectRow) return null;

  if (findExistingMonthlyBrokerage(expenses, { client: c, project: p, monthKey })) {
    return null;
  }

  const amount = computeImportMonthlyBrokerageAmount(projectRow, monthGrossAmount, monthKey, {
    activeFromYmd: firstWeekdayOnOrAfter(date) || date
  });
  if (!(amount > 0)) return null;

  return buildMonthlyBrokerageExpenseData({
    client: c,
    project: p,
    monthKey,
    amount,
    brokerageType: projectRow.brokerageType || 'percentage',
    brokerageValue: projectRow.brokerageValue ?? '',
    createdBy,
    date
  });
};

/**
 * Classify CSV rows vs existing transactions by date+amount.
 * - Pending match → auto-skip (already awaiting approval; not shown on Transactions)
 * - Approved match → ask override / keep_both
 * - No match → ready to import
 */
export const classifyCsvRowsAgainstExisting = ({ csvRows = [], existingTransactions = [] }) => {
  const pendingByKey = new Map();
  const approvedByKey = new Map();

  (existingTransactions || []).forEach((t) => {
    const date = normalizeDateToYYYYMMDD(t?.date);
    const amount = Number(t?.amount);
    if (!date || !Number.isFinite(amount)) return;
    const key = dupeKey(date, amount);
    const bucket = isApproved(t) ? approvedByKey : pendingByKey;
    const arr = bucket.get(key) || [];
    arr.push(t);
    bucket.set(key, arr);
  });

  const usedPending = new Map();
  const usedApproved = new Map();

  return (csvRows || []).map((row) => {
    const date = row.date;
    const amount = row.amount;
    if (!date || !Number.isFinite(amount)) {
      return { ...row, importStatus: 'invalid', reason: 'Missing date or amount', existingMatchId: null };
    }

    const key = dupeKey(date, amount);
    const pendingMatches = pendingByKey.get(key) || [];
    const approvedMatches = approvedByKey.get(key) || [];

    const pendingUsed = usedPending.get(key) || 0;
    if (pendingUsed < pendingMatches.length) {
      usedPending.set(key, pendingUsed + 1);
      return {
        ...row,
        importStatus: 'skip',
        existingMatchId: pendingMatches[pendingUsed]?.id || null,
        reason: 'Already pending approval'
      };
    }

    const approvedUsed = usedApproved.get(key) || 0;
    if (approvedUsed < approvedMatches.length) {
      usedApproved.set(key, approvedUsed + 1);
      const existing = approvedMatches[approvedUsed];
      return {
        ...row,
        importStatus: 'ask',
        existingMatchId: existing?.id || null,
        reason: 'Same date and amount already exists'
      };
    }

    return { ...row, importStatus: 'ready', reason: '', existingMatchId: null };
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
