import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api.js';

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

const Header = ({ title }) => {
  const navigate   = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [open,          setOpen]          = useState(false);
  const ref = useRef(null);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  useEffect(() => {
    api.get('/notifications')
      .then(({ data }) => setNotifications(data.data ?? []))
      .catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const count = notifications.length;

  const handleNotifClick = (link) => {
    setOpen(false);
    navigate(link);
  };

  return (
    <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
      <h2 className="text-xl font-semibold text-gray-800">{title}</h2>

      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-400">{today}</span>

        {/* Notification bell */}
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((o) => !o)}
            className="relative p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            {/* Bell icon */}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {open && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Notifications</span>
                {count > 0 && (
                  <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">
                    {count} alert{count !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {count === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400">
                  No alerts — all clear!
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                  {notifications.map((n) => (
                    <button
                      key={`${n.type}-${n.id}`}
                      onClick={() => handleNotifClick(n.link)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                          n.type === 'overdue_task' ? 'bg-amber-400' : 'bg-red-500'
                        }`} />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            {n.title}
                          </p>
                          <p className="text-sm text-gray-700 mt-0.5 leading-snug">{n.message}</p>
                          <p className="text-xs text-gray-400 mt-1">Due {fmtDate(n.date)}</p>
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
