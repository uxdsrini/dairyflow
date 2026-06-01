import React, { useState, useEffect } from 'react';
import { BarChart3, Users, DollarSign, Wallet, FileSpreadsheet, ChevronRight, AlertTriangle, Download, Calendar } from 'lucide-react';
import { Invoice, Payment, Salary } from '../types';
import { getInvoices } from '../services/billingService';
import { getPayments } from '../services/paymentService';
import { getSalaries } from '../services/salaryService';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const Reports: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [loading, setLoading] = useState(true);

  // Export filters
  const [exportMonth, setExportMonth] = useState<number>(new Date().getMonth() + 1);
  const [exportYear, setExportYear] = useState<number>(new Date().getFullYear());
  const [exportRange, setExportRange] = useState<'month' | 'all'>('month');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        getInvoices(),
        getPayments(),
        getSalaries()
      ]);

      if (results[0].status === 'fulfilled') {
        setInvoices(results[0].value);
      } else {
        console.error('Failed to load invoices:', results[0].reason);
        toast.error('Failed to load invoices');
      }

      if (results[1].status === 'fulfilled') {
        setPayments(results[1].value);
      } else {
        console.error('Failed to load payments:', results[1].reason);
        toast.error('Failed to load payments');
      }

      if (results[2].status === 'fulfilled') {
        setSalaries(results[2].value);
      } else {
        console.error('Failed to load salaries:', results[2].reason);
        toast.error('Failed to load salaries');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load reports data');
    } finally {
      setLoading(false);
    }
  };

  // Helper to extract Date from Firestore timestamp or string
  const getPaymentDate = (dateField: any): Date | null => {
    if (!dateField) return null;
    if (typeof dateField.toDate === 'function') {
      try { return dateField.toDate(); } catch { return null; }
    }
    if (dateField instanceof Date) return dateField;
    if (typeof dateField === 'string' || typeof dateField === 'number') {
      const d = new Date(dateField);
      return isNaN(d.getTime()) ? null : d;
    }
    if (dateField?.seconds) {
      return new Date(dateField.seconds * 1000);
    }
    return null;
  };

  // Filter payments by selected period
  const getFilteredPayments = (): Payment[] => {
    if (exportRange === 'all') return payments;
    return payments.filter(p => {
      const d = getPaymentDate(p.date);
      if (!d) return false;
      return (d.getMonth() + 1) === exportMonth && d.getFullYear() === exportYear;
    });
  };

  // ─── Export: Date-wise Payment Report ───
  const handleExportDatewise = () => {
    const filtered = getFilteredPayments();
    if (filtered.length === 0) {
      toast.error('No payment records found for the selected period');
      return;
    }

    // Sort by date
    const sorted = [...filtered].sort((a, b) => {
      const da = getPaymentDate(a.date)?.getTime() || 0;
      const db = getPaymentDate(b.date)?.getTime() || 0;
      return da - db;
    });

    const rows = sorted.map((p, idx) => {
      const d = getPaymentDate(p.date);
      return {
        'S.No': idx + 1,
        'Date': d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
        'Customer Name': p.customerName,
        'Amount (₹)': p.amount,
        'Payment Method': p.method === 'bank_transfer' ? 'Bank Transfer' : p.method === 'upi' ? 'UPI' : 'Cash',
        'Notes': p.notes || '-',
      };
    });

    // Add total row
    const totalAmount = sorted.reduce((acc, p) => acc + p.amount, 0);
    rows.push({
      'S.No': '' as any,
      'Date': '',
      'Customer Name': 'TOTAL',
      'Amount (₹)': totalAmount,
      'Payment Method': '',
      'Notes': '',
    });

    const ws = XLSX.utils.json_to_sheet(rows);

    // Set column widths
    ws['!cols'] = [
      { wch: 6 },   // S.No
      { wch: 16 },  // Date
      { wch: 25 },  // Customer Name
      { wch: 14 },  // Amount
      { wch: 16 },  // Method
      { wch: 30 },  // Notes
    ];

    const wb = XLSX.utils.book_new();
    const sheetName = exportRange === 'all' ? 'All Payments' : `${MONTH_SHORT[exportMonth - 1]} ${exportYear}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const fileName = exportRange === 'all'
      ? `DairyFlow_Payments_All.xlsx`
      : `DairyFlow_Payments_${MONTH_SHORT[exportMonth - 1]}_${exportYear}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success(`Downloaded ${fileName}`);
  };

  // ─── Export: Monthly Summary Report ───
  const handleExportMonthlySummary = () => {
    if (payments.length === 0) {
      toast.error('No payment records found');
      return;
    }

    // Group all payments by month-year, then by customer
    const monthlyData: Record<string, Record<string, { total: number; count: number; methods: Set<string> }>> = {};

    const paymentsToProcess = exportRange === 'all' ? payments : getFilteredPayments();

    paymentsToProcess.forEach(p => {
      const d = getPaymentDate(p.date);
      if (!d) return;
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = `${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;

      if (!monthlyData[monthKey]) monthlyData[monthKey] = {};
      if (!monthlyData[monthKey][p.customerName]) {
        monthlyData[monthKey][p.customerName] = { total: 0, count: 0, methods: new Set() };
      }
      monthlyData[monthKey][p.customerName].total += p.amount;
      monthlyData[monthKey][p.customerName].count += 1;
      monthlyData[monthKey][p.customerName].methods.add(p.method);
    });

    // Flatten into rows sorted by month then customer
    const rows: any[] = [];
    let sno = 1;
    const sortedMonths = Object.keys(monthlyData).sort();

    sortedMonths.forEach(monthKey => {
      const [y, m] = monthKey.split('-');
      const monthLabel = `${MONTH_NAMES[Number(m) - 1]} ${y}`;
      const customers = monthlyData[monthKey];
      let monthTotal = 0;

      Object.entries(customers)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([name, val]) => {
          rows.push({
            'S.No': sno++,
            'Month': monthLabel,
            'Customer Name': name,
            'Total Paid (₹)': val.total,
            'No. of Payments': val.count,
            'Payment Methods': Array.from(val.methods).map(m => m === 'bank_transfer' ? 'Bank' : m === 'upi' ? 'UPI' : 'Cash').join(', '),
          });
          monthTotal += val.total;
        });

      // Month total row
      rows.push({
        'S.No': '',
        'Month': '',
        'Customer Name': `── ${monthLabel} Total ──`,
        'Total Paid (₹)': monthTotal,
        'No. of Payments': '',
        'Payment Methods': '',
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 6 },   // S.No
      { wch: 18 },  // Month
      { wch: 25 },  // Customer
      { wch: 16 },  // Total Paid
      { wch: 16 },  // No. of Payments
      { wch: 20 },  // Methods
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Monthly Summary');

    const fileName = exportRange === 'all'
      ? `DairyFlow_Monthly_Summary_All.xlsx`
      : `DairyFlow_Monthly_Summary_${MONTH_SHORT[exportMonth - 1]}_${exportYear}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success(`Downloaded ${fileName}`);
  };

  if (loading) return <LoadingSpinner text="Generating reports..." />;

  // Computations
  const totalBilled = invoices.reduce((acc, i) => acc + i.totalAmount, 0);
  const totalCollected = invoices.reduce((acc, i) => acc + i.paidAmount, 0);
  const outstandingDues = invoices.reduce((acc, i) => acc + i.pendingAmount, 0);
  const salaryExpenses = salaries.reduce((acc, s) => acc + s.netSalary, 0);
  const netEstimatedProfit = totalBilled - salaryExpenses;

  // Group outstanding dues by customer name
  const customerDues: Record<string, { pending: number, total: number }> = {};
  invoices.forEach(inv => {
    if (inv.pendingAmount > 0) {
      if (customerDues[inv.customerName]) {
        customerDues[inv.customerName].pending += inv.pendingAmount;
        customerDues[inv.customerName].total += inv.totalAmount;
      } else {
        customerDues[inv.customerName] = {
          pending: inv.pendingAmount,
          total: inv.totalAmount
        };
      }
    }
  });

  const debtors = Object.entries(customerDues)
    .map(([name, val]) => ({ name, ...val }))
    .sort((a, b) => b.pending - a.pending);

  const filteredPaymentsCount = getFilteredPayments().length;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Revenue</h1>
          <p className="text-sm text-gray-500 mt-1">Detailed summary of financial performance, worker expenses, and debtors.</p>
        </div>
      </div>

      {/* ═══ Export Payment Reports Section ═══ */}
      <div className="card p-5 space-y-4 border-l-4 border-l-dairy-500">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-dairy-50 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5 text-dairy-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Export Payment Reports</h3>
            <p className="text-xs text-gray-500">Download Excel sheets with date-wise or monthly payment data</p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-end gap-3 pt-2">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Period</label>
            <select
              value={exportRange}
              onChange={(e) => setExportRange(e.target.value as 'month' | 'all')}
              className="select-field py-2 px-3 text-sm"
            >
              <option value="month">Specific Month</option>
              <option value="all">All Time</option>
            </select>
          </div>

          {exportRange === 'month' && (
            <>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Month</label>
                <select
                  value={exportMonth}
                  onChange={(e) => setExportMonth(Number(e.target.value))}
                  className="select-field py-2 px-3 text-sm"
                >
                  {MONTH_NAMES.map((m, i) => (
                    <option key={i + 1} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Year</label>
                <select
                  value={exportYear}
                  onChange={(e) => setExportYear(Number(e.target.value))}
                  className="select-field py-2 px-3 text-sm"
                >
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-xl">
            <Calendar className="w-3.5 h-3.5" />
            {filteredPaymentsCount} payment{filteredPaymentsCount !== 1 ? 's' : ''} found
          </div>
        </div>

        {/* Download Buttons */}
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={handleExportDatewise}
            className="btn-primary flex items-center gap-2 text-sm py-2.5 px-4"
          >
            <Download className="w-4 h-4" />
            Download Date-wise Report
          </button>
          <button
            onClick={handleExportMonthlySummary}
            className="btn-secondary flex items-center gap-2 text-sm py-2.5 px-4 border-dairy-300 text-dairy-700 hover:bg-dairy-50"
          >
            <Download className="w-4 h-4" />
            Download Monthly Summary
          </button>
        </div>
      </div>

      {/* Financial Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-dairy-50 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-dairy-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Revenue Breakdown</h3>
            </div>
          </div>
          <div className="space-y-2.5 pt-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Billed:</span>
              <strong className="text-gray-900">₹{totalBilled.toLocaleString()}</strong>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Collected:</span>
              <strong className="text-emerald-600">₹{totalCollected.toLocaleString()}</strong>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-dashed border-gray-150">
              <span className="text-gray-500">Pending Dues:</span>
              <strong className="text-red-600">₹{outstandingDues.toLocaleString()}</strong>
            </div>
          </div>
        </div>

        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Expenses</h3>
            </div>
          </div>
          <div className="space-y-2.5 pt-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Staff Salaries:</span>
              <strong className="text-rose-600">₹{salaryExpenses.toLocaleString()}</strong>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Feed & Maintenance:</span>
              <strong className="text-gray-900">₹0 (MVP)</strong>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-dashed border-gray-150">
              <span className="text-gray-500">Total Expense:</span>
              <strong className="text-rose-700">₹{salaryExpenses.toLocaleString()}</strong>
            </div>
          </div>
        </div>

        <div className="card p-5 space-y-4 bg-gradient-to-br from-dairy-500 to-dairy-700 text-white border-none shadow-lg shadow-dairy-600/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Estimated Net Profit</h3>
            </div>
          </div>
          <div className="space-y-2.5 pt-2">
            <div className="flex justify-between text-sm text-white/90">
              <span>Total Revenue:</span>
              <strong>₹{totalBilled.toLocaleString()}</strong>
            </div>
            <div className="flex justify-between text-sm text-white/90">
              <span>Total Expense:</span>
              <strong>₹{salaryExpenses.toLocaleString()}</strong>
            </div>
            <div className="flex justify-between text-base pt-2 border-t border-white/20 font-bold">
              <span>Estimated Profit:</span>
              <span className="text-lg">₹{netEstimatedProfit.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Debtors List (Pending customer dues) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">Outstanding Customer Dues</h3>
            <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-lg border border-red-100 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Action Needed
            </span>
          </div>

          {debtors.length === 0 ? (
            <div className="text-center py-10 text-gray-500 text-sm">No customers have pending dues! Well done!</div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[350px] overflow-y-auto pr-1">
              {debtors.map((d, idx) => (
                <div key={idx} className="flex justify-between items-center py-3">
                  <div>
                    <h4 className="font-bold text-gray-900">{d.name}</h4>
                    <p className="text-xs text-gray-500">Total Invoiced: ₹{d.total}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-red-600">₹{d.pending}</span>
                    <p className="text-[10px] text-gray-400 font-medium">Pending Dues</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Transaction Stats */}
        <div className="card p-5 space-y-4">
          <h3 className="text-base font-semibold text-gray-900">Transaction Stats</h3>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-xl space-y-1">
              <div className="text-xs text-gray-500 font-medium">Payments Processed</div>
              <div className="text-lg font-bold text-gray-900">{payments.length} Payments</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl space-y-1">
              <div className="text-xs text-gray-500 font-medium">Average Payment Value</div>
              <div className="text-lg font-bold text-gray-900">
                ₹{payments.length > 0 ? Math.round(payments.reduce((acc, p) => acc + p.amount, 0) / payments.length) : 0}
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl space-y-1">
              <div className="text-xs text-gray-500 font-medium">Invoices Calculated</div>
              <div className="text-lg font-bold text-gray-900">{invoices.length} Months/Bills</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
