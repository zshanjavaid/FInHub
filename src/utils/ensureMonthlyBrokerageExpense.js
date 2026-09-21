import { isApproved } from '../constants/app';
import { transactionHasBrokerageDeduction } from './availableBalance';
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

  // Brokerage on the transaction is already removed from inward — do not also book an expense.
  if (transactionHasBrokerageDeduction(transactionData)) return null;

  const monthGross = monthGrossForProject(transactions, client, project, monthKey, {
    excludeTxId,
    includeAmount: transactionData?.amount
  });

  // Manual add/edit: honor the transaction form. 0% must not create a project-rate expense.
  const txType = transactionData?.brokerageType;
  const txVal = transactionData?.brokerageValue;
  const effectiveProject = {
    ...projectRow,
    brokerageType: txType || projectRow.brokerageType,
    brokerageValue: txVal !== undefined && txVal !== null ? txVal : projectRow.brokerageValue
  };

  return planNewMonthlyBrokerageExpense({
    client,
    project,
    date: transactionData.date,
    projectRow: effectiveProject,
    expenses,
    monthGrossAmount: monthGross,
    createdBy
  });
};

export { findLatestProjectByBrokerAndProject, monthGrossForProject, monthKeyFromYmd };
