import React, { useState, useEffect } from 'react';
import { Truck, Check, X, AlertTriangle, Calendar, Plus, Filter, User, Download, FileSpreadsheet } from 'lucide-react';
import { Delivery, Worker, Customer, Subscription } from '../types';
import { getDeliveriesByDate, addDelivery, updateDelivery } from '../services/deliveryService';
import { getWorkers } from '../services/workerService';
import { getActiveSubscriptions } from '../services/subscriptionService';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

const Deliveries: React.FC = () => {
  const { currentUser } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState<Delivery[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [routeFilter, setRouteFilter] = useState('all');
  const [workerFilter, setWorkerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | Delivery['status']>('all');

  useEffect(() => {
    loadData();
  }, [date]);

  useEffect(() => {
    filterDeliveries();
  }, [deliveries, routeFilter, workerFilter, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [deliveriesData, workersData] = await Promise.all([
        getDeliveriesByDate(date, currentUser?.uid),
        getWorkers(currentUser?.uid)
      ]);
      setDeliveries(deliveriesData);
      setWorkers(workersData.filter(w => w.status === 'active' && w.role === 'delivery_boy'));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  };

  const filterDeliveries = () => {
    let result = [...deliveries];
    if (routeFilter !== 'all') {
      result = result.filter(d => d.route.toLowerCase() === routeFilter.toLowerCase());
    }
    if (workerFilter !== 'all') {
      result = result.filter(d => d.workerId === workerFilter);
    }
    if (statusFilter !== 'all') {
      result = result.filter(d => d.status === statusFilter);
    }
    setFilteredDeliveries(result);
  };

  const handleGenerateDeliveries = async () => {
    if (deliveries.length > 0) {
      if (!window.confirm('Deliveries already exist for this date. Generating again might create duplicates. Proceed?')) {
        return;
      }
    }

    setLoading(true);
    try {
      const activeSubs = await getActiveSubscriptions(currentUser?.uid);
      if (activeSubs.length === 0) {
        toast.error('No active subscriptions found to generate deliveries.');
        setLoading(false);
        return;
      }

      let count = 0;
      for (const sub of activeSubs) {
        // Create delivery item
        const deliveryPayload: Omit<Delivery, 'id' | 'createdAt'> = {
          date,
          customerId: sub.customerId,
          customerName: sub.customerName,
          customerAddress: '', // Will fetch/update on UI or read from customer info
          type: 'subscription',
          sourceId: sub.id,
          items: [{
            productName: sub.milkType === 'cow' ? 'Cow Milk' : sub.milkType === 'buffalo' ? 'Buffalo Milk' : sub.milkType === 'a2' ? 'A2 Milk' : 'Mixed Milk',
            quantity: sub.quantityPerDay,
            unit: 'Litre'
          }],
          route: 'General Route', // Default route, update below if customer is found
          workerId: '',
          workerName: 'Unassigned',
          status: 'pending',
          createdBy: currentUser?.uid
        };

        // Try to find customer details to get correct route
        try {
          const custSnap = await getDeliveriesByDate(date, currentUser?.uid); // Not querying again, we can match with state or defaults
        } catch (e) {
          console.error(e);
        }

        await addDelivery(deliveryPayload);
        count++;
      }

      toast.success(`Successfully generated ${count} deliveries for ${date}!`);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate deliveries');
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: Delivery['status']) => {
    try {
      await updateDelivery(id, { status });
      toast.success(`Delivery marked as ${status}`);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update delivery status');
    }
  };

  const handleAssignWorker = async (deliveryId: string, workerId: string) => {
    const selectedWorker = workers.find(w => w.id === workerId);
    if (!selectedWorker && workerId !== '') return;

    try {
      await updateDelivery(deliveryId, {
        workerId: workerId || '',
        workerName: selectedWorker ? selectedWorker.name : 'Unassigned'
      });
      toast.success('Worker assigned successfully');
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to assign worker');
    }
  };

  // Get unique routes
  const uniqueRoutes = Array.from(new Set(deliveries.map(d => d.route))).filter(Boolean);

  // Delivery count stats
  const total = deliveries.length;
  const pending = deliveries.filter(d => d.status === 'pending').length;
  const delivered = deliveries.filter(d => d.status === 'delivered').length;
  const missed = deliveries.filter(d => d.status === 'missed' || d.status === 'cancelled').length;

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredDeliveries.length === 0) {
      toast.error('No deliveries to export');
      return;
    }

    const exportData = filteredDeliveries.map((d) => ({
      'Date': date,
      'Customer Name': d.customerName,
      'Delivery Items': d.items.map(item => `${item.quantity} ${item.unit} ${item.productName}`).join(', '),
      'Route': d.route,
      'Assigned Worker': d.workerName || 'Unassigned',
      'Status': d.status.charAt(0).toUpperCase() + d.status.slice(1),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 },  // Date
      { wch: 22 },  // Customer Name
      { wch: 30 },  // Delivery Items
      { wch: 18 },  // Route
      { wch: 18 },  // Assigned Worker
      { wch: 12 },  // Status
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Deliveries');

    const fileName = `Deliveries_Report_${date}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success(`Report downloaded as ${fileName}`);
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Delivery Tracking</h1>
          <p className="text-sm text-gray-500 mt-1">Generate lists, track statuses, and assign delivery boys.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <input
            type="date"
            className="input-field max-w-[160px] py-2 px-3"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 text-sm py-2 px-3 rounded-lg font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
            title="Export deliveries to Excel"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export Excel
          </button>
          <button
            onClick={handleGenerateDeliveries}
            className="btn-primary flex items-center gap-1.5 text-sm py-2 px-3"
          >
            <Plus className="w-4 h-4" /> Generate Deliveries
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{total}</div>
          <div className="text-xs text-gray-500 mt-0.5">Total Deliveries</div>
        </div>
        <div className="card p-4 text-center border-l-4 border-l-yellow-500">
          <div className="text-2xl font-bold text-yellow-600">{pending}</div>
          <div className="text-xs text-gray-500 mt-0.5">Pending</div>
        </div>
        <div className="card p-4 text-center border-l-4 border-l-emerald-500">
          <div className="text-2xl font-bold text-emerald-600">{delivered}</div>
          <div className="text-xs text-gray-500 mt-0.5">Delivered</div>
        </div>
        <div className="card p-4 text-center border-l-4 border-l-red-500">
          <div className="text-2xl font-bold text-red-600">{missed}</div>
          <div className="text-xs text-gray-500 mt-0.5">Missed/Cancelled</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
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
        <div>
          <select
            value={workerFilter}
            onChange={(e) => setWorkerFilter(e.target.value)}
            className="select-field"
          >
            <option value="all">All Delivery Boys</option>
            {workers.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
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
            <option value="pending">Pending</option>
            <option value="delivered">Delivered</option>
            <option value="missed">Missed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-dairy-600 border-t-transparent rounded-full animate-spin"></div></div>
      ) : filteredDeliveries.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">No deliveries found for this date. Generate deliveries above to populate.</div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block table-container">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="p-4">Customer</th>
                  <th className="p-4">Delivery Items</th>
                  <th className="p-4">Route</th>
                  <th className="p-4">Assigned Worker</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {filteredDeliveries.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 font-semibold text-gray-900">{d.customerName}</td>
                    <td className="p-4">
                      {d.items.map((item, idx) => (
                        <div key={idx} className="font-medium text-gray-800">
                          {item.quantity} {item.unit} {item.productName}
                        </div>
                      ))}
                    </td>
                    <td className="p-4">
                      <span className="bg-dairy-50 text-dairy-800 text-xs px-2.5 py-1 rounded-lg font-medium border border-dairy-100">
                        {d.route}
                      </span>
                    </td>
                    <td className="p-4">
                      <select
                        value={d.workerId || ''}
                        onChange={(e) => handleAssignWorker(d.id, e.target.value)}
                        className="select-field py-1.5 text-xs max-w-[150px]"
                      >
                        <option value="">Unassigned</option>
                        {workers.map(w => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-4">
                      <span className={d.status === 'delivered' ? 'badge-green' : d.status === 'pending' ? 'badge-yellow' : 'badge-red'}>
                        {d.status}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleUpdateStatus(d.id, 'delivered')}
                        className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors inline-flex"
                        title="Mark Delivered"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(d.id, 'missed')}
                        className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors inline-flex"
                        title="Mark Missed"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredDeliveries.map((d) => (
              <div key={d.id} className="card p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900">{d.customerName}</h3>
                    <span className="inline-block mt-1 bg-dairy-50 text-dairy-800 text-xs px-2 py-0.5 rounded font-medium border border-dairy-100">
                      {d.route}
                    </span>
                  </div>
                  <span className={d.status === 'delivered' ? 'badge-green' : d.status === 'pending' ? 'badge-yellow' : 'badge-red'}>
                    {d.status}
                  </span>
                </div>

                <div className="text-xs text-gray-600 space-y-1">
                  <div className="font-semibold text-gray-800">Items:</div>
                  {d.items.map((item, idx) => (
                    <div key={idx} className="pl-2">
                      • {item.quantity} {item.unit} {item.productName}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <select
                      value={d.workerId || ''}
                      onChange={(e) => handleAssignWorker(d.id, e.target.value)}
                      className="select-field py-1 px-2 text-[11px] max-w-[120px]"
                    >
                      <option value="">Unassigned</option>
                      {workers.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleUpdateStatus(d.id, 'delivered')}
                      className="bg-emerald-50 text-emerald-600 p-1.5 rounded-lg text-xs font-semibold hover:bg-emerald-100"
                    >
                      Delivered
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(d.id, 'missed')}
                      className="bg-red-50 text-red-600 p-1.5 rounded-lg text-xs font-semibold hover:bg-red-100"
                    >
                      Missed
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Deliveries;
