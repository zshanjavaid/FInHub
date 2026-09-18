import { isApproved } from '../constants/app';
import {
  monthKeyFromYmd,
  planNewMonthlyBrokerageExpense
} from './csvTransactionImport';

const findLatestProjectByBrokerAndProject = (projects = [], broker, projectName) => {
  if (!broker || !projectName || !projects?.length) return null;
  const matches = projects
    .filter(
      (p) =>
        (p.client || '').trim().toLowerCase() === String(broker).trim().toLowerCase() &&
        (p.project || '').trim().toLowerCase() === String(projectName).trim().toLowerCase()
    )
    .sort((a, b) => {
      const dateA = a.createdAt || a.date || '';
      const dateB = b.createdAt || b.date || '';
      return String(dateB).localeCompare(String(dateA));
    });
  return matches[0] || null;
};

const monthGrossForProject = (
  transactions = [],
  client,
  project,
  monthKey,
  { excludeTxId = null, includeAmount = 0 } = {}
) => {
  let sum = Number(includeAmount) || 0;
  (transactions || []).forEach((t) => {
    if (!isApproved(t)) return;
    if (excludeTxId && t.id === excludeTxId) return;
    if ((t.client || '').trim().toLowerCase() !== String(client || '').trim().toLowerCase()) return;
    if ((t.project || '').trim().toLowerCase() !== String(project || '').trim().toLowerCase()) return;
    if (monthKeyFromYmd(t.date) !== monthKey) return;
    sum += Number(t.amount) || 0;
  });
  return sum;
};

/**
 * Create a monthly brokerage expense if missing (same as CSV import).
 * Returns the expense payload created, or null.
 */
export const buildMonthlyBrokerageExpenseIfNeeded = ({
  transactionData,
  projects = [],
  transactions = [],
  expenses = [],
  excludeTxId = null,
  createdBy = null
}) => {
  const client = transactionData?.client;
  const project = transactionData?.project;
  const projectRow = findLatestProjectByBrokerAndProject(projects, client, project);
  const monthKey = monthKeyFromYmd(transactionData?.date);
  if (!projectRow || !monthKey) return null;

  const monthGross = monthGrossForProject(transactions, client, project, monthKey, {
    excludeTxId,
    includeAmount: transactionData?.amount
  });

  return planNewMonthlyBrokerageExpense({
    client,
    project,
    date: transactionData.date,
    projectRow,
    expenses,
    monthGrossAmount: monthGross,
    createdBy
  });
};

export { findLatestProjectByBrokerAndProject, monthGrossForProject, monthKeyFromYmd };
