import { roundMoney, toNumber } from './number';
import { prorateFixedAmountForMonth } from './workingDays';
import { impactFundFromNet } from './transactionNet';
import { normalizeDateToYYYYMMDD } from './date';
import { appendContractExtension } from './projectContractExtensions';

/** Allocation-only company tax (not used on project forms / live transactions). */
export const ALLOCATION_COMPANY_TAX_RATE = 0.3;

/**
 * Brokerage in dollars.
 * - Percentage: hours × rate × (value / 100)
 * - Fixed: full monthly fee, or prorated by Mon–Fri days when `monthKey` (YYYY-MM) is provided
 */
export const computeProjectBrokerageDollars = (p, options = {}) => {
  const hours = toNumber(p.totalMonthlyHours);
  const rate = toNumber(p.hourlyRate);
  const gross = hours * rate;
  const isPercentage = (p.brokerageType || 'percentage') === 'percentage';
  if (isPercentage) return gross * (toNumber(p.brokerageValue) / 100);

  const fixed = toNumber(p.brokerageValue);
  const monthKey = options.monthKey ? String(options.monthKey).slice(0, 7) : '';
  if (monthKey && /^\d{4}-\d{2}$/.test(monthKey)) {
    return prorateFixedAmountForMonth(p, monthKey, fixed, {
      activeFromYmd: options.activeFromYmd
    });
  }
  return fixed;
};

/** Tax in dollars for allocation (same basis as gross: hours × rate). */
export const computeProjectTaxDollars = (p) => {
  const hours = toNumber(p.totalMonthlyHours);
  const rate = toNumber(p.hourlyRate);
  const gross = hours * rate;
  if (p.taxType === 'percentage') {
    return gross * (toNumber(p.taxValue) / 100);
  }
  if (p.taxType === 'fixed') {
    return toNumber(p.taxValue);
  }
  return toNumber(p.taxAmount);
};

/** Form defaults when editing or copying from an existing project. */
export const getTaxFormDefaultsFromProject = (project) => {
  if (!project) return { taxType: 'percentage', taxValue: '' };
  if (project.taxType === 'percentage' || project.taxType === 'fixed') {
    return {
      taxType: project.taxType,
      taxValue: project.taxValue ?? ''
    };
  }
  const legacy = project.taxAmount;
  if (legacy !== '' && legacy != null && Number(legacy) !== 0) {
    return { taxType: 'fixed', taxValue: String(legacy) };
  }
  return { taxType: 'percentage', taxValue: '' };
};

/** Persist computed taxAmount ($) for reporting; keep taxType + taxValue for the form. */
export const prepareProjectForFirestore = (values, options = {}) => {
  const { markAsExtension, endDateChangeMode, inactiveReasonOther, ...rest } = values || {};
  const taxAmount = Number(computeProjectTaxDollars(rest).toFixed(2));
  const out = { ...rest, taxAmount };
  const pc = rest.projectCost;
  if (pc === '' || pc == null) {
    out.projectCost = null;
  } else {
    const n = Number(pc);
    out.projectCost = Number.isFinite(n) ? Number(n.toFixed(2)) : null;
  }

  const status = String(out.projectStatus || 'active').trim().toLowerCase();
  if (status === 'inactive') {
    const selected = String(out.inactiveReason || '').trim();
    const other = String(inactiveReasonOther || '').trim();
    out.inactiveReason = selected === 'Other' ? other || 'Other' : selected;
  } else {
    delete out.inactiveReason;
  }

  const previous = options.previousProject || null;
  if (previous) {
    const from = normalizeDateToYYYYMMDD(previous.contractEnding);
    const to = normalizeDateToYYYYMMDD(out.contractEnding);
    const dateChanged = Boolean(from && to && from !== to);
    if (dateChanged && endDateChangeMode === 'reset') {
      // Correction: new end date with no extension history.
      out.contractExtensions = [];
    } else if (
      dateChanged &&
      (endDateChangeMode === 'extension' || markAsExtension === true)
    ) {
      out.contractExtensions = appendContractExtension(previous.contractExtensions, {
        from,
        to
      });
    }
    // 'update' (or unchanged date): keep existing contractExtensions as-is.
  }

  return out;
};

export const getProjectMonthlyAllocationAmount = (p, options = {}) => {
  const hours = toNumber(p.totalMonthlyHours);
  const rate = toNumber(p.hourlyRate);
  const gross = hours * rate;
  const brokerage = computeProjectBrokerageDollars(p, options);
  const projectCost = toNumber(p.projectCost);
  const afterProjectCuts = Math.max(0, gross - brokerage - projectCost);
  const companyTax = afterProjectCuts * ALLOCATION_COMPANY_TAX_RATE;
  const beforeIf = Math.max(0, afterProjectCuts - companyTax);
  return roundMoney(beforeIf - impactFundFromNet(beforeIf));
};
