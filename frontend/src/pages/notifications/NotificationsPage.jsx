import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import api from '../../services/api.js';
import { fmtBSDateTime } from '../../utils/nepaliDate.js';

const DOT_COLOR = {
  task_assigned:  'bg-brand-500',
  leave_approved: 'bg-green-500',
  leave_rejected: 'bg-red-500',
  overdue_task:   'bg-amber-400',
  pending_leave:  'bg-blue-400',
  overdue_bill:   'bg-red-500',
  warning:        'bg-orange-400',
  mention:        'bg-purple-400',
};

const TYPE_LABEL = {
  task_assigned:  'Task',
  leave_approved: 'Leave',
  leave_rejected: 'Leave',
  overdue_task:   'Overdue',
  pending_leave:  'Leave Request',
  overdue_bill:   'Bill',
  warning:        'Warning',
  mention:        'Mention',
};

const SECTION_LABEL = {
  stored:   'In-App Notifications',
  computed: 'Live Alerts',
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [clearing,      setClearing]      = useState(false);
  const [dismissing,    setDismissing]    = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/notifications')
      .then(({ data }) => setNotifications(data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    // Mark all as read when page is opened
    api.patch('/notifications/read-all').catch(() => {});
  }, [load]);

  const handleDismiss = async (id) => {
    setDismissing(id);
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n._id?.toString() !== id));
    } catch { /* ignore */ } finally { setDismissing(null); }
  };

  const handleClearAll = async () => {
    if (!confirm('Clear all in-app notifications?')) return;
    setClearing(true);
    try {
      await api.delete('/notifications/clear-all');
      setNotifications((prev) => prev.filter((n) => !n.stored));
    } catch { /* ignore */ } finally { setClearing(false); }
  };

  const stored   = notifications.filter((n) => n.stored);
  const computed = notifications.filter((n) => !n.stored);
  const unread   = notifications.filter((n) => !n.read).length;

  const Section = ({ title, items, showDismiss }) => (
    <div>
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">{title}</h2>
      {items.length === 0 ? (
        <div className="card text-sm text-gray-400 italic py-6 text-center">None</div>
      ) : (
        <div className="card p-0 overflow-hidden divide-y divide-gray-50">
          {items.map((n, i) => (
            <div
              key={n._id ?? `${n.type}-${i}`}
              className={`flex items-start gap-4 px-5 py-4 ${!n.read ? 'bg-blue-50/30' : ''}`}
            >
              <span className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${DOT_COLOR[n.type] ?? 'bg-gray-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {TYPE_LABEL[n.type] ?? n.type}
                  </span>
                  {!n.read && (
                    <span className="text-[10px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded font-medium">New</span>
                  )}
                </div>
                <p className="text-sm text-gray-800 mt-0.5">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">{fmtBSDateTime(n.date)}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {n.link && (
                  <button
                    onClick={() => navigate(n.link)}
                    className="text-xs text-brand-600 hover:text-brand-700"
                  >
                    View →
                  </button>
                )}
                {showDismiss && n.stored && (
                  <button
                    onClick={() => handleDismiss(n._id)}
                    disabled={dismissing === n._id}
                    className="text-xs text-gray-300 hover:text-red-400 transition-colors disabled:opacity-40"
                    title="Dismiss"
                  >
                    {dismissing === n._id ? '…' : '×'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <DashboardLayout title="Notifications">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">All Notifications</h1>
            {unread > 0 && (
              <p className="text-sm text-gray-400 mt-0.5">{unread} unread</p>
            )}
          </div>
          {stored.length > 0 && (
            <button
              onClick={handleClearAll}
              disabled={clearing}
              className="text-sm px-3 py-1.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 disabled:opacity-40 transition-colors"
            >
              {clearing ? 'Clearing…' : 'Clear all'}
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : (
          <>
            <Section title={SECTION_LABEL.stored}   items={stored}   showDismiss={true} />
            <Section title={SECTION_LABEL.computed} items={computed} showDismiss={false} />
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default NotificationsPage;
