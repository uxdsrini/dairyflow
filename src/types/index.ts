import { Timestamp } from 'firebase/firestore';

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  address: string;
  route: string;
  customerType: 'residential' | 'commercial' | 'wholesale';
  status: 'active' | 'inactive';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Subscription {
  id: string;
  customerId: string;
  customerName: string;
  milkType: 'cow' | 'buffalo' | 'a2' | 'mixed';
  quantityPerDay: number;
  frequency: 'daily' | 'alternate' | 'weekly' | 'monthly';
  startDate: Timestamp;
  pricePerLitre: number;
  status: 'active' | 'paused' | 'stopped';
  createdAt: Timestamp;
}

export interface Product {
  id: string;
  name: string;
  unit: string;
  pricePerUnit: number;
  category: string;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  orderDate: Timestamp;
  orderStatus: 'pending' | 'delivered' | 'cancelled';
  paymentStatus: 'paid' | 'unpaid' | 'partial';
  createdAt: Timestamp;
}

export interface DeliveryItem {
  productName: string;
  quantity: number;
  unit: string;
}

export interface Delivery {
  id: string;
  date: string;
  customerId: string;
  customerName: string;
  customerAddress: string;
  type: 'subscription' | 'order';
  sourceId: string;
  items: DeliveryItem[];
  route: string;
  workerId: string;
  workerName: string;
  status: 'pending' | 'delivered' | 'missed' | 'cancelled';
  createdAt: Timestamp;
}

export interface Worker {
  id: string;
  name: string;
  mobile: string;
  role: 'delivery_boy' | 'milking_worker' | 'manager' | 'cleaner';
  salaryType: 'monthly' | 'daily';
  monthlySalary: number;
  joiningDate: Timestamp;
  status: 'active' | 'inactive';
  createdAt: Timestamp;
}

export interface Attendance {
  id: string;
  workerId: string;
  workerName: string;
  date: string;
  status: 'present' | 'absent' | 'half_day' | 'leave';
}

export interface Salary {
  id: string;
  workerId: string;
  workerName: string;
  month: number;
  year: number;
  baseSalary: number;
  daysPresent: number;
  daysAbsent: number;
  halfDays: number;
  advance: number;
  deduction: number;
  overtime: number;
  netSalary: number;
  status: 'paid' | 'unpaid';
  paidDate?: Timestamp;
  createdAt: Timestamp;
}

export interface Payment {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  method: 'cash' | 'upi' | 'bank_transfer';
  date: Timestamp;
  invoiceId?: string;
  notes: string;
  createdAt: Timestamp;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Invoice {
  id: string;
  customerId: string;
  customerName: string;
  month: number;
  year: number;
  items: InvoiceItem[];
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  status: 'paid' | 'partial' | 'unpaid';
  createdAt: Timestamp;
}

export type RouteOption = string;

export const MILK_TYPES = ['cow', 'buffalo', 'a2', 'mixed'] as const;
export const FREQUENCIES = ['daily', 'alternate', 'weekly', 'monthly'] as const;
export const CUSTOMER_TYPES = ['residential', 'commercial', 'wholesale'] as const;
export const ORDER_STATUSES = ['pending', 'delivered', 'cancelled'] as const;
export const PAYMENT_STATUSES = ['paid', 'unpaid', 'partial'] as const;
export const DELIVERY_STATUSES = ['pending', 'delivered', 'missed', 'cancelled'] as const;
export const WORKER_ROLES = ['delivery_boy', 'milking_worker', 'manager', 'cleaner'] as const;
export const ATTENDANCE_STATUSES = ['present', 'absent', 'half_day', 'leave'] as const;
export const PAYMENT_METHODS = ['cash', 'upi', 'bank_transfer'] as const;

export const ROLE_LABELS: Record<string, string> = {
  delivery_boy: 'Delivery Boy',
  milking_worker: 'Milking Worker',
  manager: 'Manager',
  cleaner: 'Cleaner',
};

export const MILK_TYPE_LABELS: Record<string, string> = {
  cow: 'Cow Milk',
  buffalo: 'Buffalo Milk',
  a2: 'A2 Milk',
  mixed: 'Mixed Milk',
};

export const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  alternate: 'Alternate Day',
  weekly: 'Weekly',
  monthly: 'Monthly',
};
