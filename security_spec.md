# Security Specification — Ryan Gumay Law Firm Disposition System

## 1. Data Invariants

1. **Authentication & Email Verification Invariant**: Every read and write operation across `/workspaces/{workspaceId}`, `/workspaces/{workspaceId}/advokat/{advokatId}`, and `/workspaces/{workspaceId}/disposisi/{itemId}` requires an authenticated user (`request.auth != null`) with a verified email (`request.auth.token.email_verified == true`), or the bootstrapped admin (`bosip94@gmail.com` with `email_verified == true`).
2. **Master Gate (Relational Sync) Invariant**: Sub-documents in `/workspaces/{workspaceId}/advokat/{advokatId}` and `/workspaces/{workspaceId}/disposisi/{itemId}` cannot be created, read (`get`), updated, or deleted unless the parent `/workspaces/{workspaceId}` document exists and has `visibility == 'firm_internal'`.
3. **Strict Key & Anti-Shadow Field Invariant**: All document creations and updates must strictly match the exact required/allowed keys (`hasAll` + `hasOnly`), preventing any undeclared "ghost" or shadow fields.
4. **Identity & Temporal Integrity Invariant**: On every `create` and `update`, `authorUid` must equal `request.auth.uid`. On `create`, `createdAt == request.time` and `updatedAt == request.time`. On `update`, `createdAt == resource.data.createdAt` (immutable) and `updatedAt == request.time`.
5. **Query Enforcer Invariant**: `list` operations on subcollections must evaluate `resource.data.workspaceId == workspaceId && resource.data.visibility == 'firm_internal'` without expensive `get()` calls inside `allow list`.

---

## 2. The "Dirty Dozen" Payloads

1. **Payload 1 (Unauthenticated Write)**: Attempting to create `/workspaces/rglf-main` with `request.auth == null`. -> `PERMISSION_DENIED`
2. **Payload 2 (Unverified Email Spoof)**: Authenticated user with `email: "bosip94@gmail.com"` but `email_verified: false` attempting to create `/workspaces/rglf-main`. -> `PERMISSION_DENIED`
3. **Payload 3 (Shadow/Ghost Field Injection on Workspace)**: Creating `/workspaces/rglf-main` with all required fields plus `"isSuperAdmin": true`. -> `PERMISSION_DENIED`
4. **Payload 4 (Identity Spoofing on Create)**: Authenticated user `uid: "user-1"` creating a `DisposisiItem` with `authorUid: "user-2"`. -> `PERMISSION_DENIED`
5. **Payload 5 (Orphaned Subcollection Write)**: Creating `/workspaces/non-existent-ws/disposisi/item-1` when `/workspaces/non-existent-ws` does not exist. -> `PERMISSION_DENIED`
6. **Payload 6 (Immutable `createdAt` Tampering on Update)**: Updating `/workspaces/rglf-main/disposisi/item-1` while modifying `createdAt` to a new timestamp. -> `PERMISSION_DENIED`
7. **Payload 7 (Forged Client Timestamp on Create)**: Creating `/workspaces/rglf-main/advokat/adv-1` with a past timestamp `createdAt != request.time`. -> `PERMISSION_DENIED`
8. **Payload 8 (ID Poisoning / Oversized Document ID)**: Creating a document with an invalid ID containing spaces or special characters (`item$bad!id`). -> `PERMISSION_DENIED`
9. **Payload 9 (Denial of Wallet / 1MB String Injection)**: Updating `perkara` on `DisposisiItem` with a 5,000-character string (exceeding `maxLength: 500`). -> `PERMISSION_DENIED`
10. **Payload 10 (Unbounded Array Injection)**: Creating `DisposisiItem` with 60 elements in `advokatPendampingIds` (exceeding `maxLength: 50`) or non-string first element `[12345]`. -> `PERMISSION_DENIED`
11. **Payload 11 (Cross-Workspace Mismatch)**: Creating `/workspaces/rglf-main/advokat/adv-1` where body `workspaceId` is `"other-workspace"`. -> `PERMISSION_DENIED`
12. **Payload 12 (Unscoped List Scraping)**: Executing a `list` query on `/workspaces/rglf-main/disposisi` without matching `visibility == 'firm_internal'`. -> `PERMISSION_DENIED`
