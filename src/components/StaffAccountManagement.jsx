import React, { useEffect, useState } from 'react';
import { UserPlus, Users, Shield, ShieldCheck, UserRound, RefreshCw, Power } from 'lucide-react';
import { createStaffUser, fetchStaffUsers, setStaffUserActive } from '../services/api';

const roleLabels = {
  staff: 'Staff',
  admin: 'Admin',
  super_admin: 'Super Admin'
};

export default function StaffAccountManagement() {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('staff');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      setUsers(await fetchStaffUsers());
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleCreate = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsSaving(true);
    try {
      await createStaffUser({ name, email, password, role });
      setName('');
      setEmail('');
      setPassword('');
      setMessage(`${roleLabels[role]} account created.`);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (user) => {
    setError('');
    setMessage('');
    try {
      const { user: updated } = await setStaffUserActive(user.id, !user.isActive);
      setUsers(current => current.map(item => item.id === updated.id ? updated : item));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-7">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Staff Accounts</h1>
        <p className="mt-1 text-sm text-slate-500">Create staff and admin logins and disable accounts that should no longer have access.</p>
      </div>

      {error && <div role="alert" className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm">{error}</div>}
      {message && <div role="status" className="mb-4 p-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm">{message}</div>}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-6 items-start">
        <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <UserPlus className="w-5 h-5 text-brand-600" />
            <h2 className="font-bold text-slate-900">Create account</h2>
          </div>
          <label className="block text-xs font-semibold text-slate-700 mb-3">
            Full name
            <input required minLength={2} maxLength={80} value={name} onChange={event => setName(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" />
          </label>
          <label className="block text-xs font-semibold text-slate-700 mb-3">
            Email
            <input required type="email" value={email} onChange={event => setEmail(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" />
          </label>
          <label className="block text-xs font-semibold text-slate-700 mb-3">
            Temporary password
            <input required minLength={10} maxLength={128} type="password" value={password} onChange={event => setPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" />
            <span className="font-normal text-slate-500">At least 10 characters; share it with the account holder securely.</span>
          </label>
          <label className="block text-xs font-semibold text-slate-700 mb-5">
            Role
            <select value={role} onChange={event => setRole(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal">
              <option value="staff">Staff — manage order queue and status</option>
              <option value="admin">Admin — manage queue, status, and prices</option>
            </select>
          </label>
          <button disabled={isSaving} className="w-full rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 py-2.5 text-sm font-bold text-white">
            {isSaving ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-600" />
              <h2 className="font-bold text-slate-900">Accounts</h2>
            </div>
            <button type="button" onClick={loadUsers} disabled={isLoading} aria-label="Refresh accounts" className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {isLoading ? <p className="text-sm text-slate-500 py-6 text-center">Loading accounts…</p> : (
            <div className="divide-y divide-slate-100">
              {users.map(user => (
                <div key={user.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {user.role === 'super_admin'
                        ? <ShieldCheck className="w-4 h-4 text-violet-600" />
                        : user.role === 'admin'
                          ? <Shield className="w-4 h-4 text-brand-600" />
                          : <UserRound className="w-4 h-4 text-slate-500" />}
                      <span className="text-sm font-bold text-slate-900 truncate">{user.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${user.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {user.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 ml-6 truncate">{user.email} · {roleLabels[user.role]}</p>
                  </div>
                  {user.role !== 'super_admin' && (
                    <button type="button" onClick={() => handleToggleActive(user)} className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${user.isActive ? 'border-red-200 text-red-700 hover:bg-red-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`}>
                      <Power className="w-3.5 h-3.5" />
                      {user.isActive ? 'Disable' : 'Enable'}
                    </button>
                  )}
                </div>
              ))}
              {users.length === 0 && <p className="text-sm text-slate-500 py-6 text-center">No staff accounts yet.</p>}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
