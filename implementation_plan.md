# APNATICKET — Feature Gap Audit & Implementation Plan

## Audit Summary

After reviewing all backend files against the requirements, here is the status:

| # | Requirement | Status | Details |
|---|---|---|---|
| 1 | PAN verification for majors (18+) | ⚠️ **Partial** | PAN is stored as `panHash` but there's no age/DOB validation, no PAN format check, and registration doesn't require it |
| 2 | Aadhaar verification for minors (linked to guardian PAN) | ❌ **Missing** | No minor/guardian model, no Aadhaar field |
| 3 | Mandatory photo-based ID validation | ❌ **Missing** | No ID document upload endpoint or validation |
| 4 | Max 2 tickets per PAN per booking cycle | ✅ **Done** | `MAX_TICKETS_PER_BOOKING = 2` enforced in [bookings.js](file:///d:/apna/backend/routes/bookings.js) |
| 5 | Daily booking cap per PAN | ⚠️ **Partial** | Cap exists but only checks by `userId`, not by PAN |
| 6 | Limited tickets per transaction | ✅ **Done** | Same as #4 |
| 7 | Mandatory ID upload for every passenger | ❌ **Missing** | Only `idHash` string required, no actual file upload |
| 8 | Automated rule enforcement before payment | ✅ **Done** | Rules checked before wallet debit |
| 9 | E-Rupee wallet booking lock | ✅ **Done** | Wallet debit happens at booking |
| 10 | Transaction traceability | ✅ **Done** | Every tx has ref, timestamp, type |
| 11 | No UPI/card fallback | ✅ **Done** | Only e-INR wallet used |
| 12 | Ticket after ID + payment validation | ⚠️ **Partial** | Ticket generated after payment, but no real ID validation step |
| 13 | QR with encrypted passenger metadata | ⚠️ **Partial** | QR contains passenger data but it's **not encrypted**, just JSON |
| 14 | Immutable booking logs | ✅ **Done** | Audit log written on create/cancel |
| 15 | Transaction history linked to PAN (masked) | ⚠️ **Partial** | History exists but not linked to PAN, no masking |
| 16 | Admin anomaly detection dashboard | ⚠️ **Partial** | Dashboard exists but no anomaly detection logic |

---

## Proposed Changes

### 1. Registration & Identity Verification

#### [MODIFY] [auth.js](file:///d:/apna/backend/routes/auth.js)
- **Make PAN mandatory** for registration (with format validation: `ABCDE1234F`)
- Add `dateOfBirth` field to determine minor/major
- If age < 18, require `aadhaarHash` + `guardianPanHash` instead of own PAN
- Store `idVerificationStatus: 'pending' | 'verified'` on user document
- Add `POST /api/auth/upload-id` endpoint for photo ID upload (base64/multipart)
- Add `POST /api/auth/verify-id` (admin) to approve/reject uploaded IDs

#### [MODIFY] [mockData.js](file:///d:/apna/backend/data/mockData.js)
- Add `dateOfBirth`, `aadhaarHash`, `guardianPanHash`, `idDocumentUrl`, `idVerificationStatus` fields to mock users

---

### 2. Booking Rules Engine Hardening

#### [MODIFY] [bookings.js](file:///d:/apna/backend/routes/bookings.js)
- Change daily cap check from `userId` to **PAN-based**: look up user's PAN, then query all bookings by users sharing that PAN today
- Add ID verification gate: reject booking if `idVerificationStatus !== 'verified'`
- Add `idDocumentUrl` requirement per passenger (URL or base64 from upload step)
- Validate passenger age: if minor, require linked Aadhaar + guardian PAN

---

### 3. QR Ticket Encryption

#### [MODIFY] [qrGenerator.js](file:///d:/apna/backend/utils/qrGenerator.js)
- Encrypt the QR payload using AES-256-CBC with a server-side secret key before encoding into QR
- Update [validateQRPayload](file:///d:/apna/backend/utils/qrGenerator.js#38-54) to decrypt before parsing
- Add `QR_ENCRYPTION_KEY` to [.env](file:///d:/apna/backend/.env)

---

### 4. Admin Anomaly Detection

#### [MODIFY] [admin.js](file:///d:/apna/backend/routes/admin.js)
- Add `GET /api/admin/anomalies` endpoint that flags:
  - Users with > 5 bookings in a single day
  - Multiple accounts sharing the same PAN
  - Bookings with mismatched passenger IDs
- Add PAN masking utility (`ABCDE****F`) in admin user listing

---

### 5. Environment Config

#### [MODIFY] [.env](file:///d:/apna/backend/.env)
- Add `QR_ENCRYPTION_KEY` for ticket QR encryption

---

## Verification Plan

### Automated Tests
1. `POST /api/auth/register` — Verify PAN format validation rejects invalid PANs
2. `POST /api/auth/register` — Verify minor registration requires Aadhaar + guardian PAN
3. `POST /api/bookings` — Verify daily cap counts by PAN, not just userId
4. `POST /api/bookings` — Verify unverified IDs are rejected
5. `POST /api/tickets/validate` — Verify encrypted QR decrypts correctly
6. `GET /api/admin/anomalies` — Verify anomaly detection returns flagged users

### Manual Verification
- Test full flow: Register with PAN → Upload ID → Admin verifies → Book ticket → Check QR
