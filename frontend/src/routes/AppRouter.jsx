import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';

import Login from '../pages/auth/Login.jsx';
import AttendancePage  from '../pages/attendance/AttendancePage.jsx';
import MyPayrollPage   from '../pages/payroll/MyPayrollPage.jsx';
import PayrollPage     from '../pages/finance/PayrollPage.jsx';
import AccountingPage  from '../pages/finance/AccountingPage.jsx';
import UsersPage       from '../pages/admin/UsersPage.jsx';
import ProjectsPage    from '../pages/projects/ProjectsPage.jsx';
import KanbanPage      from '../pages/projects/KanbanPage.jsx';
import MyTasksPage     from '../pages/projects/MyTasksPage.jsx';
import CeoDashboard from '../pages/dashboards/CeoDashboard.jsx';
import ManagerDashboard from '../pages/dashboards/ManagerDashboard.jsx';
import ITDashboard from '../pages/dashboards/ITDashboard.jsx';
import FinanceDashboard from '../pages/dashboards/FinanceDashboard.jsx';
import VideographerDashboard from '../pages/dashboards/VideographerDashboard.jsx';
import PhotographerDashboard from '../pages/dashboards/PhotographerDashboard.jsx';

const ROLE_DEFAULT_ROUTES = {
  ceo: '/ceo/dashboard',
  manager: '/manager/dashboard',
  it: '/it/dashboard',
  finance: '/finance/dashboard',
  videographer: '/videographer/dashboard',
  photographer: '/photographer/dashboard',
};

const RoleRedirect = () => {
  const { user } = useAuth();
  const target = ROLE_DEFAULT_ROUTES[user?.role] || '/login';
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
        {/* Shared — every authenticated role */}
        <Route path="/attendance"      element={<AttendancePage />} />
        <Route path="/payroll/me"      element={<MyPayrollPage />} />
        <Route path="/projects"        element={<ProjectsPage />} />
        <Route path="/projects/:id"    element={<KanbanPage />} />
        <Route path="/tasks/me"        element={<MyTasksPage />} />
      </Route>

      {/* Finance & CEO — payroll + accounting */}
      <Route element={<ProtectedRoute allowedRoles={['finance', 'ceo']} />}>
        <Route path="/finance/payroll"     element={<PayrollPage />} />
        <Route path="/finance/accounting"  element={<AccountingPage />} />
      </Route>

      {/* CEO */}
      <Route element={<ProtectedRoute allowedRoles={['ceo']} />}>
        <Route path="/ceo/dashboard" element={<CeoDashboard />} />
        <Route path="/admin/users"   element={<UsersPage />} />
      </Route>

      {/* Manager */}
      <Route element={<ProtectedRoute allowedRoles={['manager']} />}>
        <Route path="/manager/dashboard" element={<ManagerDashboard />} />
      </Route>

      {/* IT */}
      <Route element={<ProtectedRoute allowedRoles={['it']} />}>
        <Route path="/it/dashboard" element={<ITDashboard />} />
      </Route>

      {/* Finance */}
      <Route element={<ProtectedRoute allowedRoles={['finance']} />}>
        <Route path="/finance/dashboard" element={<FinanceDashboard />} />
      </Route>

      {/* Videographer */}
      <Route element={<ProtectedRoute allowedRoles={['videographer']} />}>
        <Route path="/videographer/dashboard" element={<VideographerDashboard />} />
      </Route>

      {/* Photographer */}
      <Route element={<ProtectedRoute allowedRoles={['photographer']} />}>
        <Route path="/photographer/dashboard" element={<PhotographerDashboard />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);

export default AppRouter;
