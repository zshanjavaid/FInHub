import {
  EXPENSE_TYPE_LABELS,
  formatExpenseTypeLabel,
  slugifyExpenseType,
  collectExpenseTypeLabels
} from '../constants/expenseTypes';
import {
  parseCsvText,
  parseAmount,
  parseMercuryTimestampToYmd,
  normalizeMatchText
} from './csvTransactionImport';

/**
 * Keyword → expense type (storage value). First match wins.
 * Built-in rules; learned rules from prior expenses are layered on top at detect time.
 */
export const EXPENSE_TYPE_KEYWORD_RULES = [
  { type: 'rent', keywords: ['office rent', 'rent'] },
  {
    type: 'software_tool',
    keywords: [
      'software',
      'subscription',
      'saas',
      'cloud',
      'hosting',
      'aws',
      'azure',
      'gcp',
      'github',
      'gitlab',
      'notion',
      'slack',
      'figma',
      'adobe'
    ]
  },
  { type: 'salaries', keywords: ['salary', 'salaries', 'payroll', 'wage', 'wages'] },
  { type: 'brokerage', keywords: ['brokerage', 'broker fee', 'broker fees'] },
  { type: 'fh', keywords: ['finhub', ' fh '] },
  {
    type: 'bill',
    keywords: ['bill', 'electric', 'internet', 'phone', 'wifi', 'utility', 'utilities', 'water', 'gas']
  }
  // Do not auto-map to `general` — unmatched rows stay blank (Need type).
];

/**
 * Build keyword rules from existing expenses so typed categories reuse next import.
 * Exact expense names become keywords for that type (custom or built-in).
 */
export const buildLearnedExpenseTypeRules = (expenses = []) => {
  const byType = new Map();
  (expenses || []).forEach((e) => {
    const type = slugifyExpenseType(e?.expenseType);
    const name = normalizeMatchText(e?.expenseName);
    if (!type || !name || name.length < 2) return;
    // Never learn auto-fill for generic fallback type from weak cues
    if (!byType.has(type)) byType.set(type, new Set());
    byType.get(type).add(name);
  });
  return [...byType.entries()].map(([type, keywords]) => ({
    type,
    keywords: [...keywords]
  }));
};

const matchAgainstRules = (hay, rules) => {
  for (const rule of rules || []) {
    for (const kw of rule.keywords || []) {
      const needle = normalizeMatchText(kw);
      if (!needle) continue;
      if (hay.includes(` ${needle} `) || hay.includes(needle)) {
        return rule.type;
      }
    }
  }
  return '';
};

/**
 * If any word in Expense Name matches a Type label/value word, auto-select that type.
 * Longer type labels win (e.g. "Software Tool" before a short custom type).
 * Skips `general` unless the name explicitly contains "general".
 */
export const matchExpenseTypeByNameWords = (description = '', typeOptions = []) => {
  const nameNorm = normalizeMatchText(description);
  if (!nameNorm) return '';
  const hay = ` ${nameNorm} `;
  const nameTokens = new Set(nameNorm.split(' ').filter((t) => t.length >= 2));
  if (!nameTokens.size) return '';

  const ranked = [...(typeOptions || [])].sort(
    (a, b) => String(b.label || '').length - String(a.label || '').length
  );

  for (const opt of ranked) {
    const value = String(opt?.value || '').trim();
    const label = String(opt?.label || formatExpenseTypeLabel(value) || '').trim();
    if (!value) continue;
    // Do not soft-match General — only if the word "general" is in the name.
    if (value === 'general' && !nameTokens.has('general')) continue;

    const labelNorm = normalizeMatchText(label);
    if (labelNorm && (hay.includes(` ${labelNorm} `) || hay.includes(labelNorm))) {
      return value;
    }

    const typeWords = [
      ...labelNorm.split(' ').filter((t) => t.length >= 2),
      ...value.split('_').filter((t) => t.length >= 2)
    ];
    const unique = [...new Set(typeWords)];
    if (unique.some((w) => nameTokens.has(w))) return value;
  }
  return '';
};

/**
 * Detect FinHub expense type from Description (keyword rules, no AI).
 * Order: learned names → word match vs type labels → built-in keywords.
 */
