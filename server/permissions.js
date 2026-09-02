/**
 * Centralized Role-Based Access Control (RBAC) definitions and permission checks.
 * Roles: TRADER, AUTHORITY, VERIFIER, GATC, PLATFORM_ADMIN
 */

export const ROLES = {
  TRADER: 'TRADER',
  AUTHORITY: 'AUTHORITY',
  VERIFIER: 'VERIFIER',
  GATC: 'GATC',
  PLATFORM_ADMIN: 'PLATFORM_ADMIN'
};

export const PERMISSIONS = {
  // Instrument permissions
  CREATE_INSTRUMENT: [ROLES.TRADER, ROLES.PLATFORM_ADMIN],
  VIEW_OWN_INSTRUMENTS: [ROLES.TRADER],
  VIEW_ALL_INSTRUMENTS: [ROLES.AUTHORITY, ROLES.PLATFORM_ADMIN, ROLES.VERIFIER, ROLES.GATC],

  // Application permissions
  SUBMIT_APPLICATION: [ROLES.TRADER],
  VIEW_OWN_APPLICATIONS: [ROLES.TRADER],
  REVIEW_APPLICATION: [ROLES.AUTHORITY, ROLES.PLATFORM_ADMIN],
  ASSIGN_VERIFIER: [ROLES.AUTHORITY, ROLES.PLATFORM_ADMIN],

  // Verifier workspace permissions
  VIEW_ASSIGNED_CASES: [ROLES.VERIFIER, ROLES.GATC],
  OPEN_VERIFICATION_WORKSPACE: [ROLES.VERIFIER, ROLES.GATC],
  RECORD_VERIFICATION: [ROLES.VERIFIER, ROLES.GATC],

  // Governance permissions
  VIEW_AUDIT_LOGS: [ROLES.AUTHORITY, ROLES.PLATFORM_ADMIN]
};

export function hasPermission(role, permissionKey) {
  const allowedRoles = PERMISSIONS[permissionKey];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role);
}

// Server Middleware to enforce permissions
export function requirePermission(permissionKey) {
  return (req, res, next) => {
    const userRole = req.headers['x-user-role'] || req.body?.actor_role || req.query?.user_role;
    if (!userRole) {
      return res.status(401).json({ error: 'Authentication/Role header required (x-user-role)' });
    }

    if (!hasPermission(userRole, permissionKey)) {
      return res.status(403).json({
        error: `Forbidden: Role '${userRole}' does not have permission '${permissionKey}'`
      });
    }

    next();
  };
}
