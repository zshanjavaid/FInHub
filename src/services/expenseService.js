import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ENTRY_STATUS } from '../constants/app';

export const getAllExpenses = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'expenses'));
    const expenses = [];
    querySnapshot.forEach((d) => {
      expenses.push({ id: d.id, ...d.data() });
    });
    return expenses;
  } catch (error) {
    console.error('Error loading expenses:', error);
    throw error;
  }
};

/** Add n months to a YYYY-MM-DD date string, return YYYY-MM-DD */
function addMonthsToDate(dateStr, monthsToAdd) {
  if (!dateStr || typeof dateStr !== 'string') return dateStr;
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  date.setMonth(date.getMonth() + monthsToAdd);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export const saveExpense = async (expenseData) => {
  try {
    const recurring = !!expenseData.recurring;
    const recurringMonths = Math.max(0, Math.min(36, Number(expenseData.recurringMonths) || 0));
    const shouldCreateRecurring = recurring && recurringMonths > 0;

    const createdBy = expenseData.createdBy ?? null;
    const status = createdBy ? ENTRY_STATUS.PENDING : ENTRY_STATUS.APPROVED;
    const baseData = {
      expenseName: expenseData.expenseName ?? '',
      date: expenseData.date ?? '',
      expenseType: expenseData.expenseType ?? '',
      amount: Number(expenseData.amount) || 0,
      comment: expenseData.comment ?? '',
      createdBy,
      status,
      createdAt: new Date().toISOString()
    };

    if (expenseData.client) baseData.client = String(expenseData.client).trim();
    if (expenseData.project) baseData.project = String(expenseData.project).trim();
    if (expenseData.monthKey) baseData.monthKey = String(expenseData.monthKey).slice(0, 7);
    if (expenseData.isMonthlyBrokerage) baseData.isMonthlyBrokerage = true;
    if (expenseData.brokerageType) {
      baseData.brokerageType =
        String(expenseData.brokerageType).trim().toLowerCase() === 'fixed' ? 'fixed' : 'percentage';
    }
    if (expenseData.brokerageValue !== undefined && expenseData.brokerageValue !== null && expenseData.brokerageValue !== '') {
      baseData.brokerageValue = Number(expenseData.brokerageValue);
    }

    if (shouldCreateRecurring) {
      const startDate = (expenseData.date || '').toString().slice(0, 10);
      const ids = [];
      for (let i = 0; i < recurringMonths; i++) {
        const monthDate = addMonthsToDate(startDate, i);
        const docRef = await addDoc(collection(db, 'expenses'), {
          ...baseData,
          date: monthDate,
          recurring: true,
          recurringMonths
        });
        ids.push(docRef.id);
      }
      return ids[0];
    }

    const docRef = await addDoc(collection(db, 'expenses'), baseData);
    return docRef.id;
  } catch (error) {
    console.error('Error saving expense:', error);
    throw error;
  }
};

export const updateExpense = async (expenseId, expenseData) => {
  try {
    await updateDoc(doc(db, 'expenses', expenseId), {
      ...expenseData,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating expense:', error);
    throw error;
  }
};

export const deleteExpense = async (expenseId) => {
  try {
    await deleteDoc(doc(db, 'expenses', expenseId));
  } catch (error) {
    console.error('Error deleting expense:', error);
    throw error;
  }
};

export const approveExpense = async (expenseId, approvedBy) => {
  try {
    await updateDoc(doc(db, 'expenses', expenseId), {
      status: ENTRY_STATUS.APPROVED,
      approvedBy,
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error approving expense:', error);
    throw error;
  }
};
