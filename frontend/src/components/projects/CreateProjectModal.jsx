import { useEffect, useState } from 'react';
import api from '../../services/api.js';
import BSDatePicker from '../ui/BSDatePicker.jsx';

const INITIAL = { name: '', description: '', startDate: '', endDate: '', status: 'Planning', members: [] };

const CreateProjectModal = ({ onClose, onCreated }) => {
  const [form,    setForm]    = useState(INITIAL);
  const [users,   setUsers]   = useState([]);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    api.get('/users').then(({ data }) => {
      const all = data.data ?? [];
      setUsers(all);
      // Auto-include managers
      const managerIds = all.filter((u) => u.permissionLevel === 'manager').map((u) => u._id);
      setForm((p) => ({ ...p, members: [...new Set([...p.members, ...managerIds])] }));
    }).catch(() => {});
  }, []);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const toggleMember = (id) =>
    setForm((p) => ({
      ...p,
      members: p.members.includes(id)
        ? p.members.filter((m) => m !== id)
        : [...p.members, id],
    }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Project name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post('/projects', form);
      onCreated(data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">New Project</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Body */}
        <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className={labelCls}>Name *</label>
            <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Project name" />
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <textarea className={inputCls} rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="What is this project about?" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Start Date</label>
              <BSDatePicker value={form.startDate} onChange={(iso) => set('startDate', iso)} placeholder="Start date" />
            </div>
            <div>
              <label className={labelCls}>End Date</label>
              <BSDatePicker value={form.endDate} onChange={(iso) => set('endDate', iso)} placeholder="End date" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Status</label>
            <select className={inputCls} value={form.status} onChange={(e) => set('status', e.target.value)}>
              {['Planning', 'Active', 'Completed'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          {/* Members */}
          <div>
            <label className={labelCls}>Members</label>
            <div className="border border-gray-200 rounded-lg max-h-36 overflow-y-auto divide-y divide-gray-50">
              {users.map((u) => {
                const isManager = u.permissionLevel === 'manager';
                return (
                  <label key={u._id} className={`flex items-center gap-3 px-3 py-2 hover:bg-gray-50 ${isManager ? 'cursor-default' : 'cursor-pointer'}`}>
                    <input type="checkbox" checked={form.members.includes(u._id)} onChange={() => !isManager && toggleMember(u._id)} disabled={isManager} className="accent-brand-600" />
                    <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {u.name[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-700 truncate">{u.name}</p>
                      <p className="text-xs text-gray-400 capitalize">{u.role}</p>
                    </div>
                    {isManager && <span className="text-xs text-brand-600 font-medium">Manager</span>}
                  </label>
                );
              })}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="text-sm px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={submit} disabled={saving} className="btn-primary text-sm disabled:opacity-50">
            {saving ? 'Creating…' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateProjectModal;
