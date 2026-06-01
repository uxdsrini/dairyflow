import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Subscription } from '../types';

const COLLECTION = 'subscriptions';

export const getSubscriptions = async (): Promise<Subscription[]> => {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Subscription));
};

export const getActiveSubscriptions = async (): Promise<Subscription[]> => {
  const q = query(collection(db, COLLECTION), where('status', '==', 'active'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Subscription));
};

export const getSubscriptionsByCustomer = async (customerId: string): Promise<Subscription[]> => {
  const q = query(collection(db, COLLECTION), where('customerId', '==', customerId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Subscription));
};

export const addSubscription = async (data: Omit<Subscription, 'id' | 'createdAt'>) => {
  return addDoc(collection(db, COLLECTION), { ...data, createdAt: Timestamp.now() });
};

export const updateSubscription = async (id: string, data: Partial<Subscription>) => {
  return updateDoc(doc(db, COLLECTION, id), { ...data });
};

export const deleteSubscription = async (id: string) => {
  return deleteDoc(doc(db, COLLECTION, id));
};

export const pauseSubscription = async (id: string) => {
  return updateDoc(doc(db, COLLECTION, id), { status: 'paused' });
};

export const resumeSubscription = async (id: string) => {
  return updateDoc(doc(db, COLLECTION, id), { status: 'active' });
};
