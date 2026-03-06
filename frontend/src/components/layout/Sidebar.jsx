import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext.jsx';
import { ChangePasswordModal } from '../../pages/admin/UsersPage.jsx';
import logo from '../../assets/logo-removebg-preview.png';

const SHARED_ITEMS = [
  { label: 'Calendar',   to: '/calendar' },
  { label: 'Attendance', to: '/attendance' },
  { label: 'My Payroll', to: '/payroll/me' },
  { label: 'My Leave',   to: '/leave' },
  { label: 'Projects',   to: '/projects' },
  { label: 'My Tasks',   to: '/tasks/me' },
];

const FINANCE_ITEMS = [
  { label: 'Payroll Mgmt', to: '/finance/payroll' },
  { label: 'Accounting',   to: '/finance/accounting' },
];

const MANAGER_EXTRA = [
  { label: 'Leave Requests', to: '/leave/manage' },
  { label: 'Team',           to: '/manager/team' },
];

const NAV_ITEMS = {
  admin:   [{ label: 'Dashboard', to: '/admin/dashboard' },   ...SHARED_ITEMS, ...FINANCE_ITEMS, ...MANAGER_EXTRA, { label: 'Users', to: '/admin/users' }],
  manager: [{ label: 'Dashboard', to: '/manager/dashboard' }, ...SHARED_ITEMS, ...MANAGER_EXTRA],
  finance: [{ label: 'Dashboard', to: '/finance/dashboard' }, ...SHARED_ITEMS, ...FINANCE_ITEMS],
  staff:   [{ label: 'Dashboard', to: '/staff/dashboard' },   ...SHARED_ITEMS],
};

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = NAV_ITEMS[user?.permissionLevel] || [];
  const [showChangePw, setShowChangePw] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleNavClick = () => {
    onClose?.();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:z-auto lg:flex-shrink-0
      `}>
        {/* Brand */}
        <div className="px-4 py-4 border-b border-gray-700 flex items-center justify-between gap-2">
          <img
            src={logo}
            alt="Nepal Marathon"
            className="h-12 w-auto object-contain"
          />
          <button
            onClick={onClose}
            className="lg:hidden flex-shrink-0 text-gray-400 hover:text-white p-1 rounded"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
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
              onClick={handleNavClick}
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
