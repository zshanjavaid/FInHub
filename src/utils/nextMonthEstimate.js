import { isApproved } from '../constants/app';
import { expenseDateValue, normalizeDateToYYYYMMDD } from './date';
import { countExpectedPayoutsInRange, payoutShareCount } from './payoutSchedule';
import { isProjectEligibleForAutoGenerateMonth, projectLifecycleEndYmd } from './transactionsEligibility';
import { sumTransactionNetAfterImpactFund } from './transactionNet';
import { sumExpenseAmountsForAvailable } from './availableBalance';
import { latestProjectByIdentity, matchesClientProject } from './projectLookup';
import { matchesSelectedBroker } from './brokerFilter';
import { computeImportMonthlyBrokerageAmount } from './csvTransactionImport';
import { roundMoney, toNumber } from './number';

const ESTIMATE_TAX_RATE = 0.3;

const monthBounds = (year, monthIndex0) => {
  const d = new Date(year, monthIndex0, 1);
  const y = d.getFullYear();
  const m0 = d.getMonth();
  const lastDay = new Date(y, m0 + 1, 0).getDate();
  const m = String(m0 + 1).padStart(2, '0');
  return {
    monthKey: `${y}-${m}`,
    from: `${y}-${m}-01`,
    to: `${y}-${m}-${String(lastDay).padStart(2, '0')}`
  };
};

export const computeNextMonthEstimatedAmount = ({
  projects = [],
  transactions = [],
  expenses = [],
  selectedBroker = '',
  selectedProject = null,
  now = new Date()
} = {}) => {
  const ref = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  const prev = monthBounds(ref.getFullYear(), ref.getMonth() - 1);
  const next = monthBounds(ref.getFullYear(), ref.getMonth() + 1);

  const matchesFilters = (row) => {
    if (!isApproved(row)) return false;
    if (selectedProject) return matchesClientProject(row, selectedProject.client, selectedProject.project);
    return !selectedBroker || matchesSelectedBroker(row, selectedBroker);
  };
  const isPreviousMonth = (date) => {
    const ymd = normalizeDateToYYYYMMDD(date);
    return ymd && ymd >= prev.from && ymd <= prev.to;
  };

  const previousMonthTx = (transactions || []).filter((row) => matchesFilters(row) && isPreviousMonth(row.date));
  const previousMonthInward = sumTransactionNetAfterImpactFund(previousMonthTx);
  const previousMonthExpenses = sumExpenseAmountsForAvailable(
    (expenses || []).filter((row) => matchesFilters(row) && isPreviousMonth(expenseDateValue(row))),
    previousMonthTx
  );
  const previousMonthAvailable = roundMoney(previousMonthInward - previousMonthExpenses);

  const latestProjects = latestProjectByIdentity((projects || []).filter(matchesFilters));
  let newProjectsGross = 0;
  let newProjectsBrokerage = 0;
  let newProjectsAdditionalCharges = 0;
  latestProjects.forEach((project) => {
    const start = normalizeDateToYYYYMMDD(project.date);
    if (!start || start <= prev.to) return;
    if (!isProjectEligibleForAutoGenerateMonth(project, next.from, next.to)) return;

    const end = projectLifecycleEndYmd(project);
    const rangeTo = end && end < next.to ? end : next.to;
    const expectedPayouts = countExpectedPayoutsInRange(project, next.from, rangeTo);
    if (expectedPayouts <= 0) return;
    const monthlyGross = Math.max(0, toNumber(project.totalMonthlyHours)) * Math.max(0, toNumber(project.hourlyRate));
    const gross = monthlyGross * expectedPayouts / payoutShareCount(project);
    newProjectsGross += gross;
    newProjectsBrokerage += computeImportMonthlyBrokerageAmount(project, gross, next.monthKey);
    newProjectsAdditionalCharges += Math.max(0, toNumber(project.projectCost));
  });

  newProjectsGross = roundMoney(newProjectsGross);
  newProjectsBrokerage = roundMoney(newProjectsBrokerage);
  newProjectsAdditionalCharges = roundMoney(newProjectsAdditionalCharges);
  const newProjectsBeforeTax = roundMoney(newProjectsGross - newProjectsBrokerage - newProjectsAdditionalCharges);
  const beforeTax = roundMoney(previousMonthAvailable + newProjectsBeforeTax);
  const taxAmount = roundMoney(Math.max(0, beforeTax) * ESTIMATE_TAX_RATE);

  return {
    estimated: roundMoney(beforeTax - taxAmount),
    previousMonthInward: roundMoney(previousMonthInward),
    previousMonthExpenses: roundMoney(previousMonthExpenses),
    previousMonthAvailable,
    newProjectsGross,
    newProjectsBrokerage,
    newProjectsAdditionalCharges,
    newProjectsBeforeTax,
    beforeTax,
    taxAmount,
    previousMonthKey: prev.monthKey,
    nextMonthKey: next.monthKey
  };
};
