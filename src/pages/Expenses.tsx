import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Trash2, Edit2, Filter, Download, BarChart3,
  Calendar, DollarSign, Upload, FileSpreadsheet, X, CheckCircle2, AlertTriangle,
  ArrowRight, RotateCcw
} from 'lucide-react';
import { Expense, ImportLog, EXPENSE_CATEGORY_LABELS, PAYMENT_METHODS } from '../types';
import {
  getExpenses, addExpense, updateExpense, deleteExpense,
  getTotalExpensesByMonth, getTotalExpensesByCategory,
  bulkImportExpenses, getRecentExpenseImportLogs, deleteExpenseImportLog, BulkExpenseInput
} from '../services/expenseService';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { Timestamp } from 'firebase/firestore';
import { formatFirestoreDate } from '../utils/dateUtils';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
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

type RequiredImportField = 'date' | 'category' | 'description' | 'amount';
type ImportStep = 'upload' | 'preview' | 'mapping' | 'validation' | 'success';

interface RawExpenseRow {
  rowNumber: number;
  values: Record<string, any>;
}

interface ImportMapping {
  date: string;
  category: string;
  description: string;
  amount: string;
}

interface ValidatedExpenseRow {
  rowNumber: number;
  raw: RawExpenseRow;
  date: Date | null;
  dateKey: string;
  category: Expense['category'];
  description: string;
  amount: number;
  errors: string[];
  duplicate: boolean;
}

interface ImportSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  readyRows: number;
}

interface ImportResult {
  totalRows: number;
  importedRows: number;
  skippedDuplicates: number;
  invalidRows: number;
}

const IMPORT_FIELDS: { key: RequiredImportField; label: string; required: boolean }[] = [
  { key: 'date', label: 'Date', required: true },
  { key: 'category', label: 'Category', required: true },
  { key: 'description', label: 'Description', required: false },
  { key: 'amount', label: 'Amount', required: true },
];

const IMPORT_FIELD_ALIASES: Record<RequiredImportField, string[]> = {
  date: ['date', 'expense date', 'paid date', 'transaction date'],
  category: ['category', 'expense type', 'type'],
  description: ['description', 'details', 'notes', 'expense description'],
  amount: ['amount', 'total amount', 'cost', 'expense amount'],
};

const CATEGORY_LABEL_TO_KEY = Object.entries(EXPENSE_CATEGORY_LABELS).reduce((acc, [key, label]) => {
  acc[label.toLowerCase()] = key as Expense['category'];
  acc[key.replace(/_/g, ' ').toLowerCase()] = key as Expense['category'];
  return acc;
}, {} as Record<string, Expense['category']>);

const CATEGORY_KEYWORDS: { category: Expense['category']; keywords: string[] }[] = [
  { category: 'fuel', keywords: ['diesel', 'petrol', 'fuel'] },
  { category: 'transportation', keywords: ['vehicle', 'auto', 'bike', 'delivery', 'transport', 'trip'] },
  { category: 'feed', keywords: ['cattle feed', 'feed', 'grass', 'fodder', 'silage'] },
  { category: 'medicine', keywords: ['injection', 'vaccine', 'vaccination', 'vet', 'tablet', 'medicine'] },
  { category: 'maintenance', keywords: ['repair', 'service', 'shed work', 'maintenance'] },
  { category: 'electricity', keywords: ['current bill', 'power bill', 'electricity'] },
  { category: 'water', keywords: ['water'] },
  { category: 'packaging', keywords: ['bottle', 'packet', 'cover', 'packaging'] },
  { category: 'rent', keywords: ['rent', 'shed rent', 'land rent'] },
  { category: 'equipment_repair', keywords: ['equipment repair', 'machine repair'] },
];

