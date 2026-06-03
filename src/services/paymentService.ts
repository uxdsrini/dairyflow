import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, Timestamp, writeBatch, serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Customer, ImportLog, Payment } from '../types';
import { filterByUser } from './userScope';

const COLLECTION = 'payments';
const CUSTOMERS_COLLECTION = 'customers';
const IMPORT_LOGS_COLLECTION = 'import_logs';

export type BulkPaymentInput = Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>;
export type BulkCustomerInput = Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> & { temporaryKey: string };

export interface PaymentImportLogInput {
  fileName: string;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  duplicateRows: number;
  invalidRows: number;
  newCustomersCreated: number;
  uploadedBy: string;
}

export const getPayments = async (userId?: string): Promise<Payment[]> => {
  const snapshot = await getDocs(collection(db, COLLECTION));
  const payments = filterByUser(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Payment)), userId);
  // Sort client-side to avoid Firestore index requirement
  return payments.sort((a, b) => {
    try {
      const dateA = a.date?.toDate ? a.date.toDate().getTime() : (typeof a.date === 'string' ? new Date(a.date).getTime() : 0);
      const dateB = b.date?.toDate ? b.date.toDate().getTime() : (typeof b.date === 'string' ? new Date(b.date).getTime() : 0);
      return dateB - dateA;
    } catch {
      return 0;
    }
  });
};

export const getPaymentsByCustomer = async (customerId: string, userId?: string): Promise<Payment[]> => {
  const q = query(
    collection(db, COLLECTION),
    where('customerId', '==', customerId),
    orderBy('date', 'desc')
  );
  const snapshot = await getDocs(q);
  return filterByUser(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Payment)), userId);
};

export const addPayment = async (data: Omit<Payment, 'id' | 'createdAt'>) => {
  return addDoc(collection(db, COLLECTION), { ...data, createdAt: Timestamp.now() });
};

export const updatePayment = async (id: string, data: Partial<Payment>) => {
  return updateDoc(doc(db, COLLECTION, id), { ...data, updatedAt: Timestamp.now() });
};

export const deletePayment = async (id: string) => {
  return deleteDoc(doc(db, COLLECTION, id));
};

export const bulkImportPayments = async (
  payments: BulkPaymentInput[],
  newCustomers: BulkCustomerInput[],
  importLog: PaymentImportLogInput
) => {
  const BATCH_LIMIT = 450;
  const customerIdsByTemporaryKey: Record<string, string> = {};
  let importedRows = 0;
  let createdCustomers = 0;

  for (let index = 0; index < newCustomers.length; index += BATCH_LIMIT) {
    const batch = writeBatch(db);
    const chunk = newCustomers.slice(index, index + BATCH_LIMIT);

    chunk.forEach((customer) => {
      const customerRef = doc(collection(db, CUSTOMERS_COLLECTION));
      customerIdsByTemporaryKey[customer.temporaryKey] = customerRef.id;
      const { temporaryKey, ...customerData } = customer;
      batch.set(customerRef, {
        ...customerData,
        id: customerRef.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();
    createdCustomers += chunk.length;
  }

  const resolvedPayments = payments.map((payment) => ({
    ...payment,
    customerId: customerIdsByTemporaryKey[payment.customerId] || payment.customerId,
  }));

  for (let index = 0; index < resolvedPayments.length; index += BATCH_LIMIT) {
    const batch = writeBatch(db);
    const chunk = resolvedPayments.slice(index, index + BATCH_LIMIT);

    chunk.forEach((payment) => {
      const paymentRef = doc(collection(db, COLLECTION));
      batch.set(paymentRef, {
        ...payment,
        id: paymentRef.id,
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
      type: 'payments',
      ...importLog,
      importedRows,
      newCustomersCreated: createdCustomers,
      uploadedAt: serverTimestamp(),
    })
    .commit();

  return { importedRows, newCustomersCreated: createdCustomers };
};

export const getRecentPaymentImportLogs = async (userId?: string): Promise<ImportLog[]> => {
  const snapshot = await getDocs(collection(db, IMPORT_LOGS_COLLECTION));
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() } as ImportLog))
    .filter((log) => log.type === 'payments')
    .filter((log) => !userId || log.uploadedBy === userId)
    .sort((a, b) => {
      const dateA = a.uploadedAt?.toDate ? a.uploadedAt.toDate().getTime() : 0;
      const dateB = b.uploadedAt?.toDate ? b.uploadedAt.toDate().getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 5);
};

export const deletePaymentImportLog = async (id: string) => {
  return deleteDoc(doc(db, IMPORT_LOGS_COLLECTION, id));
};
