import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import api from '../../services/api.js';

const TEAM_ROLES = ['admin', 'finance', 'volunteer', 'staff', 'coordinator', 'viewer'];

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

// ── Create Team Modal ─────────────────────────────────────────────────────────

const CreateTeamModal = ({ onClose, onCreated }) => {
  const [form,   setForm]   = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Team name is required'); return; }
    setSaving(true); setError('');
    try {
      const { data } = await api.post('/teams', form);
      onCreated(data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to create team');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">New Team</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div>
            <label className={labelCls}>Team Name *</label>
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. RaceTiming"
            />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea
              className={inputCls}
              rows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Optional description"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary text-sm disabled:opacity-50">
              {saving ? 'Creating…' : 'Create Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Edit Team Modal ───────────────────────────────────────────────────────────

const EditTeamModal = ({ team, onClose, onUpdated }) => {
  const [form,   setForm]   = useState({ name: team.name || '', description: team.description || '', isActive: team.isActive ?? true });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Team name is required'); return; }
    setSaving(true); setError('');
    try {
      const { data } = await api.patch(`/teams/${team._id}`, form);
      onUpdated(data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to update team');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">Edit Team</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div>
            <label className={labelCls}>Team Name *</label>
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea
              className={inputCls}
              rows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => set('isActive', e.target.checked)}
              className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary text-sm disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Add Member Modal ──────────────────────────────────────────────────────────

const AddMemberModal = ({ teamId, allUsers, existingMemberIds, onClose, onAdded }) => {
  const [userId, setUserId] = useState('');
  const [role,   setRole]   = useState('staff');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const available = allUsers.filter((u) => !existingMemberIds.includes(u._id));

  const submit = async (e) => {
    e.preventDefault();
    if (!userId) { setError('Please select a user'); return; }
    setSaving(true); setError('');
    try {
      const { data } = await api.post(`/teams/${teamId}/members`, { userId, role });
      onAdded(data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to add member');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">Add Member</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div>
            <label className={labelCls}>User *</label>
            <select className={inputCls} value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">Select a user…</option>
              {available.map((u) => (
                <option key={u._id} value={u._id}>{u.name} — {u.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Team Role *</label>
            <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}>
              {TEAM_ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary text-sm disabled:opacity-50">
              {saving ? 'Adding…' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Role Badge ────────────────────────────────────────────────────────────────

const ROLE_BADGE = {
  admin:       'bg-brand-50 text-brand-700',
  coordinator: 'bg-blue-50 text-blue-700',
  finance:     'bg-green-50 text-green-700',
  staff:       'bg-gray-100 text-gray-600',
  volunteer:   'bg-purple-50 text-purple-700',
  viewer:      'bg-gray-50 text-gray-500',
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const TeamsPage = () => {
  const [teams,        setTeams]        = useState([]);
  const [allUsers,     setAllUsers]     = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [members,      setMembers]      = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showCreate,   setShowCreate]   = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);
  const [showAddMember, setShowAddMember] = useState(false);

  // Load all teams and all users once
  useEffect(() => {
    Promise.all([
      api.get('/teams').then((r) => r.data.data ?? []),
      api.get('/users/all').then((r) => r.data.data ?? []),
    ])
      .then(([t, u]) => {
        setTeams(t);
        setAllUsers(u);
        if (t.length > 0) setSelectedTeam(t[0]);
      })
      .catch(() => {})
      .finally(() => setLoadingTeams(false));
  }, []);

  // Load members whenever selected team changes
  useEffect(() => {
    if (!selectedTeam) return;
    setLoadingMembers(true);
    api.get(`/teams/${selectedTeam._id}/members`)
      .then((r) => setMembers(r.data.data ?? []))
      .catch(() => setMembers([]))
      .finally(() => setLoadingMembers(false));
  }, [selectedTeam]);

  const handleTeamCreated = (team) => {
    setTeams((prev) => [team, ...prev]);
    setSelectedTeam(team);
  };

  const handleTeamUpdated = (updated) => {
    setTeams((prev) => prev.map((t) => t._id === updated._id ? updated : t));
    if (selectedTeam?._id === updated._id) setSelectedTeam(updated);
  };

  const handleDeleteTeam = async (teamId) => {
    if (!window.confirm('Delete this team? This cannot be undone.')) return;
    try {
      await api.delete(`/teams/${teamId}`);
      const next = teams.filter((t) => t._id !== teamId);
      setTeams(next);
      if (selectedTeam?._id === teamId) {
        setSelectedTeam(next[0] || null);
        setMembers([]);
      }
    } catch (err) {
      alert(err.response?.data?.message ?? 'Failed to delete team');
    }
  };

  const handleMemberAdded = (membership) => {
    setMembers((prev) => [...prev, membership]);
  };

  const handleRoleChange = async (userId, newRole) => {
    if (!selectedTeam) return;
    try {
      await api.patch(`/teams/${selectedTeam._id}/members/${userId}`, { role: newRole });
      setMembers((prev) => prev.map((m) => m.user?._id === userId ? { ...m, role: newRole } : m));
    } catch (err) {
      alert(err.response?.data?.message ?? 'Failed to update role');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!selectedTeam) return;
    if (!window.confirm('Remove this member from the team?')) return;
    try {
      await api.delete(`/teams/${selectedTeam._id}/members/${userId}`);
      setMembers((prev) => prev.filter((m) => m.user?._id !== userId));
    } catch (err) {
      alert(err.response?.data?.message ?? 'Failed to remove member');
    }
  };

  const existingMemberIds = members.map((m) => m.user?._id).filter(Boolean);

  return (
    <DashboardLayout title="Team Management">
      <div className="flex flex-col lg:flex-row gap-6 lg:h-full">
        {/* Left panel — teams list */}
        <div className="w-full lg:w-72 lg:flex-shrink-0 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Teams</h2>
            <button onClick={() => setShowCreate(true)} className="btn-primary text-xs px-3 py-1.5">
              + New Team
            </button>
          </div>

          <div className="card p-0 overflow-hidden flex-1">
            {loadingTeams ? (
              <p className="text-sm text-gray-400 px-4 py-6">Loading…</p>
            ) : teams.length === 0 ? (
              <p className="text-sm text-gray-400 italic px-4 py-6">No teams yet.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {teams.map((team) => (
                  <div
                    key={team._id}
                    onClick={() => setSelectedTeam(team)}
                    className={`px-4 py-3 cursor-pointer transition-colors ${
                      selectedTeam?._id === team._id
                        ? 'bg-brand-50 border-l-2 border-brand-500'
                        : 'hover:bg-gray-50 border-l-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">{team.name}</p>
                        {team.description && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{team.description}</p>
                        )}
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${team.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {team.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setEditTarget(team)}
                        className="text-xs text-brand-600 hover:underline"
                      >
                        Edit
                      </button>
                      <span className="text-gray-300">·</span>
                      <button
                        onClick={() => handleDeleteTeam(team._id)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right panel — members */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {selectedTeam ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    {selectedTeam.name} — Members
                  </h2>
                  {selectedTeam.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{selectedTeam.description}</p>
                  )}
                </div>
                <button
                  onClick={() => setShowAddMember(true)}
                  className="btn-primary text-xs px-3 py-1.5"
                >
                  + Add Member
                </button>
              </div>

              <div className="card p-0 overflow-hidden">
                {loadingMembers ? (
                  <p className="text-sm text-gray-400 px-4 py-6">Loading…</p>
                ) : members.length === 0 ? (
                  <p className="text-sm text-gray-400 italic px-4 py-6">No members yet. Add someone to get started.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
                          <th className="text-left px-4 py-3">Member</th>
                          <th className="text-left px-4 py-3">Email</th>
                          <th className="text-left px-4 py-3">Job Title</th>
                          <th className="text-left px-4 py-3">Team Role</th>
                          <th className="text-left px-4 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.map((m) => (
                          <tr key={m._id ?? m.user?._id} className="border-b border-gray-50 last:border-0">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                                  {(m.user?.name || '?')[0].toUpperCase()}
                                </div>
                                <span className="font-medium text-gray-800">{m.user?.name ?? '—'}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-500">{m.user?.email ?? '—'}</td>
                            <td className="px-4 py-3 text-gray-600 capitalize">{m.user?.role ?? '—'}</td>
                            <td className="px-4 py-3">
                              <select
                                value={m.role}
                                onChange={(e) => handleRoleChange(m.user?._id, e.target.value)}
                                className={`text-xs px-2 py-0.5 rounded-full font-medium border-0 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer ${ROLE_BADGE[m.role] ?? 'bg-gray-100 text-gray-600'}`}
                              >
                                {TEAM_ROLES.map((r) => (
                                  <option key={r} value={r}>{r}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => handleRemoveMember(m.user?._id)}
                                className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="card flex items-center justify-center h-48">
              <p className="text-sm text-gray-400 italic">Select a team to manage its members.</p>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateTeamModal
          onClose={() => setShowCreate(false)}
          onCreated={handleTeamCreated}
        />
      )}

      {editTarget && (
        <EditTeamModal
          team={editTarget}
          onClose={() => setEditTarget(null)}
          onUpdated={handleTeamUpdated}
        />
      )}

      {showAddMember && selectedTeam && (
        <AddMemberModal
          teamId={selectedTeam._id}
          allUsers={allUsers}
          existingMemberIds={existingMemberIds}
          onClose={() => setShowAddMember(false)}
          onAdded={handleMemberAdded}
        />
      )}
    </DashboardLayout>
  );
};

export default TeamsPage;
