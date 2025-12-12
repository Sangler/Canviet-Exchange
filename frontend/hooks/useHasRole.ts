import { useAuth } from '../context/AuthContext';
import { hasRequiredRole, Role } from '../lib/roles';

export function useHasRole(required?: Role | Role[]) {
  const { user } = useAuth();
  return hasRequiredRole(user?.role, required);
}
