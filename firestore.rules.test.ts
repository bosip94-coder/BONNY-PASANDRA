/**
 * Firestore Security Rules Test Specification (Dirty Dozen Verification)
 * Verifies that all 12 adversarial payloads in security_spec.md return PERMISSION_DENIED.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; email: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Unauthenticated Write to Workspace',
    operation: 'create',
    path: '/workspaces/rglf-main',
    auth: null,
    payload: { workspaceId: 'rglf-main' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified Email Spoof on Workspace',
    operation: 'create',
    path: '/workspaces/rglf-main',
    auth: { uid: 'u1', email: 'bosip94@gmail.com', email_verified: false },
    payload: { workspaceId: 'rglf-main' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Shadow Field Injection on Workspace',
    operation: 'create',
    path: '/workspaces/rglf-main',
    auth: { uid: 'u1', email: 'bosip94@gmail.com', email_verified: true },
    payload: {
      workspaceId: 'rglf-main',
      visibility: 'firm_internal',
      isSuperAdmin: true,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Identity Spoofing on DisposisiItem Create',
    operation: 'create',
    path: '/workspaces/rglf-main/disposisi/item-1',
    auth: { uid: 'u1', email: 'user1@rglf.id', email_verified: true },
    payload: { authorUid: 'u2', workspaceId: 'rglf-main' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Orphaned Subcollection Write without Parent Workspace',
    operation: 'create',
    path: '/workspaces/missing-ws/disposisi/item-1',
    auth: { uid: 'u1', email: 'user1@rglf.id', email_verified: true },
    payload: { authorUid: 'u1', workspaceId: 'missing-ws' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Immutable createdAt Tampering on Update',
    operation: 'update',
    path: '/workspaces/rglf-main/disposisi/item-1',
    auth: { uid: 'u1', email: 'user1@rglf.id', email_verified: true },
    payload: { createdAt: '2020-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Forged Client Timestamp on Advokat Create',
    operation: 'create',
    path: '/workspaces/rglf-main/advokat/adv-1',
    auth: { uid: 'u1', email: 'user1@rglf.id', email_verified: true },
    payload: { createdAt: '1999-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'ID Poisoning with Special Characters',
    operation: 'create',
    path: '/workspaces/rglf-main/disposisi/bad$id!@#',
    auth: { uid: 'u1', email: 'user1@rglf.id', email_verified: true },
    payload: { id: 'bad$id!@#' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Oversized String Value Poisoning on perkara',
    operation: 'update',
    path: '/workspaces/rglf-main/disposisi/item-1',
    auth: { uid: 'u1', email: 'user1@rglf.id', email_verified: true },
    payload: { perkara: 'X'.repeat(2000) },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Non-String Element in advokatPendampingIds Array',
    operation: 'create',
    path: '/workspaces/rglf-main/disposisi/item-1',
    auth: { uid: 'u1', email: 'user1@rglf.id', email_verified: true },
    payload: { advokatPendampingIds: [99999] },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Cross-Workspace Mismatch in Payload vs Path',
    operation: 'create',
    path: '/workspaces/rglf-main/advokat/adv-1',
    auth: { uid: 'u1', email: 'user1@rglf.id', email_verified: true },
    payload: { id: 'adv-1', workspaceId: 'different-ws' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unscoped List Query on Root Workspaces Collection',
    operation: 'list',
    path: '/workspaces',
    auth: { uid: 'u1', email: 'user1@rglf.id', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
];