export const detectExpenseTypeFromDescription = (
  description = '',
  { learnedRules = [], typeOptions = [] } = {}
) => {
  const hay = ` ${normalizeMatchText(description)} `;
  if (!hay.trim()) return '';

  const learned = matchAgainstRules(hay, learnedRules);
  if (learned) return learned;

  const byWord = matchExpenseTypeByNameWords(description, typeOptions);
  if (byWord) return byWord;

  return matchAgainstRules(hay, EXPENSE_TYPE_KEYWORD_RULES);
};

const headerKey = (h) => String(h || '').trim().toLowerCase();

const labelForType = (type, labelByValue = {}) =>
  labelByValue[type] || EXPENSE_TYPE_LABELS[type] || formatExpenseTypeLabel(type);

/**
 * Parse Mercury-style expense CSV into preview rows.
 * Maps: Description→name, Date (UTC)→date, Amount→amount,
 * Note else Bank Description→comment, type from Description when matched.
 */
export const parseMercuryExpenseCsv = (text, { expenses = [], labelByValue = {} } = {}) => {
  const matrix = parseCsvText(text);
  if (!matrix.length) return { headers: [], rows: [], error: 'CSV is empty.' };

  const headers = matrix[0].map((h) => String(h || '').trim());
  const indexBy = {};
  headers.forEach((h, i) => {
    indexBy[headerKey(h)] = i;
  });

  const hasDescription = indexBy.description !== undefined;
  const hasAmount = indexBy.amount !== undefined;
  const hasDate =
    indexBy['date (utc)'] !== undefined ||
    indexBy.date !== undefined ||
    indexBy.timestamp !== undefined;

  if (!hasDescription || !hasAmount || !hasDate) {
    const missing = [
      !hasDescription ? 'description' : null,
      !hasAmount ? 'amount' : null,
      !hasDate ? 'date (utc) or timestamp' : null
    ].filter(Boolean);
    return {
      headers,
      rows: [],
      error: `Missing required column(s): ${missing.join(', ')}. Expected Mercury expense export format.`
    };
  }

  const get = (cols, name) => {
    const i = indexBy[name];
    return i === undefined ? '' : String(cols[i] ?? '').trim();
  };

  const learnedRules = buildLearnedExpenseTypeRules(expenses);
  const typeOptions = collectExpenseTypeLabels(expenses, { includeBuiltins: true });
  const rows = [];
  for (let r = 1; r < matrix.length; r += 1) {
    const cols = matrix[r];
    const description = get(cols, 'description');
    const amount = parseAmount(get(cols, 'amount'));
    const status = get(cols, 'status');
    const timestamp = get(cols, 'timestamp') || get(cols, 'date (utc)') || get(cols, 'date');
    const date = parseMercuryTimestampToYmd(timestamp);
    const note = get(cols, 'note');
    const bankDescription = get(cols, 'bank description');
    const comment = note || bankDescription || '';

    if (!description && !Number.isFinite(amount)) continue;

    const detectedType = detectExpenseTypeFromDescription(description, {
      learnedRules,
      typeOptions
    });
    const typeMatched = Boolean(detectedType);

    rows.push({
      rowKey: `exp-csv-${r}`,
      lineNumber: r + 1,
      expenseName: description,
      date,
      amount: Number.isFinite(amount) ? amount : NaN,
      status,
      comment,
      bankDescription,
      note,
      expenseType: typeMatched ? detectedType : '',
      expenseTypeLabel: typeMatched ? labelForType(detectedType, labelByValue) : '',
      typeMatched,
      timestamp
    });
  }

  return { headers, rows, error: '' };
};

export const buildImportedExpenseData = (row, { createdBy = null } = {}) => ({
  expenseName: String(row.expenseName || '').trim(),
  date: String(row.date || '').trim(),
  expenseType: slugifyExpenseType(row.expenseType || row.expenseTypeLabel),
  amount: Number(row.amount) || 0,
  comment: String(row.comment || '').trim(),
  createdBy
});

export const isExpenseImportRowReady = (row) => {
  if (!row) return false;
  if (!String(row.expenseName || '').trim()) return false;
  if (!String(row.date || '').trim()) return false;
  if (!Number.isFinite(Number(row.amount)) || Number(row.amount) <= 0) return false;
  if (!slugifyExpenseType(row.expenseType || row.expenseTypeLabel)) return false;
  return true;
};
