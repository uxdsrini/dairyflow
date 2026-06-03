import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Customer } from '../types';
import { filterByUser } from './userScope';

const COLLECTION = 'customers';

export const getCustomers = async (userId?: string): Promise<Customer[]> => {
  const q = query(collection(db, COLLECTION), orderBy('name'));
  const snapshot = await getDocs(q);
  return filterByUser(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Customer)), userId);
};

export const getCustomersByStatus = async (status: string, userId?: string): Promise<Customer[]> => {
  const q = query(collection(db, COLLECTION), where('status', '==', status), orderBy('name'));
  const snapshot = await getDocs(q);
  return filterByUser(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Customer)), userId);
};

export const getCustomer = async (id: string): Promise<Customer | null> => {
  const snap = await getDoc(doc(db, COLLECTION, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } as Customer : null;
};

export const addCustomer = async (data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
  const now = Timestamp.now();
  return addDoc(collection(db, COLLECTION), { ...data, createdAt: now, updatedAt: now });
};

export const updateCustomer = async (id: string, data: Partial<Customer>) => {
  return updateDoc(doc(db, COLLECTION, id), { ...data, updatedAt: Timestamp.now() });
};

export const deleteCustomer = async (id: string) => {
  return deleteDoc(doc(db, COLLECTION, id));
};
