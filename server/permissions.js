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
  // 1. Trader / Applicant permissions
  CREATE_INSTRUMENT: [ROLES.TRADER],
  VIEW_OWN_INSTRUMENTS: [ROLES.TRADER],
  SUBMIT_APPLICATION: [ROLES.TRADER],
  VIEW_OWN_APPLICATIONS: [ROLES.TRADER],
  RECORD_PAYMENT: [ROLES.TRADER],
  RESUBMIT_APPLICATION: [ROLES.TRADER],

  // 2. Authority Officer statutory permissions
  REVIEW_APPLICATION: [ROLES.AUTHORITY],
  RETURN_APPLICATION: [ROLES.AUTHORITY],
  REJECT_APPLICATION: [ROLES.AUTHORITY],
  ASSIGN_VERIFIER: [ROLES.AUTHORITY],
  APPROVE_APPLICATION: [ROLES.AUTHORITY],
  GENERATE_CERTIFICATE: [ROLES.AUTHORITY],
  VIEW_OPERATIONS_QUEUE: [ROLES.AUTHORITY],

  // 3. Field Verifier permissions
  VIEW_FIELD_CASES: [ROLES.VERIFIER],
  RECORD_FIELD_VERIFICATION: [ROLES.VERIFIER],

  // 4. GATC Lab permissions
  VIEW_GATC_CASES: [ROLES.GATC],
  RECORD_GATC_TESTING: [ROLES.GATC],

  // Shared inspection workspace permissions
  VIEW_ASSIGNED_CASES: [ROLES.VERIFIER, ROLES.GATC],
  OPEN_VERIFICATION_WORKSPACE: [ROLES.VERIFIER, ROLES.GATC],
  RECORD_VERIFICATION: [ROLES.VERIFIER, ROLES.GATC],

  // 5. Portal Admin permissions (System Administration only — NO legal approval/verification)
  MANAGE_USERS: [ROLES.PLATFORM_ADMIN],
  MANAGE_ROLES: [ROLES.PLATFORM_ADMIN],
  MANAGE_OFFICES_LABS: [ROLES.PLATFORM_ADMIN],
  MANAGE_MASTER_DATA: [ROLES.PLATFORM_ADMIN],
  VIEW_SYSTEM_HEALTH: [ROLES.PLATFORM_ADMIN],

  // Common / Shared read permissions
  VIEW_ALL_INSTRUMENTS: [ROLES.AUTHORITY, ROLES.PLATFORM_ADMIN, ROLES.VERIFIER, ROLES.GATC],
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
    const userRole = req.actor?.role || req.headers['x-user-role'] || req.body?.actor_role || req.query?.user_role;
    if (!userRole) {
      return res.status(401).json({ error: 'Authentication/Role required' });
    }

    if (!hasPermission(userRole, permissionKey)) {
      return res.status(403).json({
        error: `Forbidden: Role '${userRole}' does not have permission '${permissionKey}'. Action restricted.`
      });
    }

    next();
  };
}
