import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { useAuth } from '../../store/AuthContext.jsx';
import api from '../../services/api.js';

const PRIORITY_COLOR = { High: 'text-red-500', Medium: 'text-amber-500', Low: 'text-gray-400' };
const STATUS_COLOR   = { Done: 'text-gray-400 line-through', 'In Progress': 'text-brand-600', Todo: 'text-gray-700' };

const StaffDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks,   setTasks]   = useState([]);
  const [leaves,  setLeaves]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get('/tasks/my-tasks'),
      api.get('/leaves/my'),
    ]).then(([tasksRes, leavesRes]) => {
      setTasks(tasksRes.status  === 'fulfilled' ? (tasksRes.value.data.data  ?? []) : []);
      setLeaves(leavesRes.status === 'fulfilled' ? (leavesRes.value.data.leaves ?? []) : []);
    }).finally(() => setLoading(false));
  }, []);

  const open    = tasks.filter((t) => t.status !== 'Done').length;
  const done    = tasks.filter((t) => t.status === 'Done').length;
  const overdue = tasks.filter((t) => t.status !== 'Done' && t.dueDate && new Date(t.dueDate) < new Date()).length;

  const pendingLeave  = leaves.filter((l) => l.status === 'Pending').length;
  const approvedLeave = leaves.filter((l) => l.status === 'Approved').length;

  return (
    <DashboardLayout title="My Dashboard" hideSalaryWidget={false}>
      <div className="space-y-6">

        {/* Task stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="stat-card border-l-4 border-brand-400">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Open Tasks</p>
            <p className="text-3xl font-bold text-gray-900">{loading ? '…' : open}</p>
          </div>
          <div className="stat-card border-l-4 border-green-400">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Completed</p>
            <p className="text-3xl font-bold text-green-600">{loading ? '…' : done}</p>
          </div>
          <div className="stat-card border-l-4 border-red-400">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Overdue</p>
            <p className="text-3xl font-bold text-red-500">{loading ? '…' : overdue}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* My tasks */}
          <div className="lg:col-span-2 card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">My Tasks</h3>
              <button onClick={() => navigate('/tasks/me')} className="text-xs text-brand-600 hover:text-brand-800 font-medium">
                View all →
              </button>
            </div>
            {loading ? (
              <p className="text-sm text-gray-400 px-4 py-6">Loading…</p>
            ) : tasks.length === 0 ? (
              <p className="text-sm text-gray-400 italic px-4 py-6">No tasks assigned yet.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {tasks.slice(0, 8).map((t) => {
                  const isOverdue = t.status !== 'Done' && t.dueDate && new Date(t.dueDate) < new Date();
                  return (
                    <div
                      key={t._id}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/projects/${t.project?._id}`)}
                    >
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${STATUS_COLOR[t.status] ?? 'text-gray-800'}`}>
                          {t.title}
                        </p>
                        <p className="text-xs text-gray-400">{t.project?.name ?? 'Project'}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {t.priority && (
                          <span className={`text-xs font-medium ${PRIORITY_COLOR[t.priority] ?? ''}`}>{t.priority}</span>
                        )}
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

          {/* Leave summary + quick links */}
          <div className="space-y-4">
            {/* Leave status */}
            <div className="card p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">My Leave</h3>
                <button onClick={() => navigate('/leave')} className="text-xs text-brand-600 hover:text-brand-800 font-medium">
                  View all →
                </button>
              </div>
              <div className="divide-y divide-gray-50">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-600">Pending</span>
                  <span className={`text-sm font-semibold ${pendingLeave > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                    {loading ? '…' : pendingLeave}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-600">Approved</span>
                  <span className={`text-sm font-semibold ${approvedLeave > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                    {loading ? '…' : approvedLeave}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick links */}
            <button
              onClick={() => navigate('/leave')}
              className="w-full card text-left hover:border-brand-300 border border-gray-100 transition-all cursor-pointer"
            >
              <p className="text-sm font-semibold text-gray-800">Request Leave</p>
              <p className="text-xs text-gray-400 mt-1">Submit a new leave request</p>
            </button>
            <button
              onClick={() => navigate('/payroll/me')}
              className="w-full card text-left hover:border-brand-300 border border-gray-100 transition-all cursor-pointer"
            >
              <p className="text-sm font-semibold text-gray-800">My Payroll</p>
              <p className="text-xs text-gray-400 mt-1">View salary slips and SSF details</p>
            </button>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default StaffDashboard;
