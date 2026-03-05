import React, { useEffect, useMemo, useRef, useState } from 'react';
import ErrorMessage from '../components/ErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';
import { restaurantAPI, restaurantOwnerAPI } from '../services/api';

const badgeClasses = {
  Pending: 'bg-amber-200 text-amber-900',
  Preparing: 'bg-sky-200 text-sky-900',
  'Out for Delivery': 'bg-violet-200 text-violet-900',
  Delivered: 'bg-emerald-200 text-emerald-900',
  Cancelled: 'bg-rose-200 text-rose-900'
};

const orderCardClasses = {
  Pending: 'border-amber-200 bg-amber-50',
  Preparing: 'border-sky-200 bg-sky-50',
  'Out for Delivery': 'border-violet-200 bg-violet-50',
  Delivered: 'border-emerald-200 bg-emerald-50',
  Cancelled: 'border-rose-200 bg-rose-50'
};

const nextStatusMap = {
  Pending: 'Preparing'
};

const availabilityOptions = ['Available', 'Not Available', 'Last Few', 'Trending', 'Fresh'];
const availabilityCardClasses = {
  Available: 'border-emerald-200 bg-emerald-50',
  'Not Available': 'border-rose-200 bg-rose-50',
  'Last Few': 'border-amber-200 bg-amber-50',
  Trending: 'border-violet-200 bg-violet-50',
  Fresh: 'border-cyan-200 bg-cyan-50'
};

const availabilityBadgeClasses = {
  Available: 'bg-emerald-100 text-emerald-700',
  'Not Available': 'bg-rose-100 text-rose-700',
  'Last Few': 'bg-amber-100 text-amber-700',
  Trending: 'bg-violet-100 text-violet-700',
  Fresh: 'bg-cyan-100 text-cyan-700'
};

const time12Pattern = /^(0?[1-9]|1[0-2]):([0-5]\d)\s?(AM|PM)$/i;
const time24Pattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
const hourOptions = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const minuteOptions = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const periodOptions = ['AM', 'PM'];

const normalizeTimeTo12Hour = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  const match12 = trimmed.match(time12Pattern);
  if (match12) {
    const hour = String(Number(match12[1])).padStart(2, '0');
    const minute = match12[2];
    const period = match12[3].toUpperCase();
    return `${hour}:${minute} ${period}`;
  }

  const match24 = trimmed.match(time24Pattern);
  if (match24) {
    const hour24 = Number(match24[1]);
    const minute = match24[2];
    const period = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 || 12;
    return `${String(hour12).padStart(2, '0')}:${minute} ${period}`;
  }

  return trimmed;
};

const parseTimeToParts = (value) => {
  const normalized = normalizeTimeTo12Hour(value);
  const match = normalized.match(/^(\d{2}):(\d{2})\s(AM|PM)$/i);

  if (!match) {
    return { hour: '09', minute: '00', period: 'AM' };
  }

  return {
    hour: match[1],
    minute: match[2],
    period: match[3].toUpperCase()
  };
};

const buildTimeFromParts = ({ hour, minute, period }) => `${hour}:${minute} ${period}`;

