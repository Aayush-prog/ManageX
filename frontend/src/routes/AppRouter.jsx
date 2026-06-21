import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';

import Login from '../pages/auth/Login.jsx';

const AttendancePage       = lazy(() => import('../pages/attendance/AttendancePage.jsx'));
const TeamAttendancePage   = lazy(() => import('../pages/attendance/TeamAttendancePage.jsx'));
const MyPayrollPage        = lazy(() => import('../pages/payroll/MyPayrollPage.jsx'));
const PayrollPage          = lazy(() => import('../pages/finance/PayrollPage.jsx'));
const AccountingPage       = lazy(() => import('../pages/finance/AccountingPage.jsx'));
const UsersPage            = lazy(() => import('../pages/admin/UsersPage.jsx'));
const ProjectsPage         = lazy(() => import('../pages/projects/ProjectsPage.jsx'));
const KanbanPage           = lazy(() => import('../pages/projects/KanbanPage.jsx'));
const MyTasksPage          = lazy(() => import('../pages/projects/MyTasksPage.jsx'));
const LeavePage            = lazy(() => import('../pages/leave/LeavePage.jsx'));
const LeaveManagementPage  = lazy(() => import('../pages/leave/LeaveManagementPage.jsx'));
const CalendarPage         = lazy(() => import('../pages/calendar/CalendarPage.jsx'));
const NotificationsPage    = lazy(() => import('../pages/notifications/NotificationsPage.jsx'));
const ExcursionPage        = lazy(() => import('../pages/excursion/ExcursionPage.jsx'));
const GpxMapPage           = lazy(() => import('../pages/gpx/GpxMapPage.jsx'));
const AdminDashboard       = lazy(() => import('../pages/dashboards/AdminDashboard.jsx'));
const ManagerDashboard     = lazy(() => import('../pages/dashboards/ManagerDashboard.jsx'));
const TeamPage             = lazy(() => import('../pages/manager/TeamPage.jsx'));
const FinanceDashboard     = lazy(() => import('../pages/dashboards/FinanceDashboard.jsx'));
const StaffDashboard       = lazy(() => import('../pages/dashboards/StaffDashboard.jsx'));
const SuperAdminDashboard  = lazy(() => import('../pages/dashboards/SuperAdminDashboard.jsx'));
const TeamsPage            = lazy(() => import('../pages/superadmin/TeamsPage.jsx'));

const PERMISSION_DEFAULT_ROUTES = {
  admin:       '/admin/dashboard',
  coordinator: '/manager/dashboard',
  manager:     '/manager/dashboard', // legacy fallback
  finance:     '/finance/dashboard',
  staff:       '/staff/dashboard',
  volunteer:   '/staff/dashboard',
  viewer:      '/staff/dashboard',
};

const RoleRedirect = () => {
  const { user, isSuperAdmin } = useAuth();
  if (isSuperAdmin) return <Navigate to="/superadmin/dashboard" replace />;
  const target = PERMISSION_DEFAULT_ROUTES[user?.permissionLevel] || '/login';
  return <Navigate to={target} replace />;
};

// Inner component so it can read activeTeam from context (BrowserRouter must be a parent)
const TeamScopedRoutes = () => {
  const { activeTeam } = useAuth();

  return (
    <Routes key={activeTeam?._id || 'no-team'}>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<div className="flex items-center justify-center min-h-screen text-gray-600 text-lg">403 — Access Denied</div>} />

      {/* Role root redirect */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<RoleRedirect />} />
        {/* Shared — every authenticated user */}
        <Route path="/calendar"        element={<CalendarPage />} />
        <Route path="/attendance"      element={<AttendancePage />} />
        <Route path="/payroll/me"      element={<MyPayrollPage />} />
        <Route path="/projects"        element={<ProjectsPage />} />
        <Route path="/projects/:id"    element={<KanbanPage />} />
        <Route path="/tasks/me"        element={<MyTasksPage />} />
        <Route path="/leave"           element={<LeavePage />} />
        <Route path="/notifications"   element={<NotificationsPage />} />
        <Route path="/gpx"             element={<GpxMapPage />} />
      </Route>

      {/* Super Admin */}
      <Route element={<ProtectedRoute />}>
        <Route path="/superadmin/dashboard" element={<SuperAdminDashboard />} />
        <Route path="/superadmin/teams"     element={<TeamsPage />} />
      </Route>

      {/* Team attendance — coordinator, manager, admin */}
      <Route element={<ProtectedRoute allowedRoles={['coordinator', 'manager', 'admin']} />}>
        <Route path="/attendance/team" element={<TeamAttendancePage />} />
      </Route>

      {/* Leave management — coordinator and admin */}
      <Route element={<ProtectedRoute allowedRoles={['coordinator', 'manager', 'admin']} />}>
        <Route path="/leave/manage"  element={<LeaveManagementPage />} />
        <Route path="/excursions"    element={<ExcursionPage />} />
      </Route>

      {/* Finance & Admin — payroll + accounting */}
      <Route element={<ProtectedRoute allowedRoles={['finance', 'admin']} />}>
        <Route path="/finance/payroll"     element={<PayrollPage />} />
        <Route path="/finance/accounting"  element={<AccountingPage />} />
      </Route>

      {/* Admin */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/users"     element={<UsersPage />} />
      </Route>

      {/* Coordinator / Manager */}
      <Route element={<ProtectedRoute allowedRoles={['coordinator', 'manager', 'admin']} />}>
        <Route path="/manager/team" element={<TeamPage />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={['coordinator', 'manager']} />}>
        <Route path="/manager/dashboard" element={<ManagerDashboard />} />
      </Route>

      {/* Finance */}
      <Route element={<ProtectedRoute allowedRoles={['finance']} />}>
        <Route path="/finance/dashboard" element={<FinanceDashboard />} />
      </Route>

      {/* Staff / volunteer / viewer */}
      <Route element={<ProtectedRoute allowedRoles={['staff', 'volunteer', 'viewer']} />}>
        <Route path="/staff/dashboard" element={<StaffDashboard />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const AppRouter = () => (
  <BrowserRouter>
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-gray-400">Loading…</div>}>
      <TeamScopedRoutes />
    </Suspense>
  </BrowserRouter>
);

export default AppRouter;
