import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';

import Login from '../pages/auth/Login.jsx';
import AttendancePage       from '../pages/attendance/AttendancePage.jsx';
import MyPayrollPage        from '../pages/payroll/MyPayrollPage.jsx';
import PayrollPage          from '../pages/finance/PayrollPage.jsx';
import AccountingPage       from '../pages/finance/AccountingPage.jsx';
import UsersPage            from '../pages/admin/UsersPage.jsx';
import ProjectsPage         from '../pages/projects/ProjectsPage.jsx';
import KanbanPage           from '../pages/projects/KanbanPage.jsx';
import MyTasksPage          from '../pages/projects/MyTasksPage.jsx';
import LeavePage            from '../pages/leave/LeavePage.jsx';
import LeaveManagementPage  from '../pages/leave/LeaveManagementPage.jsx';
import AdminDashboard       from '../pages/dashboards/AdminDashboard.jsx';
import ManagerDashboard     from '../pages/dashboards/ManagerDashboard.jsx';
import FinanceDashboard     from '../pages/dashboards/FinanceDashboard.jsx';
import StaffDashboard       from '../pages/dashboards/StaffDashboard.jsx';

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
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<div className="flex items-center justify-center min-h-screen text-gray-600 text-lg">403 — Access Denied</div>} />

      {/* Role root redirect */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<RoleRedirect />} />
        {/* Shared — every authenticated user */}
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
  </BrowserRouter>
);

export default AppRouter;
