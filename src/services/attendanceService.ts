import {
  collection, doc, getDocs, addDoc, updateDoc,
  query, where, Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Attendance } from '../types';
import { filterByUser } from './userScope';

const COLLECTION = 'attendance';

export const getAttendanceByDate = async (date: string, userId?: string): Promise<Attendance[]> => {
  const q = query(collection(db, COLLECTION), where('date', '==', date));
  const snapshot = await getDocs(q);
  return filterByUser(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Attendance)), userId);
};

export const getAttendanceByWorker = async (workerId: string, month: number, year: number, userId?: string): Promise<Attendance[]> => {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
  const q = query(
    collection(db, COLLECTION),
    where('workerId', '==', workerId),
    where('date', '>=', startDate),
    where('date', '<=', endDate)
  );
  const snapshot = await getDocs(q);
  return filterByUser(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Attendance)), userId);
};

export const getAllAttendance = async (userId?: string): Promise<Attendance[]> => {
  const snapshot = await getDocs(collection(db, COLLECTION));
  return filterByUser(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Attendance)), userId);
};

export const markAttendance = async (data: Omit<Attendance, 'id'>) => {
  const q = query(
    collection(db, COLLECTION),
    where('workerId', '==', data.workerId),
    where('date', '==', data.date),
    where('createdBy', '==', data.createdBy || '')
  );
  const existing = await getDocs(q);
  if (!existing.empty) {
    return updateDoc(doc(db, COLLECTION, existing.docs[0].id), { status: data.status });
  }
  return addDoc(collection(db, COLLECTION), data);
};

export const updateAttendance = async (id: string, status: string) => {
  return updateDoc(doc(db, COLLECTION, id), { status });
};
