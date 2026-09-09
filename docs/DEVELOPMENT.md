# Contributor Development Guidelines

This document outlines conventions, architectural invariants, and engineering best practices for contributors working on the **CertifyMetric** codebase (`SIH26036`).

---

## 1. Branching & Commit Conventions

### 1.1 Branch Naming
* **Feature Branches**: `feat/<feature-name>` (e.g., `feat/trader-verification-flow`)
* **Bug Fixes**: `fix/<bug-description>` (e.g., `fix/fee-calculation-rounding`)
* **Refactoring**: `refactor/<component>` (e.g., `refactor/application-details-modal`)
* **Documentation**: `docs/<topic>` (e.g., `docs/api-specifications`)

### 1.2 Commit Messages (Conventional Commits)
```
<type>(<scope>): <subject>

[optional body explaining rationale]
```
* `feat`: A new user-facing feature or statutory workflow enhancement.
* `fix`: A bug fix or layout correction.
* `docs`: Documentation updates only.
* `refactor`: Code refactoring without behavioral alterations.
* `test`: Adding or updating test suites.
* `chore`: Dependency updates, tooling, or build configuration.

---

## 2. Code Organization & Responsibilities

| Code Location | Layer | Primary Responsibility |
| :--- | :--- | :--- |
| `client/src/views/` | Frontend Views | Screen-level components (`TraderDashboard.jsx`, `ApplyVerificationView.jsx`, `ApplicationsList.jsx`, `ApplicationTimeline.jsx`, `VerificationWorkspace.jsx`). |
| `client/src/components/` | Frontend Components | Reusable components (`AppSidebar.jsx`, `TopHeader.jsx`, `ApplicationDetailsModal.jsx`, `StatusBadge.jsx`, `QRCodeModal.jsx`). |
| `client/src/api.js` | Frontend API Layer | Centralized API client. All network calls must go through `api.js`. |
| `server/server.js` | Backend Controller | Express route handlers, business state transitions, and error handling. |
| `server/models/index.js` | Backend Models | Mongoose schemas and database models for MongoDB. |
| `server/permissions.js` | Backend Security | Role-Based Access Control (RBAC) permission matrices. |
| `server/auth-utils.js` | Backend Security | Cryptographic `scrypt` password hashing and verification. |
| `server/scripts/seedDemoUsers.js` | Database Seeder | Database initializers and mock data generation. |

---

## 3. Statutory Verification & State Invariants

1. **Strict RBAC Enforcement**:
   - Every protected API route must validate user roles using `getActor(req)`.
   - Never trust client-supplied role claims.
2. **Statutory Return Clarification Workflow**:
   - An authority officer returning an application **must** supply mandatory `return_reason` remarks.
   - Resubmission by a trader resets the state to `UNDER_REVIEW` without requiring re-payment of statutory fees.
3. **MPE Calculation Tolerance**:
   - Verification error must be strictly validated against the Maximum Permissible Error (MPE) thresholds defined in Schedule V of the Legal Metrology General Rules, 2011.
4. **Form 6 Certificate Cryptographic QR**:
   - Official certificates must generate a verifiable public token that can be looked up anonymously on `/api/public/verify/:token`.
   - Public verification endpoints must **never** expose applicant PII (phone numbers, emails, passwords).
5. **Immutable Audit Logging**:
   - Every significant state mutation (application creation, return, assignment, test completion, certificate issuance) must invoke `logAudit(...)`.

---

## 4. Quality Assurance & Build Verification

Before submitting code:
```bash
# 1. Validate frontend build
npm --prefix client run build

# 2. Verify backend startup and seeding
node server/scripts/seedDemoUsers.js
```
The frontend build must complete with `0` errors.
