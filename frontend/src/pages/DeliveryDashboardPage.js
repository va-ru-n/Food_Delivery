import React, { useEffect, useMemo, useState } from 'react';
import ErrorMessage from '../components/ErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';
import { deliveryAPI } from '../services/api';

const statusCardClasses = {
  'Out for Delivery': 'border-violet-200 bg-violet-50',
  Delivered: 'border-emerald-200 bg-emerald-50'
};

function DeliveryDashboardPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchOrders = async ({ withLoader = false } = {}) => {
    try {
      if (withLoader) {
        setLoading(true);
      }
      const { data } = await deliveryAPI.getMyOrders();
      setOrders(data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load delivery orders');
    } finally {
      if (withLoader) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchOrders({ withLoader: true });
    const intervalId = setInterval(() => fetchOrders(), 30000);
    return () => clearInterval(intervalId);
  }, []);

  const activeOrders = useMemo(
    () => orders.filter((order) => order.status === 'Out for Delivery'),
    [orders]
  );
  const deliveredOrders = useMemo(
    () => orders.filter((order) => order.status === 'Delivered'),
    [orders]
  );

  const handleMarkPickedUp = async (orderId) => {
    try {
      setActionLoadingId(orderId);
      await deliveryAPI.markPickedUp(orderId);
      setSuccess('Pickup marked successfully');
      setError('');
      fetchOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark pickup');
      setSuccess('');
    } finally {
      setActionLoadingId('');
    }
  };

  const handleMarkDelivered = async (orderId) => {
    try {
      setActionLoadingId(orderId);
      await deliveryAPI.markDelivered(orderId);
      setSuccess('Order marked as delivered');
      setError('');
      fetchOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark delivery');
      setSuccess('');
    } finally {
      setActionLoadingId('');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading delivery dashboard..." />;
  }

  return (
    <section className="space-y-5">
      <div className="rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 p-6 text-white shadow-sm">
        <h1 className="text-2xl font-bold">Delivery Dashboard</h1>
        <p className="mt-1 text-sm text-sky-100">Manage assigned deliveries, pickup, and completion updates.</p>
      </div>

      <ErrorMessage message={error} />
      {success && <p className="rounded-md bg-green-100 p-3 text-sm text-green-700">{success}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-gray-500">Active Deliveries</p>
          <p className="text-2xl font-bold text-gray-900">{activeOrders.length}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-gray-500">Completed Deliveries</p>
          <p className="text-2xl font-bold text-gray-900">{deliveredOrders.length}</p>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Assigned Orders</h2>
        {orders.length === 0 ? (
          <p className="text-gray-600">No orders assigned yet.</p>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const hasLocationPin =
                Number.isFinite(order?.deliveryLocation?.latitude) &&
                Number.isFinite(order?.deliveryLocation?.longitude);

              return (
                <article
                  key={order._id}
                  className={`rounded-xl border p-4 shadow-sm ${statusCardClasses[order.status] || 'border-gray-200 bg-white'}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">Order #{order._id.slice(-6)}</p>
                      <p className="text-sm text-gray-600">Restaurant: {order.restaurantId?.name || 'N/A'}</p>
                    </div>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                      {order.status}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-gray-700">Customer: {order.userId?.name || 'N/A'}</p>
                  <p className="text-sm text-gray-700">Phone: {order.phoneNumber}</p>
                  <p className="text-sm text-gray-700">Address: {order.deliveryAddress}</p>
                  {hasLocationPin && (
                    <p className="text-sm text-gray-700">
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
                  <p className="text-sm text-gray-700">Amount: Rs. {order.totalAmount}</p>
                  <p className="text-sm text-gray-700">
                    Assigned: {new Date(order.deliveryAssignedAt || order.createdAt).toLocaleString()}
                  </p>
                  {order.pickedUpAt && (
                    <p className="text-sm text-gray-700">Picked Up: {new Date(order.pickedUpAt).toLocaleString()}</p>
                  )}
                  {order.deliveredAt && (
                    <p className="text-sm text-gray-700">Delivered: {new Date(order.deliveredAt).toLocaleString()}</p>
                  )}

                  {order.status === 'Out for Delivery' && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleMarkPickedUp(order._id)}
                        disabled={actionLoadingId === order._id || Boolean(order.pickedUpAt)}
                        className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {order.pickedUpAt ? 'Picked Up' : 'Mark Picked Up'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMarkDelivered(order._id)}
                        disabled={actionLoadingId === order._id}
                        className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        Mark Delivered
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default DeliveryDashboardPage;
