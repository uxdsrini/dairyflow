import React, { useState, useEffect } from 'react';
import {
  Plus, Search, CreditCard, FileSpreadsheet, Upload, X,
  AlertTriangle, CheckCircle2, ArrowRight, RotateCcw, Trash2, Edit2
} from 'lucide-react';
import { Payment, Customer, Invoice, PAYMENT_METHODS, ImportLog } from '../types';
import {
  getPayments, addPayment, updatePayment, deletePayment, bulkImportPayments, getRecentPaymentImportLogs,
  deletePaymentImportLog, BulkCustomerInput, BulkPaymentInput
} from '../services/paymentService';
import { getCustomers } from '../services/customerService';
import { getInvoices, updateInvoice } from '../services/billingService';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { Timestamp } from 'firebase/firestore';
import { formatFirestoreDate } from '../utils/dateUtils';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';

type PaymentImportField = 'date' | 'customerName' | 'mobile' | 'amount' | 'method';
type PaymentImportStep = 'upload' | 'preview' | 'mapping' | 'validation' | 'success';

interface RawPaymentRow {
  rowNumber: number;
  values: Record<string, any>;
}

interface PaymentImportMapping {
  date: string;
  customerName: string;
  mobile: string;
  amount: string;
  method: string;
}

interface ValidatedPaymentRow {
  rowNumber: number;
  raw: RawPaymentRow;
  date: Date | null;
  dateKey: string;
  customerName: string;
  mobile: string;
  amount: number;
  method: Payment['method'];
  errors: string[];
  duplicate: boolean;
  customerId: string;
  matchedCustomer?: Customer;
  createsCustomer: boolean;
}

interface PaymentImportSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  readyRows: number;
  matchedCustomers: number;
  newCustomers: number;
}

interface PaymentImportResult {
  totalRows: number;
  importedRows: number;
  skippedDuplicates: number;
  invalidRows: number;
  newCustomersCreated: number;
}

const PAYMENT_IMPORT_FIELDS: { key: PaymentImportField; label: string }[] = [
  { key: 'date', label: 'Date' },
  { key: 'customerName', label: 'Customer Name' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'amount', label: 'Amount' },
  { key: 'method', label: 'Payment Method' },
];

const PAYMENT_FIELD_ALIASES: Record<PaymentImportField, string[]> = {
  date: ['date', 'payment date', 'paid date', 'transaction date'],
  customerName: ['customer name', 'customer', 'name', 'client name'],
  mobile: ['mobile', 'phone', 'phone number', 'contact number', 'mobile number'],
  amount: ['amount', 'paid amount', 'payment amount', 'total amount'],
  method: ['payment method', 'payment mode', 'mode', 'method'],
};

