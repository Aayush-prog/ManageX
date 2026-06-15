import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import api from '../../services/api.js';
import { fmtBSDate } from '../../utils/nepaliDate.js';

const fmtDate = fmtBSDate;

const StatCard = ({ label, value, sub, accent, onClick }) => (
  <div
    className={`stat-card border-l-4 ${accent} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
    onClick={onClick}
  >
    <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
    <p className="text-3xl font-bold text-gray-900 mt-1">{value ?? '—'}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

const STATUS_BADGE = {
  Planning:  'bg-gray-100 text-gray-600',
  Active:    'bg-green-50 text-green-700',
  Completed: 'bg-blue-50 text-blue-700',
};

const ManagerDashboard = () => {
  const navigate = useNavigate();

  const [stats,      setStats]      = useState(null);
  const [pendLeaves, setPendLeaves] = useState([]);
  const [projects,   setProjects]   = useState([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [usersRes, leavesRes, projRes] = await Promise.allSettled([
          api.get('/users'),
          api.get('/leaves/all', { params: { status: 'Pending' } }),
          api.get('/projects'),
        ]);

        const users    = usersRes.status  === 'fulfilled' ? (usersRes.value.data.data   ?? []) : [];
        const leaves   = leavesRes.status === 'fulfilled' ? (leavesRes.value.data.data  ?? []) : [];
        const projs    = projRes.status   === 'fulfilled' ? (projRes.value.data.data    ?? []) : [];

        const active    = projs.filter((p) => p.status === 'Active').length;
        const completed = projs.filter((p) => p.status === 'Completed').length;

        setStats({ teamCount: users.length, pendingLeaves: leaves.length, activeProjects: active, completedProjects: completed });
        setPendLeaves(leaves.slice(0, 5));
        setProjects(projs.slice(0, 8));
      } catch {
        // keep defaults
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <DashboardLayout title="Manager Dashboard" hideSalaryWidget={false}>
      <div className="space-y-6">

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Team Members"
            value={loading ? '…' : stats?.teamCount}
            accent="border-brand-400"
            onClick={() => navigate('/manager/team')}
          />
          <StatCard
            label="Pending Leaves"
            value={loading ? '…' : stats?.pendingLeaves}
            sub={stats?.pendingLeaves > 0 ? 'Tap to review' : 'None pending'}
            accent={stats?.pendingLeaves > 0 ? 'border-amber-400' : 'border-gray-300'}
            onClick={() => navigate('/leave/manage')}
          />
          <StatCard
            label="Active Projects"
            value={loading ? '…' : stats?.activeProjects}
            accent="border-green-400"
            onClick={() => navigate('/projects')}
          />
          <StatCard
            label="Completed Projects"
            value={loading ? '…' : stats?.completedProjects}
            accent="border-blue-400"
            onClick={() => navigate('/projects')}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Leave Requests */}
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Pending Leave Requests</h3>
              <button
                onClick={() => navigate('/leave/manage')}
                className="text-xs text-brand-600 hover:text-brand-800 font-medium"
              >
                View all →
              </button>
            </div>
            {loading ? (
              <p className="text-sm text-gray-400 px-4 py-6">Loading…</p>
            ) : pendLeaves.length === 0 ? (
              <p className="text-sm text-gray-400 italic px-4 py-6">No pending leave requests.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {pendLeaves.map((l) => (
                  <div key={l._id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{l.user?.name ?? '—'}</p>
                      <p className="text-xs text-gray-400">{fmtDate(l.startDate)} → {fmtDate(l.endDate)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${l.type === 'Sick' ? 'bg-blue-50 text-blue-700' : l.type === 'Annual' ? 'bg-purple-50 text-purple-700' : 'bg-orange-50 text-orange-700'}`}>
                        {l.type}
                      </span>
                      <span className="text-xs text-gray-500">{l.days}d</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Project progress */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">Project Progress</h3>
              <button onClick={() => navigate('/projects')} className="text-xs text-brand-600 hover:text-brand-800 font-medium">
                View all →
              </button>
            </div>
            {loading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : projects.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No projects yet.</p>
            ) : (
              <div className="space-y-3">
                {projects.map((p) => {
                  const pct      = Math.round(p.completionPercentage ?? 0);
                  const barColor = pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-brand-500' : 'bg-amber-400';
                  return (
                    <div key={p._id} className="cursor-pointer hover:bg-gray-50 rounded-lg p-1.5 -mx-1.5 transition-colors"
                      onClick={() => navigate(`/projects/${p._id}`)}>
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <span className="text-sm font-medium text-gray-700 truncate">{p.name}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[p.status] ?? ''}`}>{p.status}</span>
                          <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default ManagerDashboard;
