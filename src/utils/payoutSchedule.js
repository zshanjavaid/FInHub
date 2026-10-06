import { addMonths } from 'date-fns';
import { normalizeDateToYYYYMMDD } from './date';
import { normalizePayoutOccurrence } from '../constants/payoutOccurrences';

export const payoutShareCount = (project) => {
  const key = normalizePayoutOccurrence(project?.payoutOccurrence);
  if (key === 'weekly') return 4;
  if (key === 'monthly') return 1;
  return 2;
};

const toDateFromYmd = (ymd) => {
  if (!ymd) return null;
  const [y, m, d] = String(ymd).slice(0, 10).split('-').map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

const daysInMonth = (year, monthIndex0) => new Date(year, monthIndex0 + 1, 0).getDate();

export const buildExpectedTransactionDatesForMonth = (project, monthKey) => {
  const mk = String(monthKey || '').slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(mk)) return [];
  const [yy, mm] = mk.split('-').map(Number);
  if (!Number.isFinite(yy) || !Number.isFinite(mm)) return [];

  const lastDay = new Date(yy, mm, 0).getDate();
  const payoutOccurrence = normalizePayoutOccurrence(project?.payoutOccurrence);
  const startYmd = normalizeDateToYYYYMMDD(project?.date);
  const startDay = (() => {
    if (!startYmd) return 1;
    if (startYmd.slice(0, 7) !== mk) return 1;
    const d = Number(startYmd.slice(8, 10));
    return Number.isFinite(d) ? d : 1;
  })();

  const clampDay = (d) => Math.max(1, Math.min(lastDay, d));
  const ymd = (day) => `${mk}-${String(clampDay(day)).padStart(2, '0')}`;

  const buildSegmentSlots = (segStartDay, segEndDay, count) => {
    const start = Math.max(segStartDay, startDay);
    const end = segEndDay;
    if (start > end) return [];
    if (count <= 1) return [ymd(end)];
    if (count === 2) {
      const a = ymd(start);
      const b = ymd(end);
      return [a, b];
    }
    const slots = [];
    const span = Math.max(1, end - start);
    for (let i = 0; i < count; i += 1) {
      const day = Math.round(start + (span * i) / Math.max(1, count - 1));
      slots.push(ymd(day));
    }
    return slots;
  };

  let dates = [];
  if (payoutOccurrence === 'weekly') {
    dates = [
      ...buildSegmentSlots(1, 15, 2),
      ...buildSegmentSlots(16, lastDay, 2)
    ];
  } else if (payoutOccurrence === 'monthly') {
    const ps = toDateFromYmd(startYmd);
    const targetDay = ps ? ps.getDate() : 1;
    const d = clampDay(targetDay);
    const picked = d < startDay ? startDay : d;
    dates = [ymd(picked)];
  } else {
    dates = [
      ...buildSegmentSlots(1, 15, 1),
      ...buildSegmentSlots(16, lastDay, 1)
    ];
  }

  if (!startYmd) return dates;
  return dates.filter((d) => d >= startYmd);
};

const firstOccurrenceMonthly = (startDate, rangeStart) => {
  const targetDay = startDate.getDate();
  const y = rangeStart.getFullYear();
  const m = rangeStart.getMonth();
  const dim = daysInMonth(y, m);
  const occ = new Date(y, m, Math.min(targetDay, dim));
  if (occ < rangeStart) {
    const next = addMonths(occ, 1);
    const nd = daysInMonth(next.getFullYear(), next.getMonth());
    return new Date(next.getFullYear(), next.getMonth(), Math.min(targetDay, nd));
  }
  return occ;
};

