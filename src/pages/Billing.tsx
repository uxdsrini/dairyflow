import React, { useState, useEffect } from 'react';
import { FileText, Send, Check, Search, Clipboard, AlertCircle, RefreshCw, Download } from 'lucide-react';
import { Invoice, Customer, Delivery, Order, Subscription } from '../types';
import { getInvoicesByMonth, addInvoice, generateWhatsAppInvoice } from '../services/billingService';
import { getCustomers } from '../services/customerService';
import { getDeliveries } from '../services/deliveryService';
import { getOrders } from '../services/orderService';
import { getSubscriptions } from '../services/subscriptionService';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const BILLING_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const escapeHtml = (value: string | number | undefined | null) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const formatInvoiceCurrency = (amount: number) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

const sanitizeInvoiceFileName = (value: string) =>
  value.replace(/[^a-z0-9-_]+/gi, '_').replace(/^_+|_+$/g, '') || 'customer';

const getInvoiceFileName = (invoice: Invoice) =>
  `DairyFlow_Invoice_${sanitizeInvoiceFileName(invoice.customerName)}_${BILLING_MONTH_NAMES[invoice.month - 1]}_${invoice.year}.pdf`;

const buildA5InvoiceHtml = (invoice: Invoice, customer?: Customer) => {
  const monthName = BILLING_MONTH_NAMES[invoice.month - 1] || String(invoice.month);
  const customerMobile = customer?.mobile ? `<div>Mobile: ${escapeHtml(customer.mobile)}</div>` : '';
  const customerAddress = customer?.address ? `<div>Address: ${escapeHtml(customer.address)}</div>` : '';
  const route = customer?.route ? `<div>Route: ${escapeHtml(customer.route)}</div>` : '';
  const rows = invoice.items.map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(item.description)}</td>
      <td class="num">${escapeHtml(item.quantity)}</td>
      <td class="num">${formatInvoiceCurrency(item.rate)}</td>
      <td class="num">${formatInvoiceCurrency(item.amount)}</td>
    </tr>
  `).join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>DairyFlow Invoice - ${escapeHtml(invoice.customerName)}</title>
  <style>
    @page { size: A5; margin: 10mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #eef2f0;
      color: #111827;
      font-family: Arial, Helvetica, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .toolbar {
      display: flex;
      justify-content: center;
      gap: 10px;
      padding: 14px;
    }
    .toolbar button {
      border: 0;
      border-radius: 10px;
      padding: 10px 16px;
      background: #5aa04e;
      color: white;
      font-weight: 700;
      cursor: pointer;
    }
    .invoice {
      width: 148mm;
      min-height: 210mm;
      margin: 0 auto 24px;
      padding: 10mm;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
    }
    .header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 12px;
      border-bottom: 2px solid #5aa04e;
    }
    .brand h1 {
      margin: 0;
      font-size: 22px;
      color: #2f7d32;
    }
    .brand p,
    .meta {
      margin: 4px 0 0;
      color: #6b7280;
      font-size: 11px;
      line-height: 1.45;
    }
    .invoice-title {
      text-align: right;
      font-size: 22px;
      font-weight: 800;
      color: #111827;
    }
    .section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 16px;
    }
    .box {
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 10px;
      font-size: 12px;
      line-height: 1.5;
    }
    .box strong {
      display: block;
      color: #374151;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: .08em;
      margin-bottom: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
      font-size: 11px;
    }
    th {
      background: #f3f8f1;
      color: #374151;
      text-transform: uppercase;
      font-size: 9px;
      letter-spacing: .08em;
      text-align: left;
    }
    th, td {
      border: 1px solid #e5e7eb;
      padding: 7px;
      vertical-align: top;
    }
    .num { text-align: right; white-space: nowrap; }
    .totals {
      width: 62%;
      margin-left: auto;
      margin-top: 14px;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
      font-size: 12px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 10px;
      border-bottom: 1px solid #e5e7eb;
    }
    .total-row:last-child { border-bottom: 0; }
    .grand {
      background: #f3f8f1;
      font-size: 14px;
      font-weight: 800;
      color: #2f7d32;
    }
    .pending { color: #dc2626; font-weight: 800; }
    .footer {
      margin-top: 20px;
      padding-top: 12px;
      border-top: 1px dashed #d1d5db;
      color: #6b7280;
      font-size: 10px;
      text-align: center;
    }
    @media print {
      body { background: #fff; }
      .toolbar { display: none; }
      .invoice {
        width: auto;
        min-height: auto;
        margin: 0;
        padding: 0;
        border-radius: 0;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button onclick="window.print()">Print / Save PDF</button>
  </div>
  <main class="invoice">
    <div class="header">
      <div class="brand">
        <h1>DairyFlow</h1>
        <p>Dairy Management Invoice</p>
      </div>
      <div>
        <div class="invoice-title">INVOICE</div>
        <div class="meta">Period: ${escapeHtml(monthName)} ${escapeHtml(invoice.year)}</div>
        <div class="meta">Invoice ID: ${escapeHtml(invoice.id)}</div>
        <div class="meta">Date: ${new Date().toLocaleDateString('en-IN')}</div>
      </div>
    </div>

    <section class="section">
      <div class="box">
        <strong>Bill To</strong>
        <div><b>${escapeHtml(invoice.customerName)}</b></div>
        ${customerMobile}
        ${customerAddress}
        ${route}
      </div>
      <div class="box">
        <strong>Payment Status</strong>
        <div>Status: ${escapeHtml(invoice.status.toUpperCase())}</div>
        <div>Total: ${formatInvoiceCurrency(invoice.totalAmount)}</div>
        <div>Paid: ${formatInvoiceCurrency(invoice.paidAmount)}</div>
        <div>Pending: ${formatInvoiceCurrency(invoice.pendingAmount)}</div>
      </div>
    </section>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Description</th>
          <th class="num">Qty</th>
          <th class="num">Rate</th>
          <th class="num">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="totals">
      <div class="total-row"><span>Total Amount</span><b>${formatInvoiceCurrency(invoice.totalAmount)}</b></div>
      <div class="total-row"><span>Paid Amount</span><b>${formatInvoiceCurrency(invoice.paidAmount)}</b></div>
      <div class="total-row grand"><span>Pending Amount</span><span class="pending">${formatInvoiceCurrency(invoice.pendingAmount)}</span></div>
    </div>

    <div class="footer">
      Thank you for your business. This A5 invoice was generated from DairyFlow.
    </div>
  </main>
</body>
</html>`;
};