function RestaurantDashboard() {
  const [restaurant, setRestaurant] = useState(null);
  const [orders, setOrders] = useState([]);
  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const [selectedPartnerByOrder, setSelectedPartnerByOrder] = useState({});
  const [foodItems, setFoodItems] = useState([]);
  const [updatingFoodId, setUpdatingFoodId] = useState('');
  const [assigningOrderId, setAssigningOrderId] = useState('');
  const [updatingOpenStatus, setUpdatingOpenStatus] = useState(false);
  const [updatingTimings, setUpdatingTimings] = useState(false);
  const [timingDirty, setTimingDirty] = useState(false);
  const [openingParts, setOpeningParts] = useState({ hour: '09', minute: '00', period: 'AM' });
  const [closingParts, setClosingParts] = useState({ hour: '10', minute: '00', period: 'PM' });
  const [supportsAvailabilityApi, setSupportsAvailabilityApi] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  const knownOrderIdsRef = useRef(new Set());
  const initializedOrdersRef = useRef(false);
  const audioContextRef = useRef(null);

  const playAlertSound = async () => {
    if (!soundEnabled || typeof window === 'undefined') {
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        return;
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const now = audioContextRef.current.currentTime;
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, now);
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      oscillator.start(now);
      oscillator.stop(now + 0.34);
    } catch (soundError) {
      // Silent fail: alert sound is best-effort and browser-policy dependent.
    }
  };

  const showBrowserNotification = (title, body) => {
    if (
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      notificationPermission !== 'granted'
    ) {
      return;
    }

    try {
      new Notification(title, { body });
    } catch (notificationError) {
      // Ignore notification runtime errors.
    }
  };

  const triggerNewOrderAlert = async (newOrderCount) => {
    if (newOrderCount <= 0) {
      return;
    }

    await playAlertSound();
    showBrowserNotification(
      'New Order Received',
      newOrderCount === 1
        ? 'You have 1 new order in your restaurant dashboard.'
        : `You have ${newOrderCount} new orders in your restaurant dashboard.`
    );
  };

  const detectAndHandleNewOrders = async (incomingOrders) => {
    const incomingOrderIds = new Set((incomingOrders || []).map((order) => String(order._id)));

    if (!initializedOrdersRef.current) {
      knownOrderIdsRef.current = incomingOrderIds;
      initializedOrdersRef.current = true;
      return;
    }

    const newPendingOrders = (incomingOrders || []).filter(
      (order) =>
        order.status === 'Pending' && !knownOrderIdsRef.current.has(String(order._id))
    );

    knownOrderIdsRef.current = incomingOrderIds;
    await triggerNewOrderAlert(newPendingOrders.length);
  };

  const handleEnableBrowserNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    } catch (permissionError) {
      setNotificationPermission('denied');
    }
  };

  const getApiErrorMessage = (err, fallbackMessage) => {
    if (typeof err?.response?.data === 'string' && err.response.data.trim()) {
      const htmlPreMatch = err.response.data.match(/<pre>(.*?)<\/pre>/i);
      if (htmlPreMatch?.[1]) {
        return htmlPreMatch[1];
      }

      return err.response.data;
    }

    return err?.response?.data?.message || fallbackMessage;
  };

  const fetchData = async ({ withLoader = false, syncTimings = false } = {}) => {
    try {
      if (withLoader) {
        setLoading(true);
      }

      const [restaurantRes, ordersRes] = await Promise.all([
        restaurantOwnerAPI.getMyRestaurant(),
        restaurantOwnerAPI.getOrders()
      ]);

      setRestaurant(restaurantRes.data);
      if (syncTimings && !timingDirty) {
        setOpeningParts(parseTimeToParts(restaurantRes.data?.openingTime || '09:00 AM'));
        setClosingParts(parseTimeToParts(restaurantRes.data?.closingTime || '10:00 PM'));
      }
      setOrders(ordersRes.data);
      await detectAndHandleNewOrders(ordersRes.data || []);
      try {
        const partnersRes = await restaurantOwnerAPI.getDeliveryPartners();
        setDeliveryPartners(partnersRes.data || []);
      } catch (partnerErr) {
        setDeliveryPartners([]);
      }
      setSupportsAvailabilityApi(true);

      try {
        const foodsRes = await restaurantOwnerAPI.getFoodItems();
        setFoodItems(foodsRes.data);
        setError('');
      } catch (foodErr) {
        const message = getApiErrorMessage(foodErr, 'Failed to load menu items');

        if (message.includes('Cannot GET /api/restaurant/foods')) {
          const fallbackFoodsRes = await restaurantAPI.getFoodByRestaurant(restaurantRes.data._id);
          setFoodItems(fallbackFoodsRes.data);
          setSupportsAvailabilityApi(false);
          setError('Menu loaded with fallback API. Restart backend to enable availability updates.');
        } else {
          setFoodItems([]);
          setError(message);
        }
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load restaurant dashboard'));
    } finally {
      if (withLoader) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData({ withLoader: true, syncTimings: true });

    const intervalId = setInterval(() => {
      fetchData();
    }, 10000);

    return () => clearInterval(intervalId);
  }, []);

  const totalOrders = useMemo(() => orders.length, [orders]);

  const handleUpdateStatus = async (orderId, nextStatus) => {
    try {
      await restaurantOwnerAPI.updateOrderStatus(orderId, nextStatus);
      setSuccess('Order status updated');
      setError('');
      fetchData();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to update order status'));
      setSuccess('');
    }
  };

  const handleUpdateFoodAvailability = async (foodId, nextAvailability) => {
    if (!supportsAvailabilityApi) {
      setError('Availability update endpoint is unavailable. Restart backend server and try again.');
      return;
    }

    try {
      setUpdatingFoodId(foodId);
      await restaurantOwnerAPI.updateFoodItemAvailability(foodId, nextAvailability);
      setSuccess('Item availability updated');
      setError('');
      fetchData();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to update item availability'));
      setSuccess('');
    } finally {
      setUpdatingFoodId('');
    }
  };

  const handleAssignDeliveryPartner = async (orderId) => {
    const deliveryPartnerId = selectedPartnerByOrder[orderId];
    if (!deliveryPartnerId) {
      setError('Select a delivery partner first');
      setSuccess('');
      return;
    }

    try {
      setAssigningOrderId(orderId);
      await restaurantOwnerAPI.assignDeliveryPartner(orderId, deliveryPartnerId);
      setSuccess('Delivery partner assigned and order moved to Out for Delivery');
      setError('');
      setSelectedPartnerByOrder((prev) => ({ ...prev, [orderId]: '' }));
      fetchData();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to assign delivery partner'));
      setSuccess('');
    } finally {
      setAssigningOrderId('');
    }
  };

  const handleToggleOpenStatus = async () => {
    if (!restaurant) {
      return;
    }

    try {
      setUpdatingOpenStatus(true);
      const nextOpenStatus = !(restaurant.isOpen !== false);
      const { data } = await restaurantOwnerAPI.updateMyRestaurantOpenStatus(nextOpenStatus);
      setRestaurant(data);
      setSuccess(`Restaurant marked as ${data.isOpen !== false ? 'Open' : 'Closed'}`);
      setError('');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to update restaurant status'));
      setSuccess('');
    } finally {
      setUpdatingOpenStatus(false);
    }
  };

  const handleSaveTimings = async () => {
    const openingFormatted = buildTimeFromParts(openingParts);
    const closingFormatted = buildTimeFromParts(closingParts);
    if (!time12Pattern.test(openingFormatted) || !time12Pattern.test(closingFormatted)) {
      setError('Use 12-hour format like 09:30 AM');
      return;
    }

    try {
      setUpdatingTimings(true);
      const { data } = await restaurantOwnerAPI.updateMyRestaurantTimings(
        openingFormatted,
        closingFormatted
      );
      setRestaurant(data);
      setOpeningParts(parseTimeToParts(data.openingTime));
      setClosingParts(parseTimeToParts(data.closingTime));
      setTimingDirty(false);
      setSuccess('Restaurant timings updated');
      setError('');
    } catch (err) {
      const message = getApiErrorMessage(err, 'Failed to update timings');
      if (message.includes('Cannot PATCH /api/restaurant/my-restaurant/timings')) {
        setError('Timing API not loaded. Restart backend server and try again.');
      } else {
        setError(message);
      }
      setSuccess('');
    } finally {
      setUpdatingTimings(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading restaurant dashboard..." />;
  }

  return (
    <section className="space-y-6">
      <div className="rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white">
        <h1 className="text-2xl font-bold">Restaurant Dashboard</h1>
        <p className="mt-2 text-sm text-orange-100">Monitor and process your incoming orders in real time.</p>
      </div>

      <ErrorMessage message={error} />
      {success && <p className="rounded-md bg-green-100 p-3 text-sm text-green-700">{success}</p>}
      <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
        <p className="text-sm font-semibold text-sky-900">New Order Alerts</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium text-white ${
              soundEnabled ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-600 hover:bg-slate-700'
            }`}
          >
            {soundEnabled ? 'Sound: On' : 'Sound: Off'}
          </button>
          <button
            type="button"
            onClick={playAlertSound}
            className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Test Sound
          </button>
          <button
            type="button"
            onClick={handleEnableBrowserNotifications}
            disabled={notificationPermission === 'granted'}
            className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {notificationPermission === 'granted' ? 'Notifications Enabled' : 'Enable Notifications'}
          </button>
        </div>
      </div>

      {restaurant && (
        <div className="grid gap-4 rounded-xl border bg-white p-4 md:grid-cols-3">
          <div>
            <p className="text-sm text-gray-500">Restaurant</p>
            <p className="font-semibold text-gray-900">{restaurant.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Location</p>
            <p className="font-semibold text-gray-900">{restaurant.location}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Orders</p>
            <p className="font-semibold text-gray-900">{totalOrders}</p>
          </div>
          <div className="md:col-span-3">
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <span className="text-sm text-gray-500">Current Status:</span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  restaurant.isOpen !== false ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                }`}
              >
                {restaurant.isOpen !== false ? 'Open' : 'Closed'}
              </span>
              <button
                type="button"
                disabled={updatingOpenStatus}
                onClick={handleToggleOpenStatus}
                className={`rounded-md px-3 py-1.5 text-sm font-medium text-white transition ${
                  restaurant.isOpen !== false
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                } disabled:cursor-not-allowed disabled:opacity-70`}
              >
                {updatingOpenStatus
                  ? 'Updating...'
                  : restaurant.isOpen !== false
                    ? 'Mark Closed'
                    : 'Mark Open'}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="openingHour" className="block text-xs font-medium text-gray-600">
                  Opening Time
                </label>
                <div className="mt-1 flex gap-2">
                  <select
                    id="openingHour"
                    value={openingParts.hour}
                    onChange={(e) => {
                      setTimingDirty(true);
                      setOpeningParts((prev) => ({ ...prev, hour: e.target.value }));
                    }}
                    className="rounded border px-2 py-1.5 text-sm"
                  >
                    {hourOptions.map((hour) => (
                      <option key={`open-hour-${hour}`} value={hour}>
                        {hour}
                      </option>
                    ))}
                  </select>
                  <select
                    value={openingParts.minute}
                    onChange={(e) => {
                      setTimingDirty(true);
                      setOpeningParts((prev) => ({ ...prev, minute: e.target.value }));
                    }}
                    className="rounded border px-2 py-1.5 text-sm"
                  >
                    {minuteOptions.map((minute) => (
                      <option key={`open-minute-${minute}`} value={minute}>
                        {minute}
                      </option>
                    ))}
                  </select>
                  <select
                    value={openingParts.period}
                    onChange={(e) => {
                      setTimingDirty(true);
                      setOpeningParts((prev) => ({ ...prev, period: e.target.value }));
                    }}
                    className="rounded border px-2 py-1.5 text-sm"
                  >
                    {periodOptions.map((period) => (
                      <option key={`open-period-${period}`} value={period}>
                        {period}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="closingHour" className="block text-xs font-medium text-gray-600">
                  Closing Time
                </label>
                <div className="mt-1 flex gap-2">
                  <select
                    id="closingHour"
                    value={closingParts.hour}
                    onChange={(e) => {
                      setTimingDirty(true);
                      setClosingParts((prev) => ({ ...prev, hour: e.target.value }));
                    }}
                    className="rounded border px-2 py-1.5 text-sm"
                  >
                    {hourOptions.map((hour) => (
                      <option key={`close-hour-${hour}`} value={hour}>
                        {hour}
                      </option>
                    ))}
                  </select>
                  <select
                    value={closingParts.minute}
                    onChange={(e) => {
                      setTimingDirty(true);
                      setClosingParts((prev) => ({ ...prev, minute: e.target.value }));
                    }}
                    className="rounded border px-2 py-1.5 text-sm"
                  >
                    {minuteOptions.map((minute) => (
                      <option key={`close-minute-${minute}`} value={minute}>
                        {minute}
                      </option>
                    ))}
                  </select>
                  <select
                    value={closingParts.period}
                    onChange={(e) => {
                      setTimingDirty(true);
                      setClosingParts((prev) => ({ ...prev, period: e.target.value }));
                    }}
                    className="rounded border px-2 py-1.5 text-sm"
                  >
                    {periodOptions.map((period) => (
                      <option key={`close-period-${period}`} value={period}>
                        {period}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="button"
                disabled={updatingTimings}
                onClick={handleSaveTimings}
                className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {updatingTimings ? 'Saving...' : 'Save Timings'}
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Timings: {normalizeTimeTo12Hour(restaurant.openingTime) || 'Not set'} -{' '}
              {normalizeTimeTo12Hour(restaurant.closingTime) || 'Not set'}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-900">My Menu Items</h2>
        {foodItems.length === 0 ? (
          <p className="text-gray-600">No menu items found for your restaurant.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {foodItems.map((item) => (
              <article
                key={item._id}
                className={`rounded-lg border p-2 shadow-sm ${availabilityCardClasses[item.availabilityStatus || 'Available'] || 'border-gray-200 bg-white'}`}
              >
                <p className="truncate text-sm font-semibold text-gray-900" title={item.name}>
                  {item.name}
                </p>
                <p className="truncate text-xs text-gray-600">
                  {item.category} | Rs. {item.price} | Qty: {item.quantity || 'N/A'}
                </p>
                <div className="mt-1">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      availabilityBadgeClasses[item.availabilityStatus || 'Available'] || 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {item.availabilityStatus || 'Available'}
                  </span>
                </div>
                <select
                  value={item.availabilityStatus || 'Available'}
                  disabled={!supportsAvailabilityApi || updatingFoodId === item._id}
                  onChange={(e) => handleUpdateFoodAvailability(item._id, e.target.value)}
                  className="mt-1 w-full rounded border border-orange-300 bg-orange-100 px-2 py-1 text-xs text-orange-900 disabled:bg-gray-100"
                >
                  {availabilityOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-900">Recent Orders</h2>
        {orders.length === 0 ? (
          <p className="text-gray-600">No orders yet for your restaurant.</p>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const nextStatus = nextStatusMap[order.status];
              const hasLocationPin =
                Number.isFinite(order?.deliveryLocation?.latitude) &&
                Number.isFinite(order?.deliveryLocation?.longitude);
              return (
                <article
                  key={order._id}
                  className={`rounded-xl border p-4 shadow-sm ${
                    orderCardClasses[order.status] || 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">Order #{order._id.slice(-6)}</p>
                      <p className="text-sm text-gray-600">
                        {order.userId?.name} ({order.userId?.email})
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        badgeClasses[order.status] || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-gray-700">
                    <span className="font-medium">Delivery Address:</span> {order.deliveryAddress}
                  </p>
                  {hasLocationPin && (
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Location Pin:</span>{' '}
                      <a
                        href={`https://www.google.com/maps?q=${order.deliveryLocation.latitude},${order.deliveryLocation.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-700 hover:underline"
                      >
                        Open in Map
                      </a>
                    </p>
                  )}
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Phone:</span> {order.phoneNumber}
                  </p>
                  {order.deliveryPartner && (
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Delivery Partner:</span>{' '}
                      {order.deliveryPartner.name} ({order.deliveryPartner.email})
                    </p>
                  )}
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Order Time:</span> {new Date(order.createdAt).toLocaleString()}
                  </p>

                  <div className="mt-3">
                    <p className="mb-2 text-sm font-medium text-gray-800">Items</p>
                    <ul className="space-y-1 text-sm text-gray-700">
                      {order.items.map((item) => (
                        <li key={`${order._id}-${item.foodItem}`}>
                          {item.name} x {item.quantity} (Rs. {item.price})
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                    <p className="font-semibold text-gray-900">Total: Rs. {order.totalAmount}</p>

                    <select
                      value={order.status}
                      disabled={!nextStatus}
                      onChange={(e) => handleUpdateStatus(order._id, e.target.value)}
                      className="rounded border border-orange-300 bg-orange-100 px-3 py-2 text-sm text-orange-900 disabled:bg-gray-100"
                    >
                      <option value={order.status}>{order.status}</option>
                      {nextStatus ? <option value={nextStatus}>{nextStatus}</option> : null}
                    </select>
                  </div>
                  {order.status === 'Preparing' && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <select
                        value={selectedPartnerByOrder[order._id] || ''}
                        onChange={(e) =>
                          setSelectedPartnerByOrder((prev) => ({ ...prev, [order._id]: e.target.value }))
                        }
                        className="rounded border border-sky-300 bg-sky-50 px-3 py-2 text-sm text-sky-900"
                      >
                        <option value="">Select Delivery Partner</option>
                        {deliveryPartners.map((partner) => (
                          <option key={partner._id} value={partner._id}>
                            {partner.name} ({partner.email})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleAssignDeliveryPartner(order._id)}
                        disabled={assigningOrderId === order._id}
                        className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {assigningOrderId === order._id ? 'Assigning...' : 'Assign & Dispatch'}
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

export default RestaurantDashboard;
