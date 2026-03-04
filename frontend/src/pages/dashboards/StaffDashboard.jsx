import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { useAuth } from '../../store/AuthContext.jsx';
import api from '../../services/api.js';

const StaffDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/tasks/my-tasks')
      .then(({ data }) => setTasks(data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const open     = tasks.filter((t) => t.status !== 'Done').length;
  const done     = tasks.filter((t) => t.status === 'Done').length;
  const overdue  = tasks.filter((t) => t.status !== 'Done' && t.dueDate && new Date(t.dueDate) < new Date()).length;

  return (
    <DashboardLayout title="My Dashboard">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="stat-card">
            <p className="text-sm text-gray-500">Open Tasks</p>
            <p className="text-2xl font-bold text-gray-900">{loading ? '…' : open}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-gray-500">Completed</p>
            <p className="text-2xl font-bold text-green-600">{loading ? '…' : done}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-gray-500">Overdue</p>
            <p className="text-2xl font-bold text-red-500">{loading ? '…' : overdue}</p>
          </div>
        </div>

        {/* My tasks */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-800">My Tasks</h3>
            <button onClick={() => navigate('/tasks/me')} className="text-sm text-brand-600 hover:underline">
              View all →
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No tasks assigned yet.</p>
          ) : (
            <div className="space-y-2">
              {tasks.slice(0, 8).map((t) => {
                const isOverdue = t.status !== 'Done' && t.dueDate && new Date(t.dueDate) < new Date();
                return (
                  <div
                    key={t._id}
                    className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 rounded px-1"
                    onClick={() => navigate(`/projects/${t.project?._id}`)}
                  >
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${t.status === 'Done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {t.title}
                      </p>
                      <p className="text-xs text-gray-400">{t.project?.name ?? 'Project'}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isOverdue && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">Overdue</span>
                      )}
                      <span className="text-xs text-gray-400">{t.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/attendance')}
            className="card text-left hover:border-brand-300 border border-gray-100 transition-all cursor-pointer"
          >
            <p className="text-sm font-semibold text-gray-800">Attendance</p>
            <p className="text-xs text-gray-400 mt-1">View your attendance history and clock in/out</p>
          </button>
          <button
            onClick={() => navigate('/payroll/me')}
            className="card text-left hover:border-brand-300 border border-gray-100 transition-all cursor-pointer"
          >
            <p className="text-sm font-semibold text-gray-800">My Payroll</p>
            <p className="text-xs text-gray-400 mt-1">View your salary slips and SSF details</p>
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StaffDashboard;
