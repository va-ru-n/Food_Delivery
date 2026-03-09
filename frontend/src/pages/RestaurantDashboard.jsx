import React, { useEffect, useMemo, useRef, useState } from 'react';
import ErrorMessage from '../components/ErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';
import OrderCard from '../components/OrderCard';
import { restaurantOwnerAPI } from '../services/api';
import { connectSocket } from '../services/socket';

const getSecondsLeft = (acceptBy) => {
  if (!acceptBy) return 0;
  const ms = new Date(acceptBy).getTime() - Date.now();
  return Math.max(0, Math.floor(ms / 1000));
};

function RestaurantDashboard() {
  const [restaurant, setRestaurant] = useState(null);
  const [orders, setOrders] = useState([]);
  const [partners, setPartners] = useState([]);
  const [selectedPartnerByOrder, setSelectedPartnerByOrder] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [secondsTick, setSecondsTick] = useState(0);
  const [highlightOrderId, setHighlightOrderId] = useState('');
  const [notificationPermission, setNotificationPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  const audioContextRef = useRef(null);

  const fetchData = async () => {
    try {
      const [restaurantRes, ordersRes, partnersRes] = await Promise.all([
        restaurantOwnerAPI.getMyRestaurant(),
        restaurantOwnerAPI.getOrders(),
        restaurantOwnerAPI.getDeliveryPartners()
      ]);
      setRestaurant(restaurantRes.data);
      setOrders(ordersRes.data || []);
      setPartners(partnersRes.data || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const playAlertSound = async () => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const now = audioContextRef.current.currentTime;
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(720, now);
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      oscillator.start(now);
      oscillator.stop(now + 0.32);
    } catch (err) {
      // Browser policies may block autoplay.
    }
  };

  const showNewOrderNotification = (orderPayload) => {
    if (notificationPermission !== 'granted') return;

    new Notification('New Delivery Order', {
      body: `Order #${orderPayload._id.slice(-6)} from ${orderPayload.userId?.name || 'Customer'}`
    });
  };

  useEffect(() => {
    fetchData();

    const intervalId = setInterval(() => {
      setSecondsTick((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const socket = connectSocket();
    if (!socket) return undefined;

    const onNewOrder = (payload) => {
      setOrders((prev) => {
        const existing = prev.some((order) => String(order._id) === String(payload._id));
        if (existing) {
          return prev.map((order) => (String(order._id) === String(payload._id) ? payload : order));
        }
        return [payload, ...prev];
      });

      setHighlightOrderId(payload._id);
      playAlertSound();
      showNewOrderNotification(payload);
      setTimeout(() => setHighlightOrderId(''), 5000);
    };

    const onOrderUpdated = (payload) => {
      setOrders((prev) => prev.map((order) => (String(order._id) === String(payload._id) ? payload : order)));
    };

    socket.on('newOrder', onNewOrder);
    socket.on('orderUpdated', onOrderUpdated);

    return () => {
      socket.off('newOrder', onNewOrder);
      socket.off('orderUpdated', onOrderUpdated);
    };
  }, [notificationPermission]);

  const pendingCount = useMemo(
    () => orders.filter((order) => order.status === 'Pending').length,
    [orders, secondsTick]
  );

  const handleRequestNotifications = async () => {
    if (!('Notification' in window)) {
      setNotificationPermission('unsupported');
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  const handleAcceptOrder = async (orderId) => {
    try {
      const { data } = await restaurantOwnerAPI.updateOrderStatus(orderId, 'Preparing');
      setOrders((prev) => prev.map((order) => (String(order._id) === String(data._id) ? data : order)));
      setSuccess('Order accepted');
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to accept order');
      setSuccess('');
    }
  };

  const handleRejectOrder = async (orderId) => {
    try {
      const { data } = await restaurantOwnerAPI.updateOrderStatus(orderId, 'Rejected');
      setOrders((prev) => prev.map((order) => (String(order._id) === String(data._id) ? data : order)));
      setSuccess('Order rejected');
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject order');
      setSuccess('');
    }
  };

  const handleAssign = async (orderId) => {
    const partnerId = selectedPartnerByOrder[orderId];
    if (!partnerId) {
      setError('Select delivery partner first');
      return;
    }

    try {
      const { data } = await restaurantOwnerAPI.assignDeliveryPartner(orderId, partnerId);
      setOrders((prev) => prev.map((order) => (String(order._id) === String(data._id) ? data : order)));
      setSuccess('Delivery partner assigned');
      setError('');
      setSelectedPartnerByOrder((prev) => ({ ...prev, [orderId]: '' }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign delivery partner');
      setSuccess('');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading restaurant dashboard..." />;
  }

  return (
    <section className="space-y-5">
      <div className="rounded-xl bg-gradient-to-r from-orange-600 to-red-600 p-6 text-white">
        <h1 className="text-2xl font-bold">Restaurant Dashboard</h1>
        <p className="mt-1 text-sm text-orange-100">Live order queue with 5-minute acceptance timer.</p>
      </div>

      <ErrorMessage message={error} />
      {success && <p className="rounded-md bg-green-100 p-3 text-sm text-green-700">{success}</p>}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-gray-500">Restaurant</p>
          <p className="text-lg font-semibold text-gray-900">{restaurant?.name || 'N/A'}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-gray-500">Total Orders</p>
          <p className="text-lg font-semibold text-gray-900">{orders.length}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-gray-500">Pending (Timer Running)</p>
          <p className="text-lg font-semibold text-gray-900">{pendingCount}</p>
        </div>
      </div>

      <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
        <p className="text-sm font-semibold text-cyan-900">Real-time alerts</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={playAlertSound}
            className="rounded-md bg-cyan-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-800"
          >
            Test Sound
          </button>
          <button
            type="button"
            onClick={handleRequestNotifications}
            disabled={notificationPermission === 'granted'}
            className="rounded-md bg-indigo-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-800 disabled:opacity-70"
          >
            {notificationPermission === 'granted' ? 'Notifications Enabled' : 'Enable Notifications'}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Incoming Orders</h2>
        {orders.length === 0 ? (
          <p className="text-gray-600">No orders yet.</p>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                countdown={getSecondsLeft(order.acceptBy)}
                highlight={String(highlightOrderId) === String(order._id)}
                onAccept={handleAcceptOrder}
                onReject={handleRejectOrder}
                onAssign={handleAssign}
                onPartnerSelect={(orderId, partnerId) =>
                  setSelectedPartnerByOrder((prev) => ({ ...prev, [orderId]: partnerId }))
                }
                partnerOptions={partners}
                selectedPartnerId={selectedPartnerByOrder[order._id]}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default RestaurantDashboard;
