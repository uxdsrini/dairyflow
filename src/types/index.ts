import { Timestamp } from 'firebase/firestore';

export type PlanId = 'starter' | 'growth' | 'premium';
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'pending_payment';

export interface UserSubscriptionProfile {
  id: string;
  userId: string;
  email?: string;
  status: SubscriptionStatus;
  trialPlan: PlanId;
  activePlan?: PlanId | null;
  trialStartedAt: Timestamp;
  trialEndsAt: Timestamp;
  planActivatedAt?: Timestamp | null;
  planExpiresAt?: Timestamp | null;
  isFoundingMember: boolean;
  pricingLockedUntil?: Timestamp | null;
  pendingPlan?: PlanId | null;
  pendingPaymentLinkId?: string | null;
  pendingReferenceId?: string | null;
  lastPaymentId?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  address: string;
  route: string;
  customerType: 'residential' | 'commercial' | 'wholesale' | 'regular';
  status: 'active' | 'inactive';
  source?: 'payment_excel_import';
  createdBy?: string;
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
  createdBy?: string;
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
  createdBy?: string;
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
  createdBy?: string;
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
  createdBy?: string;
  createdAt: Timestamp;
}

export interface Attendance {
  id: string;
  workerId: string;
  workerName: string;
  date: string;
  status: 'present' | 'absent' | 'half_day' | 'leave';
  createdBy?: string;
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
  createdBy?: string;
  createdAt: Timestamp;
}

export interface Payment {
  id: string;
  customerId: string;
  customerName: string;
  customerMobile?: string;
  amount: number;
  method: 'cash' | 'upi' | 'bank_transfer';
  date: Timestamp;
  paymentDate?: string;
  paymentMethod?: 'cash' | 'upi' | 'bank_transfer';
  invoiceId?: string;
  notes: string;
  source?: 'manual' | 'excel_import';
  uploadedFileName?: string;
  createdBy?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
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
  createdBy?: string;
  createdAt: Timestamp;
}

export type RouteOption = string;


export interface Expense {
  id: string;
  title: string;
  description?: string;
  category: 'transportation' | 'feed' | 'medicine' | 'maintenance' | 'worker_advance' | 'electricity' | 'water' | 'packaging' | 'fuel' | 'equipment_repair' | 'rent' | 'other';
  amount: number;
  expenseDate: Timestamp;
  paymentMethod: 'cash' | 'upi' | 'bank_transfer';
  vendorName?: string;
  notes?: string;
  attachmentUrl?: string;
  source?: 'manual' | 'excel_import';
  uploadedFileName?: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ImportLog {
  id: string;
  type: 'expenses' | 'payments';
  fileName: string;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  duplicateRows: number;
  invalidRows: number;
  newCustomersCreated?: number;
  uploadedBy: string;
  uploadedAt: Timestamp;
}

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

export const EXPENSE_CATEGORIES = [
  'transportation', 'feed', 'medicine', 'maintenance', 'worker_advance',
  'electricity', 'water', 'packaging', 'fuel', 'equipment_repair', 'rent', 'other'
] as const;

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  transportation: 'Transportation',
  feed: 'Cattle Feed',
  medicine: 'Medicine',
  maintenance: 'Farm Maintenance',
  worker_advance: 'Worker Advance',
  electricity: 'Electricity',
  water: 'Water',
  packaging: 'Packaging',
  fuel: 'Fuel',
  equipment_repair: 'Equipment Repair',
  rent: 'Rent',
  other: 'Other Expenses',
};

export const EXPENSE_COLORS: Record<string, string> = {
  transportation: 'from-blue-500 to-blue-600',
  feed: 'from-green-500 to-green-600',
  medicine: 'from-red-500 to-red-600',
  maintenance: 'from-yellow-500 to-yellow-600',
  worker_advance: 'from-purple-500 to-purple-600',
  electricity: 'from-amber-500 to-amber-600',
  water: 'from-cyan-500 to-cyan-600',
  packaging: 'from-pink-500 to-pink-600',
  fuel: 'from-orange-500 to-orange-600',
  equipment_repair: 'from-violet-500 to-violet-600',
  rent: 'from-indigo-500 to-indigo-600',
  other: 'from-gray-500 to-gray-600',
};