const isAllowedImportFile = (file: File) => {
  const lowerName = file.name.toLowerCase();
  return lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.csv');
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const normalizeHeader = (value: string) => value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');

const autoDetectMapping = (headers: string[]): ImportMapping => {
  const mapping: ImportMapping = { date: '', category: '', description: '', amount: '' };
  IMPORT_FIELDS.forEach((field) => {
    const match = headers.find((header) => IMPORT_FIELD_ALIASES[field.key].includes(normalizeHeader(header)));
    mapping[field.key] = match || '';
  });
  return mapping;
};

const parseImportedDate = (value: any): Date | null => {
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

const parseAmount = (value: any): number => {
  if (typeof value === 'number') return value;
  const cleaned = String(value ?? '').replace(/[₹,\s]/g, '');
  return Number(cleaned);
};

const detectCategory = (categoryValue: any, descriptionValue: any): Expense['category'] => {
  const categoryText = String(categoryValue ?? '').trim().toLowerCase();
  const descriptionText = String(descriptionValue ?? '').trim().toLowerCase();
  const combined = `${categoryText} ${descriptionText}`.trim();

  if (CATEGORY_LABEL_TO_KEY[categoryText]) return CATEGORY_LABEL_TO_KEY[categoryText];

  for (const candidate of CATEGORY_KEYWORDS) {
    if (candidate.keywords.some((keyword) => combined.includes(keyword))) {
      return candidate.category;
    }
  }

  return 'other';
};

const getExpenseDateKey = (expense: Expense) => {
  const rawDate: any = expense.expenseDate;
  if (rawDate?.toDate) return toDateKey(rawDate.toDate());
  const parsed = parseImportedDate(rawDate);
  return parsed ? toDateKey(parsed) : '';
};

const normalizeDuplicateText = (value: string | undefined) => (value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const getDuplicateKey = (dateKey: string, category: string, amount: number, description: string) =>
  [dateKey, category, amount.toFixed(2), normalizeDuplicateText(description)].join('|');

const validateImportedRows = (
  rows: RawExpenseRow[],
  mapping: ImportMapping,
  existingExpenses: Expense[],
  currentUserId: string,
  skipDuplicates: boolean
) => {
  const existingKeys = new Set(
    existingExpenses
      .filter((expense) => !expense.createdBy || expense.createdBy === currentUserId)
      .map((expense) => getDuplicateKey(
        getExpenseDateKey(expense),
        expense.category,
        Number(expense.amount || 0),
        expense.description || expense.notes || expense.title || ''
      ))
  );
  const importKeys = new Set<string>();

  const validated = rows.map((row): ValidatedExpenseRow => {
    const dateValue = row.values[mapping.date];
    const categoryValue = row.values[mapping.category];
    const description = String(row.values[mapping.description] ?? '').trim();
    const amount = parseAmount(row.values[mapping.amount]);
    const date = parseImportedDate(dateValue);
    const errors: string[] = [];

    if (!date) errors.push('Date is required and must be valid');
    if (!String(categoryValue ?? '').trim()) errors.push('Category is required');
    if (!Number.isFinite(amount) || amount <= 0) errors.push('Amount must be a positive number');

    const category = detectCategory(categoryValue, description);
    const dateKey = date ? toDateKey(date) : '';
    const duplicateKey = getDuplicateKey(dateKey, category, Number.isFinite(amount) ? amount : 0, description);
    const duplicate = Boolean(dateKey && existingKeys.has(duplicateKey)) || importKeys.has(duplicateKey);

    if (dateKey && !importKeys.has(duplicateKey)) {
      importKeys.add(duplicateKey);
    }

    if (duplicate && !skipDuplicates) {
      return { rowNumber: row.rowNumber, raw: row, date, dateKey, category, description, amount, errors, duplicate };
    }

    return { rowNumber: row.rowNumber, raw: row, date, dateKey, category, description, amount, errors, duplicate };
  });

  const validRows = validated.filter((row) => row.errors.length === 0).length;
  const invalidRows = validated.length - validRows;
  const duplicateRows = validated.filter((row) => row.errors.length === 0 && row.duplicate).length;
  const readyRows = validated.filter((row) => row.errors.length === 0 && (!row.duplicate || !skipDuplicates)).length;

  return {
    rows: validated,
    summary: {
      totalRows: rows.length,
      validRows,
      invalidRows,
      duplicateRows,
      readyRows,
    } as ImportSummary,
  };
};

const Expenses: React.FC = () => {
  const { currentUser } = useAuth();
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

  // Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState<ImportStep>('upload');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [rawImportRows, setRawImportRows] = useState<RawExpenseRow[]>([]);
  const [importMapping, setImportMapping] = useState<ImportMapping>({ date: '', category: '', description: '', amount: '' });
  const [validatedRows, setValidatedRows] = useState<ValidatedExpenseRow[]>([]);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importLogs, setImportLogs] = useState<ImportLog[]>([]);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    loadExpenses();
    loadImportLogs();
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
      const data = await getExpenses(currentUser?.uid);
      setExpenses(data);
    } catch (err) {
      console.error('Failed to load expenses:', err);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const loadImportLogs = async () => {
    try {
      const logs = await getRecentExpenseImportLogs(currentUser?.uid);
      setImportLogs(logs);
    } catch (err) {
      console.error('Failed to load import logs:', err);
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
      const total = await getTotalExpensesByMonth(parseInt(month), parseInt(year), currentUser?.uid);
      setMonthlyTotal(total);

      const breakdown = await getTotalExpensesByCategory(currentUser?.uid);
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
        source: 'manual' as const,
        createdBy: currentUser?.uid || 'user1',
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

  const handleDeleteImportLog = async (log: ImportLog) => {
    if (!window.confirm(`Delete import history for "${log.fileName}"? Imported expenses will not be deleted.`)) {
      return;
    }

    try {
      await deleteExpenseImportLog(log.id);
      await loadImportLogs();
      toast.success('Import history deleted');
    } catch (err) {
      console.error('Failed to delete import log:', err);
      toast.error('Failed to delete import history');
    }
  };

  const resetImportState = () => {
    setImportStep('upload');
    setImportFile(null);
    setImportHeaders([]);
    setRawImportRows([]);
    setImportMapping({ date: '', category: '', description: '', amount: '' });
    setValidatedRows([]);
    setImportSummary(null);
    setSkipDuplicates(true);
    setImportResult(null);
    setDragActive(false);
  };

  const handleCloseImportModal = () => {
    setShowImportModal(false);
    resetImportState();
  };

  const handleOpenImportModal = () => {
    resetImportState();
    setShowImportModal(true);
  };

  const parseImportFile = async (file: File) => {
    if (!isAllowedImportFile(file)) {
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
        toast.error('No expense rows found in file');
        return;
      }

      const mapping = autoDetectMapping(headers);
      setImportFile(file);
      setImportHeaders(headers);
      setRawImportRows(rows);
      setImportMapping(mapping);
      setValidatedRows([]);
      setImportSummary(null);
      setImportResult(null);
      setImportStep('preview');
      toast.success('File parsed successfully');
    } catch (err) {
      console.error('Failed to parse import file:', err);
      toast.error('Could not parse the uploaded file');
    }
  };

  const handleFileSelect = (file?: File) => {
    if (file) {
      parseImportFile(file);
    }
  };

  const requiredMappingsComplete = IMPORT_FIELDS
    .filter((field) => field.required)
    .every((field) => Boolean(importMapping[field.key]));

  const handleValidateImport = () => {
    if (!requiredMappingsComplete) {
      toast.error('Map Date, Category, and Amount before validation');
      return;
    }

    const { rows, summary } = validateImportedRows(
      rawImportRows,
      importMapping,
      expenses,
      currentUser?.uid || 'anonymous',
      skipDuplicates
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
      const { rows, summary } = validateImportedRows(
        rawImportRows,
        importMapping,
        expenses,
        currentUser?.uid || 'anonymous',
        skip
      );
      setValidatedRows(rows);
      setImportSummary(summary);
    }
  };

  const handleImportExpenses = async () => {
    if (!importFile || !importSummary) return;
    const userId = currentUser?.uid;
    if (!userId) {
      toast.error('Please sign in before importing expenses');
      return;
    }

    const rowsToImport = validatedRows.filter((row) => row.errors.length === 0 && (!row.duplicate || !skipDuplicates));
    if (rowsToImport.length === 0) {
      toast.error('No valid rows to import');
      return;
    }

    setImporting(true);
    try {
      const expensesToImport: BulkExpenseInput[] = rowsToImport.map((row) => ({
        title: row.description || EXPENSE_CATEGORY_LABELS[row.category],
        description: row.description,
        category: row.category,
        amount: row.amount,
        expenseDate: Timestamp.fromDate(row.date as Date),
        paymentMethod: 'cash',
        vendorName: '',
        notes: row.description,
        source: 'excel_import',
        uploadedFileName: importFile.name,
        createdBy: userId,
      }));

      const duplicateRows = validatedRows.filter((row) => row.errors.length === 0 && row.duplicate).length;
      const skippedDuplicates = skipDuplicates ? duplicateRows : 0;
      const result = await bulkImportExpenses(expensesToImport, {
        fileName: importFile.name,
        totalRows: rawImportRows.length,
        importedRows: rowsToImport.length,
        skippedRows: skippedDuplicates + importSummary.invalidRows,
        duplicateRows,
        invalidRows: importSummary.invalidRows,
        uploadedBy: userId,
      });

      await Promise.all([loadExpenses(), loadImportLogs()]);
      setImportResult({
        totalRows: rawImportRows.length,
        importedRows: result.importedRows,
        skippedDuplicates,
        invalidRows: importSummary.invalidRows,
      });
      setImportStep('success');
      toast.success('Expenses imported successfully');
    } catch (err) {
      console.error('Expense import failed:', err);
      toast.error('Firestore write failed. Please try again.');
    } finally {
      setImporting(false);
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
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={handleOpenImportModal}
            className="btn-secondary flex items-center justify-center gap-2"
          >
            <Upload className="w-5 h-5" />
            Upload Expense Excel
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Expense
          </button>
        </div>
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

      {/* Import History */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileSpreadsheet className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Recent Expense Imports</h3>
        </div>
        {importLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">File</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Uploaded</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Total</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Imported</th>
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
          <p className="text-sm text-gray-500">No expense imports yet.</p>
        )}
      </div>

      {/* Import Wizard Modal */}
      <Modal isOpen={showImportModal} onClose={handleCloseImportModal} title="Upload Expense Excel" size="lg">
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
                <p className="mt-3 text-base font-semibold text-gray-900">Drop your expense file here</p>
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
                <table className="w-full min-w-[760px]">
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
                <p className="text-xs text-gray-500 mt-1">Date, Category, and Amount are required before import.</p>
              </div>
              <div className="space-y-3">
                {IMPORT_FIELDS.map((field) => (
                  <div key={field.key} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] sm:items-center gap-2">
                    <label className="text-sm font-medium text-gray-900">
                      {field.label}{field.required && ' *'}
                    </label>
                    <ArrowRight className="hidden sm:block w-4 h-4 text-gray-400" />
                    <select
                      value={importMapping[field.key]}
                      onChange={(e) => setImportMapping({ ...importMapping, [field.key]: e.target.value })}
                      className="input w-full"
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
                  Map Date, Category, and Amount to continue.
                </div>
              )}
              <div className="sticky bottom-0 -mx-1 flex flex-col sm:flex-row gap-2 bg-white pt-3">
                <button type="button" className="btn-secondary flex-1" onClick={() => setImportStep('preview')}>Back</button>
                <button type="button" className="btn-primary flex-1" disabled={!requiredMappingsComplete} onClick={handleValidateImport}>
                  Validate Rows
                </button>
              </div>
            </div>
          )}

          {importStep === 'validation' && importSummary && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
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
                    <table className="w-full min-w-[760px]">
                      <thead className="bg-red-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-red-900">Row</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-red-900">Date</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-red-900">Category</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-red-900">Amount</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-red-900">Errors</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-100">
                        {validatedRows.filter((row) => row.errors.length > 0).map((row) => (
                          <tr key={row.rowNumber}>
                            <td className="px-3 py-2 text-xs text-gray-700">{row.rowNumber}</td>
                            <td className="px-3 py-2 text-xs text-gray-700">{String(row.raw.values[importMapping.date] ?? '')}</td>
                            <td className="px-3 py-2 text-xs text-gray-700">{String(row.raw.values[importMapping.category] ?? '')}</td>
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
                  onClick={handleImportExpenses}
                >
                  {importing ? 'Importing...' : 'Import Expenses'}
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
                <h3 className="text-xl font-bold text-gray-900">Expenses Imported Successfully</h3>
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
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button type="button" className="btn-primary flex-1" onClick={handleCloseImportModal}>View Expenses</button>
                <button type="button" className="btn-secondary flex-1 flex items-center justify-center gap-2" onClick={resetImportState}>
                  <RotateCcw className="w-4 h-4" />
                  Upload Another File
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

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
