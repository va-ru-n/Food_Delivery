import React, { useEffect, useState } from 'react';
import HeroSection from '../components/HeroSection';
import RestaurantCard from '../components/RestaurantCard';
import HowItWorks from '../components/HowItWorks';
import Footer from '../components/Footer';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { restaurantAPI } from '../services/api';

function HomePage() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        setLoading(true);
        const { data } = await restaurantAPI.getAll();
        setRestaurants(data);
        setError('');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load restaurants');
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  const fallbackRestaurants = [
    {
      _id: 'sample-1',
      name: 'Andhra Spice Biryani',
      image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=1200&q=80',
      location: 'Main Road, Jaggayyapeta',
      openingTime: '09:00 AM',
      closingTime: '11:00 PM',
      isOpen: true,
      category: 'Biryani',
      rating: 4.4,
      deliveryTime: '25 mins',
      address: 'Main Road, Jaggayyapeta'
    },
    {
      _id: 'sample-2',
      name: 'Home Style Meals Hub',
      image: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?auto=format&fit=crop&w=1200&q=80',
      location: 'Bus Stand Center, Jaggayyapeta',
      openingTime: '10:00 AM',
      closingTime: '10:00 PM',
      isOpen: true,
      category: 'Meals',
      rating: 4.2,
      deliveryTime: '30 mins',
      address: 'Bus Stand Center, Jaggayyapeta'
    },
    {
      _id: 'sample-3',
      name: 'Evening Snacks Corner',
      image: 'https://images.unsplash.com/photo-1536305030011-9d4fa1c1aa9c?auto=format&fit=crop&w=1200&q=80',
      location: 'Market Line, Jaggayyapeta',
      openingTime: '04:00 PM',
      closingTime: '10:30 PM',
      isOpen: false,
      category: 'Snacks',
      rating: 4.1,
      deliveryTime: '20 mins',
      address: 'Market Line, Jaggayyapeta'
    }
  ];

  const displayRestaurants = (restaurants.length > 0 ? restaurants : fallbackRestaurants).map((restaurant, index) => {
      const categoryFallback = ['Biryani', 'Meals', 'Snacks'][index % 3];
      const ratingFallback = [4.3, 4.2, 4.4][index % 3];
      const timeFallback = ['25 mins', '30 mins', '20 mins'][index % 3];

      return {
        ...restaurant,
        category: restaurant.category || categoryFallback,
        rating: restaurant.rating || ratingFallback,
        deliveryTime: restaurant.deliveryTime || timeFallback,
        address: restaurant.address || restaurant.location || 'Jaggayyapeta'
      };
    });

  return (
    <section className="space-y-10">
      <HeroSection />

      <ErrorMessage message={error} />

      {loading ? (
        <LoadingSpinner message="Fetching restaurants..." />
      ) : (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Popular Restaurants</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {displayRestaurants.map((restaurant) => (
              <RestaurantCard key={restaurant._id} restaurant={restaurant} />
            ))}
          </div>
        </div>
      )}

      {!loading && displayRestaurants.length === 0 && (
        <p className="text-gray-600">No restaurants available yet.</p>
      )}

      <HowItWorks />
      <Footer />
    </section>
  );
}

export default HomePage;
