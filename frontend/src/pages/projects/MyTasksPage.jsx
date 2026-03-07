import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import api from '../../services/api.js';
import { fmtBSDate } from '../../utils/nepaliDate.js';

const PRIORITY_BADGE = {
  Low:      'bg-gray-100 text-gray-600',
  Medium:   'bg-blue-50 text-blue-700',
  High:     'bg-orange-50 text-orange-700',
  Critical: 'bg-red-50 text-red-700',
};

const STATUS_BADGE = {
  Backlog:    'bg-gray-100 text-gray-600',
  Todo:       'bg-blue-50 text-blue-700',
  InProgress: 'bg-amber-50 text-amber-700',
  Review:     'bg-purple-50 text-purple-700',
  Done:       'bg-green-50 text-green-700',
};

const fmtDate = fmtBSDate;

const isOverdue = (iso, status) => iso && status !== 'Done' && new Date(iso) < new Date();

const TaskRow = ({ task, onClick }) => {
  const overdue = isOverdue(task.dueDate, task.status);
  return (
    <div
      onClick={() => onClick(task)}
      className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
        <p className="text-xs text-gray-400 truncate mt-0.5">{task.project?.name ?? '—'}</p>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_BADGE[task.status]}`}>
        {task.status}
      </span>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${PRIORITY_BADGE[task.priority]}`}>
        {task.priority}
      </span>
      <span className={`text-xs flex-shrink-0 ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
        {overdue ? '⚠ ' : ''}{fmtDate(task.dueDate)}
      </span>
    </div>
  );
};

const MyTasksPage = () => {
  const navigate = useNavigate();
  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all'); // all | active | overdue

  useEffect(() => {
    api.get('/tasks/my-tasks')
      .then(({ data }) => setTasks(data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleTaskClick = (task) => {
    if (task.project?._id) {
      navigate(`/projects/${task.project._id}`, { state: { openTaskId: task._id } });
    }
  };

  const filtered = tasks.filter((t) => {
    if (filter === 'active')  return t.status !== 'Done';
    if (filter === 'overdue') return isOverdue(t.dueDate, t.status);
    return true;
  });

  const active  = tasks.filter((t) => t.status !== 'Done').length;
  const overdue = tasks.filter((t) => isOverdue(t.dueDate, t.status)).length;

  return (
    <DashboardLayout title="My Tasks">
      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="stat-card">
            <p className="text-sm text-gray-500">Total Assigned</p>
            <p className="text-3xl font-bold text-gray-900">{tasks.length}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-gray-500">Active</p>
            <p className="text-3xl font-bold text-amber-500">{active}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-gray-500">Overdue</p>
            <p className="text-3xl font-bold text-red-500">{overdue}</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1">
          {[
            { key: 'all',     label: `All (${tasks.length})` },
            { key: 'active',  label: `Active (${active})` },
            { key: 'overdue', label: `Overdue (${overdue})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filter === key
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Task list */}
        <div className="card p-0 overflow-hidden">
          {loading ? (
            <p className="text-sm text-gray-400 px-4 py-6">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 italic px-4 py-6">No tasks found.</p>
          ) : (
            filtered.map((t) => (
              <TaskRow key={t._id} task={t} onClick={handleTaskClick} />
            ))
          )}
        </div>

        {/* Go to Projects */}
        <div className="text-center">
          <button
            onClick={() => navigate('/projects')}
            className="text-sm text-brand-600 hover:underline"
          >
            View all Projects →
          </button>
        </div>
      </div>

    </DashboardLayout>
  );
};

export default MyTasksPage;
