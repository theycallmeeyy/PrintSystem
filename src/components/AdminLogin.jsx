import React, { useEffect, useState } from 'react';
import { KeyRound, LoaderCircle, ShieldCheck } from 'lucide-react';
import {
  createInitialSuperAdmin,
  fetchAuthSetup,
  loginStaff
} from '../services/api';

export default function AdminLogin({ onAuthenticated, onBackToOrders }) {
  const [needsSetup, setNeedsSetup] = useState(false);
  const [setupBlocked, setSetupBlocked] = useState(false);
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAuthSetup()
      .then(({ needsSetup: setupRequired, setupBlocked: blocked }) => {
        setNeedsSetup(setupRequired);
        setSetupBlocked(blocked);
      })
      .catch(err => setError(err.message))
      .finally(() => setIsCheckingSetup(false));
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const result = needsSetup
        ? await createInitialSuperAdmin({ name, email, password })
        : await loginStaff({ email, password });
      onAuthenticated(result);
    } catch (err) {
      setError(err.message);
      if (err.message.includes('already been completed')) setNeedsSetup(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-3xl shadow-lg p-7">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mb-5">
          {needsSetup ? <ShieldCheck className="w-6 h-6" /> : <KeyRound className="w-6 h-6" />}
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">
          {isCheckingSetup ? 'Checking staff access…' : setupBlocked ? 'Admin Setup Required' : needsSetup ? 'Set up Super Admin' : 'Staff Sign In'}
        </h1>
        <p className="text-sm text-slate-500 mt-1 mb-6">
          {setupBlocked
            ? 'Account creation is disabled in production until the server owner configures the initial Super Admin credentials.'
            : needsSetup
            ? 'Create the first protected account. After setup, only the super admin can create staff and admin accounts.'
            : 'Sign in to access the private order queue and tools for your role.'}
        </p>

        {setupBlocked && (
          <div role="alert" className="mb-4 p-3 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs">
            Set INITIAL_SUPER_ADMIN_EMAIL and INITIAL_SUPER_ADMIN_PASSWORD in the server environment, then restart the app.
          </div>
        )}

        {!setupBlocked && (
          <>
            {needsSetup && (
              <label className="block text-xs font-semibold text-slate-700 mb-4">
                Full name
                <input
                  required
                  minLength={2}
                  maxLength={80}
                  value={name}
                  onChange={event => setName(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-normal"
                  autoComplete="name"
                />
              </label>
            )}

            <label className="block text-xs font-semibold text-slate-700 mb-4">
              Email
              <input
                required
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-normal"
                autoComplete="username"
              />
            </label>

            <label className="block text-xs font-semibold text-slate-700 mb-5">
              Password
              <input
                required
                minLength={needsSetup ? 10 : undefined}
                value={password}
                onChange={event => setPassword(event.target.value)}
                type="password"
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-normal"
                autoComplete={needsSetup ? 'new-password' : 'current-password'}
              />
              {needsSetup && <span className="text-[11px] text-slate-500 font-normal">Use at least 10 characters.</span>}
            </label>
          </>
        )}

        {error && !setupBlocked && (
          <div role="alert" className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs">
            {error}
          </div>
        )}

        {!setupBlocked && <button
          type="submit"
          disabled={isCheckingSetup || isSubmitting}
          className="w-full rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold py-3 text-sm flex items-center justify-center gap-2"
        >
          {isSubmitting && <LoaderCircle className="w-4 h-4 animate-spin" />}
          {isSubmitting ? 'Please wait…' : needsSetup ? 'Create Super Admin Account' : 'Sign In'}
        </button>}

        <button type="button" onClick={onBackToOrders} className="w-full mt-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800">
          Back to customer orders
        </button>
      </form>
    </div>
  );
}
