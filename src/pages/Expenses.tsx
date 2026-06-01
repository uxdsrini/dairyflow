import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Trash2, Edit2, Filter, Download, BarChart3,
  Calendar, DollarSign, Percent
} from 'lucide-react';
import { Expense, EXPENSE_CATEGORY_LABELS, EXPENSE_COLORS, PAYMENT_METHODS } from '../types';
import {
  getExpenses, addExpense, updateExpense, deleteExpense,
  getTotalExpensesByMonth, getTotalExpensesByCategory
} from '../services/expenseService';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { Timestamp } from 'firebase/firestore';
import { formatFirestoreDate } from '../utils/dateUtils';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line
} from 'recharts';

interface FormState {
  title: string;
  category: Expense['category'];
  amount: string;
  expenseDate: string;
  paymentMethod: Expense['paymentMethod'];
  vendorName: string;
  notes: string;
}

const initialFormState: FormState = {
  title: '',
  category: 'transportation',
  amount: '',
  expenseDate: new Date().toISOString().split('T')[0],
  paymentMethod: 'cash',
  vendorName: '',
  notes: '',
};

const Expenses: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Form and modal state
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [monthYear, setMonthYear] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Summary data
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [categoryBreakdown, setCategoryBreakdown] = useState<Record<string, number>>({});

  useEffect(() => {
    loadExpenses();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [expenses, searchQuery, categoryFilter, dateRange]);

  useEffect(() => {
    updateSummary();
  }, [expenses, monthYear]);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const data = await getExpenses();
      setExpenses(data);
    } catch (err) {
      console.error('Failed to load expenses:', err);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...expenses];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((exp) =>
        exp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.vendorName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((exp) => exp.category === categoryFilter);
    }

    // Date range filter
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter((exp) => {
        try {
          const expDate = exp.expenseDate?.toDate
            ? exp.expenseDate.toDate().toISOString().split('T')[0]
            : '';
          return expDate >= dateRange.start && expDate <= dateRange.end;
        } catch {
          return false;
        }
      });
    }

    setFilteredExpenses(filtered);
  };

  const updateSummary = async () => {
    try {
      const [month, year] = monthYear.split('-');
      const total = await getTotalExpensesByMonth(parseInt(month), parseInt(year));
      setMonthlyTotal(total);

      const breakdown = await getTotalExpensesByCategory();
      setCategoryBreakdown(breakdown);
    } catch (err) {
      console.error('Failed to update summary:', err);
    }
  };

  const handleOpenModal = (expense?: Expense) => {
    if (expense) {
      setEditingId(expense.id);
      setFormData({
        title: expense.title,
        category: expense.category,
        amount: expense.amount.toString(),
        expenseDate: expense.expenseDate?.toDate
          ? expense.expenseDate.toDate().toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        paymentMethod: expense.paymentMethod,
        vendorName: expense.vendorName || '',
        notes: expense.notes || '',
      });
    } else {
      setEditingId(null);
      setFormData(initialFormState);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData(initialFormState);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.amount) {
      toast.error('Please fill in required fields');
      return;
    }

    setSaving(true);
    try {
      const expenseData = {
        title: formData.title,
        category: formData.category as Expense['category'],
        amount: parseFloat(formData.amount),
        expenseDate: Timestamp.fromDate(new Date(formData.expenseDate)),
        paymentMethod: formData.paymentMethod as Expense['paymentMethod'],
        vendorName: formData.vendorName,
        notes: formData.notes,
        createdBy: 'user1', // TODO: Use actual user ID
      };

      if (editingId) {
        await updateExpense(editingId, expenseData);
        toast.success('Expense updated successfully');
      } else {
        await addExpense(expenseData);
        toast.success('Expense added successfully');
      }

      await loadExpenses();
      handleCloseModal();
    } catch (err) {
      console.error('Failed to save expense:', err);
      toast.error('Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) {
      return;
    }

    try {
      await deleteExpense(id);
      await loadExpenses();
      toast.success('Expense deleted successfully');
    } catch (err) {
      console.error('Failed to delete expense:', err);
      toast.error('Failed to delete expense');
    }
  };

  const handleExportCSV = () => {
    const csv = [
      ['Date', 'Title', 'Category', 'Amount', 'Vendor', 'Payment Method', 'Notes'],
      ...filteredExpenses.map((exp) => [
        formatFirestoreDate(exp.expenseDate),
        exp.title,
        EXPENSE_CATEGORY_LABELS[exp.category],
        exp.amount,
        exp.vendorName || '',
        exp.paymentMethod,
        exp.notes || '',
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const categoryData = Object.entries(categoryBreakdown).map(([cat, amount]) => ({
    name: EXPENSE_CATEGORY_LABELS[cat] || cat,
    value: amount,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-10 h-10 border-4 border-dairy-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const CHART_COLORS = [
    '#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6',
    '#06b6d4', '#ec4899', '#6366f1', '#14b8a6', '#f97316',
    '#6b7280', '#a855f7'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage your dairy business expenses</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Expense
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                ₹{filteredExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="card p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Monthly Total ({monthYear})</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">₹{monthlyTotal.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="card p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Record Count</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{filteredExpenses.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      {categoryData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Category Breakdown</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => value ? `${name}: ₹${value.toLocaleString()}` : ''}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => value ? `₹${value.toLocaleString()}` : '₹0'} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Category Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={categoryData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 120 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} fontSize={12} />
                <Tooltip formatter={(value: any) => value ? `₹${value.toLocaleString()}` : '₹0'} />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title or vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input"
          >
            <option value="all">All Categories</option>
            {Object.entries(EXPENSE_CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          {/* Date Range Start */}
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="input"
            placeholder="Start date"
          />

          {/* Date Range End */}
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="input"
            placeholder="End date"
          />
        </div>

        {/* Export Button */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleExportCSV}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          {dateRange.start && (
            <button
              onClick={() => setDateRange({ start: '', end: '' })}
              className="btn-tertiary"
            >
              Clear Date Range
            </button>
          )}
        </div>
      </div>

      {/* Expenses List */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-900">Title</th>
                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-900">Category</th>
                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-900">Amount</th>
                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-900">Payment</th>
                <th className="px-5 py-3 text-left text-sm font-semibold text-gray-900">Vendor</th>
                <th className="px-5 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-sm text-gray-900">
                      {formatFirestoreDate(exp.expenseDate)}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-900 font-medium">{exp.title}</td>
                    <td className="px-5 py-3 text-sm">
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                        {EXPENSE_CATEGORY_LABELS[exp.category]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-900">
                      ₹{exp.amount.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-700">
                      <span className="capitalize">{exp.paymentMethod}</span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{exp.vendorName || '-'}</td>
                    <td className="px-5 py-3 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(exp)}
                          className="btn-icon text-blue-600 hover:bg-blue-50"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="btn-icon text-red-600 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-gray-500">
                    No expenses found. {searchQuery || categoryFilter !== 'all' || dateRange.start ? 'Try adjusting your filters.' : 'Add your first expense!'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={handleCloseModal} title={editingId ? 'Edit Expense' : 'Add Expense'}>
        <form onSubmit={handleSaveExpense} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Expense Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input w-full"
              placeholder="e.g., Milk Collection Trip"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Category *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as Expense['category'] })}
              className="input w-full"
            >
              {Object.entries(EXPENSE_CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Amount (₹) *
            </label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="input w-full"
              placeholder="0"
              step="0.01"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Expense Date *
            </label>
            <input
              type="date"
              value={formData.expenseDate}
              onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
              className="input w-full"
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Payment Method *
            </label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as Expense['paymentMethod'] })}
              className="input w-full"
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method.charAt(0).toUpperCase() + method.slice(1).replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Vendor Name */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Vendor/Paid To</label>
            <input
              type="text"
              value={formData.vendorName}
              onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
              className="input w-full"
              placeholder="e.g., ABC Supplies"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input w-full resize-none"
              rows={3}
              placeholder="Add any additional notes..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button type="button" onClick={handleCloseModal} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : editingId ? 'Update Expense' : 'Add Expense'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Expenses;
