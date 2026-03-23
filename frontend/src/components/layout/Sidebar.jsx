import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext.jsx';
import { ChangePasswordModal } from '../../pages/admin/UsersPage.jsx';
import logo from '../../assets/logo-removebg-preview.png';

// Each role's nav is an array of sections: { heading?: string, items: [{ label, to }] }
const NAV_SECTIONS = {
  admin: [
    {
      items: [{ label: 'Dashboard', to: '/admin/dashboard' }],
    },
    {
      heading: 'Work',
      items: [
        { label: 'Projects',    to: '/projects' },
        { label: 'My Tasks',    to: '/tasks/me' },
        { label: 'Calendar',    to: '/calendar' },
      ],
    },
    {
      heading: 'HR & Team',
      items: [
        { label: 'Attendance',      to: '/attendance' },
        { label: 'Excursions',      to: '/excursions' },
        { label: 'My Leave',        to: '/leave' },
        { label: 'Leave Requests',  to: '/leave/manage' },
        { label: 'Team',            to: '/manager/team' },
        { label: 'Users',           to: '/admin/users' },
      ],
    },
    {
      heading: 'Finance',
      items: [
        { label: 'My Payroll',    to: '/payroll/me' },
        { label: 'Payroll Mgmt',  to: '/finance/payroll' },
        { label: 'Accounting',    to: '/finance/accounting' },
      ],
    },
  ],

  manager: [
    {
      items: [{ label: 'Dashboard', to: '/manager/dashboard' }],
    },
    {
      heading: 'Work',
      items: [
        { label: 'Projects',   to: '/projects' },
        { label: 'My Tasks',   to: '/tasks/me' },
        { label: 'Calendar',   to: '/calendar' },
      ],
    },
    {
      heading: 'Team',
      items: [
        { label: 'Team',           to: '/manager/team' },
        { label: 'Leave Requests', to: '/leave/manage' },
        { label: 'Attendance',     to: '/attendance' },
        { label: 'Excursions',     to: '/excursions' },
      ],
    },
    {
      heading: 'Personal',
      items: [
        { label: 'My Payroll', to: '/payroll/me' },
        { label: 'My Leave',   to: '/leave' },
      ],
    },
  ],

  finance: [
    {
      items: [{ label: 'Dashboard', to: '/finance/dashboard' }],
    },
    {
      heading: 'Finance',
      items: [
        { label: 'Accounting',   to: '/finance/accounting' },
        { label: 'Payroll Mgmt', to: '/finance/payroll' },
      ],
    },
    {
      heading: 'Work',
      items: [
        { label: 'Projects',   to: '/projects' },
        { label: 'My Tasks',   to: '/tasks/me' },
        { label: 'Calendar',   to: '/calendar' },
      ],
    },
    {
      heading: 'Personal',
      items: [
        { label: 'Attendance', to: '/attendance' },
        { label: 'My Payroll', to: '/payroll/me' },
        { label: 'My Leave',   to: '/leave' },
      ],
    },
  ],

  staff: [
    {
      items: [{ label: 'Dashboard', to: '/staff/dashboard' }],
    },
    {
      heading: 'Work',
      items: [
        { label: 'Projects',   to: '/projects' },
        { label: 'My Tasks',   to: '/tasks/me' },
        { label: 'Calendar',   to: '/calendar' },
      ],
    },
    {
      heading: 'Personal',
      items: [
        { label: 'Attendance', to: '/attendance' },
        { label: 'My Payroll', to: '/payroll/me' },
        { label: 'My Leave',   to: '/leave' },
      ],
    },
  ],
};

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const sections = NAV_SECTIONS[user?.permissionLevel] || [];
  const [showChangePw, setShowChangePw] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:z-auto lg:flex-shrink-0
      `}>
        {/* Brand */}
        <div className="px-4 py-4 border-b border-gray-700 flex items-center justify-between gap-2">
          <img src={logo} alt="Nepal Marathon" className="h-12 w-auto object-contain" />
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
        <div className="px-5 py-4 border-b border-gray-700">
          <p className="text-sm font-semibold truncate">{user?.name || 'User'}</p>
          <p className="text-xs text-gray-400 truncate mt-0.5">{user?.role}</p>
          <span className="text-xs bg-brand-700 text-brand-100 px-2 py-0.5 rounded-full mt-1.5 inline-block capitalize">
            {user?.permissionLevel}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
          {sections.map((section, si) => (
            <div key={si}>
              {section.heading && (
                <p className="px-3 mb-1 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                  {section.heading}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-brand-600 text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-gray-700 space-y-0.5">
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
