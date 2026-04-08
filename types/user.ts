// src/types/user.ts
// PIMPAY Banking Portal - User Types & Interfaces

export enum BankPortalRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  COMPLIANCE_OFFICER = 'COMPLIANCE_OFFICER',
  TREASURER = 'TREASURER',
  OPERATOR = 'OPERATOR',
  AUDITOR = 'AUDITOR',
  VIEWER = 'VIEWER',
}

export enum Permission {
  VIEW_TRANSACTIONS = 'VIEW_TRANSACTIONS',
  CREATE_TRANSACTIONS = 'CREATE_TRANSACTIONS',
  APPROVE_TRANSACTIONS = 'APPROVE_TRANSACTIONS',
  VIEW_ACCOUNTS = 'VIEW_ACCOUNTS',
  MANAGE_ACCOUNTS = 'MANAGE_ACCOUNTS',
  VIEW_COMPLIANCE = 'VIEW_COMPLIANCE',
  MANAGE_COMPLIANCE = 'MANAGE_COMPLIANCE',
  VIEW_TREASURY = 'VIEW_TREASURY',
  MANAGE_TREASURY = 'MANAGE_TREASURY',
  MANAGE_USERS = 'MANAGE_USERS',
  VIEW_AUDIT = 'VIEW_AUDIT',
  MANAGE_SETTINGS = 'MANAGE_SETTINGS',
  MANAGE_FX = 'MANAGE_FX',
  VIEW_REPORTS = 'VIEW_REPORTS',
  EXPORT_DATA = 'EXPORT_DATA',
}

export const RolePermissions: Record<BankPortalRole, Permission[]> = {
  [BankPortalRole.SUPER_ADMIN]: [
    Permission.VIEW_TRANSACTIONS,
    Permission.CREATE_TRANSACTIONS,
    Permission.APPROVE_TRANSACTIONS,
    Permission.VIEW_ACCOUNTS,
    Permission.MANAGE_ACCOUNTS,
    Permission.VIEW_COMPLIANCE,
    Permission.MANAGE_COMPLIANCE,
    Permission.VIEW_TREASURY,
    Permission.MANAGE_TREASURY,
    Permission.MANAGE_USERS,
    Permission.VIEW_AUDIT,
    Permission.MANAGE_SETTINGS,
    Permission.MANAGE_FX,
    Permission.VIEW_REPORTS,
    Permission.EXPORT_DATA,
  ],
  [BankPortalRole.ADMIN]: [
    Permission.VIEW_TRANSACTIONS,
    Permission.CREATE_TRANSACTIONS,
    Permission.APPROVE_TRANSACTIONS,
    Permission.VIEW_ACCOUNTS,
    Permission.MANAGE_ACCOUNTS,
    Permission.VIEW_COMPLIANCE,
    Permission.MANAGE_COMPLIANCE,
    Permission.VIEW_TREASURY,
    Permission.MANAGE_TREASURY,
    Permission.MANAGE_USERS,
    Permission.VIEW_AUDIT,
    Permission.VIEW_REPORTS,
    Permission.EXPORT_DATA,
  ],
  [BankPortalRole.COMPLIANCE_OFFICER]: [
    Permission.VIEW_TRANSACTIONS,
    Permission.VIEW_ACCOUNTS,
    Permission.VIEW_COMPLIANCE,
    Permission.MANAGE_COMPLIANCE,
    Permission.VIEW_AUDIT,
    Permission.VIEW_REPORTS,
    Permission.EXPORT_DATA,
  ],
  [BankPortalRole.TREASURER]: [
    Permission.VIEW_TRANSACTIONS,
    Permission.CREATE_TRANSACTIONS,
    Permission.APPROVE_TRANSACTIONS,
    Permission.VIEW_ACCOUNTS,
    Permission.VIEW_TREASURY,
    Permission.MANAGE_TREASURY,
    Permission.MANAGE_FX,
    Permission.VIEW_REPORTS,
    Permission.EXPORT_DATA,
  ],
  [BankPortalRole.OPERATOR]: [
    Permission.VIEW_TRANSACTIONS,
    Permission.CREATE_TRANSACTIONS,
    Permission.VIEW_ACCOUNTS,
    Permission.MANAGE_ACCOUNTS,
    Permission.VIEW_REPORTS,
  ],
  [BankPortalRole.AUDITOR]: [
    Permission.VIEW_TRANSACTIONS,
    Permission.VIEW_ACCOUNTS,
    Permission.VIEW_COMPLIANCE,
    Permission.VIEW_TREASURY,
    Permission.VIEW_AUDIT,
    Permission.VIEW_REPORTS,
    Permission.EXPORT_DATA,
  ],
  [BankPortalRole.VIEWER]: [
    Permission.VIEW_TRANSACTIONS,
    Permission.VIEW_ACCOUNTS,
    Permission.VIEW_COMPLIANCE,
    Permission.VIEW_TREASURY,
    Permission.VIEW_AUDIT,
    Permission.VIEW_REPORTS,
  ],
};

