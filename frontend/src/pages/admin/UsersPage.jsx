import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import api from '../../services/api.js';
import { useAuth } from '../../store/AuthContext.jsx';

const EyeIcon = ({ open }) => open ? (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
) : (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

const PasswordInput = ({ value, onChange, placeholder = 'Min 8 characters', ...props }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        tabIndex={-1}
      >
        <EyeIcon open={show} />
      </button>
    </div>
  );
};

const PERMISSION_LEVELS = ['admin', 'coordinator', 'finance', 'volunteer', 'staff', 'viewer'];

const PERMISSION_BADGE = {
  admin:       'bg-brand-50 text-brand-700',
  coordinator: 'bg-blue-50 text-blue-700',
  finance:     'bg-green-50 text-green-700',
  staff:       'bg-gray-100 text-gray-600',
  volunteer:   'bg-purple-50 text-purple-700',
  viewer:      'bg-gray-50 text-gray-500',
  // legacy
  manager:     'bg-blue-50 text-blue-700',
};


const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

// ── Create User Modal ─────────────────────────────────────────────────────────

const CreateUserModal = ({ onClose, onCreated }) => {
  const [form,   setForm]   = useState({ name: '', email: '', password: '', role: '', permissionLevel: 'staff', monthlySalary: '' });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.role) { setError('Name, email, role (job title), and password are required'); return; }
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
          <div>
            <label className={labelCls}>Job Title * (e.g. Videographer, IT)</label>
            <input className={inputCls} value={form.role} onChange={(e) => set('role', e.target.value)} placeholder="Job title" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Permission Level *</label>
              <select className={inputCls} value={form.permissionLevel} onChange={(e) => set('permissionLevel', e.target.value)}>
                {PERMISSION_LEVELS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Monthly Salary (Rs.)</label>
              <input type="number" min="0" className={inputCls} value={form.monthlySalary} onChange={(e) => set('monthlySalary', e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Password * (min 8 chars)</label>
            <PasswordInput value={form.password} onChange={(e) => set('password', e.target.value)} />
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
                <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} />
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
                <PasswordInput value={form.currentPassword} onChange={(e) => set('currentPassword', e.target.value)} placeholder="Current password" />
              </div>
              <div>
                <label className={labelCls}>New Password (min 8 chars)</label>
                <PasswordInput value={form.newPassword} onChange={(e) => set('newPassword', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Confirm New Password</label>
                <PasswordInput value={form.confirm} onChange={(e) => set('confirm', e.target.value)} placeholder="Confirm new password" />
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

// ── Edit User Modal ───────────────────────────────────────────────────────────

const pad = (n) => String(n).padStart(2, '0');
const toHHMM  = (h, m) => `${pad(h ?? 0)}:${pad(m ?? 0)}`;
const fromHHMM = (s) => {
  const [h, m] = (s || '00:00').split(':').map((n) => parseInt(n, 10) || 0);
  return { h, m };
};

const EditUserModal = ({ user, onClose, onUpdated, isSuperAdmin }) => {
  const [form,   setForm]   = useState({
    name:            user.name,
    email:           user.email,
    role:            user.role,
    permissionLevel: user.permissionLevel,
    monthlySalary:   user.monthlySalary ?? 0,
    rfid_uid:        user.rfid_uid ?? '',
    workStart:       toHHMM(user.workStartHour ?? 12, user.workStartMinute ?? 0),
    workEnd:         toHHMM(user.workEndHour ?? 17, user.workEndMinute ?? 0),
    lateGraceMinutes: user.lateGraceMinutes ?? 15,
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.role) { setError('Name, email, and job title are required'); return; }
    const start = fromHHMM(form.workStart);
    const end   = fromHHMM(form.workEnd);
    if (end.h * 60 + end.m <= start.h * 60 + start.m) {
      setError('Work end time must be after start time'); return;
    }
    setSaving(true); setError('');
    try {
      const { workStart, workEnd, ...rest } = form;
      const payload = {
        ...rest,
        monthlySalary:    Number(form.monthlySalary) || 0,
        workStartHour:    start.h,
        workStartMinute:  start.m,
        workEndHour:      end.h,
        workEndMinute:    end.m,
        lateGraceMinutes: Number(form.lateGraceMinutes) || 0,
      };
      if (!isSuperAdmin) delete payload.rfid_uid;
      const { data } = await api.patch(`/users/${user._id}`, payload);
      onUpdated(data.data); onClose();
    } catch (err) { setError(err.response?.data?.message ?? 'Failed to update user'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">Edit User — {user.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div>
            <label className={labelCls}>Full Name *</label>
            <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Full name" />
          </div>
          <div>
            <label className={labelCls}>Email *</label>
            <input type="email" className={inputCls} value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Job Title *</label>
            <input className={inputCls} value={form.role} onChange={(e) => set('role', e.target.value)} placeholder="e.g. Videographer, IT" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Permission Level</label>
              <select className={inputCls} value={form.permissionLevel} onChange={(e) => set('permissionLevel', e.target.value)}>
                {PERMISSION_LEVELS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Monthly Salary (Rs.)</label>
              <input type="number" min="0" className={inputCls} value={form.monthlySalary} onChange={(e) => set('monthlySalary', e.target.value)} />
            </div>
          </div>
          {isSuperAdmin && (
            <div>
              <label className={labelCls}>RFID UID</label>
              <input
                className={inputCls}
                value={form.rfid_uid}
                onChange={(e) => set('rfid_uid', e.target.value.toUpperCase())}
                placeholder="e.g. A1B2C3D4 (leave blank to clear)"
                style={{ fontFamily: 'monospace' }}
              />
              <p className="text-xs text-gray-400 mt-1">Unique card/tag UID assigned to this user. Super admin only.</p>
            </div>
          )}
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Work Shift</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Start</label>
                <input type="time" className={inputCls} value={form.workStart} onChange={(e) => set('workStart', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>End</label>
                <input type="time" className={inputCls} value={form.workEnd} onChange={(e) => set('workEnd', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Late Grace (min)</label>
                <input type="number" min="0" max="180" className={inputCls}
                  value={form.lateGraceMinutes}
                  onChange={(e) => set('lateGraceMinutes', e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">Late = clock-in after start time + grace.</p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary text-sm disabled:opacity-50">{saving ? 'Saving…' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Salary From Team Modal ────────────────────────────────────────────────────

const SalaryFromTeamModal = ({ user, teams, onClose, onUpdated }) => {
  const [teamId,  setTeamId]  = useState(user.salaryFromTeam?._id || user.salaryFromTeam || '');
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const { data } = await api.patch(`/users/${user._id}/salary-from-team`, { salaryFromTeam: teamId || null });
      onUpdated(data.data); onClose();
    } catch (err) { setError(err.response?.data?.message ?? 'Failed to update'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">Salary From Team — {user.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div>
            <label className={labelCls}>Team that pays this user's salary</label>
            <select className={inputCls} value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              <option value="">— No team (not in payroll) —</option>
              {teams.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary text-sm disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const UsersPage = () => {
  const { isSuperAdmin } = useAuth();
  const [users,            setUsers]            = useState([]);
  const [teams,            setTeams]            = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [showCreate,       setShowCreate]       = useState(false);
  const [editTarget,       setEditTarget]       = useState(null);
  const [resetTarget,      setResetTarget]      = useState(null);
  const [salaryTeamTarget, setSalaryTeamTarget] = useState(null);
  const [search,           setSearch]           = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/users/all').then(r => r.data.data ?? []),
      api.get('/teams').then(r => r.data.data ?? []),
    ])
      .then(([u, t]) => { setUsers(u); setTeams(t); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCreated  = (user) => setUsers((prev) => [user, ...prev]);
  const handleUpdated  = (updated) => setUsers((prev) => prev.map((u) => u._id === updated._id ? { ...u, ...updated } : u));

  const handleToggle   = async (id) => {
    try {
      const { data } = await api.patch(`/users/${id}/toggle-active`);
      setUsers((prev) => prev.map((u) => u._id === id ? { ...u, isActive: data.data.isActive } : u));
    } catch { /* ignore */ }
  };

  const handleSalaryTeamUpdated = (updated) => {
    setUsers((prev) => prev.map((u) => u._id === updated._id ? { ...u, salaryFromTeam: updated.salaryFromTeam } : u));
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-3">
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
          <div className="flex items-center gap-3 flex-wrap">
            <input
              placeholder="Search name / email / role…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full sm:w-56 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button onClick={() => setShowCreate(true)} className="btn-primary text-sm whitespace-nowrap">+ New User</button>
          </div>
        </div>

        {/* Table */}
        <div className="card p-0 overflow-hidden">
          {loading ? (
            <p className="text-sm text-gray-400 px-4 py-6">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 italic px-4 py-6">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3">Job Title</th>
                  <th className="text-left px-4 py-3">Access</th>
                  <th className="text-right px-4 py-3">Salary</th>
                  <th className="text-left px-4 py-3">Salary From</th>
                  {isSuperAdmin && <th className="text-left px-4 py-3">RFID UID</th>}
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
                    <td className="px-4 py-3 text-gray-600 capitalize">{u.role}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {u.isSuperAdmin && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-50 text-yellow-700">
                            Super Admin
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PERMISSION_BADGE[u.permissionLevel] ?? 'bg-gray-100 text-gray-600'}`}>
                          {u.permissionLevel}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      Rs. {(u.monthlySalary ?? 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      {u.salaryFromTeam ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">
                          {u.salaryFromTeam?.name || '—'}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">none</span>
                      )}
                    </td>
                    {isSuperAdmin && (
                      <td className="px-4 py-3">
                        {u.rfid_uid ? (
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-700 tracking-wider">
                            {u.rfid_uid}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300 italic">—</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => setEditTarget(u)}
                          className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setResetTarget(u)}
                          className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded hover:bg-gray-100 transition-colors"
                        >
                          Reset PW
                        </button>
                        <button
                          onClick={() => setSalaryTeamTarget(u)}
                          className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 transition-colors"
                        >
                          Salary Team
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
            </div>
          )}
        </div>
      </div>

      {showCreate       && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
      {editTarget       && <EditUserModal user={editTarget} onClose={() => setEditTarget(null)} onUpdated={handleUpdated} isSuperAdmin={isSuperAdmin} />}
      {resetTarget      && <SetPasswordModal user={resetTarget} onClose={() => setResetTarget(null)} />}
      {salaryTeamTarget && <SalaryFromTeamModal user={salaryTeamTarget} teams={teams} onClose={() => setSalaryTeamTarget(null)} onUpdated={handleSalaryTeamUpdated} />}
    </DashboardLayout>
  );
};

export default UsersPage;
