import { PlanId } from '../types';

export type FeatureKey =
  | 'customers'
  | 'subscriptions'
  | 'orders'
  | 'billing'
  | 'payments'
  | 'deliveries'
  | 'workers'
  | 'attendance'
  | 'salaries'
  | 'expenses'
  | 'reports'
  | 'advancedAnalytics'
  | 'multiUser';

export interface PlanDefinition {
  id: PlanId;
  name: string;
  price: number;
  tagline: string;
  summary: string;
  customerLimit: number | null;
  features: string[];
  unavailable: string[];
}

export const TRIAL_LENGTH_DAYS = 30;
export const PLAN_VALIDITY_DAYS = 30;
export const FOUNDING_MEMBER_LIMIT = 100;

export const PLAN_ORDER: PlanId[] = ['starter', 'growth', 'premium'];

export const PLAN_DEFINITIONS: Record<PlanId, PlanDefinition> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 299,
    tagline: 'Perfect for small dairy businesses.',
    summary: 'Core billing and customer tools for getting daily operations under control.',
    customerLimit: 100,
    features: [
      'Up to 100 customers',
      'Customer management',
      'Milk subscriptions',
      'Orders management',
      'Billing and payments',
      'Basic revenue dashboard',
      'Mobile access',
    ],
    unavailable: [
      'Worker management',
      'Attendance',
      'Salary management',
      'Expense tracking',
      'Advanced reports',
    ],
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    price: 599,
    tagline: 'Perfect for growing dairy businesses.',
    summary: 'Operations, staff, deliveries, and profit tracking for expanding teams.',
    customerLimit: 500,
    features: [
      'Everything in Starter',
      'Up to 500 customers',
      'Worker management',
      'Attendance management',
      'Salary management',
      'Delivery tracking',
      'Expense tracking',
      'Monthly profit reports',
      'Customer payment reminders',
      'Export reports',
    ],
    unavailable: [
      'Multi-user access',
      'Advanced analytics',
    ],
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 999,
    tagline: 'Perfect for large dairy farms and milk distributors.',
    summary: 'Full DairyFlow access with advanced reporting and future AI upgrades.',
    customerLimit: null,
    features: [
      'Everything in Growth',
      'Unlimited customers',
      'Unlimited workers',
      'Advanced reports',
      'Profit and loss dashboard',
      'Multi-user accounts',
      'Route-wise delivery analytics',
      'Revenue forecasting',
      'Expense analytics',
      'Priority support',
      'Future AI features',
    ],
    unavailable: [],
  },
};

export const FEATURE_ACCESS: Record<FeatureKey, { minimumPlan: PlanId; upgradeMessage: string }> = {
  customers: {
    minimumPlan: 'starter',
    upgradeMessage: 'Choose a plan to continue managing customers, routes, and billing records.',
  },
  subscriptions: {
    minimumPlan: 'starter',
    upgradeMessage: 'Choose a plan to continue managing milk subscriptions.',
  },
  orders: {
    minimumPlan: 'starter',
    upgradeMessage: 'Choose a plan to continue managing one-time orders.',
  },
  billing: {
    minimumPlan: 'starter',
    upgradeMessage: 'Choose a plan to continue creating invoices and monthly bills.',
  },
  payments: {
    minimumPlan: 'starter',
    upgradeMessage: 'Choose a plan to continue collecting and tracking customer payments.',
  },
  deliveries: {
    minimumPlan: 'growth',
    upgradeMessage: 'This feature is available in the Growth Plan. Upgrade now for ₹599/month.',
  },
  workers: {
    minimumPlan: 'growth',
    upgradeMessage: 'This feature is available in the Growth Plan. Upgrade now for ₹599/month.',
  },
  attendance: {
    minimumPlan: 'growth',
    upgradeMessage: 'This feature is available in the Growth Plan. Upgrade now for ₹599/month.',
  },
  salaries: {
    minimumPlan: 'growth',
    upgradeMessage: 'This feature is available in the Growth Plan. Upgrade now for ₹599/month.',
  },
  expenses: {
    minimumPlan: 'growth',
    upgradeMessage: 'This feature is available in the Growth Plan. Upgrade now for ₹599/month.',
  },
  reports: {
    minimumPlan: 'growth',
    upgradeMessage: 'This feature is available in the Growth Plan. Upgrade now for ₹599/month.',
  },
  advancedAnalytics: {
    minimumPlan: 'premium',
    upgradeMessage: 'This feature is available in the Premium Plan. Upgrade now for ₹999/month.',
  },
  multiUser: {
    minimumPlan: 'premium',
    upgradeMessage: 'This feature is available in the Premium Plan. Upgrade now for ₹999/month.',
  },
};

export const ROUTE_FEATURES: Record<string, FeatureKey | null> = {
  '/': null,
  '/customers': 'customers',
  '/subscriptions': 'subscriptions',
  '/orders': 'orders',
  '/deliveries': 'deliveries',
  '/workers': 'workers',
  '/attendance': 'attendance',
  '/salaries': 'salaries',
  '/billing': 'billing',
  '/payments': 'payments',
  '/expenses': 'expenses',
  '/reports': 'reports',
};

export const getPlanRank = (plan?: PlanId | null) => {
  if (!plan) return 0;
  return PLAN_ORDER.indexOf(plan) + 1;
};

export const hasPlanAccess = (plan: PlanId | null, requiredPlan: PlanId) => {
  return getPlanRank(plan) >= getPlanRank(requiredPlan);
};

export const getCustomerLimit = (plan: PlanId | null) => {
  if (!plan) return 0;
  return PLAN_DEFINITIONS[plan].customerLimit;
};

export const getNextPlan = (plan: PlanId | null): PlanId => {
  if (plan === 'starter') return 'growth';
  return 'premium';
};