export type Department =
  | 'OPERATIONS'
  | 'COMPLIANCE'
  | 'TREASURY'
  | 'TECHNOLOGY'
  | 'RISK_MANAGEMENT'
  | 'AUDIT'
  | 'EXECUTIVE'
  | 'CUSTOMER_SERVICE'
  | 'FINANCE'
  | 'LEGAL';

export interface BankPortalUser {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string | null;
  role: BankPortalRole;
  department: Department;
  permissions: Permission[];
  lastActive: Date | string | null;
  twoFactorRequired: boolean;
  twoFactorEnabled: boolean;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt?: Date | string;
  phoneNumber?: string | null;
  employeeId?: string | null;
  managerId?: string | null;
}

export interface UserSession {
  user: BankPortalUser;
  token: string;
  expiresAt: Date | string;
  refreshToken: string;
  issuedAt?: Date | string;
  sessionId?: string;
  deviceInfo?: SessionDeviceInfo;
}

export interface SessionDeviceInfo {
  userAgent: string;
  ipAddress: string;
  deviceType?: 'DESKTOP' | 'MOBILE' | 'TABLET' | 'UNKNOWN';
  browser?: string;
  os?: string;
  location?: string;
}

export type AuditEventType =
  | 'AUTH'
  | 'TRANSACTION'
  | 'ACCOUNT'
  | 'USER'
  | 'COMPLIANCE'
  | 'TREASURY'
  | 'SETTINGS'
  | 'REPORT'
  | 'KYC'
  | 'SYSTEM';

export type AuditEntityType =
  | 'USER'
  | 'ACCOUNT'
  | 'TRANSACTION'
  | 'COMPLIANCE_RECORD'
  | 'KYC_PROFILE'
  | 'TREASURY_ACCOUNT'
  | 'FX_RATE'
  | 'SYSTEM_CONFIG'
  | 'ROLE'
  | 'PERMISSION';

export type AuditActorType = 'USER' | 'SYSTEM' | 'API' | 'SCHEDULER' | 'WEBHOOK';

export interface AuditLogEntry {
  id: string;
  timestamp: Date | string;
  eventType: AuditEventType;
  entityType: AuditEntityType;
  entityId: string;
  action: string;
  actorId: string;
  actorType: AuditActorType;
  ipAddress: string;
  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  hashChain: string;
  metadata?: Record<string, unknown> | null;
  sessionId?: string | null;
  correlationId?: string | null;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description?: string | null;
}

export type KYCTier = 0 | 1 | 2 | 3;

export type KYCDocumentType =
  | 'PASSPORT'
  | 'NATIONAL_ID'
  | 'DRIVERS_LICENSE'
  | 'RESIDENCE_PERMIT'
  | 'UTILITY_BILL'
  | 'BANK_STATEMENT'
  | 'TAX_DOCUMENT'
  | 'INCORPORATION_CERTIFICATE'
  | 'PROOF_OF_ADDRESS'
  | 'SELFIE'
  | 'OTHER';

export type KYCDocumentStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED';

export interface KYCDocument {
  id: string;
  kycProfileId: string;
  documentType: KYCDocumentType;
  documentNumber?: string | null;
  issuingCountry?: string | null;
  issuingAuthority?: string | null;
  issueDate?: Date | string | null;
  expiryDate?: Date | string | null;
  fileUrl: string;
  fileHash?: string | null;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  status: KYCDocumentStatus;
  rejectionReason?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: Date | string | null;
  uploadedAt: Date | string;
  updatedAt?: Date | string;
  metadata?: Record<string, unknown> | null;
}

export type PEPStatus = 'NONE' | 'DIRECT' | 'ASSOCIATE' | 'FAMILY_MEMBER' | 'FORMER';

export type RiskCategory = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

export interface KYCVerificationResult {
  id: string;
  kycProfileId: string;
  verificationProvider: string;
  verificationType:
    | 'IDENTITY'
    | 'ADDRESS'
    | 'AML'
    | 'PEP'
    | 'SANCTIONS'
    | 'CREDIT';
  status: 'PENDING' | 'PASSED' | 'FAILED' | 'MANUAL_REVIEW';
  score?: number | null;
  externalReferenceId?: string | null;
  resultPayload?: Record<string, unknown> | null;
  performedAt: Date | string;
  expiresAt?: Date | string | null;
  performedBy?: string | null;
}

