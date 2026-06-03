import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, Timestamp, writeBatch, serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Expense, ImportLog } from '../types';

const COLLECTION = 'expenses';
const IMPORT_LOGS_COLLECTION = 'import_logs';

export type BulkExpenseInput = Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>;

export interface ExpenseImportLogInput {
  fileName: string;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  duplicateRows: number;
  invalidRows: number;
  uploadedBy: string;
}

export const getExpenses = async (): Promise<Expense[]> => {
  const snapshot = await getDocs(collection(db, COLLECTION));
  const expenses = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Expense));
  // Sort by date descending
  return expenses.sort((a, b) => {
    try {
      const dateA = a.expenseDate?.toDate ? a.expenseDate.toDate().getTime() : 0;
      const dateB = b.expenseDate?.toDate ? b.expenseDate.toDate().getTime() : 0;
      return dateB - dateA;
    } catch {
      return 0;
    }
  });
};

export const getExpensesByCategory = async (category: string): Promise<Expense[]> => {
  const q = query(
    collection(db, COLLECTION),
    where('category', '==', category),
    orderBy('expenseDate', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Expense));
};

export const getExpensesByDateRange = async (startDate: string, endDate: string): Promise<Expense[]> => {
  const allExpenses = await getExpenses();
  return allExpenses.filter((exp) => {
    try {
      const expDate = exp.expenseDate?.toDate ? exp.expenseDate.toDate().toISOString().split('T')[0] : '';
      return expDate >= startDate && expDate <= endDate;
    } catch {
      return false;
    }
  });
};

export const getExpensesByMonth = async (month: number, year: number): Promise<Expense[]> => {
  const allExpenses = await getExpenses();
  return allExpenses.filter((exp) => {
    try {
      const expDate = exp.expenseDate?.toDate ? exp.expenseDate.toDate() : new Date();
      return expDate.getMonth() === month - 1 && expDate.getFullYear() === year;
    } catch {
      return false;
    }
  });
};

export const getTotalExpensesByMonth = async (month: number, year: number): Promise<number> => {
  const expenses = await getExpensesByMonth(month, year);
  return expenses.reduce((sum, exp) => sum + exp.amount, 0);
};

export const getTotalExpensesByCategory = async (): Promise<Record<string, number>> => {
  const expenses = await getExpenses();
  const byCategory: Record<string, number> = {};
  
  expenses.forEach((exp) => {
    if (!byCategory[exp.category]) {
      byCategory[exp.category] = 0;
    }
    byCategory[exp.category] += exp.amount;
  });
  
  return byCategory;
};

export const getTotalExpensesForPeriod = async (startDate: string, endDate: string): Promise<number> => {
  const expenses = await getExpensesByDateRange(startDate, endDate);
  return expenses.reduce((sum, exp) => sum + exp.amount, 0);
};

export const addExpense = async (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
  return addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
};

export const updateExpense = async (id: string, data: Partial<Expense>) => {
  return updateDoc(doc(db, COLLECTION, id), {
    ...data,
    updatedAt: Timestamp.now(),
  });
};

export const deleteExpense = async (id: string) => {
  return deleteDoc(doc(db, COLLECTION, id));
};

export const bulkImportExpenses = async (
  expenses: BulkExpenseInput[],
  importLog: ExpenseImportLogInput
) => {
  const BATCH_LIMIT = 450;
  let importedRows = 0;

  for (let index = 0; index < expenses.length; index += BATCH_LIMIT) {
    const batch = writeBatch(db);
    const chunk = expenses.slice(index, index + BATCH_LIMIT);

    chunk.forEach((expense) => {
      const expenseRef = doc(collection(db, COLLECTION));
      batch.set(expenseRef, {
        ...expense,
        id: expenseRef.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();
    importedRows += chunk.length;
  }

  const logRef = doc(collection(db, IMPORT_LOGS_COLLECTION));
  await writeBatch(db)
    .set(logRef, {
      id: logRef.id,
      type: 'expenses',
      ...importLog,
      importedRows,
      uploadedAt: serverTimestamp(),
    })
    .commit();

  return { importedRows };
};

export const getRecentExpenseImportLogs = async (): Promise<ImportLog[]> => {
  const snapshot = await getDocs(collection(db, IMPORT_LOGS_COLLECTION));
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() } as ImportLog))
    .filter((log) => log.type === 'expenses')
    .sort((a, b) => {
      const dateA = a.uploadedAt?.toDate ? a.uploadedAt.toDate().getTime() : 0;
      const dateB = b.uploadedAt?.toDate ? b.uploadedAt.toDate().getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 5);
};

export const deleteExpenseImportLog = async (id: string) => {
  return deleteDoc(doc(db, IMPORT_LOGS_COLLECTION, id));
};
