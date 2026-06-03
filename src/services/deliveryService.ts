import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Delivery } from '../types';
import { filterByUser } from './userScope';

const COLLECTION = 'deliveries';

export const getDeliveries = async (userId?: string): Promise<Delivery[]> => {
  const q = query(collection(db, COLLECTION), orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  return filterByUser(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Delivery)), userId);
};

export const getDeliveriesByDate = async (date: string, userId?: string): Promise<Delivery[]> => {
  const q = query(collection(db, COLLECTION), where('date', '==', date));
  const snapshot = await getDocs(q);
  return filterByUser(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Delivery)), userId);
};

export const addDelivery = async (data: Omit<Delivery, 'id' | 'createdAt'>) => {
  return addDoc(collection(db, COLLECTION), { ...data, createdAt: Timestamp.now() });
};

export const updateDelivery = async (id: string, data: Partial<Delivery>) => {
  return updateDoc(doc(db, COLLECTION, id), { ...data });
};

export const deleteDelivery = async (id: string) => {
  return deleteDoc(doc(db, COLLECTION, id));
};
