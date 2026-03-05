import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ErrorMessage from '../components/ErrorMessage';
import { orderAPI } from '../services/api';

const getLocationErrorMessage = (error) => {
  if (!error) return 'Unable to get location';
  if (error.code === 1) return 'Location permission denied. Enable it in your browser settings.';
  if (error.code === 2) return 'Location is unavailable. Please try again.';
  if (error.code === 3) return 'Location request timed out. Please try again.';
  return 'Unable to get location';
};

const getMapEmbedUrl = (latitude, longitude) => {
  const delta = 0.004;
  const bbox = [
    longitude - delta,
    latitude - delta,
    longitude + delta,
    latitude + delta
  ]
    .map((value) => value.toFixed(6))
    .join(',');

  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude.toFixed(6)},${longitude.toFixed(6)}`;
};

function CartPage({ user, cartItems, updateCartQuantity, clearCart }) {
  const navigate = useNavigate();
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [liveTracking, setLiveTracking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const watchIdRef = useRef(null);

  const total = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  );

  const fetchAddressFromCoordinates = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
      );
      if (!response.ok) return '';

      const data = await response.json();
      return data?.display_name || '';
    } catch (fetchError) {
      return '';
    }
  };

  const updateLocationFromPosition = async (position, shouldResolveAddress = false) => {
    const latitude = Number(position.coords.latitude);
    const longitude = Number(position.coords.longitude);
    const accuracy = Number(position.coords.accuracy);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setLocationError('Received invalid coordinates. Please try again.');
      return;
    }

    setDeliveryLocation({
      latitude,
      longitude,
      accuracy: Number.isFinite(accuracy) ? accuracy : undefined
    });
    setLocationError('');

    if (!deliveryAddress.trim() || shouldResolveAddress) {
      const resolvedAddress = await fetchAddressFromCoordinates(latitude, longitude);
      if (resolvedAddress) {
        setDeliveryAddress(resolvedAddress);
      }
    }
  };

  const stopLiveLocation = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setLiveTracking(false);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.');
      return;
    }

    setLocationLoading(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await updateLocationFromPosition(position, true);
        setLocationLoading(false);
      },
      (geoError) => {
        setLocationError(getLocationErrorMessage(geoError));
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const startLiveLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.');
      return;
    }

    setLocationError('');
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        updateLocationFromPosition(position);
      },
      (geoError) => {
        setLocationError(getLocationErrorMessage(geoError));
        stopLiveLocation();
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
    watchIdRef.current = watchId;
    setLiveTracking(true);
  };

  useEffect(() => () => stopLiveLocation(), []);

  const handlePlaceOrder = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (user.role !== 'customer') {
      setError('Only customer accounts can place orders');
      return;
    }

    if (cartItems.length === 0) {
      setError('Your cart is empty');
      return;
    }

    if (!deliveryAddress.trim()) {
      setError('Delivery address is required');
      return;
    }

    if (!/^[0-9+\-\s]{8,15}$/.test(phoneNumber.trim())) {
      setError('Enter a valid phone number');
      return;
    }

    try {
      setLoading(true);
      await orderAPI.create({
        items: cartItems,
        totalAmount: total,
        deliveryAddress: deliveryAddress.trim(),
        phoneNumber: phoneNumber.trim(),
        ...(deliveryLocation
          ? {
              deliveryLocation: {
                latitude: deliveryLocation.latitude,
                longitude: deliveryLocation.longitude,
                accuracy: deliveryLocation.accuracy
              }
            }
          : {})
      });

      clearCart();
      setDeliveryAddress('');
      setPhoneNumber('');
      setDeliveryLocation(null);
      stopLiveLocation();
      setError('');
      setSuccessMessage('Order placed successfully. Payment: Cash on Delivery.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place order');
      setSuccessMessage('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-6 py-6 text-white shadow-sm">
        <h1 className="text-2xl font-bold">Your Cart</h1>
        <p className="mt-1 text-sm text-orange-100">Review your items and place order with Cash on Delivery.</p>
      </div>

      <ErrorMessage message={error} />
      {successMessage && <p className="rounded-md bg-green-100 p-3 text-sm text-green-700">{successMessage}</p>}

      {cartItems.length === 0 ? (
        <p className="text-gray-600">No items in cart.</p>
      ) : (
        <div className="space-y-3">
          {cartItems.map((item) => (
            <div
              key={item.foodItem}
              className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 p-4 shadow-sm"
            >
              <div>
                <p className="font-medium text-gray-900">{item.name}</p>
                <p className="text-sm text-gray-600">Rs. {item.price} each</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="rounded bg-rose-500 px-2 py-1 font-semibold text-white hover:bg-rose-600"
                  onClick={() => updateCartQuantity(item.foodItem, item.quantity - 1)}
                >
                  -
                </button>
                <span className="min-w-6 rounded bg-white px-2 py-0.5 text-center font-semibold text-gray-800">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  className="rounded bg-emerald-500 px-2 py-1 font-semibold text-white hover:bg-emerald-600"
                  onClick={() => updateCartQuantity(item.foodItem, item.quantity + 1)}
                >
                  +
                </button>
              </div>
            </div>
          ))}

          <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 shadow-sm">
            <p className="text-lg font-bold text-gray-900">Total: Rs. {total}</p>
            <p className="mt-1 text-sm text-gray-600">Payment method: Cash on Delivery</p>

            <label htmlFor="address" className="mt-4 block text-sm font-medium text-gray-700">
              Delivery Address
            </label>
            <textarea
              id="address"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              className="mt-2 w-full rounded-md border border-violet-300 bg-white px-3 py-2"
              rows={3}
              placeholder="Enter full address"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={loading || locationLoading}
                className="rounded-md border border-brand-500 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {locationLoading ? 'Detecting Location...' : 'Use Current Location (Free)'}
              </button>
              <button
                type="button"
                onClick={liveTracking ? stopLiveLocation : startLiveLocation}
                disabled={loading || locationLoading}
                className={`rounded-md px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-70 ${
                  liveTracking ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {liveTracking ? 'Stop Live Location' : 'Start Live Location'}
              </button>
            </div>
            {locationError && <p className="mt-2 text-sm text-rose-700">{locationError}</p>}
            {deliveryLocation && (
              <div className="mt-3 rounded-md border border-gray-200 bg-white p-3">
                <p className="text-sm text-gray-700">
                  Pinned location: {deliveryLocation.latitude.toFixed(6)}, {deliveryLocation.longitude.toFixed(6)}
                  {Number.isFinite(deliveryLocation.accuracy)
                    ? ` (accuracy ~${Math.round(deliveryLocation.accuracy)}m)`
                    : ''}
                </p>
                <iframe
                  title="Selected delivery location"
                  src={getMapEmbedUrl(deliveryLocation.latitude, deliveryLocation.longitude)}
                  className="mt-2 h-48 w-full rounded-md border border-gray-200"
                  loading="lazy"
                />
              </div>
            )}

            <label htmlFor="phone" className="mt-4 block text-sm font-medium text-gray-700">
              Phone Number
            </label>
            <input
              id="phone"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="mt-2 w-full rounded-md border border-violet-300 bg-white px-3 py-2"
              placeholder="Enter phone number"
            />

            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={loading}
              className="mt-4 rounded-md bg-gradient-to-r from-brand-600 to-rose-600 px-4 py-2 font-medium text-white hover:from-brand-700 hover:to-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'Placing Order...' : 'Place Order'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default CartPage;
