import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Phone, MapPin, Download } from 'lucide-react';
import { Customer } from '../types';
import { getCustomers, addCustomer, updateCustomer, deleteCustomer } from '../services/customerService';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';

const CUSTOMER_TYPE_LABELS: Record<Customer['customerType'], string> = {
  residential: 'Residential',
  commercial: 'Commercial',
  wholesale: 'Wholesale',
  regular: 'Regular',
};

const STATUS_LABELS: Record<Customer['status'], string> = {
  active: 'Active',
  inactive: 'Inactive',
};

const Customers: React.FC = () => {
  const { currentUser } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | Customer['customerType']>('all');
  const [routeFilter, setRouteFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [route, setRoute] = useState('');
  const [customerType, setCustomerType] = useState<Customer['customerType']>('residential');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchQuery, statusFilter, typeFilter, routeFilter]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await getCustomers(currentUser?.uid);
      setCustomers(data);
    } catch (err) {
      console.error('Error loading customers:', err);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const filterCustomers = () => {
    let result = [...customers];

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) => c.name.toLowerCase().includes(q) || c.mobile.includes(q)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((c) => c.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      result = result.filter((c) => c.customerType === typeFilter);
    }

    if (routeFilter !== 'all') {
      result = result.filter((c) => c.route.toLowerCase() === routeFilter.toLowerCase());
    }

    setFilteredCustomers(result);
  };

  const resetForm = () => {
    setName('');
    setMobile('');
    setAddress('');
    setRoute('');
    setCustomerType('residential');
    setStatus('active');
    setEditingCustomer(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setMobile(c.mobile);
    setAddress(c.address);
    setRoute(c.route);
    setCustomerType(c.customerType);
    setStatus(c.status);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !mobile || !address || !route) {
      toast.error('Please fill in all fields');
      return;
    }

    setSaving(true);
    try {
      const payload = { name, mobile, address, route, customerType, status, createdBy: editingCustomer?.createdBy || currentUser?.uid };
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, payload);
        toast.success('Customer updated successfully');
      } else {
        await addCustomer(payload);
        toast.success('Customer added successfully');
      }
      setIsModalOpen(false);
      loadCustomers();
    } catch (err) {
      console.error('Error saving customer:', err);
      toast.error('Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return;

    try {
      await deleteCustomer(id);
      toast.success('Customer deleted successfully');
      loadCustomers();
    } catch (err) {
      console.error('Error deleting customer:', err);
      toast.error('Failed to delete customer');
    }
  };

  const handleExportExcel = () => {
    if (filteredCustomers.length === 0) {
      toast.error('No customers to export');
      return;
    }

    const rows = filteredCustomers.map((customer, index) => ({
      'S.No': index + 1,
      'Full Name': customer.name,
      'Mobile Number': customer.mobile,
      'Delivery Address': customer.address,
      'Route / Area': customer.route,
      'Customer Type': CUSTOMER_TYPE_LABELS[customer.customerType] || customer.customerType,
      'Status': STATUS_LABELS[customer.status] || customer.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 8 },
      { wch: 24 },
      { wch: 16 },
      { wch: 42 },
      { wch: 22 },
      { wch: 18 },
      { wch: 12 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');
    const fileName = `DairyFlow_Customers_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success(`Downloaded ${fileName}`);
  };

  // Extract unique routes for filter dropdown
  const uniqueRoutes = Array.from(new Set(customers.map((c) => c.route))).filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="text-sm text-gray-500 mt-1">Manage dairy customers, delivery routes, and details.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={handleExportExcel}
            disabled={filteredCustomers.length === 0}
            className="btn-secondary flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> Export Excel
          </button>
          <button onClick={handleOpenAddModal} className="btn-primary flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Add Customer
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="card p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
          <input
            type="text"
            placeholder="Search by name or mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-9"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="select-field"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div>
          <select
            value={typeFilter}
            onChange={(e: any) => setTypeFilter(e.target.value)}
            className="select-field"
          >
            <option value="all">All Customer Types</option>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="wholesale">Wholesale</option>
            <option value="regular">Regular</option>
          </select>
        </div>

        <div>
          <select
            value={routeFilter}
            onChange={(e) => setRouteFilter(e.target.value)}
            className="select-field"
          >
            <option value="all">All Routes</option>
            {uniqueRoutes.map((r, idx) => (
              <option key={idx} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Customers Table / Card List */}
      {loading ? (
        <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-dairy-600 border-t-transparent rounded-full animate-spin"></div></div>
      ) : filteredCustomers.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">No customers found.</div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block table-container">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="p-4">Customer Details</th>
                  <th className="p-4">Route</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-gray-900">{c.name}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" /> {c.mobile}
                      </div>
                      <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {c.address}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="bg-dairy-50 text-dairy-800 text-xs px-2.5 py-1 rounded-lg font-medium border border-dairy-100">
                        {c.route}
                      </span>
                    </td>
                    <td className="p-4 capitalize">{c.customerType}</td>
                    <td className="p-4">
                      <span className={c.status === 'active' ? 'badge-green' : 'badge-red'}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(c)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-dairy-600 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredCustomers.map((c) => (
              <div key={c.id} className="card p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900">{c.name}</h3>
                    <span className="inline-block mt-1 capitalize text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {c.customerType}
                    </span>
                  </div>
                  <span className={c.status === 'active' ? 'badge-green' : 'badge-red'}>
                    {c.status}
                  </span>
                </div>

                <div className="text-xs text-gray-600 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{c.mobile}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>{c.address}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-dairy-700">Route:</span>
                    <span className="bg-dairy-50 text-dairy-800 px-1.5 py-0.5 rounded text-[11px] font-medium border border-dairy-100">
                      {c.route}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => handleOpenEditModal(c)}
                    className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="btn-danger py-1.5 px-3 text-xs flex items-center gap-1 bg-red-50 text-red-600 hover:bg-red-100 border-none"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? 'Edit Customer' : 'Add Customer'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input
              type="text"
              required
              className="input-field"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Mobile Number</label>
            <input
              type="tel"
              required
              className="input-field"
              placeholder="e.g. 9876543210"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Delivery Address</label>
            <textarea
              required
              className="input-field min-h-[80px]"
              placeholder="Full address, house no, street..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Route / Area</label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="e.g. Route A, Sector 4"
                value={route}
                onChange={(e) => setRoute(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Customer Type</label>
              <select
                className="select-field"
                value={customerType}
                onChange={(e: any) => setCustomerType(e.target.value)}
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="wholesale">Wholesale</option>
                <option value="regular">Regular</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Status</label>
            <select
              className="select-field"
              value={status}
              onChange={(e: any) => setStatus(e.target.value)}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
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
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Customers;
