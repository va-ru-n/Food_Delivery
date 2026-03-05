import React, { useEffect, useState } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { orderAPI } from '../services/api';

const statusCardClasses = {
  Pending: 'border-amber-200 bg-amber-50',
  Preparing: 'border-sky-200 bg-sky-50',
  'Out for Delivery': 'border-violet-200 bg-violet-50',
  Delivered: 'border-emerald-200 bg-emerald-50',
  Cancelled: 'border-rose-200 bg-rose-50'
};

const statusBadgeClasses = {
  Pending: 'bg-amber-200 text-amber-900',
  Preparing: 'bg-sky-200 text-sky-900',
  'Out for Delivery': 'bg-violet-200 text-violet-900',
  Delivered: 'bg-emerald-200 text-emerald-900',
  Cancelled: 'bg-rose-200 text-rose-900'
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
      setOrders(data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load your orders');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      await orderAPI.cancelByCustomer(orderId);
      setSuccess('Order cancelled successfully');
      fetchOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel order');
      setSuccess('');
    }
  };

  const handleHideOrder = async (orderId) => {
    try {
      await orderAPI.hideByCustomer(orderId);
      setSuccess('Order removed from your history');
      setError('');
      fetchOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove order from history');
      setSuccess('');
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <section className="space-y-4">
      <div className="rounded-xl bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 px-6 py-6 text-white shadow-sm">
        <h1 className="text-2xl font-bold">Order History</h1>
        <p className="mt-1 text-sm text-orange-100">Track all your orders with live status updates.</p>
      </div>
      <ErrorMessage message={error} />
      {success && <p className="rounded-md bg-green-100 p-3 text-sm text-green-700">{success}</p>}

      {loading ? (
        <LoadingSpinner message="Loading orders..." />
      ) : orders.length === 0 ? (
        <p className="text-gray-600">No orders found.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const hasLocationPin =
              Number.isFinite(order?.deliveryLocation?.latitude) &&
              Number.isFinite(order?.deliveryLocation?.longitude);

            return (
              <div
                key={order._id}
                className={`rounded-lg border p-4 shadow-sm ${statusCardClasses[order.status] || 'border-gray-200 bg-white'}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-gray-900">Order #{order._id.slice(-6)}</p>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      statusBadgeClasses[order.status] || 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-600">Total: Rs. {order.totalAmount}</p>
                <p className="text-sm text-gray-600">Phone: {order.phoneNumber}</p>
                <p className="text-sm text-gray-600">Address: {order.deliveryAddress}</p>
                {order.deliveryPartner && (
                  <p className="text-sm text-gray-600">
                    Delivery Partner: {order.deliveryPartner.name} ({order.deliveryPartner.email})
                  </p>
                )}
                {hasLocationPin && (
                  <p className="text-sm text-gray-600">
                    Location Pin:{' '}
                    <a
                      href={`https://www.google.com/maps?q=${order.deliveryLocation.latitude},${order.deliveryLocation.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-brand-700 hover:underline"
                    >
                      Open in Map
                    </a>
                  </p>
                )}
                <p className="text-sm text-gray-600">
                  Placed on: {new Date(order.createdAt).toLocaleString()}
                </p>
                {order.status === 'Pending' && (
                  <button
                    type="button"
                    onClick={() => handleCancelOrder(order._id)}
                    className="mt-3 rounded bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700"
                  >
                    Cancel Order
                  </button>
                )}
                {['Delivered', 'Cancelled'].includes(order.status) && (
                  <button
                    type="button"
                    onClick={() => handleHideOrder(order._id)}
                    className="mt-3 ml-2 rounded bg-slate-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Delete from History
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default OrdersPage;
