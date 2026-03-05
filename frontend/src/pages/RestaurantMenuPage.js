import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import FoodItemCard from '../components/FoodItemCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { restaurantAPI } from '../services/api';

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

function RestaurantMenuPage({ addToCart, cartCount = 0 }) {
  const { id } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cartPulse, setCartPulse] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const isRestaurantOpen = restaurant ? restaurant.isOpen !== false : true;

  const categories = useMemo(() => {
    const baseCategories = ['All', 'Food', 'Biryani', 'Vegetables', 'Meat'];
    const extraCategories = items
      .map((item) => String(item.category || '').trim())
      .filter(Boolean)
      .filter((category) => !baseCategories.some((base) => base.toLowerCase() === category.toLowerCase()));
    return [...baseCategories, ...extraCategories];
  }, [items]);

  const filteredItems = useMemo(() => {
    if (selectedCategory.toLowerCase() === 'all') {
      return items;
    }

    return items.filter((item) => String(item.category || '').trim().toLowerCase() === selectedCategory.toLowerCase());
  }, [items, selectedCategory]);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        setLoading(true);
        setSelectedCategory('All');
        const [restaurantRes, foodsRes] = await Promise.all([
          restaurantAPI.getById(id),
          restaurantAPI.getFoodByRestaurant(id)
        ]);
        setRestaurant(restaurantRes.data);
        setItems(foodsRes.data);
        setError('');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load menu');
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, [id]);

  useEffect(() => {
    if (cartCount <= 0) return;
    setCartPulse(true);
    const timer = setTimeout(() => setCartPulse(false), 500);
    return () => clearTimeout(timer);
  }, [cartCount]);

  return (
    <section className="space-y-4 pb-24">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Restaurant Menu</h1>
          {restaurant && (
            <>
              <span
                className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  isRestaurantOpen ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                }`}
              >
                {isRestaurantOpen ? 'Open Now' : 'Currently Closed'}
              </span>
              <p className="mt-1 text-sm font-medium text-gray-700">
                Timings: {formatTime12Hour(restaurant.openingTime)} - {formatTime12Hour(restaurant.closingTime)}
              </p>
            </>
          )}
        </div>
        <Link
          to="/cart"
          className="rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 shadow-sm hover:bg-brand-100"
        >
          Cart {cartCount > 0 ? `(${cartCount})` : ''}
        </Link>
      </div>

      <ErrorMessage message={error} />
      {restaurant && !isRestaurantOpen && (
        <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700">
          This restaurant is closed now. You can view the menu, but ordering is disabled.
        </p>
      )}

      {!loading && items.length > 0 && (
        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-max items-center gap-2">
            {categories.map((category) => {
              const isActive = selectedCategory.toLowerCase() === category.toLowerCase();
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'border-brand-700 bg-brand-600 text-white'
                      : 'border-orange-200 bg-white text-gray-700 hover:bg-orange-50'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <LoadingSpinner message="Fetching menu..." />
      ) : items.length === 0 ? (
        <p className="text-gray-600">No food items found for this restaurant.</p>
      ) : filteredItems.length === 0 ? (
        <p className="text-gray-600">No items found in "{selectedCategory}" category.</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <FoodItemCard
              key={item._id}
              item={item}
              onAddToCart={addToCart}
              restaurantClosed={Boolean(restaurant && !isRestaurantOpen)}
            />
          ))}
        </div>
      )}

      {cartCount > 0 && (
        <Link
          to="/cart"
          className={`fixed bottom-5 right-5 z-40 rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-brand-700 ${
            cartPulse ? 'scale-105' : 'scale-100'
          }`}
        >
          View Cart ({cartCount})
        </Link>
      )}
    </section>
  );
}

export default RestaurantMenuPage;
