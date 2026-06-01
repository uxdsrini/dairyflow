import {
  collection, doc, getDocs, addDoc, updateDoc,
  query, where, orderBy, Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Salary } from '../types';

const COLLECTION = 'salaries';

export const getSalaries = async (): Promise<Salary[]> => {
  const snapshot = await getDocs(collection(db, COLLECTION));
  const salaries = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Salary));
  // Sort client-side to avoid Firestore composite index requirement
  return salaries.sort((a, b) => b.year - a.year || b.month - a.month);
};

export const getSalariesByMonth = async (month: number, year: number): Promise<Salary[]> => {
  const q = query(
    collection(db, COLLECTION),
    where('month', '==', month),
    where('year', '==', year)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Salary));
};

export const addSalary = async (data: Omit<Salary, 'id' | 'createdAt'>) => {
  const q = query(
    collection(db, COLLECTION),
    where('workerId', '==', data.workerId),
    where('month', '==', data.month),
    where('year', '==', data.year)
  );
  const existing = await getDocs(q);
  if (!existing.empty) {
    return updateDoc(doc(db, COLLECTION, existing.docs[0].id), { ...data });
  }
  return addDoc(collection(db, COLLECTION), { ...data, createdAt: Timestamp.now() });
};

export const updateSalary = async (id: string, data: Partial<Salary>) => {
  return updateDoc(doc(db, COLLECTION, id), { ...data });
};

export const markSalaryPaid = async (id: string) => {
  return updateDoc(doc(db, COLLECTION, id), { status: 'paid', paidDate: Timestamp.now() });
};
