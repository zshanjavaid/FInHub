import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { ENTRY_STATUS } from '../../constants/app';
import {
  getAllExpenses as getAllExpensesService,
  saveExpense as saveExpenseService,
  updateExpense as updateExpenseService,
  deleteExpense as deleteExpenseService,
  approveExpense as approveExpenseService
} from '../../services/expenseService';
import { shouldSkipListFetch } from '../../utils/fetchGate';

export const fetchExpenses = createAsyncThunk(
  'expenses/fetchAll',
  async () => getAllExpensesService(),
  {
    condition: (arg, { getState }) => !shouldSkipListFetch(getState().expenses, arg)
  }
);

export const createExpense = createAsyncThunk(
  'expenses/create',
  async (expenseData, { dispatch }) => {
    await saveExpenseService(expenseData);
    await dispatch(fetchExpenses({ force: true }));
  }
);

export const editExpense = createAsyncThunk(
  'expenses/edit',
  async ({ expenseId, expenseData }, { dispatch }) => {
    await updateExpenseService(expenseId, expenseData);
    await dispatch(fetchExpenses({ force: true }));
  }
);

export const removeExpense = createAsyncThunk(
  'expenses/delete',
  async (expenseId, { dispatch, rejectWithValue }) => {
    try {
      await deleteExpenseService(expenseId);
      return expenseId;
    } catch (error) {
      await dispatch(fetchExpenses({ force: true }));
      return rejectWithValue(error?.message || 'Failed to delete expense');
    }
  }
);

export const approveExpense = createAsyncThunk(
  'expenses/approve',
  async ({ expenseId, approvedBy }, { dispatch, rejectWithValue }) => {
    try {
      await approveExpenseService(expenseId, approvedBy);
      return { expenseId, approvedBy };
    } catch (error) {
      await dispatch(fetchExpenses({ force: true }));
      return rejectWithValue(error?.message || 'Failed to approve expense');
    }
  }
);

const setsLoadingOnMutation = (action) => {
  const t = action.type;
  return t.startsWith('expenses/create/') || t.startsWith('expenses/edit/');
};

const expensesSlice = createSlice({
  name: 'expenses',
  initialState: {
    items: [],
    isLoading: false,
    error: null,
    lastFetchedAt: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchExpenses.pending, (state) => {
        if (!state.items.length) state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchExpenses.fulfilled, (state, action) => {
        state.items = action.payload || [];
        state.isLoading = false;
        state.lastFetchedAt = Date.now();
      })
      .addCase(fetchExpenses.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error?.message || 'Failed to load expenses';
      })
      .addCase(approveExpense.pending, (state, action) => {
        const { expenseId, approvedBy } = action.meta.arg;
        const item = state.items.find((i) => i.id === expenseId);
        if (item) {
          item.status = ENTRY_STATUS.APPROVED;
          item.approvedBy = approvedBy;
          item.approvedAt = new Date().toISOString();
        }
      })
      .addCase(approveExpense.rejected, (state, action) => {
        state.error = action.payload || action.error?.message || 'Failed to approve expense';
      })
      .addCase(removeExpense.pending, (state, action) => {
        state.items = state.items.filter((i) => i.id !== action.meta.arg);
      })
      .addCase(removeExpense.rejected, (state, action) => {
        state.error = action.payload || action.error?.message || 'Failed to delete expense';
      })
      .addMatcher(setsLoadingOnMutation, (state, action) => {
        if (action.type.endsWith('/pending')) {
          state.isLoading = true;
          state.error = null;
        }
        if (action.type.endsWith('/rejected')) {
          state.isLoading = false;
          state.error = action.error?.message || 'Expense action failed';
        }
        if (action.type.endsWith('/fulfilled')) {
          state.isLoading = false;
        }
      });
  }
});

export default expensesSlice.reducer;
