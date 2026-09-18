import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { ENTRY_STATUS } from '../../constants/app';
import {
  getAllTransactions as getAllTransactionsService,
  saveTransaction as saveTransactionService,
  saveTransactionsBulk as saveTransactionsBulkService,
  updateTransaction as updateTransactionService,
  deleteTransaction as deleteTransactionService,
  deleteTransactionsBulk as deleteTransactionsBulkService,
  approveTransaction as approveTransactionService
} from '../../services/transactionService';
import { shouldSkipListFetch } from '../../utils/fetchGate';

export const fetchTransactions = createAsyncThunk(
  'transactions/fetchAll',
  async () => await getAllTransactionsService(),
  {
    condition: (arg, { getState }) => !shouldSkipListFetch(getState().transactions, arg)
  }
);

export const createTransaction = createAsyncThunk(
  'transactions/create',
  async (transactionData, { dispatch }) => {
    await saveTransactionService(transactionData);
    await dispatch(fetchTransactions({ force: true }));
  }
);

export const createTransactionsBulk = createAsyncThunk(
  'transactions/createBulk',
  async (transactions, { dispatch }) => {
    await saveTransactionsBulkService(transactions);
    await dispatch(fetchTransactions({ force: true }));
  }
);

export const editTransaction = createAsyncThunk(
  'transactions/edit',
  async ({ transactionId, transactionData }, { dispatch }) => {
    await updateTransactionService(transactionId, transactionData);
    await dispatch(fetchTransactions({ force: true }));
  }
);

export const removeTransaction = createAsyncThunk(
  'transactions/delete',
  async (transactionId, { dispatch, rejectWithValue }) => {
    try {
      await deleteTransactionService(transactionId);
      return transactionId;
    } catch (error) {
      await dispatch(fetchTransactions({ force: true }));
      return rejectWithValue(error?.message || 'Failed to delete transaction');
    }
  }
);

export const removeTransactionsBulk = createAsyncThunk(
  'transactions/deleteBulk',
  async (transactionIds, { dispatch, rejectWithValue }) => {
    try {
      await deleteTransactionsBulkService(transactionIds);
      return transactionIds;
    } catch (error) {
      await dispatch(fetchTransactions({ force: true }));
      return rejectWithValue(error?.message || 'Failed to delete transactions');
    }
  }
);

export const approveTransaction = createAsyncThunk(
  'transactions/approve',
  async ({ transactionId, approvedBy }, { dispatch, rejectWithValue }) => {
    try {
      await approveTransactionService(transactionId, approvedBy);
      return { transactionId, approvedBy };
    } catch (error) {
      await dispatch(fetchTransactions({ force: true }));
      return rejectWithValue(error?.message || 'Failed to approve transaction');
    }
  }
);

const setsLoadingOnMutation = (action) => {
  const t = action.type;
  return (
    (t.startsWith('transactions/create/') && !t.includes('Bulk')) ||
    t.startsWith('transactions/edit/')
  );
};

const transactionsSlice = createSlice({
  name: 'transactions',
  initialState: {
    items: [],
    isLoading: false,
    error: null,
    lastFetchedAt: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTransactions.pending, (state) => {
        if (!state.items.length) state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.items = action.payload || [];
        state.isLoading = false;
        state.lastFetchedAt = Date.now();
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error?.message || 'Failed to load transactions';
      })
      .addCase(approveTransaction.pending, (state, action) => {
        const { transactionId, approvedBy } = action.meta.arg;
        const item = state.items.find((i) => i.id === transactionId);
        if (item) {
          item.status = ENTRY_STATUS.APPROVED;
          item.approvedBy = approvedBy;
          item.approvedAt = new Date().toISOString();
        }
      })
      .addCase(approveTransaction.rejected, (state, action) => {
        state.error = action.payload || action.error?.message || 'Failed to approve transaction';
      })
      .addCase(removeTransaction.pending, (state, action) => {
        state.items = state.items.filter((i) => i.id !== action.meta.arg);
      })
      .addCase(removeTransaction.rejected, (state, action) => {
        state.error = action.payload || action.error?.message || 'Failed to delete transaction';
      })
      .addCase(removeTransactionsBulk.pending, (state, action) => {
        const ids = new Set(action.meta.arg || []);
        state.items = state.items.filter((i) => !ids.has(i.id));
      })
      .addCase(removeTransactionsBulk.rejected, (state, action) => {
        state.error = action.payload || action.error?.message || 'Failed to delete transactions';
      })
      .addMatcher(setsLoadingOnMutation, (state, action) => {
        if (action.type.endsWith('/pending')) {
          state.isLoading = true;
          state.error = null;
        }
        if (action.type.endsWith('/rejected')) {
          state.isLoading = false;
          state.error = action.error?.message || 'Transaction action failed';
        }
        if (action.type.endsWith('/fulfilled')) {
          state.isLoading = false;
        }
      });
  }
});

export default transactionsSlice.reducer;
