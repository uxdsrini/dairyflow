import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Phone, Calendar, DollarSign, Briefcase } from 'lucide-react';
import { Worker, WORKER_ROLES, ROLE_LABELS } from '../types';
import { getWorkers, addWorker, updateWorker, deleteWorker } from '../services/workerService';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { Timestamp } from 'firebase/firestore';
import { formatFirestoreDate, getFirestoreISOString } from '../utils/dateUtils';
import { useAuth } from '../contexts/AuthContext';


const Workers: React.FC = () => {
  const { currentUser } = useAuth();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [filteredWorkers, setFilteredWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | Worker['role']>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [role, setRole] = useState<Worker['role']>('delivery_boy');
  const [salaryType, setSalaryType] = useState<Worker['salaryType']>('monthly');
  const [monthlySalary, setMonthlySalary] = useState(0);
  const [joiningDate, setJoiningDate] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadWorkers();
  }, []);

  useEffect(() => {
    filterWorkers();
  }, [workers, searchQuery, roleFilter, statusFilter]);

  const loadWorkers = async () => {
    setLoading(true);
    try {
      const data = await getWorkers(currentUser?.uid);
      setWorkers(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load workers');
    } finally {
      setLoading(false);
    }
  };

  const filterWorkers = () => {
    let result = [...workers];
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(w => w.name.toLowerCase().includes(q) || w.mobile.includes(q));
    }
    if (roleFilter !== 'all') {
      result = result.filter(w => w.role === roleFilter);
    }
    if (statusFilter !== 'all') {
      result = result.filter(w => w.status === statusFilter);
    }
    setFilteredWorkers(result);
  };

  const handleOpenAddModal = () => {
    setEditingWorker(null);
    setName('');
    setMobile('');
    setRole('delivery_boy');
    setSalaryType('monthly');
    setMonthlySalary(0);
    setJoiningDate(new Date().toISOString().split('T')[0]);
    setStatus('active');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (w: Worker) => {
    setEditingWorker(w);
    setName(w.name);
    setMobile(w.mobile);
    setRole(w.role);
    setSalaryType(w.salaryType);
    setMonthlySalary(w.monthlySalary);
    const dateStr = getFirestoreISOString(w.joiningDate);
    setJoiningDate(dateStr);
    setStatus(w.status);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !mobile || !joiningDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        mobile,
        role,
        salaryType,
        monthlySalary: Number(monthlySalary),
        joiningDate: Timestamp.fromDate(new Date(joiningDate)),
        status,
        createdBy: editingWorker?.createdBy || currentUser?.uid,
      };

      if (editingWorker) {
        await updateWorker(editingWorker.id, payload);
        toast.success('Worker updated successfully');
      } else {
        await addWorker(payload);
        toast.success('Worker added successfully');
      }
      setIsModalOpen(false);
      loadWorkers();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save worker');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this worker?')) return;
    try {
      await deleteWorker(id);
      toast.success('Worker deleted successfully');
      loadWorkers();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete worker');
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Workers</h1>
          <p className="text-sm text-gray-500 mt-1">Manage staff, delivery boys, cleaners, and drivers.</p>
        </div>
        <button onClick={handleOpenAddModal} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Worker
        </button>
      </div>

      <div className="card p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
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
            value={roleFilter}
            onChange={(e: any) => setRoleFilter(e.target.value)}
            className="select-field"
          >
            <option value="all">All Roles</option>
            {WORKER_ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
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
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-dairy-600 border-t-transparent rounded-full animate-spin"></div></div>
      ) : filteredWorkers.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">No workers found.</div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block table-container">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="p-4">Name</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Salary info</th>
                  <th className="p-4">Joining Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {filteredWorkers.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-gray-900">{w.name}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" /> {w.mobile}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="capitalize bg-gray-100 text-gray-800 text-xs px-2.5 py-1 rounded-lg font-medium">
                        {ROLE_LABELS[w.role] || w.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">₹{w.monthlySalary}</div>
                      <div className="text-xs text-gray-400 capitalize">{w.salaryType}</div>
                    </td>
                    <td className="p-4 text-gray-500">
                      {formatFirestoreDate(w.joiningDate)}
                    </td>
                    <td className="p-4">
                      <span className={w.status === 'active' ? 'badge-green' : 'badge-red'}>
                        {w.status}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(w)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-dairy-600 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(w.id)}
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
            {filteredWorkers.map((w) => (
              <div key={w.id} className="card p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900">{w.name}</h3>
                    <span className="inline-block mt-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {ROLE_LABELS[w.role] || w.role}
                    </span>
                  </div>
                  <span className={w.status === 'active' ? 'badge-green' : 'badge-red'}>
                    {w.status}
                  </span>
                </div>

                <div className="text-xs text-gray-600 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{w.mobile}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                    <span>₹{w.monthlySalary} / {w.salaryType}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>Joined: {formatFirestoreDate(w.joiningDate)}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => handleOpenEditModal(w)}
                    className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(w.id)}
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
        title={editingWorker ? 'Edit Worker' : 'Add Worker'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input
              type="text"
              required
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
            />
          </div>

          <div>
            <label className="label">Mobile Number</label>
            <input
              type="tel"
              required
              className="input-field"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="e.g. 9876543210"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Role</label>
              <select
                className="select-field"
                value={role}
                onChange={(e: any) => setRole(e.target.value)}
              >
                {WORKER_ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Salary Type</label>
              <select
                className="select-field"
                value={salaryType}
                onChange={(e: any) => setSalaryType(e.target.value)}
              >
                <option value="monthly">Monthly Fixed</option>
                <option value="daily">Daily Wage</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Salary Amount (₹)</label>
              <input
                type="number"
                required
                className="input-field"
                value={monthlySalary}
                onChange={(e) => setMonthlySalary(Number(e.target.value))}
                placeholder="e.g. 15000"
              />
            </div>
            <div>
              <label className="label">Joining Date</label>
              <input
                type="date"
                required
                className="input-field"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
              />
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

export default Workers;
