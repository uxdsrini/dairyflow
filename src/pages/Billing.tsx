import React, { useState, useEffect } from 'react';
import { FileText, Send, Check, Search, Share2, Clipboard, AlertCircle, RefreshCw } from 'lucide-react';
import { Invoice, Customer, Delivery, Order, Subscription } from '../types';
import { getInvoicesByMonth, addInvoice, generateWhatsAppInvoice } from '../services/billingService';
import { getCustomers } from '../services/customerService';
import { getDeliveries } from '../services/deliveryService';
import { getOrders } from '../services/orderService';
import { getSubscriptions } from '../services/subscriptionService';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const Billing: React.FC = () => {
  const { currentUser } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Month & Year Filter
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  // Search Filter
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, [month, year]);

  useEffect(() => {
    filterInvoices();
  }, [invoices, searchQuery]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [customersData, invoicesData] = await Promise.all([
        getCustomers(currentUser?.uid),
        getInvoicesByMonth(month, year, currentUser?.uid)
      ]);
      setCustomers(customersData);
      setInvoices(invoicesData);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const filterInvoices = () => {
    let result = [...invoices];
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(inv => inv.customerName.toLowerCase().includes(q));
    }
    setFilteredInvoices(result);
  };

  const handleGenerateBills = async () => {
    setLoading(true);
    try {
      // 1. Fetch all deliveries, orders, and subscriptions to calculate bills
      const [allDeliveries, allOrders, allSubscriptions] = await Promise.all([
        getDeliveries(currentUser?.uid),
        getOrders(currentUser?.uid),
        getSubscriptions(currentUser?.uid)
      ]);

      // Build subscription lookup maps:
      // a) By subscription ID (for delivery.sourceId lookup)
      const subById: Record<string, Subscription> = {};
      // b) By customerId + milkType (as fallback)
      const subByCustomerMilk: Record<string, Subscription> = {};
      allSubscriptions.forEach(sub => {
        subById[sub.id] = sub;
        // Use the most recent (first encountered since sorted desc) subscription per customer+milk combo
        const key = `${sub.customerId}_${sub.milkType}`;
        if (!subByCustomerMilk[key]) {
          subByCustomerMilk[key] = sub;
        }
      });

      let count = 0;
      for (const cust of customers) {
        // Filter deliveries for this customer during selected month and year
        const custDeliveries = allDeliveries.filter(d => {
          if (d.customerId !== cust.id || d.status !== 'delivered') return false;
          const [dYear, dMonth] = d.date.split('-');
          return Number(dYear) === year && Number(dMonth) === month;
        });

        // Filter orders for this customer during selected month and year
        const custOrders = allOrders.filter(o => {
          if (o.customerId !== cust.id || o.orderStatus !== 'delivered') return false;
          const oDate = o.orderDate?.toDate ? o.orderDate.toDate() : new Date(o.orderDate as any);
          return oDate && !isNaN(oDate.getTime()) && oDate.getFullYear() === year && (oDate.getMonth() + 1) === month;
        });

        if (custDeliveries.length === 0 && custOrders.length === 0) {
          continue; // No activity, skip invoice generation
        }

        // Calculate line items
        const items: Invoice['items'] = [];
        let total = 0;

        // Group deliveries by product name, using actual subscription price
        const groupedDelivs: Record<string, { qty: number, rate: number }> = {};
        custDeliveries.forEach(d => {
          d.items.forEach(i => {
            const key = i.productName;

            // Determine rate from subscription data
            let rate = 0;

            // 1. Try to get rate from the subscription linked via delivery.sourceId
            if (d.type === 'subscription' && d.sourceId && subById[d.sourceId]) {
              rate = subById[d.sourceId].pricePerLitre;
            }

            // 2. Fallback: look up by customer + milk type (product name contains the milk type)
            if (rate === 0) {
              const milkTypes = ['cow', 'buffalo', 'a2', 'mixed'] as const;
              for (const mt of milkTypes) {
                if (key.toLowerCase().includes(mt)) {
                  const lookupKey = `${cust.id}_${mt}`;
                  if (subByCustomerMilk[lookupKey]) {
                    rate = subByCustomerMilk[lookupKey].pricePerLitre;
                    break;
                  }
                }
              }
            }

            // 3. Robust Fallback: if it's a milk delivery, try to find any active subscription for this customer
            if (rate === 0 && (key.toLowerCase().includes('milk') || d.type === 'subscription')) {
              const custSub = allSubscriptions.find(sub => sub.customerId === cust.id && sub.status === 'active');
              if (custSub) {
                rate = custSub.pricePerLitre;
              } else {
                // Try any subscription including paused/stopped if no active one is found
                const anyCustSub = allSubscriptions.find(sub => sub.customerId === cust.id);
                if (anyCustSub) {
                  rate = anyCustSub.pricePerLitre;
                }
              }
            }

            // 4. Last resort: product-based defaults for non-milk items
            if (rate === 0) {
              rate = key.toLowerCase().includes('ghee') ? 650
                : key.toLowerCase().includes('paneer') ? 350
                : key.toLowerCase().includes('curd') ? 80
                : 60;
            }


            if (groupedDelivs[key]) {
              groupedDelivs[key].qty += i.quantity;
            } else {
              groupedDelivs[key] = { qty: i.quantity, rate };
            }
          });
        });

        Object.entries(groupedDelivs).forEach(([name, val]) => {
          const itemAmt = val.qty * val.rate;
          items.push({
            description: `${name} (Subscription deliveries)`,
            quantity: val.qty,
            rate: val.rate,
            amount: itemAmt
          });
          total += itemAmt;
        });

        // Add orders as line items
        custOrders.forEach(o => {
          items.push({
            description: `${o.productName} (One-time order)`,
            quantity: o.quantity,
            rate: o.price / o.quantity,
            amount: o.price
          });
          total += o.price;
        });

        // Check if there is an existing invoice to keep paid amount
        const existing = invoices.find(inv => inv.customerId === cust.id);
        const paidAmount = existing ? existing.paidAmount : 0;
        const pendingAmount = Math.max(0, total - paidAmount);
        const status = pendingAmount === 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';

        const invoicePayload: Omit<Invoice, 'id' | 'createdAt'> = {
          customerId: cust.id,
          customerName: cust.name,
          month,
          year,
          items,
          totalAmount: total,
          paidAmount,
          pendingAmount,
          status,
          createdBy: existing?.createdBy || currentUser?.uid
        };

        await addInvoice(invoicePayload);
        count++;
      }

      toast.success(`Generated ${count} invoices successfully!`);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate bills');
      setLoading(false);
    }
  };

  const handleCopyWhatsAppText = (invoice: Invoice) => {
    const text = generateWhatsAppInvoice(invoice);
    navigator.clipboard.writeText(text);
    toast.success('WhatsApp invoice text copied to clipboard!');
  };

  // Aggregated totals
  const totalInvoiced = invoices.reduce((acc, i) => acc + i.totalAmount, 0);
  const totalPaid = invoices.reduce((acc, i) => acc + i.paidAmount, 0);
  const totalPending = invoices.reduce((acc, i) => acc + i.pendingAmount, 0);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Billing & Invoices</h1>
          <p className="text-sm text-gray-500 mt-1">Generate monthly customer bills and export WhatsApp invoices.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="select-field py-2 px-3 text-sm max-w-[100px]"
          >
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
              <option key={m} value={m}>{new Date(2026, m-1, 1).toLocaleString('default', { month: 'short' })}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="select-field py-2 px-3 text-sm max-w-[100px]"
          >
            {[2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={handleGenerateBills}
            className="btn-primary flex items-center gap-1.5 text-sm py-2 px-3"
          >
            <RefreshCw className="w-4 h-4" /> Generate Bills
          </button>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Billed</span>
          <span className="text-xl font-bold text-gray-900">₹{totalInvoiced.toLocaleString()}</span>
        </div>
        <div className="card p-4 border-l-4 border-l-emerald-500">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Collected</span>
          <span className="text-xl font-bold text-emerald-600">₹{totalPaid.toLocaleString()}</span>
        </div>
        <div className="card p-4 border-l-4 border-l-red-500">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Outstanding</span>
          <span className="text-xl font-bold text-red-600">₹{totalPending.toLocaleString()}</span>
        </div>
      </div>

      {/* Search Filter */}
      <div className="card p-4 flex gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
          <input
            type="text"
            placeholder="Search by customer name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-dairy-600 border-t-transparent rounded-full animate-spin"></div></div>
      ) : filteredInvoices.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">No invoices found for this period. Click "Generate Bills" to calculate invoices.</div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block table-container">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="p-4">Customer</th>
                  <th className="p-4">Billing Items</th>
                  <th className="p-4">Total Amount</th>
                  <th className="p-4">Paid</th>
                  <th className="p-4">Pending</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Invoice Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 font-semibold text-gray-900">{inv.customerName}</td>
                    <td className="p-4 text-xs text-gray-600 space-y-1">
                      {inv.items.map((it, idx) => (
                        <div key={idx}>
                          {it.description} x{it.quantity} = ₹{it.amount}
                        </div>
                      ))}
                    </td>
                    <td className="p-4 font-bold text-gray-900">₹{inv.totalAmount}</td>
                    <td className="p-4 text-emerald-600 font-semibold">₹{inv.paidAmount}</td>
                    <td className="p-4 text-red-600 font-semibold">₹{inv.pendingAmount}</td>
                    <td className="p-4">
                      <span className={inv.status === 'paid' ? 'badge-green' : inv.status === 'partial' ? 'badge-yellow' : 'badge-red'}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleCopyWhatsAppText(inv)}
                        className="btn-secondary text-xs py-1.5 px-3 flex-inline items-center gap-1 border-dairy-300 text-dairy-700 hover:bg-dairy-50"
                        title="Copy invoice for WhatsApp"
                      >
                        <Share2 className="w-3.5 h-3.5 inline mr-1" /> WhatsApp text
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredInvoices.map((inv) => (
              <div key={inv.id} className="card p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-gray-900">{inv.customerName}</h4>
                  <span className={inv.status === 'paid' ? 'badge-green' : inv.status === 'partial' ? 'badge-yellow' : 'badge-red'}>
                    {inv.status}
                  </span>
                </div>

                <div className="text-xs text-gray-600 space-y-1 bg-gray-50 p-2.5 rounded-xl">
                  {inv.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{it.description} (x{it.quantity})</span>
                      <span>₹{it.amount}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t border-gray-200 text-sm font-bold text-gray-900">
                    <span>Total:</span>
                    <span>₹{inv.totalAmount}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Paid: ₹{inv.paidAmount} | Pending: ₹{inv.pendingAmount}</span>
                  </div>
                </div>

                <div className="flex justify-end pt-1 border-t border-gray-100">
                  <button
                    onClick={() => handleCopyWhatsAppText(inv)}
                    className="btn-secondary py-1.5 px-3 text-xs w-full flex items-center justify-center gap-1.5"
                  >
                    <Share2 className="w-3.5 h-3.5" /> Copy WhatsApp Invoice
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Billing;
