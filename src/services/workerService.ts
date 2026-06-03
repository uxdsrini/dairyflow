import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Worker } from '../types';
import { filterByUser } from './userScope';

const COLLECTION = 'workers';

export const getWorkers = async (userId?: string): Promise<Worker[]> => {
  const q = query(collection(db, COLLECTION), orderBy('name'));
  const snapshot = await getDocs(q);
  return filterByUser(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Worker)), userId);
};

export const addWorker = async (data: Omit<Worker, 'id' | 'createdAt'>) => {
  return addDoc(collection(db, COLLECTION), { ...data, createdAt: Timestamp.now() });
};

export const updateWorker = async (id: string, data: Partial<Worker>) => {
  return updateDoc(doc(db, COLLECTION, id), { ...data });
};

export const deleteWorker = async (id: string) => {
  return deleteDoc(doc(db, COLLECTION, id));
};
