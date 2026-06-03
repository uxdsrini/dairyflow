import {
  collection, doc, getDocs, addDoc, updateDoc,
  query, where, orderBy, Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Invoice } from '../types';
import { filterByUser } from './userScope';

const COLLECTION = 'invoices';

export const getInvoices = async (userId?: string): Promise<Invoice[]> => {
  const snapshot = await getDocs(collection(db, COLLECTION));
  const invoices = filterByUser(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Invoice)), userId);
  // Sort client-side to avoid needing a Firestore composite index
  return invoices.sort((a, b) => b.year - a.year || b.month - a.month);
};

export const getInvoicesByCustomer = async (customerId: string, userId?: string): Promise<Invoice[]> => {
  const q = query(collection(db, COLLECTION), where('customerId', '==', customerId));
  const snapshot = await getDocs(q);
  return filterByUser(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Invoice)), userId);
};

export const getInvoicesByMonth = async (month: number, year: number, userId?: string): Promise<Invoice[]> => {
  const q = query(
    collection(db, COLLECTION),
    where('month', '==', month),
    where('year', '==', year)
  );
  const snapshot = await getDocs(q);
  return filterByUser(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Invoice)), userId);
};

export const addInvoice = async (data: Omit<Invoice, 'id' | 'createdAt'>) => {
  const q = query(
    collection(db, COLLECTION),
    where('customerId', '==', data.customerId),
    where('month', '==', data.month),
    where('year', '==', data.year)
  );
  const existing = await getDocs(q);
  if (!existing.empty) {
    return updateDoc(doc(db, COLLECTION, existing.docs[0].id), { ...data });
  }
  return addDoc(collection(db, COLLECTION), { ...data, createdAt: Timestamp.now() });
};

export const updateInvoice = async (id: string, data: Partial<Invoice>) => {
  return updateDoc(doc(db, COLLECTION, id), { ...data });
};

export const generateWhatsAppInvoice = (invoice: Invoice): string => {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let text = `🥛 *DairyFlow Invoice*\n`;
  text += `━━━━━━━━━━━━━━━━\n`;
  text += `📋 *Customer:* ${invoice.customerName}\n`;
  text += `📅 *Period:* ${monthNames[invoice.month - 1]} ${invoice.year}\n\n`;
  text += `📝 *Items:*\n`;
  invoice.items.forEach((item) => {
    text += `  • ${item.description}: ${item.quantity} × ₹${item.rate} = ₹${item.amount}\n`;
  });
  text += `\n━━━━━━━━━━━━━━━━\n`;
  text += `💰 *Total:* ₹${invoice.totalAmount.toFixed(2)}\n`;
  text += `✅ *Paid:* ₹${invoice.paidAmount.toFixed(2)}\n`;
  text += `⏳ *Pending:* ₹${invoice.pendingAmount.toFixed(2)}\n`;
  text += `━━━━━━━━━━━━━━━━\n`;
  text += `\nThank you for your business! 🙏`;
  return text;
};
