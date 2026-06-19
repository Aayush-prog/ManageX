import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import api from '../../services/api.js';

const SuperAdminDashboard = () => {
  const [teams,   setTeams]   = useState([]);
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/teams').then((r) => r.data.data),
      api.get('/users/all').then((r) => r.data.data),
    ])
      .then(([t, u]) => { setTeams(t ?? []); setUsers(u ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activeUsers = users.filter((u) => u.isActive).length;
  const activeTeams = teams.filter((t) => t.isActive).length;

  return (
    <DashboardLayout title="Super Admin Dashboard">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card py-4 px-5">
            <p className="text-xs text-gray-500">Total Teams</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{loading ? '—' : teams.length}</p>
          </div>
          <div className="card py-4 px-5">
            <p className="text-xs text-gray-500">Active Teams</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{loading ? '—' : activeTeams}</p>
          </div>
          <div className="card py-4 px-5">
            <p className="text-xs text-gray-500">Total Users</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{loading ? '—' : users.length}</p>
          </div>
          <div className="card py-4 px-5">
            <p className="text-xs text-gray-500">Active Users</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{loading ? '—' : activeUsers}</p>
          </div>
        </div>

        {/* Teams list */}
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">All Teams</h3>
          </div>
          {loading ? (
            <p className="text-sm text-gray-400 px-5 py-6">Loading…</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {teams.map((team) => (
                <div key={team._id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">{team.name}</p>
                    {team.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{team.description}</p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${team.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {team.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
              {teams.length === 0 && (
                <p className="text-sm text-gray-400 italic px-5 py-4">No teams yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminDashboard;
