import { isApproved } from '../constants/app';
import {
  MONTH_NAMES,
  normalizeDateToYYYYMMDD,
  expenseDateValue,
  getCalendarMonthRange,
  monthSlotsForRange,
  addIntoMonthSlots,
  todayLocalYmd
} from './date';
import { toNumber, roundMoney } from './number';
import { sumTransactionNetAfterImpactFund, transactionNetAfterImpactFund } from './transactionNet';
import {
  sumExpenseAmountsForAvailable,
  isMirroredTransactionBrokerageExpense
} from './availableBalance';

const inRange = (ymd, from, to) => {
  if (!ymd) return false;
  if (from && ymd < from) return false;
  if (to && ymd > to) return false;
  return true;
};

const filterApprovedTx = (transactions = [], from, to) =>
  (transactions || []).filter((t) => {
    if (!isApproved(t)) return false;
    return inRange(normalizeDateToYYYYMMDD(t.date), from || null, to || null);
  });

const filterApprovedExpenses = (expenses = [], from, to) =>
  (expenses || []).filter((e) => {
    if (!isApproved(e)) return false;
    return inRange(expenseDateValue(e), from || null, to || null);
  });

const sumGross = (transactions = []) =>
  (transactions || []).reduce((s, t) => s + toNumber(t.amount), 0);

const pctChange = (current, previous) => {
  if (!Number.isFinite(previous) || previous === 0) return null;
  return roundMoney(((current - previous) / Math.abs(previous)) * 100);
};

