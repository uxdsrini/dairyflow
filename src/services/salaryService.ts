import {
  collection, doc, getDocs, addDoc, updateDoc,
  query, where, orderBy, Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Salary } from '../types';
import { filterByUser } from './userScope';

const COLLECTION = 'salaries';

export const getSalaries = async (userId?: string): Promise<Salary[]> => {
  const snapshot = await getDocs(collection(db, COLLECTION));
  const salaries = filterByUser(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Salary)), userId);
  // Sort client-side to avoid Firestore composite index requirement
  return salaries.sort((a, b) => b.year - a.year || b.month - a.month);
};

export const getSalariesByMonth = async (month: number, year: number, userId?: string): Promise<Salary[]> => {
  const q = query(
    collection(db, COLLECTION),
    where('month', '==', month),
    where('year', '==', year)
  );
  const snapshot = await getDocs(q);
  return filterByUser(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Salary)), userId);
};

export const addSalary = async (data: Omit<Salary, 'id' | 'createdAt'>) => {
  const q = query(
    collection(db, COLLECTION),
    where('workerId', '==', data.workerId),
    where('month', '==', data.month),
    where('year', '==', data.year),
    where('createdBy', '==', data.createdBy || '')
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
