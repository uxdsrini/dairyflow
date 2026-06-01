import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, CalendarCheck, CalendarRange, Milk, Sparkles, AlertCircle } from 'lucide-react';
import { Subscription, Customer, MILK_TYPES, FREQUENCIES, MILK_TYPE_LABELS, FREQUENCY_LABELS } from '../types';
import { getSubscriptions, addSubscription, updateSubscription, deleteSubscription, pauseSubscription, resumeSubscription } from '../services/subscriptionService';
import { getCustomers } from '../services/customerService';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { Timestamp } from 'firebase/firestore';
import { formatFirestoreDate, getFirestoreISOString } from '../utils/dateUtils';


const Subscriptions: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<Subscription[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [milkFilter, setMilkFilter] = useState<'all' | Subscription['milkType']>('all');
  const [frequencyFilter, setFrequencyFilter] = useState<'all' | Subscription['frequency']>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'stopped'>('all');

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [customerId, setCustomerId] = useState('');
  const [milkType, setMilkType] = useState<Subscription['milkType']>('cow');
  const [quantityPerDay, setQuantityPerDay] = useState(1);
  const [frequency, setFrequency] = useState<Subscription['frequency']>('daily');
  const [startDate, setStartDate] = useState('');
  const [pricePerLitre, setPricePerLitre] = useState(60);
  const [status, setStatus] = useState<Subscription['status']>('active');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterSubscriptions();
  }, [subscriptions, searchQuery, milkFilter, frequencyFilter, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subsData, custsData] = await Promise.all([getSubscriptions(), getCustomers()]);
      setSubscriptions(subsData);
      setCustomers(custsData.filter(c => c.status === 'active')); // Only active customers can subscribe
    } catch (err) {
      console.error(err);
      toast.error('Failed to load subscriptions data');
    } finally {
      setLoading(false);
    }
  };

  const filterSubscriptions = () => {
    let result = [...subscriptions];
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => s.customerName.toLowerCase().includes(q));
    }
    if (milkFilter !== 'all') {
      result = result.filter(s => s.milkType === milkFilter);
    }
    if (frequencyFilter !== 'all') {
      result = result.filter(s => s.frequency === frequencyFilter);
    }
    if (statusFilter !== 'all') {
      result = result.filter(s => s.status === statusFilter);
    }
    setFilteredSubscriptions(result);
  };

  const handleOpenAddModal = () => {
    setEditingSub(null);
    setCustomerId(customers[0]?.id || '');
    setMilkType('cow');
    setQuantityPerDay(1);
    setFrequency('daily');
    setStartDate(new Date().toISOString().split('T')[0]);
    setPricePerLitre(60);
    setStatus('active');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (sub: Subscription) => {
    setEditingSub(sub);
    setCustomerId(sub.customerId);
    setMilkType(sub.milkType);
    setQuantityPerDay(sub.quantityPerDay);
    setFrequency(sub.frequency);
    const dateStr = getFirestoreISOString(sub.startDate);
    setStartDate(dateStr);
    setPricePerLitre(sub.pricePerLitre);
    setStatus(sub.status);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !startDate || quantityPerDay <= 0 || pricePerLitre <= 0) {
      toast.error('Please enter valid subscription details');
      return;
    }

    const customer = customers.find(c => c.id === customerId);
    if (!customer && !editingSub) {
      toast.error('Selected customer not found');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        customerId,
        customerName: editingSub ? editingSub.customerName : customer!.name,
        milkType,
        quantityPerDay: Number(quantityPerDay),
        frequency,
        startDate: Timestamp.fromDate(new Date(startDate)),
        pricePerLitre: Number(pricePerLitre),
        status,
      };

      if (editingSub) {
        await updateSubscription(editingSub.id, payload);
        toast.success('Subscription updated successfully');
      } else {
        await addSubscription(payload);
        toast.success('Subscription created successfully');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save subscription');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this subscription?')) return;
    try {
      await deleteSubscription(id);
      toast.success('Subscription deleted successfully');
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete subscription');
    }
  };

  const handleToggleStatus = async (sub: Subscription) => {
    try {
      if (sub.status === 'active') {
        await pauseSubscription(sub.id);
        toast.success('Subscription paused');
      } else {
        await resumeSubscription(sub.id);
        toast.success('Subscription resumed');
      }
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Milk Subscriptions</h1>
          <p className="text-sm text-gray-500 mt-1">Manage recurring milk subscriptions, milk types, and prices.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          disabled={customers.length === 0}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Subscription
        </button>
      </div>

      {customers.length === 0 && !loading && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">You must create at least one active customer before creating a subscription.</span>
        </div>
      )}

      {/* Filters Section */}
      <div className="card p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
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
            value={milkFilter}
            onChange={(e: any) => setMilkFilter(e.target.value)}
            className="select-field"
          >
            <option value="all">All Milk Types</option>
            {MILK_TYPES.map(t => (
              <option key={t} value={t}>{MILK_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={frequencyFilter}
            onChange={(e: any) => setFrequencyFilter(e.target.value)}
            className="select-field"
          >
            <option value="all">All Frequencies</option>
            {FREQUENCIES.map(f => (
              <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>
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
            <option value="paused">Paused</option>
            <option value="stopped">Stopped</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-dairy-600 border-t-transparent rounded-full animate-spin"></div></div>
      ) : filteredSubscriptions.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">No subscriptions found.</div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block table-container">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="p-4">Customer</th>
                  <th className="p-4">Milk Type</th>
                  <th className="p-4">Qty / Day</th>
                  <th className="p-4">Price / Litre</th>
                  <th className="p-4">Frequency</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {filteredSubscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 font-semibold text-gray-900">{s.customerName}</td>
                    <td className="p-4 capitalize">
                      <span className="flex items-center gap-1.5">
                        <Milk className="w-4 h-4 text-dairy-600" />
                        {MILK_TYPE_LABELS[s.milkType]}
                      </span>
                    </td>
                    <td className="p-4 font-medium">{s.quantityPerDay} Litres</td>
                    <td className="p-4">₹{s.pricePerLitre} / L</td>
                    <td className="p-4">
                      <span className="bg-gray-100 text-gray-800 text-xs px-2.5 py-1 rounded-lg font-medium">
                        {FREQUENCY_LABELS[s.frequency]}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={s.status === 'active' ? 'badge-green' : s.status === 'paused' ? 'badge-yellow' : 'badge-red'}>
                        {s.status}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleToggleStatus(s)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors border ${
                          s.status === 'active'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        {s.status === 'active' ? 'Pause' : 'Resume'}
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(s)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-dairy-600 transition-colors inline-flex"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors inline-flex"
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
            {filteredSubscriptions.map((s) => (
              <div key={s.id} className="card p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900">{s.customerName}</h3>
                    <span className="inline-flex mt-1 items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      <Milk className="w-3.5 h-3.5 text-dairy-600" />
                      {MILK_TYPE_LABELS[s.milkType]}
                    </span>
                  </div>
                  <span className={s.status === 'active' ? 'badge-green' : s.status === 'paused' ? 'badge-yellow' : 'badge-red'}>
                    {s.status}
                  </span>
                </div>

                <div className="text-xs text-gray-600 space-y-1.5 grid grid-cols-2">
                  <div>
                    <span className="text-gray-400">Qty/Day:</span> <strong className="text-gray-800">{s.quantityPerDay} Litres</strong>
                  </div>
                  <div>
                    <span className="text-gray-400">Price/Litre:</span> <strong className="text-gray-800">₹{s.pricePerLitre}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400">Frequency:</span> <strong className="text-gray-800">{FREQUENCY_LABELS[s.frequency]}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400">Start Date:</span> <strong className="text-gray-800">{formatFirestoreDate(s.startDate)}</strong>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => handleToggleStatus(s)}
                    className={`py-1.5 px-3 rounded-lg text-xs font-semibold ${
                      s.status === 'active' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {s.status === 'active' ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(s)}
                    className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
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
        title={editingSub ? 'Edit Subscription' : 'New Subscription'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Select Customer</label>
            {editingSub ? (
              <input
                type="text"
                disabled
                className="input-field bg-gray-100 cursor-not-allowed"
                value={editingSub.customerName}
              />
            ) : (
              <select
                className="select-field"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.route})</option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Milk Type</label>
              <select
                className="select-field"
                value={milkType}
                onChange={(e: any) => setMilkType(e.target.value)}
              >
                {MILK_TYPES.map(t => (
                  <option key={t} value={t}>{MILK_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Quantity per Day (Litres)</label>
              <input
                type="number"
                step="0.5"
                required
                className="input-field"
                value={quantityPerDay}
                onChange={(e) => setQuantityPerDay(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Price per Litre (₹)</label>
              <input
                type="number"
                required
                className="input-field"
                value={pricePerLitre}
                onChange={(e) => setPricePerLitre(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label">Frequency</label>
              <select
                className="select-field"
                value={frequency}
                onChange={(e: any) => setFrequency(e.target.value)}
              >
                {FREQUENCIES.map(f => (
                  <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date</label>
              <input
                type="date"
                required
                className="input-field"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Status</label>
              <select
                className="select-field"
                value={status}
                onChange={(e: any) => setStatus(e.target.value)}
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="stopped">Stopped</option>
              </select>
            </div>
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

export default Subscriptions;
