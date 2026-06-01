import React, { useState, useEffect } from 'react';
import { Plus, Search, DollarSign, CreditCard, Calendar, FileText } from 'lucide-react';
import { Payment, Customer, Invoice, PAYMENT_METHODS } from '../types';
import { getPayments, addPayment } from '../services/paymentService';
import { getCustomers } from '../services/customerService';
import { getInvoices, updateInvoice } from '../services/billingService';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { Timestamp } from 'firebase/firestore';
import { formatFirestoreDate } from '../utils/dateUtils';


const Payments: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<'all' | Payment['method']>('all');

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<Payment['method']>('cash');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterPayments();
  }, [payments, searchQuery, methodFilter]);

  const loadData = async () => {
    setLoading(true);

    // Fetch payments
    try {
      const paymentsData = await getPayments();
      setPayments(paymentsData);
    } catch (err) {
      console.error('Failed to load payments:', err);
      toast.error('Failed to load payments');
    }

    // Fetch customers
    try {
      const customersData = await getCustomers();
      setCustomers(customersData.filter(c => c.status === 'active'));
    } catch (err) {
      console.error('Failed to load customers:', err);
    }

    // Fetch invoices separately — compound orderBy may need a Firestore index
    try {
      const invoicesData = await getInvoices();
      setInvoices(invoicesData.filter(i => i.status !== 'paid'));
    } catch (err) {
      console.error('Failed to load invoices:', err);
      // Don't block the page if invoices fail (e.g. missing composite index)
    }

    setLoading(false);
  };

  const filterPayments = () => {
    let result = [...payments];
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.customerName.toLowerCase().includes(q));
    }
    if (methodFilter !== 'all') {
      result = result.filter(p => p.method === methodFilter);
    }
    setFilteredPayments(result);
  };

  const handleOpenAddModal = () => {
    setCustomerId(customers[0]?.id || '');
    setAmount(0);
    setMethod('cash');
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setInvoiceId('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || amount <= 0 || !date) {
      toast.error('Please enter valid payment details');
      return;
    }

    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
      toast.error('Customer not found');
      return;
    }

    setSaving(true);
    try {
      const paymentPayload: Omit<Payment, 'id' | 'createdAt'> = {
        customerId,
        customerName: customer.name,
        amount: Number(amount),
        method,
        date: Timestamp.fromDate(new Date(date)),
        notes,
        invoiceId: invoiceId || undefined
      };

      // 1. Record the payment doc
      await addPayment(paymentPayload);

      // 2. If payment is linked to an invoice, update the invoice collection
      if (invoiceId) {
        const inv = invoices.find(i => i.id === invoiceId);
        if (inv) {
          const newPaidAmount = inv.paidAmount + Number(amount);
          const newPendingAmount = Math.max(0, inv.totalAmount - newPaidAmount);
          const newStatus = newPendingAmount === 0 ? 'paid' : newPaidAmount > 0 ? 'partial' : 'unpaid';

          await updateInvoice(invoiceId, {
            paidAmount: newPaidAmount,
            pendingAmount: newPendingAmount,
            status: newStatus
          });
        }
      }

      toast.success('Payment recorded successfully');
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save payment');
    } finally {
      setSaving(false);
    }
  };

  const filteredInvoicesForCustomer = invoices.filter(i => i.customerId === customerId);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payments Received</h1>
          <p className="text-sm text-gray-500 mt-1">Record payments, manage transaction history, and outstanding balances.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          disabled={customers.length === 0}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Record Payment
        </button>
      </div>

      <div className="card p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
          <input
            type="text"
            placeholder="Search by customer name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-9"
          />
        </div>
        <div>
          <select
            value={methodFilter}
            onChange={(e: any) => setMethodFilter(e.target.value)}
            className="select-field"
          >
            <option value="all">All Payment Methods</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="bank_transfer">Bank Transfer</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-dairy-600 border-t-transparent rounded-full animate-spin"></div></div>
      ) : filteredPayments.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">No payment logs found.</div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block table-container">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="p-4">Customer</th>
                  <th className="p-4">Amount Received</th>
                  <th className="p-4">Payment Method</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 font-semibold text-gray-900">{p.customerName}</td>
                    <td className="p-4 font-bold text-emerald-600">₹{p.amount}</td>
                    <td className="p-4 capitalize">
                      <span className="flex items-center gap-1.5 font-medium">
                        <CreditCard className="w-4 h-4 text-dairy-600" />
                        {p.method.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500">
                      {formatFirestoreDate(p.date)}
                    </td>
                    <td className="p-4 text-gray-400 text-xs italic">{p.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredPayments.map((p) => (
              <div key={p.id} className="card p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-gray-900">{p.customerName}</h4>
                  <span className="text-emerald-600 font-bold">₹{p.amount}</span>
                </div>
                <div className="text-xs text-gray-600 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Method:</span>
                    <span className="capitalize font-semibold text-gray-800">{p.method.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Date:</span>
                    <span className="text-gray-800">{formatFirestoreDate(p.date)}</span>
                  </div>
                  {p.notes && (
                    <div className="text-gray-400 italic pt-1 border-t border-dashed border-gray-150">
                      Notes: {p.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Record Payment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Payment"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Select Customer</label>
            <select
              className="select-field"
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setInvoiceId(''); // Reset linked invoice
              }}
            >
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.route})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Amount Received (₹)</label>
              <input
                type="number"
                required
                min="1"
                className="input-field"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="e.g. 1500"
              />
            </div>
            <div>
              <label className="label">Payment Method</label>
              <select
                className="select-field"
                value={method}
                onChange={(e: any) => setMethod(e.target.value)}
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Payment Date</label>
              <input
                type="date"
                required
                className="input-field"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Link to Pending Invoice (Optional)</label>
              <select
                className="select-field"
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.target.value)}
                disabled={filteredInvoicesForCustomer.length === 0}
              >
                <option value="">No invoice linked</option>
                {filteredInvoicesForCustomer.map(i => (
                  <option key={i.id} value={i.id}>
                    {new Date(2026, i.month - 1, 1).toLocaleString('default', { month: 'short' })} {i.year} (Dues: ₹{i.pendingAmount})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Notes / Reference</label>
            <input
              type="text"
              className="input-field"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. UPI Transaction ID or Handed to Delivery Boy"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
            >
              {saving ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Payments;
