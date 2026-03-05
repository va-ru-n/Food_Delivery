import React from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';

const HomeIcon = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 11.5L12 4l9 7.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 10.5V20h13V10.5" />
  </svg>
);

const CartIcon = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h2l2.2 10.2A2 2 0 0 0 9.2 16h8.9a2 2 0 0 0 2-1.6L21 8H7" />
    <circle cx="10" cy="20" r="1.5" />
    <circle cx="18" cy="20" r="1.5" />
  </svg>
);

const OrdersIcon = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 3h9l3 3v15H6z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 3v3h3" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 11h6M9 15h6" />
  </svg>
);

const LogoutIcon = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 17l5-5-5-5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H3" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 3v18H9" />
  </svg>
);

function Navbar({ user, cartCount, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const menuLinkClass = ({ isActive }) =>
    `flex items-center gap-1.5 rounded-md px-3 py-1.5 transition ${
      isActive ? 'bg-orange-100 text-orange-800' : 'text-gray-700 hover:bg-orange-50 hover:text-brand-700'
    }`;

  const isCustomerOrGuest = !user || user.role === 'customer';

  return (
    <header className="sticky top-0 z-30 border-b border-orange-100 bg-white/95 shadow-sm backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/jpt-logo.png"
            alt="JPT Express"
            className="h-12 w-[180px] object-cover object-center transition-transform duration-300 hover:scale-105 sm:h-14 sm:w-[220px]"
          />
          <span className="hidden text-xl font-bold text-brand-700 lg:inline">JPT Express</span>
        </Link>

        <div className="flex flex-wrap items-center justify-end gap-2 text-sm font-medium">
          {isCustomerOrGuest && (
            <NavLink to="/" className={menuLinkClass}>
              <HomeIcon />
              Home
            </NavLink>
          )}
          {isCustomerOrGuest && (
            <NavLink to="/cart" className={menuLinkClass}>
              <CartIcon />
              Cart{user && user.role === 'customer' ? ` (${cartCount})` : ''}
            </NavLink>
          )}
          {user?.role === 'customer' && (
            <NavLink to="/orders" className={menuLinkClass}>
              <OrdersIcon />
              Orders
            </NavLink>
          )}
          {user ? (
            <>
              <button
                type="button"
                onClick={handleLogout}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-white transition ${
                  location.pathname === '/logout'
                    ? 'bg-orange-700'
                    : 'bg-brand-600 hover:bg-brand-700'
                }`}
              >
                <LogoutIcon />
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={menuLinkClass}>
                <OrdersIcon />
                Orders
              </NavLink>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
