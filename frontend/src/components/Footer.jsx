import React from 'react';
import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="mt-6 rounded-2xl border border-orange-100 bg-white px-6 py-8 shadow-sm">
      <div className="grid gap-8 md:grid-cols-3">
        <div>
          <img
            src="/jpt-logo.png"
            alt="JPT Express"
            className="h-16 w-[240px] max-w-full object-cover object-center transition-transform duration-300 hover:scale-105"
          />
          <p className="mt-2 text-xl font-bold text-brand-700">JPT Express</p>
          <p className="mt-2 text-sm text-gray-600">Food &bull; Groceries &bull; Delivery</p>
        </div>

        <div>
          <p className="font-semibold text-gray-900">Quick Links</p>
          <div className="mt-2 flex flex-col gap-1 text-sm text-gray-600">
            <Link to="/" className="hover:text-brand-700">
              Home
            </Link>
            <Link to="/cart" className="hover:text-brand-700">
              Cart
            </Link>
            <Link to="/orders" className="hover:text-brand-700">
              Orders
            </Link>
          </div>
        </div>

        <div>
          <p className="font-semibold text-gray-900">Contact</p>
          <p className="mt-2 text-sm text-gray-600">Location: Jaggayyapeta</p>
          <p className="text-sm text-gray-600">Email:</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