const shiftMonth = (year, month1to12, delta) => {
  const d = new Date(year, month1to12 - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
};

/**
 * Last day of the previous calendar month.
 * Evaluation ignores the in-progress month until it has full data.
 */
export const evaluationAsOf = (now = new Date()) => {
  const ref = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  return new Date(ref.getFullYear(), ref.getMonth(), 0);
};

/**
 * MoM: last complete month gross vs the month before.
 * YoY: YTD through last complete month vs same date span last year.
 */
export const computeRevenueGrowth = (transactions = [], now = new Date()) => {
  const ref = evaluationAsOf(now);
  const y = ref.getFullYear();
  const m = ref.getMonth() + 1;
  const asOfYmd = todayLocalYmd(ref);

  const thisMonth = getCalendarMonthRange(y, m);
  const prev = shiftMonth(y, m, -1);
  const prevMonth = getCalendarMonthRange(prev.year, prev.month);

  const thisMonthGross = sumGross(filterApprovedTx(transactions, thisMonth.from, thisMonth.to));
  const prevMonthGross = sumGross(filterApprovedTx(transactions, prevMonth.from, prevMonth.to));

  const ytdFrom = `${y}-01-01`;
  const priorYtdFrom = `${y - 1}-01-01`;
  const priorYtdTo = `${y - 1}-${asOfYmd.slice(5)}`;

  const ytdGross = sumGross(filterApprovedTx(transactions, ytdFrom, asOfYmd));
  const priorYtdGross = sumGross(filterApprovedTx(transactions, priorYtdFrom, priorYtdTo));

  return {
    mom: {
      current: thisMonthGross,
      previous: prevMonthGross,
      pct: pctChange(thisMonthGross, prevMonthGross),
      currentLabel: `${MONTH_NAMES[m - 1]} ${y}`,
      previousLabel: `${MONTH_NAMES[prev.month - 1]} ${prev.year}`
    },
    yoy: {
      current: ytdGross,
      previous: priorYtdGross,
      pct: pctChange(ytdGross, priorYtdGross),
      currentLabel: `YTD ${y} through ${MONTH_NAMES[m - 1]}`,
      previousLabel: `YTD ${y - 1} (same period)`
    }
  };
};

/**
 * Gross margin = Inward / Gross (after brokerage/charges/impact fund).
 * Net margin = Available / Gross (Available = Inward − Expense).
 */
export const computeMargins = (transactions = [], expenses = [], { from = '', to = '' } = {}) => {
  const txs = filterApprovedTx(transactions, from || null, to || null);
  const exps = filterApprovedExpenses(expenses, from || null, to || null);
  const gross = sumGross(txs);
  const inward = sumTransactionNetAfterImpactFund(txs);
  const expense = sumExpenseAmountsForAvailable(exps, txs);
  const available = inward - expense;

  return {
    gross,
    inward,
    expense,
    available,
    grossMarginPct: gross > 0 ? roundMoney((inward / gross) * 100) : null,
    netMarginPct: gross > 0 ? roundMoney((available / gross) * 100) : null
  };
};

/** Last `months` complete calendar months ending at evaluation as-of (inclusive). */
export const lastNMonthRange = (months = 12, now = new Date()) => {
  const ref = evaluationAsOf(now);
  const endY = ref.getFullYear();
  const endM = ref.getMonth() + 1;
  const start = shiftMonth(endY, endM, -(Math.max(1, months) - 1));
  const fromRange = getCalendarMonthRange(start.year, start.month);
  const toRange = getCalendarMonthRange(endY, endM);
  return { from: fromRange.from, to: toRange.to };
};

/** Monthly cash in (transaction nets) vs cash out (expenses for available). */
export const computeMonthlyCashFlow = (transactions = [], expenses = [], { from, to } = {}) => {
  const range = from && to ? { from, to } : lastNMonthRange(12);
  const span = monthSlotsForRange(range.from, range.to);
  if (!span.valid) {
    return { labels: [], inflow: [], outflow: [], net: [], from: range.from, to: range.to };
  }

  const inflow = span.slots.map(() => 0);
  const outflow = span.slots.map(() => 0);
  const txsAll = (transactions || []).filter(isApproved);

  filterApprovedTx(transactions, range.from, range.to).forEach((t) => {
    addIntoMonthSlots(inflow, t.date, transactionNetAfterImpactFund(t), span.slots);
  });

  filterApprovedExpenses(expenses, range.from, range.to).forEach((e) => {
    if (isMirroredTransactionBrokerageExpense(e, txsAll)) return;
    addIntoMonthSlots(outflow, expenseDateValue(e), toNumber(e.amount), span.slots);
  });

  return {
    labels: span.labels,
    inflow,
    outflow,
    net: inflow.map((v, i) => roundMoney(v - outflow[i])),
    from: range.from,
    to: range.to
  };
};

/**
 * Runway months = Available ÷ avg monthly expenses over last 3 complete months.
 * Available is all-time inward − expense (same as Dashboard Available without date filter).
 */
export const computeRunway = (transactions = [], expenses = [], now = new Date()) => {
  const { available } = computeMargins(transactions, expenses, {});
  const range = lastNMonthRange(3, now);
  const span = monthSlotsForRange(range.from, range.to);
  const monthly = span.valid ? span.slots.map(() => 0) : [];
  const txsAll = (transactions || []).filter(isApproved);

  if (span.valid) {
    filterApprovedExpenses(expenses, range.from, range.to).forEach((e) => {
      if (isMirroredTransactionBrokerageExpense(e, txsAll)) return;
      addIntoMonthSlots(monthly, expenseDateValue(e), toNumber(e.amount), span.slots);
    });
  }

  const monthsWithData = monthly.filter((v) => v > 0);
  const avgMonthlyExpense =
    monthsWithData.length > 0
      ? roundMoney(monthly.reduce((s, v) => s + v, 0) / Math.max(monthly.length, 1))
      : 0;

  const months =
    avgMonthlyExpense > 0 ? roundMoney(available / avgMonthlyExpense) : null;

  return {
    available,
    avgMonthlyExpense,
    months,
    windowLabel: 'Last 3 complete months',
    fragile: months != null && months < 2
  };
};

export const buildEvaluationSnapshot = (transactions = [], expenses = [], now = new Date()) => {
  const asOf = evaluationAsOf(now);
  const asOfMonth = asOf.getMonth() + 1;
  const asOfYear = asOf.getFullYear();
  const growth = computeRevenueGrowth(transactions, now);
  const cashRange = lastNMonthRange(12, now);
  const margins = computeMargins(transactions, expenses, cashRange);
  const cashFlow = computeMonthlyCashFlow(transactions, expenses, cashRange);
  const runway = computeRunway(transactions, expenses, now);

  return {
    asOfLabel: `Through ${MONTH_NAMES[asOfMonth - 1]} ${asOfYear}`,
    growth,
    margins,
    cashFlow,
    runway,
    fragileMargin: margins.grossMarginPct != null && margins.grossMarginPct < 40
  };
};
