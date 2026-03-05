import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import { fmtBSShort, todayBSFull } from '../../utils/nepaliDate.js';

const DOT_COLOR = {
  task_assigned:  'bg-brand-500',
  leave_approved: 'bg-green-500',
  leave_rejected: 'bg-red-500',
  overdue_task:   'bg-amber-400',
  pending_leave:  'bg-blue-400',
  overdue_bill:   'bg-red-500',
};

const DATE_LABEL = {
  task_assigned:  'Assigned',
  leave_approved: 'Approved',
  leave_rejected: 'Rejected',
  overdue_task:   'Due',
  pending_leave:  'Starts',
  overdue_bill:   'Due',
};

const Header = ({ title }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [open,          setOpen]          = useState(false);
  const ref = useRef(null);

  const today = todayBSFull();

  const fetchNotifications = useCallback(() => {
    api.get('/notifications')
      .then(({ data }) => setNotifications(data.data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    if (!open) {
      // Mark all stored notifications as read when opening
      const hasUnread = notifications.some((n) => n.stored);
      if (hasUnread) {
        api.patch('/notifications/read-all').then(fetchNotifications).catch(() => {});
      }
    }
    setOpen((o) => !o);
  };

  const handleNotifClick = (link) => {
    setOpen(false);
    navigate(link);
  };

  // Unread count: only stored (unread) + computed alerts
  const unreadCount = notifications.filter((n) => n.stored).length
    + notifications.filter((n) => !n.stored).length;

  return (
    <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
      <h2 className="text-xl font-semibold text-gray-800">{title}</h2>

      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-400">{today}</span>

        {/* Notification bell */}
        <div className="relative" ref={ref}>
          <button
            onClick={handleOpen}
            className="relative p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {open && (
            <div className="absolute right-0 mt-2 w-84 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden" style={{ width: 340 }}>
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">
                    {unreadCount} alert{unreadCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400">
                  No alerts — all clear!
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
                  {notifications.map((n, i) => (
                    <button
                      key={n._id ?? `${n.type}-${i}`}
                      onClick={() => n.link && handleNotifClick(n.link)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${n.stored ? 'bg-blue-50/30' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${DOT_COLOR[n.type] ?? 'bg-gray-400'}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                              {n.title}
                            </p>
                            {n.stored && (
                              <span className="text-[10px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded font-medium flex-shrink-0">New</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 mt-0.5 leading-snug">{n.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {DATE_LABEL[n.type] ?? ''} {fmtBSShort(n.date)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
