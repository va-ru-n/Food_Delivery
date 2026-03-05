import React from 'react';

function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center py-10">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-orange-200 border-t-brand-600" />
        <p className="mt-3 text-sm text-gray-600">{message}</p>
      </div>
    </div>
  );
}

export default LoadingSpinner;
