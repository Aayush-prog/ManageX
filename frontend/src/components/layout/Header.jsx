import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import { fmtBSShort, todayBSFull } from '../../utils/nepaliDate.js';
import logo from '../../assets/logo-removebg-preview.png';

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

const Header = ({ title, onMenuToggle }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [open,          setOpen]          = useState(false);
  const [clearing,      setClearing]      = useState(false);
  const ref = useRef(null);

  const today = todayBSFull();

  const fetchNotifications = useCallback(() => {
    api.get('/notifications')
      .then(({ data }) => {
        setNotifications(data.data ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      })
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
    if (!open && unreadCount > 0) {
      // Mark all as read (clears badge) but notifications remain visible
      api.patch('/notifications/read-all')
        .then(() => {
          setUnreadCount(0);
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        })
        .catch(() => {});
    }
    setOpen((o) => !o);
  };

  const handleDismiss = async (e, id) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n._id?.toString() !== id));
    } catch { /* ignore */ }
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      await api.delete('/notifications/clear-all');
      // Remove only stored notifications; keep computed alerts
      setNotifications((prev) => prev.filter((n) => !n.stored));
    } catch { /* ignore */ } finally { setClearing(false); }
  };

  const handleNotifClick = (link) => {
    setOpen(false);
    if (link) navigate(link);
  };

  const storedCount = notifications.filter((n) => n.stored).length;

  return (
    <header className="bg-white border-b border-gray-100 px-4 sm:px-8 py-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuToggle}
          className="lg:hidden flex-shrink-0 p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <img src={logo} alt="Nepal Marathon" className="hidden sm:block h-8 w-auto object-contain flex-shrink-0" />
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 truncate">{title}</h2>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
        <span className="hidden sm:block text-sm text-gray-400">{today}</span>

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
            <div className="absolute right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden" style={{ width: 'min(340px, calc(100vw - 2rem))' }}>
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-gray-700">Notifications</span>
                <div className="flex items-center gap-2">
                  {storedCount > 0 && (
                    <button
                      onClick={handleClearAll}
                      disabled={clearing}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                    >
                      {clearing ? '…' : 'Clear all'}
                    </button>
                  )}
                  {unreadCount > 0 && (
                    <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">
                      {unreadCount} new
                    </span>
                  )}
                </div>
              </div>

              {/* List — max 5 in dropdown */}
              {notifications.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400">
                  No notifications
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                  {notifications.slice(0, 5).map((n, i) => (
                    <div
                      key={n._id ?? `${n.type}-${i}`}
                      className={`flex items-start gap-2 px-4 py-3 hover:bg-gray-50 transition-colors ${!n.read ? 'bg-blue-50/40' : ''}`}
                    >
                      <button
                        className="flex items-start gap-3 flex-1 min-w-0 text-left"
                        onClick={() => handleNotifClick(n.link)}
                      >
                        <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${DOT_COLOR[n.type] ?? 'bg-gray-400'}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide truncate">
                              {n.title}
                            </p>
                            {!n.read && (
                              <span className="text-[10px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded font-medium flex-shrink-0">New</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 mt-0.5 leading-snug">{n.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{fmtBSShort(n.date)}</p>
                        </div>
                      </button>
                      {n.stored && (
                        <button
                          onClick={(e) => handleDismiss(e, n._id)}
                          className="flex-shrink-0 text-gray-300 hover:text-gray-500 mt-1 text-base leading-none"
                          title="Dismiss"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div className="border-t border-gray-100 px-4 py-2.5">
                <button
                  onClick={() => { setOpen(false); navigate('/notifications'); }}
                  className="w-full text-center text-xs text-brand-600 hover:text-brand-700 font-medium"
                >
                  View all notifications →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
