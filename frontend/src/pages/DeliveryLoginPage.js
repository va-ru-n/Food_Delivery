import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import ErrorMessage from '../components/ErrorMessage';

function DeliveryLoginPage({ onAuthSuccess }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      setError('Please fill all fields');
      return;
    }

    try {
      setLoading(true);
      const { data } = await authAPI.login(formData);

      if (data.role !== 'delivery') {
        setError('This account is not a delivery partner account');
        return;
      }

      onAuthSuccess(data);
      navigate('/delivery/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Delivery partner login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-md rounded-xl border border-orange-100 bg-white p-6 shadow-sm">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Delivery Partner Login</h1>
      <p className="mb-4 text-sm text-gray-600">Use your delivery account to manage assigned deliveries.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorMessage message={error} />

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
            placeholder="delivery@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-brand-600 px-3 py-2 font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? 'Logging in...' : 'Login as Delivery Partner'}
        </button>
      </form>

      <p className="mt-4 text-sm text-gray-600">
        Customer login?{' '}
        <Link to="/login" className="font-medium text-brand-700 hover:underline">
          Go here
        </Link>
      </p>
    </section>
  );
}

export default DeliveryLoginPage;
