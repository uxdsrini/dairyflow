import {
  collection, doc, getDocs, addDoc, updateDoc,
  query, where, orderBy, Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Payment } from '../types';

const COLLECTION = 'payments';

export const getPayments = async (): Promise<Payment[]> => {
  const snapshot = await getDocs(collection(db, COLLECTION));
  const payments = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Payment));
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

export const getPaymentsByCustomer = async (customerId: string): Promise<Payment[]> => {
  const q = query(
    collection(db, COLLECTION),
    where('customerId', '==', customerId),
    orderBy('date', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Payment));
};

export const addPayment = async (data: Omit<Payment, 'id' | 'createdAt'>) => {
  return addDoc(collection(db, COLLECTION), { ...data, createdAt: Timestamp.now() });
};

export const updatePayment = async (id: string, data: Partial<Payment>) => {
  return updateDoc(doc(db, COLLECTION, id), { ...data });
};
