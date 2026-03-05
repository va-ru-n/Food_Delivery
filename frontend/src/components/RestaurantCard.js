import React from 'react';
import { Link } from 'react-router-dom';

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

const StarIcon = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M11.48 3.5a.75.75 0 0 1 1.04 0l2.29 2.27 3.18.46c.66.1.93.9.45 1.36l-2.3 2.24.54 3.16c.11.66-.58 1.16-1.17.85L12 12.6l-2.84 1.5c-.59.31-1.28-.19-1.17-.85l.54-3.16-2.3-2.24c-.48-.46-.21-1.26.45-1.36l3.18-.46z" />
  </svg>
);

function RestaurantCard({ restaurant }) {
  const isRestaurantOpen = restaurant.isOpen !== false;
  const category = restaurant.category || 'Meals';
  const rating = restaurant.rating || 4.3;
  const deliveryTime = restaurant.deliveryTime || '25 mins';
  const address = restaurant.address || restaurant.location || 'Jaggayyapeta';

  return (
    <div className="group overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <img
        src={restaurant.image}
        alt={restaurant.name}
        className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-gray-900">{restaurant.name}</h3>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              isRestaurantOpen ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
            }`}
          >
            {isRestaurantOpen ? 'Open' : 'Closed'}
          </span>
        </div>

        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span className="rounded-full bg-orange-100 px-2 py-0.5 font-medium text-orange-800">{category}</span>
          <span className="inline-flex items-center gap-1 font-medium">
            <StarIcon className="h-4 w-4 text-amber-500" /> {rating}
          </span>
          <span>{deliveryTime}</span>
        </div>

        <p className="text-sm text-gray-600">{address}</p>
        <p className="text-sm font-medium text-gray-700">
          Timings: {formatTime12Hour(restaurant.openingTime)} - {formatTime12Hour(restaurant.closingTime)}
        </p>

        <Link
          to={`/restaurants/${restaurant._id}`}
          className={`mt-1 inline-block rounded-md px-3 py-2 text-sm font-medium text-white transition ${
            isRestaurantOpen ? 'bg-brand-600 hover:bg-brand-700' : 'bg-gray-600 hover:bg-gray-700'
          }`}
        >
          View Menu
        </Link>
      </div>
    </div>
  );
}

export default RestaurantCard;
