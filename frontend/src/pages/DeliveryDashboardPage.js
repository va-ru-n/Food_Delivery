import React, { useEffect, useMemo, useRef, useState } from 'react';
import ErrorMessage from '../components/ErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';
import { deliveryAPI } from '../services/api';
import { connectSocket } from '../services/socket';

const statusCardClasses = {
  Assigned: 'border-indigo-200 bg-indigo-50',
  PickedUp: 'border-violet-200 bg-violet-50',
  OutForDelivery: 'border-purple-200 bg-purple-50',
  Delivered: 'border-emerald-200 bg-emerald-50'
};

const nextStatusMap = {
  Assigned: 'PickedUp',
  PickedUp: 'OutForDelivery',
  OutForDelivery: 'Delivered'
};

function DeliveryDashboardPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const watchIdRef = useRef(null);
  const lastLocationPushRef = useRef(0);

  const fetchOrders = async ({ withLoader = false } = {}) => {
    try {
      if (withLoader) setLoading(true);
      const { data } = await deliveryAPI.getMyOrders();
      setOrders(data || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load delivery orders');
    } finally {
      if (withLoader) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders({ withLoader: true });
  }, []);

  useEffect(() => {
    const socket = connectSocket();
    if (!socket) return undefined;

    const onDeliveryAssigned = (payload) => {
      setOrders((prev) => {
        const exists = prev.some((order) => String(order._id) === String(payload._id));
        if (exists) {
          return prev.map((order) => (String(order._id) === String(payload._id) ? payload : order));
        }
        return [payload, ...prev];
      });
    };

    const onOrderUpdated = (payload) => {
      setOrders((prev) => {
        const exists = prev.some((order) => String(order._id) === String(payload._id));
        if (!exists) return prev;
        return prev.map((order) => (String(order._id) === String(payload._id) ? payload : order));
      });
    };

    socket.on('deliveryAssigned', onDeliveryAssigned);
    socket.on('orderUpdated', onOrderUpdated);

    return () => {
      socket.off('deliveryAssigned', onDeliveryAssigned);
      socket.off('orderUpdated', onOrderUpdated);
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return undefined;

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const now = Date.now();
        if (now - lastLocationPushRef.current < 10000) {
          return;
        }

        lastLocationPushRef.current = now;
        try {
          await deliveryAPI.updateLocation(position.coords.latitude, position.coords.longitude);
        } catch (err) {
          // Keep best-effort location updates.
        }
      },
      () => { },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    watchIdRef.current = watchId;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  const activeOrders = useMemo(
    () => orders.filter((order) => ['Assigned', 'PickedUp', 'OutForDelivery'].includes(order.status)),
    [orders]
  );

  const handleAccept = async (orderId) => {
    try {
      setActionLoadingId(orderId);
      const { data } = await deliveryAPI.acceptAssigned(orderId);
      setOrders((prev) => prev.map((order) => (String(order._id) === String(data._id) ? data : order)));
      setSuccess('Delivery accepted');
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to accept delivery');
      setSuccess('');
    } finally {
      setActionLoadingId('');
    }
  };

  const handleReject = async (orderId) => {
    try {
      setActionLoadingId(orderId);
      const { data } = await deliveryAPI.rejectAssigned(orderId);
      setOrders((prev) => prev.map((order) => (String(order._id) === String(data._id) ? data : order)));
      setSuccess('Delivery rejected');
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject delivery');
      setSuccess('');
    } finally {
      setActionLoadingId('');
    }
  };

  const handleMoveStatus = async (order) => {
    const nextStatus = nextStatusMap[order.status];
    if (!nextStatus) return;

    try {
      setActionLoadingId(order._id);
      const { data } = await deliveryAPI.updateStatus(order._id, nextStatus);
      setOrders((prev) => prev.map((each) => (String(each._id) === String(data._id) ? data : each)));
      setSuccess(`Order moved to ${nextStatus}`);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
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
      <div className="rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 p-6 text-white">
        <h1 className="text-2xl font-bold">Delivery Dashboard</h1>
        <p className="mt-1 text-sm text-indigo-100">New assignments arrive instantly and location sync runs every 10 seconds.</p>
      </div>

      <ErrorMessage message={error} />
      {success && <p className="rounded-md bg-green-100 p-3 text-sm text-green-700">{success}</p>}

      <div className="rounded-xl border bg-white p-4">
        <p className="text-sm text-gray-500">Active Deliveries</p>
        <p className="text-2xl font-bold text-gray-900">{activeOrders.length}</p>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Assigned Orders</h2>
        {orders.length === 0 ? (
          <p className="text-gray-600">No orders assigned yet.</p>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <article
                key={order._id}
                className={`rounded-xl border p-4 shadow-sm ${statusCardClasses[order.status] || 'border-gray-200 bg-white'}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">Order #{order._id.slice(-6)}</p>
                    <p className="text-sm text-gray-600">Restaurant: {order.restaurantId?.name || 'N/A'}</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700">{order.status}</span>
                </div>

                <p className="mt-2 text-sm text-gray-700">Pickup Location: {order.restaurantId?.location || 'N/A'}</p>
                {order.restaurantId?.location && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.restaurantId.location)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center text-sm font-medium text-brand-600 hover:text-brand-700"
                  >
                    📍 Directions to Restaurant
                  </a>
                )}

                <p className="mt-2 text-sm text-gray-700">Drop Location: {order.deliveryAddress}</p>
                {order.deliveryLocation ? (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${order.deliveryLocation.latitude},${order.deliveryLocation.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center text-sm font-medium text-brand-600 hover:text-brand-700"
                  >
                    📍 Directions to Customer (Live coords)
                  </a>
                ) : (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryAddress)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center text-sm font-medium text-brand-600 hover:text-brand-700"
                  >
                    📍 Directions to Customer Address
                  </a>
                )}

                <p className="mt-2 text-sm text-gray-700">Customer: {order.userId?.name || 'N/A'}</p>

                {order.status === 'Assigned' && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleAccept(order._id)}
                      disabled={actionLoadingId === order._id}
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-70"
                    >
                      Accept Delivery
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(order._id)}
                      disabled={actionLoadingId === order._id}
                      className="rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-70"
                    >
                      Reject Delivery
                    </button>
                  </div>
                )}

                {nextStatusMap[order.status] && (
                  <button
                    type="button"
                    onClick={() => handleMoveStatus(order)}
                    disabled={actionLoadingId === order._id}
                    className="mt-3 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-70"
                  >
                    Mark {nextStatusMap[order.status]}
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default DeliveryDashboardPage;