export const countExpectedPayoutsInRange = (project, rangeFrom, rangeTo) => {
  const fromYmd = normalizeDateToYYYYMMDD(rangeFrom);
  const toYmd = normalizeDateToYYYYMMDD(rangeTo);
  const startYmd = normalizeDateToYYYYMMDD(project?.date);
  if (!fromYmd || !toYmd || !startYmd) return 0;

  const rs = toDateFromYmd(fromYmd);
  const re = toDateFromYmd(toYmd);
  const ps = toDateFromYmd(startYmd);
  if (!rs || !re || !ps) return 0;
  if (rs > re) return 0;

  const rangeStart = rs > ps ? rs : ps;
  const rangeEnd = re;
  if (rangeStart > rangeEnd) return 0;

  const payoutOccurrence = normalizePayoutOccurrence(project?.payoutOccurrence);

  if (payoutOccurrence === 'biweekly') {
    // Two pay periods per calendar month: 1–15 and 16–end-of-month.
    // Count how many periods overlap the range and occur on/after project start.
    let count = 0;
    const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
    const last = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1);
    while (cursor <= last) {
      const y = cursor.getFullYear();
      const m0 = cursor.getMonth();
      const dim = daysInMonth(y, m0);
      const p1Start = new Date(y, m0, 1);
      const p1End = new Date(y, m0, 15);
      const p2Start = new Date(y, m0, 16);
      const p2End = new Date(y, m0, dim);

      const segs = [
        { start: p1Start, end: p1End },
        { start: p2Start, end: p2End }
      ];

      segs.forEach((seg) => {
        const s = seg.start < rangeStart ? rangeStart : seg.start;
        const e = seg.end > rangeEnd ? rangeEnd : seg.end;
        if (s > e) return;
        if (seg.end < ps) return;
        count += 1;
      });

      cursor.setMonth(cursor.getMonth() + 1);
      if (count > 2000) break;
    }
    return count;
  }

  if (payoutOccurrence === 'weekly') {
    // Weekly here means 4 per month, split as:
    // 1–15 => 2 transactions, 16–end => 2 transactions.
    // This avoids over-counting when the project starts mid-month.
    let count = 0;
    const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
    const last = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1);
    while (cursor <= last) {
      const y = cursor.getFullYear();
      const m0 = cursor.getMonth();
      const dim = daysInMonth(y, m0);
      const p1Start = new Date(y, m0, 1);
      const p1End = new Date(y, m0, 15);
      const p2Start = new Date(y, m0, 16);
      const p2End = new Date(y, m0, dim);

      const segs = [
        { start: p1Start, end: p1End, expected: 2 },
        { start: p2Start, end: p2End, expected: 2 }
      ];

      segs.forEach((seg) => {
        const s = seg.start < rangeStart ? rangeStart : seg.start;
        const e = seg.end > rangeEnd ? rangeEnd : seg.end;
        if (s > e) return;
        if (seg.end < ps) return;
        count += seg.expected;
      });

      cursor.setMonth(cursor.getMonth() + 1);
      if (count > 2000) break;
    }
    return count;
  }

  // monthly
  let occ = firstOccurrenceMonthly(ps, rangeStart);
  let count = 0;
  while (occ <= rangeEnd) {
    count += 1;
    const next = addMonths(occ, 1);
    const dim = daysInMonth(next.getFullYear(), next.getMonth());
    occ = new Date(next.getFullYear(), next.getMonth(), Math.min(ps.getDate(), dim));
    if (count > 200) break;
  }
  return count;
};

export const getPayoutOccurrenceLabel = (project, labelByValue) => {
  const key = normalizePayoutOccurrence(project?.payoutOccurrence);
  return labelByValue?.[key] || (key === 'weekly' ? 'Weekly' : key === 'monthly' ? 'Monthly' : 'Semi-Monthly');
};

const monthKeyToRange = (monthKey) => {
  const [y, m] = String(monthKey).split('-').map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return { from: '', to: '' };
  const lastDay = new Date(y, m, 0).getDate();
  return {
    from: `${String(monthKey)}-01`,
    to: `${String(monthKey)}-${String(lastDay).padStart(2, '0')}`
  };
};

export const listMonthKeysInRange = (rangeFrom, rangeTo) => {
  const fromYmd = normalizeDateToYYYYMMDD(rangeFrom);
  const toYmd = normalizeDateToYYYYMMDD(rangeTo);
  if (!fromYmd || !toYmd) return [];
  const rs = toDateFromYmd(fromYmd);
  const re = toDateFromYmd(toYmd);
  if (!rs || !re || rs > re) return [];
  const keys = [];
  const d = new Date(rs.getFullYear(), rs.getMonth(), 1);
  const last = new Date(re.getFullYear(), re.getMonth(), 1);
  while (d <= last) {
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    d.setMonth(d.getMonth() + 1);
    if (keys.length > 240) break;
  }
  return keys;
};

export const countExpectedWithCarryover = (project, transactionsForProject = [], rangeFrom, rangeTo) => {
  const months = listMonthKeysInRange(rangeFrom, rangeTo);
  if (months.length === 0) return { expected: 0, carryIn: 0, expectedThisRange: 0 };

  const txYmd = (transactionsForProject || [])
    .map((t) => normalizeDateToYYYYMMDD(t?.date))
    .filter(Boolean);

  const monthActual = new Map();
  txYmd.forEach((d) => {
    const mk = d.slice(0, 7);
    monthActual.set(mk, (monthActual.get(mk) || 0) + 1);
  });

  const prev = (() => {
    const first = months[0];
    const [y, m] = first.split('-').map(Number);
    const prevDate = new Date(y, (m || 1) - 2, 1);
    return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  })();

  const prevRange = monthKeyToRange(prev);
  const prevExpected = prevRange.from ? countExpectedPayoutsInRange(project, prevRange.from, prevRange.to) : 0;
  const prevActual = monthActual.get(prev) || 0;
  const carryIn = Math.max(0, prevExpected - prevActual);

  let expectedThisRange = 0;
  months.forEach((mk) => {
    const mr = monthKeyToRange(mk);
    const exp = mr.from ? countExpectedPayoutsInRange(project, mr.from, mr.to) : 0;
    expectedThisRange += exp;
  });

  return { expected: expectedThisRange + carryIn, carryIn, expectedThisRange };
};
