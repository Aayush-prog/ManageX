import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext.jsx';
import { ChangePasswordModal } from '../../pages/admin/UsersPage.jsx';

const SHARED_ITEMS = [
  { label: 'Attendance', to: '/attendance' },
  { label: 'My Payroll', to: '/payroll/me' },
  { label: 'Projects',   to: '/projects' },
  { label: 'My Tasks',   to: '/tasks/me' },
];

const FINANCE_ITEMS = [
  { label: 'Payroll Mgmt', to: '/finance/payroll' },
  { label: 'Accounting',   to: '/finance/accounting' },
];

const NAV_ITEMS = {
  admin:   [{ label: 'Dashboard', to: '/admin/dashboard' },   ...SHARED_ITEMS, ...FINANCE_ITEMS, { label: 'Users', to: '/admin/users' }],
  manager: [{ label: 'Dashboard', to: '/manager/dashboard' }, ...SHARED_ITEMS],
  finance: [{ label: 'Dashboard', to: '/finance/dashboard' }, ...SHARED_ITEMS, ...FINANCE_ITEMS],
  staff:   [{ label: 'Dashboard', to: '/staff/dashboard' },   ...SHARED_ITEMS],
};

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = NAV_ITEMS[user?.permissionLevel] || [];
  const [showChangePw, setShowChangePw] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      <aside className="w-64 min-h-screen bg-gray-900 text-white flex flex-col">
        {/* Brand */}
        <div className="px-6 py-5 border-b border-gray-700">
          <h1 className="text-xl font-bold tracking-tight">ManageX</h1>
          <p className="text-xs text-gray-400 mt-0.5">Nepal Marathon</p>
        </div>

        {/* User badge */}
        <div className="px-6 py-4 border-b border-gray-700">
          <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
          <span className="text-xs bg-brand-700 text-brand-100 px-2 py-0.5 rounded-full mt-1 inline-block capitalize">
            {user?.role || user?.permissionLevel}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer actions */}
        <div className="px-4 py-4 border-t border-gray-700 space-y-1">
          <button
            onClick={() => setShowChangePw(true)}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            Change Password
          </button>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)} />}
    </>
  );
};

export default Sidebar;
