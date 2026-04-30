import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import ErrorMessage from '../components/ErrorMessage';

function LoginPage({ onAuthSuccess }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ phoneNumber: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.phoneNumber || !formData.password) {
      setError('Please fill all fields');
      return;
    }

    const trimmedPhoneNumber = formData.phoneNumber.trim();
    if (!/^[0-9+\-\s]{8,15}$/.test(trimmedPhoneNumber)) {
      setError('Enter a valid phone number');
      return;
    }

    const payload = {
      phoneNumber: trimmedPhoneNumber,
      password: formData.password
    };

    try {
      setLoading(true);
      const { data } = await authAPI.login(payload);
      onAuthSuccess(data);
      if (data.role === 'restaurant') {
        navigate('/restaurant/dashboard');
      } else if (data.role === 'delivery') {
        navigate('/delivery/dashboard');
      } else if (data.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-md rounded-xl border border-orange-100 bg-white p-6 shadow-sm">
      <h1 className="mb-4 text-2xl font-bold text-gray-900">Login</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorMessage message={error} />

        <div>
          <label htmlFor="phoneNumber" className="mb-1 block text-sm font-medium text-gray-700">
            Mobile Number
          </label>
          <input
            id="phoneNumber"
            name="phoneNumber"
            type="tel"
            value={formData.phoneNumber}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
            placeholder="Enter mobile number"
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
            placeholder="******"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-brand-600 px-3 py-2 font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <p className="mt-4 text-sm text-gray-600">
        New user?{' '}
        <Link to="/register" className="font-medium text-brand-700 hover:underline">
          Register
        </Link>
      </p>
      <p className="mt-2 text-sm text-gray-600">
        Forgot password?{' '}
        <Link to="/forgot-password" className="font-medium text-brand-700 hover:underline">
          Reset here
        </Link>
      </p>
    </section>
  );
}

export default LoginPage;
