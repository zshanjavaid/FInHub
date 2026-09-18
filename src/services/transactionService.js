import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { ENTRY_STATUS } from '../constants/app';

export const getAllTransactions = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'transactions'));
    const transactions = [];
    querySnapshot.forEach((d) => {
      transactions.push({ id: d.id, ...d.data() });
    });
    return transactions;
  } catch (error) {
    console.error('Error loading transactions:', error);
    throw error;
  }
};

export const saveTransaction = async (transactionData) => {
  try {
    const createdBy = transactionData.createdBy ?? null;
    const status = createdBy ? ENTRY_STATUS.PENDING : ENTRY_STATUS.APPROVED;
    const dataWithTimestamp = {
      ...transactionData,
      createdBy,
      status,
      createdAt: new Date().toISOString()
    };
    const docRef = await addDoc(collection(db, 'transactions'), dataWithTimestamp);
    return docRef.id;
  } catch (error) {
    console.error('Error saving transaction:', error);
    throw error;
  }
};

export const saveTransactionsBulk = async (transactions = []) => {
  try {
    if (!Array.isArray(transactions) || transactions.length === 0) return [];
    const batch = writeBatch(db);
    const ids = [];
    const nowIso = new Date().toISOString();

    transactions.forEach((t) => {
      const createdBy = t?.createdBy ?? null;
      const status = createdBy ? ENTRY_STATUS.PENDING : ENTRY_STATUS.APPROVED;
      const ref = doc(collection(db, 'transactions'));
      ids.push(ref.id);
      batch.set(ref, {
        ...(t || {}),
        createdBy,
        status,
        createdAt: nowIso
      });
    });

    await batch.commit();
    return ids;
  } catch (error) {
    console.error('Error saving transactions bulk:', error);
    throw error;
  }
};

export const updateTransaction = async (transactionId, transactionData) => {
  try {
    const payload = { ...transactionData, updatedAt: new Date().toISOString() };
    await updateDoc(doc(db, 'transactions', transactionId), payload);
  } catch (error) {
    console.error('Error updating transaction:', error);
    throw error;
  }
};

export const approveTransaction = async (transactionId, approvedBy) => {
  try {
    await updateDoc(doc(db, 'transactions', transactionId), {
      status: ENTRY_STATUS.APPROVED,
      approvedBy,
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error approving transaction:', error);
    throw error;
  }
};

export const deleteTransaction = async (transactionId) => {
  try {
    await deleteDoc(doc(db, 'transactions', transactionId));
  } catch (error) {
    console.error('Error deleting transaction:', error);
    throw error;
  }
};

export const deleteTransactionsBulk = async (transactionIds = []) => {
  try {
    const ids = (transactionIds || []).filter(Boolean);
    if (ids.length === 0) return;
    const chunkSize = 400;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((id) => batch.delete(doc(db, 'transactions', id)));
      await batch.commit();
    }
  } catch (error) {
    console.error('Error deleting transactions bulk:', error);
    throw error;
  }
};
