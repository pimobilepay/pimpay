import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'COMPLIANCE_OFFICER'
  | 'TREASURER'
  | 'OPERATOR'
  | 'AUDITOR'
  | 'VIEWER';

export type Permission =
  | 'VIEW_TRANSACTIONS'
  | 'CREATE_TRANSACTIONS'
  | 'APPROVE_TRANSACTIONS'
  | 'VIEW_ACCOUNTS'
  | 'MANAGE_ACCOUNTS'
  | 'VIEW_COMPLIANCE'
  | 'MANAGE_COMPLIANCE'
  | 'VIEW_TREASURY'
  | 'MANAGE_TREASURY'
  | 'MANAGE_USERS'
  | 'VIEW_AUDIT'
  | 'MANAGE_SETTINGS'
  | 'MANAGE_FX'
  | 'VIEW_REPORTS'
  | 'EXPORT_DATA';

export interface PermissionsContextValue {
  role: Role | null;
  permissions: ReadonlySet<Permission>;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  canApprove: boolean;
  canCreate: boolean;
  isAdmin: boolean;
  setRole: (role: Role | null) => void;
}

export interface PermissionProviderProps {
  children: ReactNode;
  initialRole?: Role | null;
}

export interface PermissionGateProps {
  children: ReactNode;
  /** Render if the user has ALL of the listed permissions */
  require?: Permission | Permission[];
  /** Render if the user has ANY of the listed permissions */
  requireAny?: Permission | Permission[];
  /** Roles that are allowed to see the children */
  roles?: Role | Role[];
  /** Rendered when access is denied. Defaults to null */
  fallback?: ReactNode;
}

// ─── Role → Permission Mapping ───────────────────────────────────────────────

const ALL_PERMISSIONS: Permission[] = [
  'VIEW_TRANSACTIONS',
  'CREATE_TRANSACTIONS',
  'APPROVE_TRANSACTIONS',
  'VIEW_ACCOUNTS',
  'MANAGE_ACCOUNTS',
  'VIEW_COMPLIANCE',
  'MANAGE_COMPLIANCE',
  'VIEW_TREASURY',
  'MANAGE_TREASURY',
  'MANAGE_USERS',
  'VIEW_AUDIT',
  'MANAGE_SETTINGS',
  'MANAGE_FX',
  'VIEW_REPORTS',
  'EXPORT_DATA',
];

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [...ALL_PERMISSIONS],

  ADMIN: ALL_PERMISSIONS.filter(
    (p) => p !== 'MANAGE_USERS' && p !== 'MANAGE_SETTINGS'
  ),

  COMPLIANCE_OFFICER: [
    'VIEW_TRANSACTIONS',
    'VIEW_ACCOUNTS',
    'VIEW_COMPLIANCE',
    'MANAGE_COMPLIANCE',
    'VIEW_REPORTS',
  ],

  TREASURER: [
    'VIEW_TRANSACTIONS',
    'VIEW_ACCOUNTS',
    'VIEW_TREASURY',
    'MANAGE_TREASURY',
    'MANAGE_FX',
    'VIEW_REPORTS',
  ],

  OPERATOR: [
    'VIEW_TRANSACTIONS',
    'CREATE_TRANSACTIONS',
    'VIEW_ACCOUNTS',
  ],

  AUDITOR: [
    'VIEW_TRANSACTIONS',
    'VIEW_ACCOUNTS',
    'VIEW_COMPLIANCE',
    'VIEW_TREASURY',
    'VIEW_AUDIT',
    'VIEW_REPORTS',
    'EXPORT_DATA',
  ],

  VIEWER: [
    'VIEW_TRANSACTIONS',
    'VIEW_ACCOUNTS',
    'VIEW_REPORTS',
  ],
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function buildPermissionSet(role: Role | null): ReadonlySet<Permission> {
  if (!role) return new Set<Permission>();
  return new Set<Permission>(ROLE_PERMISSIONS[role] ?? []);
}

// ─── Context ──────────────────────────────────────────────────────────────────

const PermissionsContext = createContext<PermissionsContextValue | null>(null);
PermissionsContext.displayName = 'PermissionsContext';

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PermissionProvider({
  children,
  initialRole = null,
}: PermissionProviderProps): JSX.Element {
  const [role, setRoleState] = useState<Role | null>(initialRole);

  const setRole = useCallback((newRole: Role | null): void => {
    setRoleState(newRole);
  }, []);

  const permissions = useMemo<ReadonlySet<Permission>>(
    () => buildPermissionSet(role),
    [role]
  );

  const hasPermission = useCallback(
    (permission: Permission): boolean => permissions.has(permission),
    [permissions]
  );

  const hasAnyPermission = useCallback(
    (perms: Permission[]): boolean => {
      if (!perms.length) return false;
      return perms.some((p) => permissions.has(p));
    },
    [permissions]
  );

  const hasAllPermissions = useCallback(
    (perms: Permission[]): boolean => {
      if (!perms.length) return false;
      return perms.every((p) => permissions.has(p));
    },
    [permissions]
  );

  const canApprove = useMemo<boolean>(
    () => permissions.has('APPROVE_TRANSACTIONS'),
    [permissions]
  );

  const canCreate = useMemo<boolean>(
    () => permissions.has('CREATE_TRANSACTIONS'),
    [permissions]
  );

  const isAdmin = useMemo<boolean>(
    () => role === 'SUPER_ADMIN' || role === 'ADMIN',
    [role]
  );

  const value = useMemo<PermissionsContextValue>(
    () => ({
      role,
      permissions,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      canApprove,
      canCreate,
      isAdmin,
      setRole,
    }),
    [
      role,
      permissions,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      canApprove,
      canCreate,
      isAdmin,
      setRole,
    ]
  );

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePermissions(): PermissionsContextValue {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    throw new Error(
      '[PIMPAY] usePermissions must be used within a <PermissionProvider>.'
    );
  }
  return ctx;
}

// ─── Gate Component ───────────────────────────────────────────────────────────

export function PermissionGate({
  children,
  require,
  requireAny,
  roles,
  fallback = null,
}: PermissionGateProps): JSX.Element {
  const { role, hasPermission, hasAnyPermission, hasAllPermissions } =
    usePermissions();

  const allowed = useMemo<boolean>((): boolean => {
    // Role check
    if (roles !== undefined) {
      const roleList = Array.isArray(roles) ? roles : [roles];
      if (!roleList.includes(role as Role)) return false;
    }

    // All-permissions check
    if (require !== undefined) {
      const permList = Array.isArray(require) ? require : [require];
      if (!hasAllPermissions(permList)) return false;
    }

    // Any-permissions check
    if (requireAny !== undefined) {
      const permList = Array.isArray(requireAny) ? requireAny : [requireAny];
      if (!hasAnyPermission(permList)) return false;
    }

    return true;
  }, [role, roles, require, requireAny, hasPermission, hasAnyPermission, hasAllPermissions]);

  return <>{allowed ? children : fallback}</>;
}

// ─── Utility: resolve permissions for a given role (testing / SSR) ────────────

export function getPermissionsForRole(role: Role): ReadonlySet<Permission> {
  return buildPermissionSet(role);
}

export { ROLE_PERMISSIONS, ALL_PERMISSIONS };
