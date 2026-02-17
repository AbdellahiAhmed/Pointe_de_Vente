import { Navigate, useLocation } from 'react-router-dom';
import { useHasRole } from '../../../duck/auth/hooks/useHasRole';

interface RequireRoleProps {
  role: string;
  children: JSX.Element;
  redirectTo?: string;
}

export const RequireRole = ({ role, children, redirectTo = '/dashboard' }: RequireRoleProps) => {
  const location = useLocation();
  const hasRole = useHasRole(role);

  if (!hasRole) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return children;
};
