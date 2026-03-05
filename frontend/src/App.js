import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import RestaurantMenuPage from './pages/RestaurantMenuPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import CartPage from './pages/CartPage';
import OrdersPage from './pages/OrdersPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import RestaurantLoginPage from './pages/RestaurantLoginPage';
import RestaurantDashboard from './pages/RestaurantDashboard';
import DeliveryLoginPage from './pages/DeliveryLoginPage';
import DeliveryDashboardPage from './pages/DeliveryDashboardPage';

function App() {
  const [user, setUser] = useState(null);
  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedCart = localStorage.getItem('cartItems');

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    if (storedCart) {
      setCartItems(JSON.parse(storedCart));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
  }, [cartItems]);

  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const handleAuthSuccess = (authData) => {
    const userData = {
      _id: authData._id,
      name: authData.name,
      email: authData.email,
      role: authData.role
    };

    localStorage.setItem('token', authData.token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const addToCart = (foodItem) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.foodItem === foodItem._id);

      if (existing) {
        return prev.map((item) =>
          item.foodItem === foodItem._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [
        ...prev,
        {
          foodItem: foodItem._id,
          name: foodItem.name,
          price: foodItem.price,
          quantity: 1
        }
      ];
    });
  };

  const updateCartQuantity = (foodItemId, quantity) => {
    if (quantity <= 0) {
      setCartItems((prev) => prev.filter((item) => item.foodItem !== foodItemId));
      return;
    }

    setCartItems((prev) =>
      prev.map((item) => (item.foodItem === foodItemId ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getDefaultRouteByRole = (role) => {
    if (role === 'restaurant') return '/restaurant/dashboard';
    if (role === 'delivery') return '/delivery/dashboard';
    if (role === 'admin') return '/admin';
    return '/';
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} cartCount={cartCount} onLogout={handleLogout} />

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Routes>
          <Route
            path="/"
            element={
              user?.role && user.role !== 'customer' ? (
                <Navigate to={getDefaultRouteByRole(user.role)} replace />
              ) : (
                <HomePage />
              )
            }
          />
          <Route
            path="/restaurants/:id"
            element={
              user?.role && user.role !== 'customer' ? (
                <Navigate to={getDefaultRouteByRole(user.role)} replace />
              ) : (
                <RestaurantMenuPage addToCart={addToCart} cartCount={cartCount} />
              )
            }
          />
          <Route
            path="/login"
            element={
              user ? (
                <Navigate to={getDefaultRouteByRole(user.role)} replace />
              ) : (
                <LoginPage onAuthSuccess={handleAuthSuccess} />
              )
            }
          />
          <Route
            path="/restaurant/login"
            element={
              user ? <Navigate to={getDefaultRouteByRole(user.role)} replace /> : (
                <RestaurantLoginPage onAuthSuccess={handleAuthSuccess} />
              )
            }
          />
          <Route
            path="/delivery/login"
            element={
              user ? <Navigate to={getDefaultRouteByRole(user.role)} replace /> : (
                <DeliveryLoginPage onAuthSuccess={handleAuthSuccess} />
              )
            }
          />
          <Route
            path="/register"
            element={
              user ? (
                <Navigate to={getDefaultRouteByRole(user.role)} replace />
              ) : (
                <RegisterPage onAuthSuccess={handleAuthSuccess} />
              )
            }
          />
          <Route
            path="/forgot-password"
            element={user ? <Navigate to={getDefaultRouteByRole(user.role)} replace /> : <ForgotPasswordPage />}
          />
          <Route
            path="/delivery/dashboard"
            element={
              <ProtectedRoute user={user} allowedRoles={['delivery']}>
                <DeliveryDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cart"
            element={
              user?.role && user.role !== 'customer' ? (
                <Navigate to={getDefaultRouteByRole(user.role)} replace />
              ) : (
                <CartPage
                  user={user}
                  cartItems={cartItems}
                  updateCartQuantity={updateCartQuantity}
                  clearCart={clearCart}
                />
              )
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute user={user} allowedRoles={['customer']}>
                <OrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute user={user} allowedRoles={['admin']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/dashboard"
            element={
              <ProtectedRoute user={user} allowedRoles={['restaurant']}>
                <RestaurantDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