const toPdfText = (value: string | number | undefined | null) =>
  String(value ?? '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const escapePdfText = (value: string | number | undefined | null) =>
  toPdfText(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const formatPdfCurrency = (amount: number) => `Rs. ${Number(amount || 0).toLocaleString('en-IN')}`;

const wrapPdfText = (text: string, maxLength: number) => {
  const words = toPdfText(text).split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach(word => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (nextLine.length > maxLength && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = nextLine;
    }
  });

  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [''];
};

const buildA5InvoicePdfBlob = (invoice: Invoice, customer?: Customer) => {
  const pageWidth = 419.53;
  const pageHeight = 595.28;
  const margin = 32;
  const content: string[] = [];
  const monthName = BILLING_MONTH_NAMES[invoice.month - 1] || String(invoice.month);
  let y = pageHeight - margin;

  const addText = (text: string | number, x: number, lineY: number, size = 10, bold = false, color = '0.07 0.09 0.15') => {
    content.push(`${color} rg BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x} ${lineY} Td (${escapePdfText(text)}) Tj ET`);
  };
  const addRightText = (text: string | number, x: number, lineY: number, size = 10, bold = false, color = '0.07 0.09 0.15') => {
    const estimatedWidth = toPdfText(text).length * size * 0.48;
    addText(text, Math.max(margin, x - estimatedWidth), lineY, size, bold, color);
  };
  const addLine = (x1: number, y1: number, x2: number, y2: number) => {
    content.push(`0.82 0.86 0.82 RG ${x1} ${y1} m ${x2} ${y2} l S`);
  };

  content.push('0.96 0.99 0.95 rg 0 0 419.53 595.28 re f');
  content.push('1 1 1 rg 22 18 375.53 559.28 re f');
  content.push('0.33 0.63 0.31 RG 32 508 m 387.53 508 l S');

  addText('DairyFlow', margin, y, 18, true, '0.18 0.49 0.20');
  addText('Dairy Management Invoice', margin, y - 16, 9, false, '0.42 0.45 0.50');
  addRightText('INVOICE', pageWidth - margin, y, 18, true);
  addRightText(`Period: ${monthName} ${invoice.year}`, pageWidth - margin, y - 16, 9, false, '0.42 0.45 0.50');
  addRightText(`Date: ${new Date().toLocaleDateString('en-IN')}`, pageWidth - margin, y - 29, 9, false, '0.42 0.45 0.50');
  y -= 62;

  addText('BILL TO', margin, y, 8, true);
  addText(invoice.customerName, margin, y - 16, 12, true);
  if (customer?.mobile) addText(`Mobile: ${customer.mobile}`, margin, y - 31, 9);
  if (customer?.route) addText(`Route: ${customer.route}`, margin, y - 44, 9);
  if (customer?.address) {
    wrapPdfText(`Address: ${customer.address}`, 38).slice(0, 2).forEach((line, index) => {
      addText(line, margin, y - 57 - (index * 12), 9);
    });
  }

  addText('STATUS', 250, y, 8, true);
  addText(invoice.status.toUpperCase(), 250, y - 16, 12, true);
  addText(`Total: ${formatPdfCurrency(invoice.totalAmount)}`, 250, y - 31, 9);
  addText(`Paid: ${formatPdfCurrency(invoice.paidAmount)}`, 250, y - 44, 9);
  addText(`Pending: ${formatPdfCurrency(invoice.pendingAmount)}`, 250, y - 57, 9, true);
  y -= 92;

  addLine(margin, y, pageWidth - margin, y);
  y -= 18;
  addText('#', margin, y, 8, true);
  addText('Description', margin + 25, y, 8, true);
  addRightText('Qty', margin + 245, y, 8, true);
  addRightText('Rate', margin + 302, y, 8, true);
  addRightText('Amount', pageWidth - margin, y, 8, true);
  y -= 12;
  addLine(margin, y, pageWidth - margin, y);
  y -= 15;

  invoice.items.forEach((item, index) => {
    if (y < 130) return;
    const descriptionLines = wrapPdfText(item.description, 35).slice(0, 2);
    addText(index + 1, margin, y, 8);
    descriptionLines.forEach((line, lineIndex) => addText(line, margin + 25, y - (lineIndex * 10), 8));
    addRightText(item.quantity, margin + 245, y, 8);
    addRightText(formatPdfCurrency(item.rate), margin + 302, y, 8);
    addRightText(formatPdfCurrency(item.amount), pageWidth - margin, y, 8);
    y -= descriptionLines.length > 1 ? 28 : 20;
  });

  y = Math.max(y, 110);
  addLine(210, y + 16, pageWidth - margin, y + 16);
  addText('Total Amount', 220, y, 9);
  addRightText(formatPdfCurrency(invoice.totalAmount), pageWidth - margin, y, 9, true);
  addText('Paid Amount', 220, y - 17, 9);
  addRightText(formatPdfCurrency(invoice.paidAmount), pageWidth - margin, y - 17, 9, true);
  addText('Pending Amount', 220, y - 36, 11, true);
  addRightText(formatPdfCurrency(invoice.pendingAmount), pageWidth - margin, y - 36, 11, true, '0.86 0.15 0.15');
  addText('Thank you for your business. Generated from DairyFlow.', 90, 40, 8, false, '0.42 0.45 0.50');

  const stream = content.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
  ];
  const encoder = new TextEncoder();
  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(encoder.encode(pdf).length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
};

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

  const getInvoiceCustomer = (invoice: Invoice) =>
    customers.find(customer => customer.id === invoice.customerId);

  const handleExportInvoice = (invoice: Invoice) => {
    const blob = buildA5InvoicePdfBlob(invoice, getInvoiceCustomer(invoice));
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = getInvoiceFileName(invoice);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('A5 invoice PDF exported successfully');
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
                    <td className="p-4 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          onClick={() => handleExportInvoice(inv)}
                          className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                          title="Export printable A5 invoice"
                        >
                          <Download className="w-3.5 h-3.5" /> Export
                        </button>
                        <button
                          onClick={() => handleCopyWhatsAppText(inv)}
                          className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 border-dairy-300 text-dairy-700 hover:bg-dairy-50"
                          title="Copy invoice for WhatsApp"
                        >
                          <Clipboard className="w-3.5 h-3.5" /> WhatsApp
                        </button>
                      </div>
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

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100">
                  <button
                    onClick={() => handleExportInvoice(inv)}
                    className="btn-secondary py-1.5 px-3 text-xs flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Export
                  </button>
                  <button
                    onClick={() => handleCopyWhatsAppText(inv)}
                    className="btn-secondary py-1.5 px-3 text-xs flex items-center justify-center gap-1.5"
                  >
                    <Clipboard className="w-3.5 h-3.5" /> WhatsApp
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
