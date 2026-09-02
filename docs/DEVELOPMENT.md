# Contributor Development Guidelines

This document outlines standard conventions, architectural rules, and engineering practices for contributors working on the CertifyMetric codebase.

---

## 1. Branching & Commit Conventions

### 1.1 Branch Naming
* **Feature Branches**: `feat/<short-description>` (e.g. `feat/reverification-scheduler`)
* **Bug Fixes**: `fix/<short-description>` (e.g. `fix/mpe-rounding-error`)
* **MVP Slices**: `slice/<slice-number>-<name>` (e.g. `slice/5-reverification`)
* **Documentation**: `docs/<short-description>` (e.g. `docs/api-spec`)

### 1.2 Commit Messages
Follow the Conventional Commits specification:
```
<type>(<scope>): <subject>

[optional body]
```
* `feat`: A new user-facing feature or API endpoint.
* `fix`: A bug fix in logic or UI.
* `docs`: Documentation updates only.
* `refactor`: Code change that neither fixes a bug nor adds a feature.
* `test`: Adding or correcting tests.
* `chore`: Build process, dependencies, or tooling adjustments.

---

## 2. Code Organization & Responsibilities

| Code Location | Layer | Responsibility |
| :--- | :--- | :--- |
| `client/src/views/` | Frontend | Top-level screen views (e.g. `TraderDashboard.jsx`, `VerificationWorkspace.jsx`). |
| `client/src/components/` | Frontend | Reusable UI components (e.g. `Navbar.jsx`, `StatusBadge.jsx`, `QRCodeModal.jsx`). |
| `client/src/api.js` | Frontend | Centralized API client. All `fetch` requests must be made here, never inline in components. |
| `server/server.js` | Backend | Express route handlers, input validation, and business workflow state machine. |
| `server/db.js` | Backend | Database schema initialization, table migrations, and sample seed data. |
| `server/auth-utils.js` | Backend | Cryptographic password hashing and verification (`scryptSync`). |
| `server/permissions.js` | Backend | RBAC permission matrix and role validation helpers. |
| `server/uploads/` | Backend | Static file storage for physical test evidence photos. |

---

## 3. Database Schema & Migration Rules

1. **Non-Destructive Migrations**:
   SQLite does not have an automated ORM migration runner. When adding columns:
   ```javascript
   const cols = db.prepare("PRAGMA table_info(my_table)").all().map(c => c.name);
   if (!cols.includes('new_column')) {
     db.exec("ALTER TABLE my_table ADD COLUMN new_column TEXT");
   }
   ```
2. **Never Drop or Truncate In Production**:
   Do not execute `DROP TABLE` in automatic startup scripts.
3. **Always Use Prepared Statements**:
   Never concatenate SQL strings with user input:
   ```javascript
   // ✔ CORRECT:
   db.prepare('SELECT * FROM users WHERE email = ?').get(email);

   // ❌ FORBIDDEN:
   db.prepare(`SELECT * FROM users WHERE email = '${email}'`).get();
   ```

---

## 4. Authentication & Security Invariants

1. **Authoritative Server Role Lookup**:
   Never trust a client-supplied role claim. Always resolve the user role from `getActor(req)` using the database record or session token.
2. **Zero Plaintext Passwords**:
   All user passwords must be hashed using `hashPassword()` (`crypto.scryptSync` with unique 16-byte salt) before writing to `users.password_hash`.
3. **Public Route Privacy**:
   The public certificate verification endpoint (`/api/public/verify/:token`) must **NEVER** expose personal identifiable information (PII) such as phone numbers, emails, trader user IDs, or internal verification primary keys.
4. **Never Commit Secrets**:
   Do not commit API tokens, production passwords, or sensitive keys to git. Use environment variables.

---

## 5. Testing & Quality Assurance

Before submitting any Pull Request:
1. **Frontend Build Validation**:
   ```bash
   cd client
   npm run build
   ```
   Must complete with `0` errors.
2. **Backend Regression Test**:
   Ensure existing demo logins and verification workflows pass:
   ```bash
   node server/seed-demo-users.js
   ```
3. **Audit Log Invariant**:
   Any new business state mutation (e.g. status changes, assignments, approvals) must record an entry via `logAudit(...)`.
