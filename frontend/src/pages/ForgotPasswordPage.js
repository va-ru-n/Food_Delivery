import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ErrorMessage from '../components/ErrorMessage';
import { authAPI } from '../services/api';

function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generatedCodeHint, setGeneratedCodeHint] = useState('');

  const handleGenerateCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const input = identifier.trim();
    if (!input) {
      setError('Email or phone number is required');
      return;
    }

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
    const isPhone = /^[0-9+\-\s]{8,15}$/.test(input);

    if (!isEmail && !isPhone) {
      setError('Enter a valid email or phone number');
      return;
    }

    try {
      setLoadingGenerate(true);
      const payload = isEmail ? { email: input } : { phoneNumber: input };
      const { data } = await authAPI.forgotPassword(payload);
      setSuccess(data.message || 'Reset code generated');
      setGeneratedCodeHint(data.resetCode ? `Your reset code: ${data.resetCode}` : '');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate reset code');
      setGeneratedCodeHint('');
    } finally {
      setLoadingGenerate(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const input = identifier.trim();
    if (!input || !code.trim() || !newPassword.trim()) {
      setError('Email/Phone, reset code, and new password are required');
      return;
    }

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
    const isPhone = /^[0-9+\-\s]{8,15}$/.test(input);

    if (!isEmail && !isPhone) {
      setError('Enter a valid email or phone number');
      return;
    }

    try {
      setLoadingReset(true);
      const payload = isEmail ? { email: input } : { phoneNumber: input };
      const { data } = await authAPI.resetPassword({
        ...payload,
        code: code.trim(),
        newPassword: newPassword.trim()
      });
      setSuccess(data.message || 'Password reset successful');
      setGeneratedCodeHint('');
      setCode('');
      setNewPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoadingReset(false);
    }
  };

  return (
    <section className="mx-auto max-w-md rounded-xl border border-orange-100 bg-white p-6 shadow-sm">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Forgot Password</h1>
      <p className="mb-4 text-sm text-gray-600">Generate a reset code and set a new password.</p>

      <ErrorMessage message={error} />
      {success && <p className="mb-3 rounded-md bg-green-100 p-3 text-sm text-green-700">{success}</p>}
      {generatedCodeHint && (
        <p className="mb-3 rounded-md bg-amber-100 p-3 text-sm text-amber-800">{generatedCodeHint}</p>
      )}

      <form onSubmit={handleGenerateCode} className="space-y-3">
        <label htmlFor="identifier" className="block text-sm font-medium text-gray-700">
          Email or Phone Number
        </label>
        <input
          id="identifier"
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="Enter email or phone number"
        />
        <button
          type="submit"
          disabled={loadingGenerate}
          className="w-full rounded-md bg-brand-600 px-3 py-2 font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loadingGenerate ? 'Generating...' : 'Generate Reset Code'}
        </button>
      </form>

      <form onSubmit={handleResetPassword} className="mt-6 space-y-3 border-t border-gray-200 pt-4">
        <label htmlFor="code" className="block text-sm font-medium text-gray-700">
          Reset Code
        </label>
        <input
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="6-digit code"
        />

        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
          New Password
        </label>
        <input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="Minimum 6 characters"
        />

        <button
          type="submit"
          disabled={loadingReset}
          className="w-full rounded-md bg-emerald-600 px-3 py-2 font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loadingReset ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>

      <p className="mt-4 text-sm text-gray-600">
        Back to login?{' '}
        <Link to="/login" className="font-medium text-brand-700 hover:underline">
          Go here
        </Link>
      </p>
    </section>
  );
}

export default ForgotPasswordPage;
