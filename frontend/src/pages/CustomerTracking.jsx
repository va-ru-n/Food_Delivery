import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import ErrorMessage from '../components/ErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';
import MapTracking from '../components/MapTracking';
import { orderAPI } from '../services/api';
import { connectSocket } from '../services/socket';

const toPoint = (latitude, longitude) => {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    type: 'Point',
    coordinates: [longitude, latitude]
  };
};

function CustomerTracking() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (err) => console.error('Error getting location:', err),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const fetchOrder = async () => {
    try {
      const { data } = await orderAPI.getById(id);
      setOrder(data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load tracking details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  useEffect(() => {
    const socket = connectSocket();
    if (!socket) return undefined;

    const onOrderUpdated = (payload) => {
      if (String(payload._id) !== String(id)) return;
      setOrder(payload);
    };

    const onDeliveryLocation = (payload) => {
      if (String(payload.orderId) !== String(id)) return;
      setOrder((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          deliveryPartnerLocation: payload.location
        };
      });
    };

    socket.on('orderUpdated', onOrderUpdated);
    socket.on('deliveryLocationUpdated', onDeliveryLocation);

    return () => {
      socket.off('orderUpdated', onOrderUpdated);
      socket.off('deliveryLocationUpdated', onDeliveryLocation);
    };
  }, [id]);

  const customerPoint = useMemo(() => {
    if (userLocation) {
      return toPoint(userLocation.latitude, userLocation.longitude);
    }
    if (!order?.deliveryLocation) return null;
    return toPoint(order.deliveryLocation.latitude, order.deliveryLocation.longitude);
  }, [order, userLocation]);

  const restaurantPoint = order?.restaurantId?.geoLocation || null;

  if (loading) {
    return <LoadingSpinner message="Loading live tracking..." />;
  }

  if (!order) {
    return <ErrorMessage message={error || 'Order not found'} />;
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 p-6 text-white">
        <h1 className="text-2xl font-bold">Live Order Tracking</h1>
        <p className="mt-1 text-sm text-indigo-100">Track status, ETA, and your delivery partner in real time.</p>
      </div>

      <ErrorMessage message={error} />

      <div className="rounded-xl border bg-white p-4">
        <p className="font-semibold text-gray-900">Order #{order._id.slice(-6)}</p>
        <p className="text-sm text-gray-700">Status: {order.status}</p>
        <p className="text-sm text-gray-700">ETA: {order.estimatedDeliveryMinutes || 35} min</p>
        <p className="text-sm text-gray-700">Restaurant: {order.restaurantId?.name || 'N/A'}</p>
        <p className="text-sm text-gray-700">Delivery Partner: {order.deliveryPartner?.name || 'Awaiting assignment'}</p>
      </div>

      <MapTracking
        restaurantPoint={restaurantPoint}
        customerPoint={customerPoint}
        deliveryPoint={order.deliveryPartnerLocation}
      />
    </section>
  );
}

export default CustomerTracking;
