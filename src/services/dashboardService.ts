import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

export const getTotalExpenses = async (month: number, year: number): Promise<number> => {
  try {
    const expenses = await getDocs(collection(db, 'expenses'));
    return expenses.docs.reduce((total, doc) => {
      const exp = doc.data();
      const expDate = exp.expenseDate?.toDate ? exp.expenseDate.toDate() : new Date();
      if (expDate.getMonth() === month - 1 && expDate.getFullYear() === year) {
        return total + (exp.amount || 0);
      }
      return total;
    }, 0);
  } catch (err) {
    console.error('Failed to get total expenses:', err);
    return 0;
  }
};

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
    pendingAmount += data.pendingAmount || 0;
  });

  payments.docs.forEach((d) => {
    const data = d.data();
    const paymentDate = data.date?.toDate
      ? data.date.toDate()
      : data.paymentDate
        ? new Date(data.paymentDate)
        : null;

    if (
      paymentDate &&
      paymentDate.getMonth() === currentMonth - 1 &&
      paymentDate.getFullYear() === currentYear
    ) {
      paidAmount += data.amount || 0;
    }
  });

  monthlyRevenue = paidAmount;

  let salaryExpense = 0;
  salaries.docs.forEach((d) => {
    salaryExpense += d.data().netSalary || 0;
  });

  // Get total expenses for the month
  const totalExpenses = await getTotalExpenses(currentMonth, currentYear);

  return {
    totalCustomers,
    activeSubscriptions,
    todayDeliveries,
    deliveredToday,
    monthlyRevenue,
    paidAmount,
    pendingAmount,
    salaryExpense,
    totalExpenses,
    netProfit: paidAmount - totalExpenses - salaryExpense,
  };
};

export const getProducts = async () => {
  const snapshot = await getDocs(collection(db, 'products'));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};
