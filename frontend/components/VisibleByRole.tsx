import React from 'react';
import { Role } from '../lib/roles';
import { useHasRole } from '../hooks/useHasRole';

interface VisibleByRoleProps {
  roles?: Role | Role[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

// Renders children only when the current user has one of the required roles.
// If no roles prop is provided, children are always rendered.
const VisibleByRole: React.FC<VisibleByRoleProps> = ({ roles, fallback = null, children }) => {
  const allowed = useHasRole(roles);
  return <>{allowed ? children : fallback}</>;
};

export default VisibleByRole;
