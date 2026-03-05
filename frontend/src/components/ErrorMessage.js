import React from 'react';

function ErrorMessage({ message }) {
  if (!message) {
    return null;
  }

  return <p className="rounded-md bg-red-100 p-3 text-sm text-red-700">{message}</p>;
}

export default ErrorMessage;
