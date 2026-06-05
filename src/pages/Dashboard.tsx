import React, { useEffect, useState } from 'react';
import {
  Users, CalendarCheck, Truck, TrendingUp, Clock, CheckCircle2, Wallet, PiggyBank, DollarSign
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getDashboardStats } from '../services/dashboardService';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';

interface Stats {
  totalCustomers: number;
  activeSubscriptions: number;
  todayDeliveries: number;
  deliveredToday: number;
  monthlyRevenue: number;
  paidAmount: number;
  pendingAmount: number;
  salaryExpense: number;
  totalExpenses: number;
  netProfit: number;
}

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await getDashboardStats(currentUser?.uid);
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading dashboard..." />;

  const s = stats || {
    totalCustomers: 0, activeSubscriptions: 0, todayDeliveries: 0,
    deliveredToday: 0, monthlyRevenue: 0, paidAmount: 0,
    pendingAmount: 0, salaryExpense: 0, totalExpenses: 0, netProfit: 0,
  };

  const statCards = [
    { label: 'Total Customers', value: s.totalCustomers, icon: Users, color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Active Subscriptions', value: s.activeSubscriptions, icon: CalendarCheck, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50' },
    { label: "Today's Deliveries", value: `${s.deliveredToday}/${s.todayDeliveries}`, icon: Truck, color: 'from-violet-500 to-violet-600', bg: 'bg-violet-50' },
    { label: 'Monthly Revenue', value: `₹${s.monthlyRevenue.toLocaleString()}`, icon: TrendingUp, color: 'from-dairy-500 to-dairy-600', bg: 'bg-dairy-50' },
    { label: 'Pending Payments', value: `₹${s.pendingAmount.toLocaleString()}`, icon: Clock, color: 'from-amber-500 to-amber-600', bg: 'bg-amber-50' },
    { label: 'Paid Amount', value: `₹${s.paidAmount.toLocaleString()}`, icon: CheckCircle2, color: 'from-teal-500 to-teal-600', bg: 'bg-teal-50' },
    { label: 'Salary Expense', value: `₹${s.salaryExpense.toLocaleString()}`, icon: Wallet, color: 'from-rose-500 to-rose-600', bg: 'bg-rose-50' },
    { label: 'Total Expenses', value: `₹${s.totalExpenses.toLocaleString()}`, icon: DollarSign, color: 'from-red-500 to-red-600', bg: 'bg-red-50' },
    { label: 'Net Profit', value: `₹${s.netProfit.toLocaleString()}`, icon: PiggyBank, color: 'from-cyan-500 to-cyan-600', bg: 'bg-cyan-50' },
  ];

  const revenueData = [
    { month: 'Jan', revenue: 45000 },
    { month: 'Feb', revenue: 52000 },
    { month: 'Mar', revenue: 48000 },
    { month: 'Apr', revenue: 61000 },
    { month: 'May', revenue: 55000 },
    { month: 'Jun', revenue: s.monthlyRevenue || 58000 },
  ];

  const paymentPieData = [
    { name: 'Paid', value: s.paidAmount || 1 },
    { name: 'Pending', value: s.pendingAmount || 1 },
  ];
  const COLORS = ['#16a34a', '#f59e0b'];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back! Here's your dairy overview.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div key={i} className="card p-4 sm:p-5 animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-start justify-between">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-sm`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Monthly Revenue</h3>
          <div className="min-w-0">
            <ResponsiveContainer width="100%" height={280} minWidth={0}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip
                  formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, 'Revenue']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                />
                <Bar dataKey="revenue" fill="url(#greenGradient)" radius={[6, 6, 0, 0]} />
                <defs>
                  <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#16a34a" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Payment Status</h3>
          <div className="min-w-0 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={280} minWidth={0}>
              <PieChart>
                <Pie
                  data={paymentPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {paymentPieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, '']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex gap-4 -mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-dairy-600" />
                <span className="text-xs text-gray-600">Paid</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-xs text-gray-600">Pending</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
