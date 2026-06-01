import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Order } from '../types';

const COLLECTION = 'orders';

export const getOrders = async (): Promise<Order[]> => {
  const q = query(collection(db, COLLECTION), orderBy('orderDate', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
};

export const addOrder = async (data: Omit<Order, 'id' | 'createdAt'>) => {
  return addDoc(collection(db, COLLECTION), { ...data, createdAt: Timestamp.now() });
};

export const updateOrder = async (id: string, data: Partial<Order>) => {
  return updateDoc(doc(db, COLLECTION, id), { ...data });
};

export const deleteOrder = async (id: string) => {
  return deleteDoc(doc(db, COLLECTION, id));
};
