import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';

import Login from '../pages/auth/Login.jsx';

const AttendancePage      = lazy(() => import('../pages/attendance/AttendancePage.jsx'));
const MyPayrollPage       = lazy(() => import('../pages/payroll/MyPayrollPage.jsx'));
const PayrollPage         = lazy(() => import('../pages/finance/PayrollPage.jsx'));
const AccountingPage      = lazy(() => import('../pages/finance/AccountingPage.jsx'));
const UsersPage           = lazy(() => import('../pages/admin/UsersPage.jsx'));
const ProjectsPage        = lazy(() => import('../pages/projects/ProjectsPage.jsx'));
const KanbanPage          = lazy(() => import('../pages/projects/KanbanPage.jsx'));
const MyTasksPage         = lazy(() => import('../pages/projects/MyTasksPage.jsx'));
const LeavePage           = lazy(() => import('../pages/leave/LeavePage.jsx'));
const LeaveManagementPage = lazy(() => import('../pages/leave/LeaveManagementPage.jsx'));
const CalendarPage        = lazy(() => import('../pages/calendar/CalendarPage.jsx'));
const AdminDashboard      = lazy(() => import('../pages/dashboards/AdminDashboard.jsx'));
const ManagerDashboard    = lazy(() => import('../pages/dashboards/ManagerDashboard.jsx'));
const TeamPage            = lazy(() => import('../pages/manager/TeamPage.jsx'));
const FinanceDashboard    = lazy(() => import('../pages/dashboards/FinanceDashboard.jsx'));
const StaffDashboard      = lazy(() => import('../pages/dashboards/StaffDashboard.jsx'));

const PERMISSION_DEFAULT_ROUTES = {
  admin:   '/admin/dashboard',
  manager: '/manager/dashboard',
  finance: '/finance/dashboard',
  staff:   '/staff/dashboard',
};

const RoleRedirect = () => {
  const { user } = useAuth();
  const target = PERMISSION_DEFAULT_ROUTES[user?.permissionLevel] || '/login';
  return <Navigate to={target} replace />;
};

const AppRouter = () => (
  <BrowserRouter>
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-gray-400">Loading…</div>}>
    <Routes>
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
      </Route>

      {/* Leave management — manager and admin */}
      <Route element={<ProtectedRoute allowedRoles={['manager', 'admin']} />}>
        <Route path="/leave/manage" element={<LeaveManagementPage />} />
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

      {/* Manager */}
      <Route element={<ProtectedRoute allowedRoles={['manager', 'admin']} />}>
        <Route path="/manager/team" element={<TeamPage />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={['manager']} />}>
        <Route path="/manager/dashboard" element={<ManagerDashboard />} />
      </Route>

      {/* Finance */}
      <Route element={<ProtectedRoute allowedRoles={['finance']} />}>
        <Route path="/finance/dashboard" element={<FinanceDashboard />} />
      </Route>

      {/* Staff */}
      <Route element={<ProtectedRoute allowedRoles={['staff']} />}>
        <Route path="/staff/dashboard" element={<StaffDashboard />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  </BrowserRouter>
);

export default AppRouter;
