import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import api from '../../services/api.js';

const ROLES = ['ceo', 'manager', 'it', 'finance', 'videographer', 'photographer'];

const ROLE_BADGE = {
  ceo:          'bg-brand-50 text-brand-700',
  manager:      'bg-blue-50 text-blue-700',
  it:           'bg-purple-50 text-purple-700',
  finance:      'bg-green-50 text-green-700',
  videographer: 'bg-amber-50 text-amber-700',
  photographer: 'bg-orange-50 text-orange-700',
};

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

// ── Create User Modal ─────────────────────────────────────────────────────────

const CreateUserModal = ({ onClose, onCreated }) => {
  const [form,   setForm]   = useState({ name: '', email: '', password: '', role: 'it', monthlySalary: '' });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { setError('Name, email, and password are required'); return; }
    setSaving(true); setError('');
    try {
      const payload = { ...form, monthlySalary: Number(form.monthlySalary) || 0 };
      const { data } = await api.post('/users', payload);
      onCreated(data.data); onClose();
    } catch (err) { setError(err.response?.data?.message ?? 'Failed to create user'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">New User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div>
            <label className={labelCls}>Full Name *</label>
            <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Full name" />
          </div>
          <div>
            <label className={labelCls}>Email *</label>
            <input type="email" className={inputCls} value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="email@nepalmarathon.com" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Role *</label>
              <select className={inputCls} value={form.role} onChange={(e) => set('role', e.target.value)}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Monthly Salary (Rs.)</label>
              <input type="number" min="0" className={inputCls} value={form.monthlySalary} onChange={(e) => set('monthlySalary', e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Password * (min 8 chars)</label>
            <input type="password" className={inputCls} value={form.password} onChange={(e) => set('password', e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary text-sm disabled:opacity-50">{saving ? 'Creating…' : 'Create User'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Set Password Modal ────────────────────────────────────────────────────────

const SetPasswordModal = ({ user, onClose }) => {
  const [password, setPassword] = useState('');
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [done,     setDone]     = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setSaving(true); setError('');
    try {
      await api.patch(`/users/${user._id}/set-password`, { newPassword: password });
      setDone(true);
    } catch (err) { setError(err.response?.data?.message ?? 'Failed to set password'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">Reset Password — {user.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <div className="px-6 py-5">
          {done ? (
            <div className="text-center space-y-3">
              <p className="text-green-600 font-medium">Password updated successfully.</p>
              <p className="text-sm text-gray-500">The user's active sessions have been invalidated.</p>
              <button onClick={onClose} className="btn-primary text-sm">Close</button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className={labelCls}>New Password *</label>
                <input type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={onClose} className="text-sm px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary text-sm disabled:opacity-50">{saving ? 'Setting…' : 'Set Password'}</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Change Own Password Modal ─────────────────────────────────────────────────

export const ChangePasswordModal = ({ onClose }) => {
  const [form,   setForm]   = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const [done,   setDone]   = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.newPassword.length < 8) { setError('New password must be at least 8 characters'); return; }
    setSaving(true); setError('');
    try {
      await api.patch('/users/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      setDone(true);
    } catch (err) { setError(err.response?.data?.message ?? 'Failed to change password'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">Change Password</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <div className="px-6 py-5">
          {done ? (
            <div className="text-center space-y-3">
              <p className="text-green-600 font-medium">Password changed successfully.</p>
              <button onClick={onClose} className="btn-primary text-sm">Close</button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className={labelCls}>Current Password</label>
                <input type="password" className={inputCls} value={form.currentPassword} onChange={(e) => set('currentPassword', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>New Password (min 8 chars)</label>
                <input type="password" className={inputCls} value={form.newPassword} onChange={(e) => set('newPassword', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Confirm New Password</label>
                <input type="password" className={inputCls} value={form.confirm} onChange={(e) => set('confirm', e.target.value)} />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={onClose} className="text-sm px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary text-sm disabled:opacity-50">{saving ? 'Saving…' : 'Change Password'}</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const UsersPage = () => {
  const [users,       setUsers]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showCreate,  setShowCreate]  = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [search,      setSearch]      = useState('');

  useEffect(() => {
    api.get('/users/all')
      .then(({ data }) => setUsers(data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCreated  = (user) => setUsers((prev) => [user, ...prev]);

  const handleToggle   = async (id) => {
    try {
      const { data } = await api.patch(`/users/${id}/toggle-active`);
      setUsers((prev) => prev.map((u) => u._id === id ? { ...u, isActive: data.data.isActive } : u));
    } catch { /* ignore */ }
  };

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const active   = users.filter((u) => u.isActive).length;
  const inactive = users.filter((u) => !u.isActive).length;

  return (
    <DashboardLayout title="User Management">
      <div className="space-y-5">
        {/* Stats + actions */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-4">
            <div className="stat-card py-3 px-4">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-xl font-bold text-gray-900">{users.length}</p>
            </div>
            <div className="stat-card py-3 px-4">
              <p className="text-xs text-gray-500">Active</p>
              <p className="text-xl font-bold text-green-600">{active}</p>
            </div>
            <div className="stat-card py-3 px-4">
              <p className="text-xs text-gray-500">Inactive</p>
              <p className="text-xl font-bold text-red-500">{inactive}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              placeholder="Search name / email / role…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">+ New User</button>
          </div>
        </div>

        {/* Table */}
        <div className="card p-0 overflow-hidden">
          {loading ? (
            <p className="text-sm text-gray-400 px-4 py-6">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 italic px-4 py-6">No users found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3">Role</th>
                  <th className="text-right px-4 py-3">Salary</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u._id} className={`border-b border-gray-50 last:border-0 ${!u.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {u.name[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-800">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${ROLE_BADGE[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      Rs. {(u.monthlySalary ?? 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setResetTarget(u)}
                          className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded hover:bg-gray-100 transition-colors"
                        >
                          Reset PW
                        </button>
                        <button
                          onClick={() => handleToggle(u._id)}
                          className={`text-xs px-2 py-1 rounded transition-colors ${
                            u.isActive
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-green-50 text-green-700 hover:bg-green-100'
                          }`}
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showCreate  && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
      {resetTarget && <SetPasswordModal user={resetTarget} onClose={() => setResetTarget(null)} />}
    </DashboardLayout>
  );
};

export default UsersPage;
