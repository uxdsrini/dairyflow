import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, ShoppingBag, DollarSign, Calendar } from 'lucide-react';
import { Order, Customer, ORDER_STATUSES, PAYMENT_STATUSES } from '../types';
import { getOrders, addOrder, updateOrder, deleteOrder } from '../services/orderService';
import { getCustomers } from '../services/customerService';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { Timestamp } from 'firebase/firestore';
import { formatFirestoreDate, getFirestoreISOString } from '../utils/dateUtils';
import { useAuth } from '../contexts/AuthContext';


const PRODUCTS = [
  { id: 'p1', name: 'Milk', pricePerUnit: 60, unit: 'Litre' },
  { id: 'p2', name: 'Curd', pricePerUnit: 80, unit: 'Kg' },
  { id: 'p3', name: 'Ghee', pricePerUnit: 650, unit: 'Kg' },
  { id: 'p4', name: 'Paneer', pricePerUnit: 350, unit: 'Kg' },
];

const Orders: React.FC = () => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | Order['orderStatus']>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | Order['paymentStatus']>('all');

  // Modal / Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [customerId, setCustomerId] = useState('');
  const [productId, setProductId] = useState(PRODUCTS[0].id);
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(PRODUCTS[0].pricePerUnit);
  const [orderDate, setOrderDate] = useState('');
  const [orderStatus, setOrderStatus] = useState<Order['orderStatus']>('pending');
  const [paymentStatus, setPaymentStatus] = useState<Order['paymentStatus']>('unpaid');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchQuery, orderStatusFilter, paymentStatusFilter]);

  // Adjust price when product changes
  useEffect(() => {
    const prod = PRODUCTS.find(p => p.id === productId);
    if (prod) {
      setPrice(prod.pricePerUnit * quantity);
    }
  }, [productId, quantity]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersData, customersData] = await Promise.all([getOrders(currentUser?.uid), getCustomers(currentUser?.uid)]);
      setOrders(ordersData);
      setCustomers(customersData.filter(c => c.status === 'active'));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let result = [...orders];
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(o => o.customerName.toLowerCase().includes(q) || o.productName.toLowerCase().includes(q));
    }
    if (orderStatusFilter !== 'all') {
      result = result.filter(o => o.orderStatus === orderStatusFilter);
    }
    if (paymentStatusFilter !== 'all') {
      result = result.filter(o => o.paymentStatus === paymentStatusFilter);
    }
    setFilteredOrders(result);
  };

  const handleOpenAddModal = () => {
    setEditingOrder(null);
    setCustomerId(customers[0]?.id || '');
    setProductId(PRODUCTS[0].id);
    setQuantity(1);
    setPrice(PRODUCTS[0].pricePerUnit);
    setOrderDate(new Date().toISOString().split('T')[0]);
    setOrderStatus('pending');
    setPaymentStatus('unpaid');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (o: Order) => {
    setEditingOrder(o);
    setCustomerId(o.customerId);
    // Find matching static product or defaults
    const prodMatch = PRODUCTS.find(p => p.name === o.productName);
    setProductId(prodMatch?.id || PRODUCTS[0].id);
    setQuantity(o.quantity);
    setPrice(o.price);
    const dateStr = getFirestoreISOString(o.orderDate);
    setOrderDate(dateStr);
    setOrderStatus(o.orderStatus);
    setPaymentStatus(o.paymentStatus);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !orderDate || quantity <= 0 || price <= 0) {
      toast.error('Invalid order inputs');
      return;
    }

    const customer = customers.find(c => c.id === customerId);
    const product = PRODUCTS.find(p => p.id === productId);

    if (!customer && !editingOrder) {
      toast.error('Customer not found');
      return;
    }
    if (!product) {
      toast.error('Product not found');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        customerId,
        customerName: editingOrder ? editingOrder.customerName : customer!.name,
        productId,
        productName: product.name,
        quantity: Number(quantity),
        price: Number(price),
        orderDate: Timestamp.fromDate(new Date(orderDate)),
        orderStatus,
        paymentStatus,
        createdBy: editingOrder?.createdBy || currentUser?.uid,
      };

      if (editingOrder) {
        await updateOrder(editingOrder.id, payload);
        toast.success('Order updated successfully');
      } else {
        await addOrder(payload);
        toast.success('Order created successfully');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save order');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;
    try {
      await deleteOrder(id);
      toast.success('Order deleted successfully');
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete order');
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">One-time Orders</h1>
          <p className="text-sm text-gray-500 mt-1">Record and manage one-time sales of dairy products.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          disabled={customers.length === 0}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Order
        </button>
      </div>

      <div className="card p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
          <input
            type="text"
            placeholder="Search customer or product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-9"
          />
        </div>
        <div>
          <select
            value={orderStatusFilter}
            onChange={(e: any) => setOrderStatusFilter(e.target.value)}
            className="select-field"
          >
            <option value="all">All Delivery Statuses</option>
            <option value="pending">Pending</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <select
            value={paymentStatusFilter}
            onChange={(e: any) => setPaymentStatusFilter(e.target.value)}
            className="select-field"
          >
            <option value="all">All Payment Statuses</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partial</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-dairy-600 border-t-transparent rounded-full animate-spin"></div></div>
      ) : filteredOrders.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">No orders found.</div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block table-container">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="p-4">Customer</th>
                  <th className="p-4">Product Details</th>
                  <th className="p-4">Total Price</th>
                  <th className="p-4">Order Date</th>
                  <th className="p-4">Delivery Status</th>
                  <th className="p-4">Payment Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 font-semibold text-gray-900">{o.customerName}</td>
                    <td className="p-4">
                      <span className="flex items-center gap-1.5 font-medium">
                        <ShoppingBag className="w-4 h-4 text-dairy-600" />
                        {o.productName} ({o.quantity} {PRODUCTS.find(p => p.name === o.productName)?.unit || 'Unit'})
                      </span>
                    </td>
                    <td className="p-4 font-bold text-gray-900">₹{o.price}</td>
                    <td className="p-4 text-gray-500">
                      {formatFirestoreDate(o.orderDate)}
                    </td>
                    <td className="p-4">
                      <span className={o.orderStatus === 'delivered' ? 'badge-green' : o.orderStatus === 'pending' ? 'badge-yellow' : 'badge-red'}>
                        {o.orderStatus}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={o.paymentStatus === 'paid' ? 'badge-green' : o.paymentStatus === 'partial' ? 'badge-yellow' : 'badge-red'}>
                        {o.paymentStatus}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(o)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-dairy-600 transition-colors inline-flex"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(o.id)}
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
            {filteredOrders.map((o) => (
              <div key={o.id} className="card p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900">{o.customerName}</h3>
                    <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                      <ShoppingBag className="w-3.5 h-3.5 text-dairy-600" />
                      {o.productName} ({o.quantity})
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={o.orderStatus === 'delivered' ? 'badge-green' : o.orderStatus === 'pending' ? 'badge-yellow' : 'badge-red'}>
                      {o.orderStatus}
                    </span>
                    <span className={o.paymentStatus === 'paid' ? 'badge-green' : o.paymentStatus === 'partial' ? 'badge-yellow' : 'badge-red'}>
                      {o.paymentStatus}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-gray-600 space-y-1.5 grid grid-cols-2 pt-1 border-t border-dashed border-gray-100">
                  <div>
                    <span className="text-gray-400">Total Price:</span> <strong className="text-gray-900 text-sm">₹{o.price}</strong>
                  </div>
                  <div>
                    <span>Order Date:</span> <strong className="text-gray-800">{formatFirestoreDate(o.orderDate)}</strong>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => handleOpenEditModal(o)}
                    className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(o.id)}
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
        title={editingOrder ? 'Edit Order' : 'New Order'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Select Customer</label>
            {editingOrder ? (
              <input
                type="text"
                disabled
                className="input-field bg-gray-100 cursor-not-allowed"
                value={editingOrder.customerName}
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
              <label className="label">Product</label>
              <select
                className="select-field"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
              >
                {PRODUCTS.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (₹{p.pricePerUnit}/{p.unit})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Quantity</label>
              <input
                type="number"
                required
                min="1"
                className="input-field"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Total Price (₹)</label>
              <input
                type="number"
                required
                className="input-field"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label">Order Date</label>
              <input
                type="date"
                required
                className="input-field"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Delivery Status</label>
              <select
                className="select-field"
                value={orderStatus}
                onChange={(e: any) => setOrderStatus(e.target.value)}
              >
                <option value="pending">Pending</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="label">Payment Status</label>
              <select
                className="select-field"
                value={paymentStatus}
                onChange={(e: any) => setPaymentStatus(e.target.value)}
              >
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
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

export default Orders;
