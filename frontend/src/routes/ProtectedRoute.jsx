import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../store/AuthContext.jsx';

const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, user, isSuperAdmin, activeTeamRole } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles) {
    // Super admin bypasses all role checks
    if (isSuperAdmin) return <Outlet />;
    // Check against active team role first, then fallback to permissionLevel
    const effectiveRole = activeTeamRole || user?.permissionLevel;
    if (!allowedRoles.includes(effectiveRole)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
