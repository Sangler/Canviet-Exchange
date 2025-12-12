export type Role = 'user' | 'admin' | string;

export function hasRequiredRole(userRole: Role | undefined | null, required?: Role | Role[]): boolean {
  if (!required) return true; // no restriction
  const req = Array.isArray(required) ? required : [required];
  if (!userRole) return false;
  return req.includes(userRole);
}
