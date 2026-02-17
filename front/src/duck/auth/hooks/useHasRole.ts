import { useSelector } from 'react-redux';
import { getAuthorizedUser } from '../auth.selector';

const ROLE_HIERARCHY: Record<string, string[]> = {
  ROLE_ADMIN:   ['ROLE_MANAGER', 'ROLE_VENDEUR'],
  ROLE_MANAGER: ['ROLE_VENDEUR'],
  ROLE_VENDEUR: [],
};

function hasRoleWithHierarchy(userRoles: string[], requiredRole: string): boolean {
  for (const role of userRoles) {
    if (role === requiredRole) return true;
    const inherited = ROLE_HIERARCHY[role] ?? [];
    if (inherited.includes(requiredRole)) return true;
  }
  return false;
}

export function useHasRole(requiredRole: string): boolean {
  const user = useSelector(getAuthorizedUser);
  if (!user) return false;
  return hasRoleWithHierarchy(user.roles, requiredRole);
}