export interface KYCProfile {
  id: string;
  userId: string;
  tier: KYCTier;
  fullName: string;
  dateOfBirth: Date | string;
  nationality: string;
  countryOfResidence?: string | null;
  occupation: string;
  employer?: string | null;
  sourceOfFunds: string;
  annualIncome?: number | null;
  netWorth?: number | null;
  riskScore: number;
  riskCategory?: RiskCategory;
  pepStatus: PEPStatus;
  sanctionsMatch?: boolean;
  adverseMediaMatch?: boolean;
  documents: KYCDocument[];
  verifications: KYCVerificationResult[];
  verifiedAt: Date | string | null;
  verifiedBy?: string | null;
  nextReviewAt?: Date | string | null;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
  isActive: boolean;
  rejectionReason?: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
  twoFactorCode?: string | null;
  rememberDevice?: boolean;
  deviceFingerprint?: string;
  captchaToken?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
  twoFactorCode?: string | null;
  invalidateOtherSessions?: boolean;
}

export type TwoFactorMethod = 'TOTP' | 'SMS' | 'EMAIL' | 'HARDWARE_KEY';

export interface TwoFactorSetup {
  method: TwoFactorMethod;
  secret?: string;
  qrCodeUrl?: string;
  backupCodes?: string[];
  phoneNumber?: string;
  emailAddress?: string;
  verificationCode?: string;
  isVerified?: boolean;
  setupToken?: string;
  expiresAt?: Date | string;
}

export interface TwoFactorVerification {
  userId: string;
  code: string;
  method: TwoFactorMethod;
  sessionToken?: string;
  trustDevice?: boolean;
  deviceFingerprint?: string;
}

export interface PasswordResetRequest {
  email: string;
  captchaToken?: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface UserCreateInput {
  email: string;
  firstName: string;
  lastName: string;
  role: BankPortalRole;
  department: Department;
  phoneNumber?: string;
  employeeId?: string;
  managerId?: string;
  twoFactorRequired?: boolean;
  sendWelcomeEmail?: boolean;
  temporaryPassword?: string;
}

export interface UserUpdateInput {
  firstName?: string;
  lastName?: string;
  avatar?: string | null;
  role?: BankPortalRole;
  department?: Department;
  permissions?: Permission[];
  phoneNumber?: string | null;
  twoFactorRequired?: boolean;
  isActive?: boolean;
  managerId?: string | null;
}

export interface UserFilters {
  role?: BankPortalRole | BankPortalRole[];
  department?: Department | Department[];
  isActive?: boolean;
  twoFactorEnabled?: boolean;
  search?: string;
  createdAfter?: Date | string;
  createdBefore?: Date | string;
  lastActiveAfter?: Date | string;
}

export interface PaginatedUsers {
  data: BankPortalUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export type UserSortField =
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'role'
  | 'department'
  | 'createdAt'
  | 'lastActive';

export type SortDirection = 'asc' | 'desc';

export interface UserQueryParams {
  page?: number;
  pageSize?: number;
  sortBy?: UserSortField;
  sortDirection?: SortDirection;
  filters?: UserFilters;
}

export function hasPermission(
  user: Pick<BankPortalUser, 'permissions'>,
  permission: Permission
): boolean {
  return user.permissions.includes(permission);
}

export function hasAnyPermission(
  user: Pick<BankPortalUser, 'permissions'>,
  permissions: Permission[]
): boolean {
  return permissions.some((p) => user.permissions.includes(p));
}

export function hasAllPermissions(
  user: Pick<BankPortalUser, 'permissions'>,
  permissions: Permission[]
): boolean {
  return permissions.every((p) => user.permissions.includes(p));
}

export function getDefaultPermissionsForRole(role: BankPortalRole): Permission[] {
  return RolePermissions[role] ?? [];
}

export function isSessionExpired(session: UserSession): boolean {
  const expiresAt =
    session.expiresAt instanceof Date
      ? session.expiresAt
      : new Date(session.expiresAt);
  return expiresAt < new Date();
}

export function getUserFullName(
  user: Pick<BankPortalUser, 'firstName' | 'lastName'>
): string {
  return `${user.firstName} ${user.lastName}`.trim();
}

export function isHighPrivilegeRole(role: BankPortalRole): boolean {
  return [
    BankPortalRole.SUPER_ADMIN,
    BankPortalRole.ADMIN,
    BankPortalRole.COMPLIANCE_OFFICER,
    BankPortalRole.TREASURER,
  ].includes(role);
}

export function kycTierLabel(tier: KYCTier): string {
  const labels: Record<KYCTier, string> = {
    0: 'Unverified',
    1: 'Basic Verified',
    2: 'Standard Verified',
    3: 'Enhanced Verified',
  };
  return labels[tier];
}

export type SafeBankPortalUser = Omit<
  BankPortalUser,
  'twoFactorRequired' | 'twoFactorEnabled'
> & {
  twoFactorRequired: boolean;
  twoFactorEnabled: boolean;
};

export type PublicUserProfile = Pick<
  BankPortalUser,
  'id' | 'firstName' | 'lastName' | 'avatar' | 'department' | 'role'
>;

export type UserContextValue = {
  currentUser: BankPortalUser | null;
  session: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  updateProfile: (data: Partial<UserUpdateInput>) => Promise<void>;
};
