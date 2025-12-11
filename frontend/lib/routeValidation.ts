/**
 * List of valid routes in the application
 * Used to validate redirect targets to prevent 404 errors
 */
const VALID_ROUTES = [
  '/',
  '/home',
  '/login',
  '/register',
  '/forget-pass',
  '/verify-email',
  '/dashboard',
  '/transfers',
  '/transfers-history',
  '/personal-info',
  '/settings',
  '/help',
  '/terms-and-conditions',
  '/referral',
  '/kyc-callback',
  '/oauth-callback',
  // General routes
  '/general/help',
  '/general/terms-and-conditions',
  // Reset password routes (dynamic)
  '/reset-password',
];

/**
 * Check if a given path is a valid route in the application
 * @param path - The path to validate (e.g., "/transfers", "/transfers-history")
 * @returns true if the route exists, false otherwise
 */
export function isValidRoute(path: string): boolean {
  if (!path || typeof path !== 'string') return false;
  
  // Remove query params and hash
  const cleanPath = path.split('?')[0].split('#')[0];
  
  // Check exact matches
  if (VALID_ROUTES.includes(cleanPath)) return true;
  
  // Check dynamic routes
  // /reset-password/[token]
  if (cleanPath.startsWith('/reset-password/')) return true;
  
  // /transfers/[id] - if you have dynamic transfer routes
  if (/^\/transfers\/[a-zA-Z0-9_-]+$/.test(cleanPath)) return true;
  
  return false;
}

/**
 * Get a safe redirect target, falling back to /transfers if invalid
 * @param nextParam - The intended redirect path
 * @param fallback - The fallback path (default: /transfers)
 * @returns A valid route path
 */
export function getSafeRedirectPath(
  nextParam: string | string[] | undefined,
  fallback: string = '/transfers'
): string {
  // Handle array (shouldn't happen with Next.js router.query, but just in case)
  const next = Array.isArray(nextParam) ? nextParam[0] : nextParam;
  
  // Must be a string and start with / to prevent open redirect
  if (typeof next !== 'string' || !next.startsWith('/')) {
    return fallback;
  }
  
  // Check if it's a valid route
  if (!isValidRoute(next)) {
    return fallback;
  }
  
  return next;
}
