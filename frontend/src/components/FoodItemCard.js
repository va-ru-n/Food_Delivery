import React, { useEffect, useRef, useState } from 'react';

const statusCardClasses = {
  Available: 'border-emerald-200 bg-emerald-50',
  'Not Available': 'border-rose-200 bg-rose-50',
  'Last Few': 'border-amber-200 bg-amber-50',
  Trending: 'border-violet-200 bg-violet-50',
  Fresh: 'border-cyan-200 bg-cyan-50'
};

const statusBadgeClasses = {
  Available: 'bg-emerald-200 text-emerald-900',
  'Not Available': 'bg-rose-200 text-rose-900',
  'Last Few': 'bg-amber-200 text-amber-900',
  Trending: 'bg-violet-200 text-violet-900',
  Fresh: 'bg-cyan-200 text-cyan-900'
};

function FoodItemCard({ item, onAddToCart, restaurantClosed = false }) {
  const [added, setAdded] = useState(false);
  const timerRef = useRef(null);
  const status = item.availabilityStatus || 'Available';
  const isBlocked = restaurantClosed || status === 'Not Available';

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleAddToCart = () => {
    if (isBlocked) {
      return;
    }

    onAddToCart(item);
    setAdded(true);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setAdded(false);
    }, 900);
  };

  return (
    <div
      className={`card-pop card-hover-lift group relative overflow-hidden rounded-xl border shadow-sm ${
        statusCardClasses[status] || 'border-orange-100 bg-white'
      }`}
    >
      <img
        src={item.image}
        alt={item.name}
        className="h-40 w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
      />
      <div className="card-shine" />
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
          <span className="rounded bg-white/70 px-2 py-1 text-xs font-medium text-brand-700">{item.category}</span>
        </div>
        <p className="text-lg font-bold text-gray-900">Rs. {item.price}</p>
        <p className="text-sm text-gray-600">Quantity: {item.quantity || 'N/A'}</p>
        <div>
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClasses[status] || 'bg-gray-100 text-gray-700'}`}>
            {status}
          </span>
        </div>
        <button
          type="button"
          disabled={isBlocked}
          onClick={handleAddToCart}
          className={`w-full rounded-md px-3 py-2 text-sm font-medium text-white transition-all duration-300 ${
            isBlocked
              ? 'cursor-not-allowed bg-rose-400'
              : added
                ? 'bg-green-600 scale-[1.03] animate-pulse'
                : status === 'Last Few'
                  ? 'bg-amber-600 hover:-translate-y-0.5 hover:bg-amber-700 hover:shadow-md'
                  : status === 'Trending'
                    ? 'bg-violet-600 hover:-translate-y-0.5 hover:bg-violet-700 hover:shadow-md'
                    : status === 'Fresh'
                      ? 'bg-cyan-600 hover:-translate-y-0.5 hover:bg-cyan-700 hover:shadow-md'
                      : 'bg-brand-600 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md'
          }`}
        >
          {restaurantClosed ? 'Restaurant Closed' : isBlocked ? 'Not Available' : added ? 'Added' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
}

export default FoodItemCard;
