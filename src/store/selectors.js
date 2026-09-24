import { createSelector } from '@reduxjs/toolkit';
import { isApproved } from '../constants/app';

const selectTransactionItems = (state) => state.transactions.items;
const selectExpenseItems = (state) => state.expenses.items;
const selectProjectItems = (state) => state.projects.items;

const countPending = (list) =>
  (list || []).reduce((sum, item) => sum + (isApproved(item) ? 0 : 1), 0);

/** Stable number — Sidebar re-renders only when the count changes, not on every list refetch. */
export const selectPendingCount = createSelector(
  [selectTransactionItems, selectExpenseItems, selectProjectItems],
  (transactions, expenses, projects) =>
    countPending(transactions) + countPending(expenses) + countPending(projects)
);
