import React, { useEffect, useState } from 'react';
import ErrorMessage from '../components/ErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';
import { authAPI, orderAPI, restaurantAPI } from '../services/api';

const statusOptions = ['Pending', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'];
const time12Pattern = /^(0?[1-9]|1[0-2]):([0-5]\d)\s?(AM|PM)$/i;
const time24Pattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

const formatTime12Hour = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return 'N/A';

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

function AdminDashboardPage() {
  const [restaurants, setRestaurants] = useState([]);
  const [foodItems, setFoodItems] = useState([]);
  const [owners, setOwners] = useState([]);
  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [restaurantForm, setRestaurantForm] = useState({
    name: '',
    image: '',
    description: '',
    location: '',
    ownerId: ''
  });

  const [foodForm, setFoodForm] = useState({
    name: '',
    price: '',
    quantity: '',
    image: '',
    category: '',
    restaurantId: ''
  });

  const [ownerForm, setOwnerForm] = useState({
    name: '',
    email: '',
    password: ''
  });

  const [deliveryForm, setDeliveryForm] = useState({
    name: '',
    email: '',
    password: ''
  });

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [restaurantsRes, ordersRes, ownersRes] = await Promise.all([
        restaurantAPI.getAll(),
        orderAPI.getAll(),
        authAPI.getRestaurantOwners()
      ]);
      const restaurantsData = restaurantsRes.data || [];
      setRestaurants(restaurantsData);
      setOrders(ordersRes.data);
      setOwners(ownersRes.data);

      try {
        const deliveryRes = await authAPI.getDeliveryPartners();
        setDeliveryPartners(deliveryRes.data || []);
      } catch (deliveryErr) {
        setDeliveryPartners([]);
      }

      const foodResults = await Promise.all(
        restaurantsData.map(async (restaurant) => {
          const foodsRes = await restaurantAPI.getFoodByRestaurant(restaurant._id);
          return (foodsRes.data || []).map((food) => ({
            ...food,
            restaurantName: restaurant.name
          }));
        })
      );
      setFoodItems(foodResults.flat());
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleAddRestaurant = async (e) => {
    e.preventDefault();
    setSuccess('');

    try {
      await restaurantAPI.addRestaurant(restaurantForm);
      setRestaurantForm({
        name: '',
        image: '',
        description: '',
        location: '',
        ownerId: ''
      });
      setSuccess('Restaurant added successfully');
      fetchDashboardData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add restaurant');
    }
  };

  const handleCreateOwner = async (e) => {
    e.preventDefault();
    setSuccess('');

    try {
      await authAPI.createUserByAdmin({
        ...ownerForm,
        role: 'restaurant'
      });
      setOwnerForm({ name: '', email: '', password: '' });
      setSuccess('Restaurant owner created successfully');
      fetchDashboardData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create restaurant owner');
    }
  };

  const handleCreateDeliveryPartner = async (e) => {
    e.preventDefault();
    setSuccess('');

    try {
      await authAPI.createUserByAdmin({
        ...deliveryForm,
        role: 'delivery'
      });
      setDeliveryForm({ name: '', email: '', password: '' });
      setSuccess('Delivery partner created successfully');
      fetchDashboardData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create delivery partner');
    }
  };

  const handleAddFood = async (e) => {
    e.preventDefault();
    setSuccess('');

    try {
      await restaurantAPI.addFoodItem({
        ...foodForm,
        price: Number(foodForm.price),
        quantity: foodForm.quantity
      });
      setFoodForm({ name: '', price: '', quantity: '', image: '', category: '', restaurantId: '' });
      setSuccess('Food item added successfully');
      fetchDashboardData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add food item');
    }
  };

  const handleStatusUpdate = async (orderId, status) => {
    try {
      await orderAPI.updateStatus(orderId, status);
      setSuccess('Order status updated');
      fetchDashboardData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDeleteRestaurant = async (restaurantId, restaurantName) => {
    const isConfirmed = window.confirm(
      `Delete restaurant "${restaurantName}"? This will also delete its food items and orders.`
    );

    if (!isConfirmed) {
      return;
    }

    try {
      await restaurantAPI.deleteRestaurant(restaurantId);
      setSuccess('Restaurant deleted successfully');
      setError('');
      fetchDashboardData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete restaurant');
      setSuccess('');
    }
  };

  const handleUpdateFoodQuantity = async (foodId, currentQuantity) => {
    const nextQuantity = window.prompt('Enter new quantity (text allowed, e.g. 500g, 2 plates):', currentQuantity || '');
    if (nextQuantity === null) return;

    const normalized = nextQuantity.trim();
    if (!normalized) {
      setError('Quantity is required');
      return;
    }

    try {
      await restaurantAPI.updateFoodItemQuantity(foodId, normalized);
      setSuccess('Food quantity updated successfully');
      setError('');
      fetchDashboardData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update food quantity');
      setSuccess('');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading admin dashboard..." />;
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
      <ErrorMessage message={error} />
      {success && <p className="rounded-md bg-green-100 p-3 text-sm text-green-700">{success}</p>}

      <div className="grid gap-6 lg:grid-cols-4">
        <form onSubmit={handleCreateOwner} className="space-y-3 rounded-xl border bg-white p-4">
          <h2 className="text-lg font-semibold">Create Restaurant Owner</h2>
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Owner Name"
            value={ownerForm.name}
            onChange={(e) => setOwnerForm((p) => ({ ...p, name: e.target.value }))}
            required
          />
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Owner Email"
            type="email"
            value={ownerForm.email}
            onChange={(e) => setOwnerForm((p) => ({ ...p, email: e.target.value }))}
            required
          />
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Password (min 6 chars)"
            type="password"
            minLength={6}
            value={ownerForm.password}
            onChange={(e) => setOwnerForm((p) => ({ ...p, password: e.target.value }))}
            required
          />
          <button className="rounded-md bg-brand-600 px-4 py-2 text-white hover:bg-brand-700" type="submit">
            Create Owner
          </button>
        </form>

        <form onSubmit={handleCreateDeliveryPartner} className="space-y-3 rounded-xl border bg-white p-4">
          <h2 className="text-lg font-semibold">Create Delivery Partner</h2>
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Partner Name"
            value={deliveryForm.name}
            onChange={(e) => setDeliveryForm((p) => ({ ...p, name: e.target.value }))}
            required
          />
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Partner Email"
            type="email"
            value={deliveryForm.email}
            onChange={(e) => setDeliveryForm((p) => ({ ...p, email: e.target.value }))}
            required
          />
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Password (min 6 chars)"
            type="password"
            minLength={6}
            value={deliveryForm.password}
            onChange={(e) => setDeliveryForm((p) => ({ ...p, password: e.target.value }))}
            required
          />
          <button className="rounded-md bg-sky-600 px-4 py-2 text-white hover:bg-sky-700" type="submit">
            Create Partner
          </button>
        </form>

        <form onSubmit={handleAddRestaurant} className="space-y-3 rounded-xl border bg-white p-4">
          <h2 className="text-lg font-semibold">Add Restaurant + Assign Owner</h2>
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Name"
            value={restaurantForm.name}
            onChange={(e) => setRestaurantForm((p) => ({ ...p, name: e.target.value }))}
            required
          />
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Image URL"
            value={restaurantForm.image}
            onChange={(e) => setRestaurantForm((p) => ({ ...p, image: e.target.value }))}
            required
          />
          <textarea
            className="w-full rounded border px-3 py-2"
            placeholder="Description"
            value={restaurantForm.description}
            onChange={(e) => setRestaurantForm((p) => ({ ...p, description: e.target.value }))}
            required
          />
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Location"
            value={restaurantForm.location}
            onChange={(e) => setRestaurantForm((p) => ({ ...p, location: e.target.value }))}
            required
          />
          <select
            className="w-full rounded border px-3 py-2"
            value={restaurantForm.ownerId}
            onChange={(e) => setRestaurantForm((p) => ({ ...p, ownerId: e.target.value }))}
            required
          >
            <option value="">Select Owner</option>
            {owners.map((owner) => (
              <option key={owner._id} value={owner._id}>
                {owner.name} ({owner.email})
              </option>
            ))}
          </select>
          <button className="rounded-md bg-brand-600 px-4 py-2 text-white hover:bg-brand-700" type="submit">
            Add Restaurant
          </button>
        </form>

        <form onSubmit={handleAddFood} className="space-y-3 rounded-xl border bg-white p-4">
          <h2 className="text-lg font-semibold">Add Food Item</h2>
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Name"
            value={foodForm.name}
            onChange={(e) => setFoodForm((p) => ({ ...p, name: e.target.value }))}
            required
          />
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Price"
            type="number"
            min="1"
            value={foodForm.price}
            onChange={(e) => setFoodForm((p) => ({ ...p, price: e.target.value }))}
            required
          />
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Quantity"
            type="text"
            value={foodForm.quantity}
            onChange={(e) => setFoodForm((p) => ({ ...p, quantity: e.target.value }))}
            required
          />
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Image URL"
            value={foodForm.image}
            onChange={(e) => setFoodForm((p) => ({ ...p, image: e.target.value }))}
            required
          />
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Category"
            value={foodForm.category}
            onChange={(e) => setFoodForm((p) => ({ ...p, category: e.target.value }))}
            required
          />
          <select
            className="w-full rounded border px-3 py-2"
            value={foodForm.restaurantId}
            onChange={(e) => setFoodForm((p) => ({ ...p, restaurantId: e.target.value }))}
            required
          >
            <option value="">Select Restaurant</option>
            {restaurants.map((restaurant) => (
              <option key={restaurant._id} value={restaurant._id}>
                {restaurant.name}
              </option>
            ))}
          </select>
          <button className="rounded-md bg-brand-600 px-4 py-2 text-white hover:bg-brand-700" type="submit">
            Add Food Item
          </button>
        </form>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Delivery Partners</h2>
        {deliveryPartners.length === 0 ? (
          <p className="text-gray-600">No delivery partners yet.</p>
        ) : (
          <div className="space-y-2">
            {deliveryPartners.map((partner) => (
              <div key={partner._id} className="rounded-lg border bg-white p-4">
                <p className="font-semibold">{partner.name}</p>
                <p className="text-sm text-gray-600">{partner.email}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Manage Restaurants</h2>
        {restaurants.length === 0 ? (
          <p className="text-gray-600">No restaurants yet.</p>
        ) : (
          restaurants.map((restaurant) => (
            <div key={restaurant._id} className="rounded-lg border bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{restaurant.name}</p>
                  <p className="text-sm text-gray-600">{restaurant.location}</p>
                  <p className="text-sm text-gray-600">
                    Timings: {formatTime12Hour(restaurant.openingTime)} - {formatTime12Hour(restaurant.closingTime)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Owner: {restaurant.owner?.name || 'N/A'} ({restaurant.owner?.email || 'N/A'})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteRestaurant(restaurant._id, restaurant.name)}
                  className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  Delete Restaurant
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Food Items</h2>
        {foodItems.length === 0 ? (
          <p className="text-gray-600">No food items yet.</p>
        ) : (
          <div className="space-y-2">
            {foodItems.map((food) => (
              <div key={food._id} className="rounded-lg border bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{food.name}</p>
                    <p className="text-sm text-gray-600">Restaurant: {food.restaurantName}</p>
                    <p className="text-sm text-gray-600">Category: {food.category}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold text-gray-900">Rs. {food.price}</p>
                    <p className="text-gray-600">Quantity: {food.quantity || 'N/A'}</p>
                    <button
                      type="button"
                      onClick={() => handleUpdateFoodQuantity(food._id, food.quantity)}
                      className="mt-2 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
                    >
                      Edit Quantity
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Manage Orders</h2>
        {orders.length === 0 ? (
          <p className="text-gray-600">No orders yet.</p>
        ) : (
          orders.map((order) => {
            const hasLocationPin =
              Number.isFinite(order?.deliveryLocation?.latitude) &&
              Number.isFinite(order?.deliveryLocation?.longitude);

            return (
              <div key={order._id} className="rounded-lg border bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">Order #{order._id.slice(-6)}</p>
                    <p className="text-sm text-gray-600">
                      {order.userId?.name} ({order.userId?.email})
                    </p>
                  </div>
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusUpdate(order._id, e.target.value)}
                    className="rounded border px-3 py-2"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-2 text-sm text-gray-700">Amount: Rs. {order.totalAmount}</p>
                <p className="text-sm text-gray-700">Phone: {order.phoneNumber}</p>
                <p className="text-sm text-gray-700">Address: {order.deliveryAddress}</p>
                {order.deliveryPartner && (
                  <p className="text-sm text-gray-700">
                    Delivery Partner: {order.deliveryPartner.name} ({order.deliveryPartner.email})
                  </p>
                )}
                {hasLocationPin && (
                  <p className="text-sm text-gray-700">
                    Location Pin:{' '}
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
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

export default AdminDashboardPage;
