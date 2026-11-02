export const ROLE_SUPER_ADMIN = 'super_admin';
export const ROLE_ADMIN = 'admin';
export const ROLE_EMPLOYEE = 'employee';
export const ROLE_GUEST = 'guest';

/**
 * Normalize role value from session object.
 * session?.user?.image === 2 -> super_admin
 * session?.user?.image === 1 -> admin
 * session?.user?.image === null -> employee
 * session is undefined -> guest
 */
export function getRole(session) {
  if (!session) return ROLE_GUEST;
  const val = session?.user?.image;
  if (val === 2) return ROLE_SUPER_ADMIN;
  if (val === 1) return ROLE_ADMIN;
  if (val === null) return ROLE_EMPLOYEE;
  // Fallback: treat other values as employee for safety
  return ROLE_EMPLOYEE;
}

export function isSuperAdmin(session) {
  return getRole(session) === ROLE_SUPER_ADMIN;
}

export function isAdmin(session) {
  return getRole(session) === ROLE_ADMIN;
}

export function isEmployee(session) {
  return getRole(session) === ROLE_EMPLOYEE;
}

export function isGuest(session) {
  return getRole(session) === ROLE_GUEST;
}

export default {
  ROLE_SUPER_ADMIN,
  ROLE_ADMIN,
  ROLE_EMPLOYEE,
  ROLE_GUEST,
  getRole,
  isSuperAdmin,
  isAdmin,
  isEmployee,
  isGuest,
};