const isAllowedPaymentFile = (file: File) => {
  const name = file.name.toLowerCase();
  return name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv');
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const normalizeHeader = (value: string) => value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');

const autoDetectPaymentMapping = (headers: string[]): PaymentImportMapping => {
  const mapping: PaymentImportMapping = { date: '', customerName: '', mobile: '', amount: '', method: '' };
  PAYMENT_IMPORT_FIELDS.forEach((field) => {
    const match = headers.find((header) => PAYMENT_FIELD_ALIASES[field.key].includes(normalizeHeader(header)));
    mapping[field.key] = match || '';
  });
  return mapping;
};

const parsePaymentDate = (value: any): Date | null => {
  if (!value && value !== 0) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return new Date(parsed.y, parsed.m - 1, parsed.d);
  }

  const raw = String(value).trim();
  if (!raw) return null;
  const isoLike = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoLike) {
    const date = new Date(Number(isoLike[1]), Number(isoLike[2]) - 1, Number(isoLike[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const indianDate = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (indianDate) {
    const year = Number(indianDate[3].length === 2 ? `20${indianDate[3]}` : indianDate[3]);
    const date = new Date(year, Number(indianDate[2]) - 1, Number(indianDate[1]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parsePaymentAmount = (value: any): number => {
  if (typeof value === 'number') return value;
  return Number(String(value ?? '').replace(/[₹,\s]/g, ''));
};

const normalizeMobile = (value: any) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
};

const normalizeName = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

const detectPaymentMethod = (value: any): Payment['method'] => {
  const text = String(value ?? '').trim().toLowerCase();
  if (!text) return 'cash';
  if (['upi', 'phonepe', 'google pay', 'gpay', 'paytm', 'upi id', 'qr'].some((keyword) => text.includes(keyword))) {
    return 'upi';
  }
  if (['bank', 'neft', 'imps', 'rtgs', 'transfer', 'account'].some((keyword) => text.includes(keyword))) {
    return 'bank_transfer';
  }
  if (['cash', 'hand cash', 'paid cash'].some((keyword) => text.includes(keyword))) {
    return 'cash';
  }
  return 'cash';
};

const getPaymentDateKey = (payment: Payment) => {
  const rawDate: any = payment.date || payment.paymentDate;
  if (rawDate?.toDate) return toDateKey(rawDate.toDate());
  const parsed = parsePaymentDate(rawDate);
  return parsed ? toDateKey(parsed) : '';
};

const getPaymentDuplicateKey = (dateKey: string, mobile: string, amount: number, method: Payment['method']) =>
  [dateKey, mobile, amount.toFixed(2), method].join('|');

const matchPaymentRows = (
  rows: RawPaymentRow[],
  mapping: PaymentImportMapping,
  customers: Customer[],
  payments: Payment[],
  currentUserId: string,
  skipDuplicates: boolean
) => {
  const customersByMobile = new Map(customers.map((customer) => [normalizeMobile(customer.mobile), customer]));
  const customersByName = new Map(customers.map((customer) => [normalizeName(customer.name), customer]));
  const newCustomersByMobile = new Map<string, string>();
  const newCustomersByName = new Map<string, string>();

  const existingPaymentKeys = new Set(
    payments
      .filter((payment) => !payment.createdBy || payment.createdBy === currentUserId)
      .map((payment) => {
        const mobile = normalizeMobile(payment.customerMobile || customers.find((customer) => customer.id === payment.customerId)?.mobile || '');
        return getPaymentDuplicateKey(
          getPaymentDateKey(payment),
          mobile,
          Number(payment.amount || 0),
          payment.method || payment.paymentMethod || 'cash'
        );
      })
  );
  const importPaymentKeys = new Set<string>();

  const validated = rows.map((row): ValidatedPaymentRow => {
    const date = parsePaymentDate(row.values[mapping.date]);
    const customerName = String(row.values[mapping.customerName] ?? '').trim();
    const mobile = normalizeMobile(row.values[mapping.mobile]);
    const amount = parsePaymentAmount(row.values[mapping.amount]);
    const method = detectPaymentMethod(row.values[mapping.method]);
    const errors: string[] = [];

    if (!date) errors.push('Date is required and must be valid');
    if (!customerName) errors.push('Customer name is required');
    if (!mobile || mobile.length !== 10) errors.push('Mobile must be a valid 10 digit number');
    if (!Number.isFinite(amount) || amount <= 0) errors.push('Amount must be a positive number');
    if (!String(row.values[mapping.method] ?? '').trim()) errors.push('Payment method is required');

    const matchedCustomer = customersByMobile.get(mobile) || customersByName.get(normalizeName(customerName));
    let customerId = matchedCustomer?.id || '';
    let createsCustomer = false;

    if (!customerId && customerName && mobile.length === 10) {
      const temporaryKey = `new:${mobile || normalizeName(customerName)}`;
      customerId = temporaryKey;
      createsCustomer = true;
      newCustomersByMobile.set(mobile, temporaryKey);
      newCustomersByName.set(normalizeName(customerName), temporaryKey);
    } else if (!customerId && customerName) {
      const temporaryKey = newCustomersByName.get(normalizeName(customerName)) || `new:${normalizeName(customerName)}`;
      customerId = temporaryKey;
      createsCustomer = true;
      newCustomersByName.set(normalizeName(customerName), temporaryKey);
    }

    const dateKey = date ? toDateKey(date) : '';
    const duplicateKey = getPaymentDuplicateKey(dateKey, mobile, Number.isFinite(amount) ? amount : 0, method);
    const duplicate = Boolean(dateKey && existingPaymentKeys.has(duplicateKey)) || importPaymentKeys.has(duplicateKey);

    if (dateKey && !importPaymentKeys.has(duplicateKey)) {
      importPaymentKeys.add(duplicateKey);
    }

    return {
      rowNumber: row.rowNumber,
      raw: row,
      date,
      dateKey,
      customerName,
      mobile,
      amount,
      method,
      errors,
      duplicate,
      customerId,
      matchedCustomer,
      createsCustomer,
    };
  });

  const validRows = validated.filter((row) => row.errors.length === 0).length;
  const invalidRows = validated.length - validRows;
  const duplicateRows = validated.filter((row) => row.errors.length === 0 && row.duplicate).length;
  const readyRows = validated.filter((row) => row.errors.length === 0 && (!row.duplicate || !skipDuplicates)).length;
  const matchedCustomers = validated.filter((row) => row.errors.length === 0 && row.matchedCustomer).length;
  const uniqueNewCustomers = new Set(validated.filter((row) => row.errors.length === 0 && row.createsCustomer).map((row) => row.customerId)).size;

  return {
    rows: validated,
    summary: {
      totalRows: rows.length,
      validRows,
      invalidRows,
      duplicateRows,
      readyRows,
      matchedCustomers,
      newCustomers: uniqueNewCustomers,
    } as PaymentImportSummary,
  };
};


const Payments: React.FC = () => {
  const { currentUser } = useAuth();
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
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  // Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState<PaymentImportStep>('upload');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [rawImportRows, setRawImportRows] = useState<RawPaymentRow[]>([]);
  const [importMapping, setImportMapping] = useState<PaymentImportMapping>({ date: '', customerName: '', mobile: '', amount: '', method: '' });
  const [validatedRows, setValidatedRows] = useState<ValidatedPaymentRow[]>([]);
  const [importSummary, setImportSummary] = useState<PaymentImportSummary | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<PaymentImportResult | null>(null);
  const [importLogs, setImportLogs] = useState<ImportLog[]>([]);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    loadData();
    loadImportLogs();
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

  const loadImportLogs = async () => {
    try {
      const logs = await getRecentPaymentImportLogs();
      setImportLogs(logs);
    } catch (err) {
      console.error('Failed to load payment import logs:', err);
    }
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
    setEditingPayment(null);
    setCustomerId(customers[0]?.id || '');
    setAmount(0);
    setMethod('cash');
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setInvoiceId('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (payment: Payment) => {
    setEditingPayment(payment);
    setCustomerId(payment.customerId);
    setAmount(payment.amount);
    setMethod(payment.method || payment.paymentMethod || 'cash');
    setDate(payment.date?.toDate ? payment.date.toDate().toISOString().split('T')[0] : payment.paymentDate || new Date().toISOString().split('T')[0]);
    setNotes(payment.notes || '');
    setInvoiceId(payment.invoiceId || '');
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
        customerMobile: customer.mobile,
        amount: Number(amount),
        method,
        date: Timestamp.fromDate(new Date(date)),
        paymentDate: date,
        paymentMethod: method,
        notes,
        invoiceId: invoiceId || undefined,
        source: editingPayment?.source || 'manual',
        uploadedFileName: editingPayment?.uploadedFileName,
        createdBy: editingPayment?.createdBy || currentUser?.uid,
      };

      if (editingPayment) {
        await updatePayment(editingPayment.id, paymentPayload);
      } else {
        await addPayment(paymentPayload);
      }

      if (!editingPayment && invoiceId) {
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

      toast.success(editingPayment ? 'Payment updated successfully' : 'Payment recorded successfully');
      setIsModalOpen(false);
      setEditingPayment(null);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save payment');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePayment = async (payment: Payment) => {
    if (!window.confirm(`Delete payment of ₹${payment.amount} from ${payment.customerName}?`)) {
      return;
    }

    try {
      await deletePayment(payment.id);
      await loadData();
      toast.success('Payment deleted successfully');
    } catch (err) {
      console.error('Failed to delete payment:', err);
      toast.error('Failed to delete payment');
    }
  };

  const resetImportState = () => {
    setImportStep('upload');
    setImportFile(null);
    setImportHeaders([]);
    setRawImportRows([]);
    setImportMapping({ date: '', customerName: '', mobile: '', amount: '', method: '' });
    setValidatedRows([]);
    setImportSummary(null);
    setSkipDuplicates(true);
    setImportResult(null);
    setDragActive(false);
  };

  const handleOpenImportModal = () => {
    resetImportState();
    setShowImportModal(true);
  };

  const handleCloseImportModal = () => {
    setShowImportModal(false);
    resetImportState();
  };

  const parseImportFile = async (file: File) => {
    if (!isAllowedPaymentFile(file)) {
      toast.error('Invalid file type. Upload .xlsx, .xls, or .csv');
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        toast.error('Empty Excel file');
        return;
      }

      const sheet = workbook.Sheets[firstSheetName];
      const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '', raw: false });
      if (jsonRows.length === 0) {
        toast.error('Empty Excel file');
        return;
      }

      const headers = Object.keys(jsonRows[0] || {}).filter(Boolean);
      if (headers.length === 0) {
        toast.error('No columns found in file');
        return;
      }

      const rows = jsonRows
        .filter((row) => Object.values(row).some((value) => String(value ?? '').trim() !== ''))
        .map((row, index) => ({ rowNumber: index + 2, values: row }));

      if (rows.length === 0) {
        toast.error('No payment rows found in file');
        return;
      }

      setImportFile(file);
      setImportHeaders(headers);
      setRawImportRows(rows);
      setImportMapping(autoDetectPaymentMapping(headers));
      setValidatedRows([]);
      setImportSummary(null);
      setImportResult(null);
      setImportStep('preview');
      toast.success('File parsed successfully');
    } catch (err) {
      console.error('Failed to parse payment import file:', err);
      toast.error('Could not parse the uploaded file');
    }
  };

  const handleFileSelect = (file?: File) => {
    if (file) parseImportFile(file);
  };

  const requiredMappingsComplete = PAYMENT_IMPORT_FIELDS.every((field) => Boolean(importMapping[field.key]));

  const validatePaymentImport = (skip = skipDuplicates) => {
    if (!requiredMappingsComplete) {
      toast.error('Map all required payment fields before validation');
      return;
    }

    const { rows, summary } = matchPaymentRows(
      rawImportRows,
      importMapping,
      customers,
      payments,
      currentUser?.uid || 'anonymous',
      skip
    );
    setValidatedRows(rows);
    setImportSummary(summary);
    setImportStep('validation');

    if (summary.readyRows === 0) {
      toast.error('No valid rows ready to import');
    } else {
      toast.success('Rows validated');
    }
  };

  const handleDuplicateModeChange = (skip: boolean) => {
    setSkipDuplicates(skip);
    if (validatedRows.length > 0) {
      validatePaymentImport(skip);
    }
  };

  const handleImportPayments = async () => {
    if (!importFile || !importSummary) return;
    const userId = currentUser?.uid;
    if (!userId) {
      toast.error('Please sign in before importing payments');
      return;
    }

    const rowsToImport = validatedRows.filter((row) => row.errors.length === 0 && (!row.duplicate || !skipDuplicates));
    if (rowsToImport.length === 0) {
      toast.error('No valid rows to import');
      return;
    }

    setImporting(true);
    try {
      const uniqueNewCustomers = new Map<string, BulkCustomerInput>();
      rowsToImport.forEach((row) => {
        if (row.createsCustomer && !uniqueNewCustomers.has(row.customerId)) {
          uniqueNewCustomers.set(row.customerId, {
            temporaryKey: row.customerId,
            name: row.customerName,
            mobile: row.mobile,
            address: '',
            route: '',
            customerType: 'regular',
            status: 'active',
            source: 'payment_excel_import',
            createdBy: userId,
          });
        }
      });

      const paymentsToImport: BulkPaymentInput[] = rowsToImport.map((row) => ({
        customerId: row.customerId,
        customerName: row.matchedCustomer?.name || row.customerName,
        customerMobile: row.matchedCustomer?.mobile || row.mobile,
        amount: row.amount,
        method: row.method,
        date: Timestamp.fromDate(row.date as Date),
        paymentDate: row.dateKey,
        paymentMethod: row.method,
        notes: '',
        source: 'excel_import',
        uploadedFileName: importFile.name,
        createdBy: userId,
      }));

      const duplicateRows = validatedRows.filter((row) => row.errors.length === 0 && row.duplicate).length;
      const skippedDuplicates = skipDuplicates ? duplicateRows : 0;
      const result = await bulkImportPayments(paymentsToImport, Array.from(uniqueNewCustomers.values()), {
        fileName: importFile.name,
        totalRows: rawImportRows.length,
        importedRows: rowsToImport.length,
        skippedRows: skippedDuplicates + importSummary.invalidRows,
        duplicateRows,
        invalidRows: importSummary.invalidRows,
        newCustomersCreated: uniqueNewCustomers.size,
        uploadedBy: userId,
      });

      await Promise.all([loadData(), loadImportLogs()]);
      setImportResult({
        totalRows: rawImportRows.length,
        importedRows: result.importedRows,
        skippedDuplicates,
        invalidRows: importSummary.invalidRows,
        newCustomersCreated: result.newCustomersCreated,
      });
      setImportStep('success');
      toast.success('Payments imported successfully');
    } catch (err) {
      console.error('Payment import failed:', err);
      toast.error('Firestore write failed. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteImportLog = async (log: ImportLog) => {
    if (!window.confirm(`Delete import history for "${log.fileName}"? Imported payments will not be deleted.`)) {
      return;
    }

    try {
      await deletePaymentImportLog(log.id);
      await loadImportLogs();
      toast.success('Import history deleted');
    } catch (err) {
      console.error('Failed to delete payment import log:', err);
      toast.error('Failed to delete import history');
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
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={handleOpenImportModal}
            className="btn-secondary flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" /> Upload Payment Excel
          </button>
          <button
            onClick={handleOpenAddModal}
            disabled={customers.length === 0}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Record Payment
          </button>
        </div>
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
                  <th className="p-4 text-right">Actions</th>
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
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(p)}
                          className="btn-icon text-blue-600 hover:bg-blue-50"
                          title="Edit payment"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePayment(p)}
                          className="btn-icon text-red-600 hover:bg-red-50"
                          title="Delete payment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
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
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(p)}
                    className="btn-secondary flex-1 flex items-center justify-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePayment(p)}
                    className="btn-danger flex-1 flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Import History */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileSpreadsheet className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Recent Payment Imports</h3>
        </div>
        {importLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">File</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Uploaded</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Total</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Imported</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">New Customers</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Duplicates</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Invalid</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {importLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{log.fileName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatFirestoreDate(log.uploadedAt)}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">{log.totalRows}</td>
                    <td className="px-4 py-3 text-sm text-right text-emerald-700 font-semibold">{log.importedRows}</td>
                    <td className="px-4 py-3 text-sm text-right text-dairy-700">{log.newCustomersCreated || 0}</td>
                    <td className="px-4 py-3 text-sm text-right text-amber-700">{log.duplicateRows}</td>
                    <td className="px-4 py-3 text-sm text-right text-red-700">{log.invalidRows}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteImportLog(log)}
                        className="btn-icon text-red-600 hover:bg-red-50"
                        title="Delete import history"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No payment imports yet.</p>
        )}
      </div>

      {/* Import Wizard Modal */}
      <Modal isOpen={showImportModal} onClose={handleCloseImportModal} title="Upload Payment Excel" size="lg">
        <div className="space-y-5">
          <div className="grid grid-cols-4 gap-2 text-xs sm:text-sm">
            {[
              ['upload', 'Upload'],
              ['preview', 'Preview'],
              ['mapping', 'Mapping'],
              ['validation', 'Validate'],
            ].map(([step, label], index) => (
              <div
                key={step}
                className={`rounded-xl px-2 py-2 text-center font-medium ${
                  importStep === step || (importStep === 'success' && step === 'validation')
                    ? 'bg-dairy-600 text-white'
                    : index < ['upload', 'preview', 'mapping', 'validation'].indexOf(importStep)
                      ? 'bg-dairy-50 text-dairy-700'
                      : 'bg-gray-100 text-gray-500'
                }`}
              >
                {label}
              </div>
            ))}
          </div>

          {importStep === 'upload' && (
            <div className="space-y-4">
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  handleFileSelect(e.dataTransfer.files[0]);
                }}
                className={`flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
                  dragActive ? 'border-dairy-500 bg-dairy-50' : 'border-gray-200 bg-gray-50 hover:bg-dairy-50'
                }`}
              >
                <Upload className="w-12 h-12 text-dairy-600" />
                <p className="mt-3 text-base font-semibold text-gray-900">Drop your payment file here</p>
                <p className="mt-1 text-sm text-gray-500">Supports .xlsx, .xls, and .csv files</p>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files?.[0])}
                />
                <span className="btn-secondary mt-5">Choose File</span>
              </label>
              {importFile && (
                <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileSpreadsheet className="w-5 h-5 text-dairy-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{importFile.name}</p>
                      <p className="text-xs text-gray-500">{formatBytes(importFile.size)}</p>
                    </div>
                  </div>
                  <button type="button" className="btn-icon" onClick={resetImportState} title="Remove file">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {importStep === 'preview' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-dairy-50 p-4">
                <p className="text-sm font-semibold text-dairy-800">Total Rows Found: {rawImportRows.length}</p>
                <p className="text-sm text-dairy-700">Showing First {Math.min(20, rawImportRows.length)} Rows</p>
                {importFile && <p className="mt-1 text-xs text-dairy-700">{importFile.name} · {formatBytes(importFile.size)}</p>}
              </div>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full min-w-[820px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Row</th>
                      {importHeaders.map((header) => (
                        <th key={header} className="px-3 py-2 text-left text-xs font-semibold text-gray-700">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rawImportRows.slice(0, 20).map((row) => (
                      <tr key={row.rowNumber}>
                        <td className="px-3 py-2 text-xs text-gray-500">{row.rowNumber}</td>
                        {importHeaders.map((header) => (
                          <td key={header} className="px-3 py-2 text-xs text-gray-800">{String(row.values[header] ?? '')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="sticky bottom-0 -mx-1 bg-white pt-3">
                <button type="button" className="btn-primary w-full flex items-center justify-center gap-2" onClick={() => setImportStep('mapping')}>
                  Continue to Column Mapping
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {importStep === 'mapping' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-900">Excel Column → DairyFlow Field</p>
                <p className="text-xs text-gray-500 mt-1">All fields are required before import.</p>
              </div>
              <div className="space-y-3">
                {PAYMENT_IMPORT_FIELDS.map((field) => (
                  <div key={field.key} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] sm:items-center gap-2">
                    <label className="text-sm font-medium text-gray-900">{field.label} *</label>
                    <ArrowRight className="hidden sm:block w-4 h-4 text-gray-400" />
                    <select
                      value={importMapping[field.key]}
                      onChange={(e) => setImportMapping({ ...importMapping, [field.key]: e.target.value })}
                      className="select-field w-full"
                    >
                      <option value="">Select Excel column</option>
                      {importHeaders.map((header) => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              {!requiredMappingsComplete && (
                <div className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  Map Date, Customer Name, Mobile, Amount, and Payment Method to continue.
                </div>
              )}
              <div className="sticky bottom-0 -mx-1 flex flex-col sm:flex-row gap-2 bg-white pt-3">
                <button type="button" className="btn-secondary flex-1" onClick={() => setImportStep('preview')}>Back</button>
                <button type="button" className="btn-primary flex-1" disabled={!requiredMappingsComplete} onClick={() => validatePaymentImport()}>
                  Validate Rows
                </button>
              </div>
            </div>
          )}

          {importStep === 'validation' && importSummary && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-xl bg-emerald-50 p-3">
                  <p className="text-xs text-emerald-700">Valid Rows</p>
                  <p className="text-xl font-bold text-emerald-800">{importSummary.validRows}</p>
                </div>
                <div className="rounded-xl bg-red-50 p-3">
                  <p className="text-xs text-red-700">Invalid Rows</p>
                  <p className="text-xl font-bold text-red-800">{importSummary.invalidRows}</p>
                </div>
                <div className="rounded-xl bg-amber-50 p-3">
                  <p className="text-xs text-amber-700">Duplicates</p>
                  <p className="text-xl font-bold text-amber-800">{importSummary.duplicateRows}</p>
                </div>
                <div className="rounded-xl bg-dairy-50 p-3">
                  <p className="text-xs text-dairy-700">Ready to Import</p>
                  <p className="text-xl font-bold text-dairy-800">{importSummary.readyRows}</p>
                </div>
                <div className="rounded-xl bg-blue-50 p-3">
                  <p className="text-xs text-blue-700">Matched Customers</p>
                  <p className="text-xl font-bold text-blue-800">{importSummary.matchedCustomers}</p>
                </div>
                <div className="rounded-xl bg-purple-50 p-3">
                  <p className="text-xs text-purple-700">New Customers</p>
                  <p className="text-xl font-bold text-purple-800">{importSummary.newCustomers}</p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-900 mb-3">Duplicate Handling</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDuplicateModeChange(true)}
                    className={`rounded-xl border p-3 text-left text-sm ${skipDuplicates ? 'border-dairy-500 bg-dairy-50 text-dairy-800' : 'border-gray-200 text-gray-700'}`}
                  >
                    <span className="font-semibold">Skip duplicates</span>
                    <span className="block text-xs mt-1">Default import behavior</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicateModeChange(false)}
                    className={`rounded-xl border p-3 text-left text-sm ${!skipDuplicates ? 'border-dairy-500 bg-dairy-50 text-dairy-800' : 'border-gray-200 text-gray-700'}`}
                  >
                    <span className="font-semibold">Import all anyway</span>
                    <span className="block text-xs mt-1">Includes detected duplicates</span>
                  </button>
                </div>
              </div>

              {validatedRows.some((row) => row.errors.length > 0) && (
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-gray-900">Invalid Rows</h4>
                  <div className="overflow-x-auto rounded-xl border border-red-100">
                    <table className="w-full min-w-[820px]">
                      <thead className="bg-red-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-red-900">Row</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-red-900">Date</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-red-900">Customer</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-red-900">Mobile</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-red-900">Amount</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-red-900">Errors</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-100">
                        {validatedRows.filter((row) => row.errors.length > 0).map((row) => (
                          <tr key={row.rowNumber}>
                            <td className="px-3 py-2 text-xs text-gray-700">{row.rowNumber}</td>
                            <td className="px-3 py-2 text-xs text-gray-700">{String(row.raw.values[importMapping.date] ?? '')}</td>
                            <td className="px-3 py-2 text-xs text-gray-700">{String(row.raw.values[importMapping.customerName] ?? '')}</td>
                            <td className="px-3 py-2 text-xs text-gray-700">{String(row.raw.values[importMapping.mobile] ?? '')}</td>
                            <td className="px-3 py-2 text-xs text-gray-700">{String(row.raw.values[importMapping.amount] ?? '')}</td>
                            <td className="px-3 py-2 text-xs text-red-700">{row.errors.join(', ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="sticky bottom-0 -mx-1 flex flex-col sm:flex-row gap-2 bg-white pt-3">
                <button type="button" className="btn-secondary flex-1" onClick={() => setImportStep('mapping')}>Back</button>
                <button
                  type="button"
                  className="btn-primary flex-1"
                  disabled={importing || importSummary.readyRows === 0}
                  onClick={handleImportPayments}
                >
                  {importing ? 'Importing...' : 'Import Payments'}
                </button>
              </div>
            </div>
          )}

          {importStep === 'success' && importResult && (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex w-16 h-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="w-9 h-9 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Payments Imported Successfully</h3>
                <p className="text-sm text-gray-500 mt-1">{importFile?.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Total Rows</p>
                  <p className="text-xl font-bold text-gray-900">{importResult.totalRows}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3">
                  <p className="text-xs text-emerald-700">Imported</p>
                  <p className="text-xl font-bold text-emerald-800">{importResult.importedRows}</p>
                </div>
                <div className="rounded-xl bg-amber-50 p-3">
                  <p className="text-xs text-amber-700">Skipped Duplicates</p>
                  <p className="text-xl font-bold text-amber-800">{importResult.skippedDuplicates}</p>
                </div>
                <div className="rounded-xl bg-red-50 p-3">
                  <p className="text-xs text-red-700">Invalid Rows</p>
                  <p className="text-xl font-bold text-red-800">{importResult.invalidRows}</p>
                </div>
                <div className="col-span-2 rounded-xl bg-dairy-50 p-3">
                  <p className="text-xs text-dairy-700">New Customers Created</p>
                  <p className="text-xl font-bold text-dairy-800">{importResult.newCustomersCreated}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button type="button" className="btn-primary flex-1" onClick={handleCloseImportModal}>View Payments</button>
                <button type="button" className="btn-secondary flex-1 flex items-center justify-center gap-2" onClick={resetImportState}>
                  <RotateCcw className="w-4 h-4" />
                  Upload Another File
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPayment(null);
        }}
        title={editingPayment ? 'Edit Payment' : 'Record Payment'}
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
              onClick={() => {
                setIsModalOpen(false);
                setEditingPayment(null);
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
            >
              {saving ? 'Saving...' : editingPayment ? 'Update Payment' : 'Record Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Payments;
