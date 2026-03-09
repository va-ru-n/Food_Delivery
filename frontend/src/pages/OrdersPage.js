import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { orderAPI } from '../services/api';
import { connectSocket } from '../services/socket';

const statusCardClasses = {
  Pending: 'border-amber-200 bg-amber-50',
  Preparing: 'border-sky-200 bg-sky-50',
  Assigned: 'border-indigo-200 bg-indigo-50',
  PickedUp: 'border-violet-200 bg-violet-50',
  OutForDelivery: 'border-purple-200 bg-purple-50',
  Delivered: 'border-emerald-200 bg-emerald-50',
  Rejected: 'border-rose-200 bg-rose-50',
  Cancelled: 'border-rose-200 bg-rose-50'
};

function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data } = await orderAPI.getMine();
      setOrders(data || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load your orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    const socket = connectSocket();
    if (!socket) return undefined;

    const onOrderUpdated = (payload) => {
      setOrders((prev) => {
        const exists = prev.some((order) => String(order._id) === String(payload._id));
        if (!exists) return prev;
        return prev.map((order) => (String(order._id) === String(payload._id) ? payload : order));
      });
    };

    socket.on('orderUpdated', onOrderUpdated);
    return () => {
      socket.off('orderUpdated', onOrderUpdated);
    };
  }, []);

  const handleCancelOrder = async (orderId) => {
    try {
      const { data } = await orderAPI.cancelByCustomer(orderId);
      setOrders((prev) => prev.map((order) => (String(order._id) === String(data._id) ? data : order)));
      setSuccess('Order cancelled successfully');
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel order');
      setSuccess('');
    }
  };

  const handleHideOrder = async (orderId) => {
    try {
      await orderAPI.hideByCustomer(orderId);
      setOrders((prev) => prev.filter((order) => String(order._id) !== String(orderId)));
      setSuccess('Order removed from your history');
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove order from history');
      setSuccess('');
    }
  };

  return (
    <section className="space-y-4">
      <div className="rounded-xl bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 px-6 py-6 text-white shadow-sm">
        <h1 className="text-2xl font-bold">Order History</h1>
        <p className="mt-1 text-sm text-orange-100">Real-time status updates and live delivery tracking.</p>
      </div>
      <ErrorMessage message={error} />
      {success && <p className="rounded-md bg-green-100 p-3 text-sm text-green-700">{success}</p>}

      {loading ? (
        <LoadingSpinner message="Loading orders..." />
      ) : orders.length === 0 ? (
        <p className="text-gray-600">No orders found.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order._id}
              className={`rounded-lg border p-4 shadow-sm ${statusCardClasses[order.status] || 'border-gray-200 bg-white'}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold text-gray-900">Order #{order._id.slice(-6)}</p>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700">{order.status}</span>
              </div>
              <p className="mt-2 text-sm text-gray-600">Total: Rs. {order.totalAmount}</p>
              <p className="text-sm text-gray-600">ETA: {order.estimatedDeliveryMinutes || 35} min</p>
              <p className="text-sm text-gray-600">Address: {order.deliveryAddress}</p>
              {order.deliveryPartner && (
                <p className="text-sm text-gray-600">
                  Delivery Partner: {order.deliveryPartner.name} ({order.deliveryPartner.phoneNumber || order.deliveryPartner.email})
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  to={`/orders/${order._id}/tracking`}
                  className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Live Tracking
                </Link>

                {order.status === 'Pending' && (
                  <button
                    type="button"
                    onClick={() => handleCancelOrder(order._id)}
                    className="rounded bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700"
                  >
                    Cancel Order
                  </button>
                )}

                {['Delivered', 'Cancelled', 'Rejected'].includes(order.status) && (
                  <button
                    type="button"
                    onClick={() => handleHideOrder(order._id)}
                    className="rounded bg-slate-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Delete from History
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default OrdersPage;
