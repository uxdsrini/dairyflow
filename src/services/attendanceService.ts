import {
  collection, doc, getDocs, addDoc, updateDoc,
  query, where, Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Attendance } from '../types';

const COLLECTION = 'attendance';

export const getAttendanceByDate = async (date: string): Promise<Attendance[]> => {
  const q = query(collection(db, COLLECTION), where('date', '==', date));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Attendance));
};

export const getAttendanceByWorker = async (workerId: string, month: number, year: number): Promise<Attendance[]> => {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
  const q = query(
    collection(db, COLLECTION),
    where('workerId', '==', workerId),
    where('date', '>=', startDate),
    where('date', '<=', endDate)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Attendance));
};

export const getAllAttendance = async (): Promise<Attendance[]> => {
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Attendance));
};

export const markAttendance = async (data: Omit<Attendance, 'id'>) => {
  const q = query(
    collection(db, COLLECTION),
    where('workerId', '==', data.workerId),
    where('date', '==', data.date)
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
