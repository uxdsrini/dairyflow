import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

export const getDashboardStats = async () => {
  const today = new Date().toISOString().split('T')[0];
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [customers, subscriptions, deliveries, orders, payments, salaries, invoices] =
    await Promise.all([
      getDocs(collection(db, 'customers')),
      getDocs(collection(db, 'subscriptions')),
      getDocs(query(collection(db, 'deliveries'), where('date', '==', today))),
      getDocs(collection(db, 'orders')),
      getDocs(collection(db, 'payments')),
      getDocs(query(
        collection(db, 'salaries'),
        where('month', '==', currentMonth),
        where('year', '==', currentYear)
      )),
      getDocs(query(
        collection(db, 'invoices'),
        where('month', '==', currentMonth),
        where('year', '==', currentYear)
      )),
    ]);

  const totalCustomers = customers.docs.filter((d) => d.data().status === 'active').length;
  const activeSubscriptions = subscriptions.docs.filter((d) => d.data().status === 'active').length;
  const todayDeliveries = deliveries.docs.length;
  const deliveredToday = deliveries.docs.filter((d) => d.data().status === 'delivered').length;

  let monthlyRevenue = 0;
  let paidAmount = 0;
  let pendingAmount = 0;

  invoices.docs.forEach((d) => {
    const data = d.data();
    monthlyRevenue += data.totalAmount || 0;
    paidAmount += data.paidAmount || 0;
    pendingAmount += data.pendingAmount || 0;
  });

  let salaryExpense = 0;
  salaries.docs.forEach((d) => {
    salaryExpense += d.data().netSalary || 0;
  });

  return {
    totalCustomers,
    activeSubscriptions,
    todayDeliveries,
    deliveredToday,
    monthlyRevenue,
    paidAmount,
    pendingAmount,
    salaryExpense,
    netProfit: monthlyRevenue - salaryExpense,
  };
};

export const getProducts = async () => {
  const snapshot = await getDocs(collection(db, 'products'));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};
