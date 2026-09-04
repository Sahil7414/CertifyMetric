# CertifyMetric — Live Deployment Readiness Audit & Verification Report

**Project**: Online Verification System for Weighing and Measuring Instruments (SIH 26036)  
**Date**: September 4, 2026  
**Status**: Ready for Production Deployment  
**Auditor**: Antigravity Automated Verification System  

---

## Table of Contents

1. [Files Created](#1-files-created)
2. [Files Modified](#2-files-modified)
3. [Files Deleted](#3-files-deleted)
4. [Database Changes](#4-database-changes)
5. [File Storage & Upload Changes](#5-file-storage--upload-changes)
6. [Environment Variable Changes](#6-environment-variable-changes)
7. [Authentication & Session Changes](#7-authentication--session-changes)
8. [CORS Changes](#8-cors-changes)
9. [Security Changes](#9-security-changes)
10. [API Changes](#10-api-changes)
11. [Frontend API Configuration Changes](#11-frontend-api-configuration-changes)
12. [Certificate & QR Verification Changes](#12-certificate--qr-verification-changes)
13. [New Health-Check Endpoint](#13-new-health-check-endpoint)
14. [Production Build Results](#14-production-build-results)
15. [Local Production Simulation Test Results](#15-local-production-simulation-test-results)
16. [Remaining Deployment Prerequisites](#16-remaining-deployment-prerequisites)
17. [Current Git Status](#17-current-git-status)

---

## 1. Files Created

| File Path | Description |
| :--- | :--- |
| `server/storage.js` | Storage subsystem encapsulating Multer file uploading, MIME type validation (JPEG, PNG, WEBP, PDF), 10MB file limit, sanitized collision-proof filenames, path traversal protection, and physical file unlinking (`deleteStoredFile`). |
| `server/migrations/postgresql-schema.sql` | Full relational DDL schema definition for PostgreSQL migration, featuring `TIMESTAMPTZ`, `JSONB`, foreign keys, and indexing. |
| `.env.example` | Root monorepo environment template for unified/Docker deployments. |
| `server/.env.example` | Dedicated server environment template for independent backend deployments (Render, Railway, Fly.io). |
| `client/.env.example` | Dedicated client environment template for independent frontend deployments (Vercel, Netlify, Cloudflare Pages). |
| `scripts/verify-production.js` | Automated 9-step simulation testing server boot, health probe, dev bypass blocking, scrypt authentication, RBAC, complete statutory verification workflow, persistent storage, QR verification, 404 handling, and graceful shutdown. |
| `docs/DEPLOYMENT.md` | Comprehensive operational deployment runbook detailing architecture diagrams, Docker configs, cloud deployment options, and monitoring. |
| `README.md` | Root documentation file with architecture breakdown, quick-start guides, and production commands (*committed & pushed*). |

---

## 2. Files Modified

| File Path | Modification Summary |
| :--- | :--- |
| `.gitignore` | Added `.env`, `.env.local`, `.env.production`, `test-sim-data/`, and database backup files to guard against secret leakage. |
| `package.json` | Added root-level helper scripts: `build`, `seed`, `seed:prod`, and `test:prod`. |
| `server/package.json` | Added `seed` and `seed:prod` scripts. |
| `server/db.js` | Enabled SQLite production PRAGMAs (`WAL`, `busy_timeout = 10000`, `synchronous = NORMAL`, `foreign_keys = ON`), parameterized `DATABASE_PATH`, and gated demo data seeding. |
| `server/server.js` | Hardened CORS whitelist using `FRONTEND_URL`, gated dev auth bypass behind `NODE_ENV !== 'production'`, integrated `storage.js`, added `GET /api/health`, structured 404/500 handlers, and graceful `SIGTERM`/`SIGINT` handling. |
| `server/seed-demo-users.js` | Parameterized `DATABASE_PATH` and added support for `--prod` flag. |
| `client/src/api.js` | Replaced hardcoded `localhost:4000` with dynamic `API_BASE` resolution and added `getFileUrl()` for dynamic evidence asset rendering. |
| `client/src/views/AddInstrumentModal.jsx` | Replaced direct hardcoded `fetch('http://localhost:4000/api/instruments')` with centralized `api.createInstrument()`. |
| `client/src/views/VerificationWorkspace.jsx` | Replaced direct hardcoded `localhost:4000` image URLs with `getFileUrl()`. |

---

## 3. Files Deleted

* **Zero files deleted.** All original MVP views, UI elements, styles, components, and workflows remain completely preserved.

---

## 4. Database Changes

### Old Implementation
- The SQLite database connection was initialized without concurrency optimization or connection PRAGMAs.
- Database location was hardcoded to `server/metrology.db`.
- No busy timeout was configured, causing queries under concurrent write load to immediately crash with `SQLITE_BUSY`.
- Foreign key constraints were not enforced at connection start.
- Demo data was seeded on every startup regardless of environment.

### New Implementation
- **Persistent Volume Parameterization**: Path resolved via `process.env.DATABASE_PATH` (defaults to `./metrology.db`), enabling mount points on cloud persistent volumes (Render Disks, Railway Volumes, AWS EBS).
- **WAL Mode (`PRAGMA journal_mode = WAL`)**: Allows concurrent reads while write transactions are processing.
- **Busy Timeout (`PRAGMA busy_timeout = 10000`)**: Queues concurrent transactions up to 10 seconds rather than throwing immediate errors.
- **Relational Integrity (`PRAGMA foreign_keys = ON`)**: Enforces referential integrity at the engine level.
- **Synchronous Normal (`PRAGMA synchronous = NORMAL`)**: Optimizes write disk I/O while guaranteeing durability across application crashes.
- **Conditional Seeding**: Demo data is only seeded when `NODE_ENV !== 'production'` or when `SEED_DEMO_USERS === 'true'`.
- **PostgreSQL Schema**: Added `server/migrations/postgresql-schema.sql` for enterprise environments requiring multi-instance scaling with AWS RDS, Supabase, or Neon.

### Why It Was Necessary
In multi-user production environments, standard rollback-journal SQLite locks the entire database file during writes, creating immediate bottlenecks and downtime. WAL mode and connection timeouts provide resilience for high-concurrency workloads.

---

## 5. File Storage & Upload Changes

### Old Implementation
- File uploads were written directly to `./uploads/evidence` with hardcoded relative paths.
- Filename collisions were possible under concurrent uploads.
- No MIME type validation was performed, allowing arbitrary files to be uploaded.
- When an evidence item was deleted via the API, only the database record was removed; the physical file was orphaned on disk permanently.

### New Implementation
- Centralized storage abstraction in `server/storage.js`.
- Configurable directory via `process.env.STORAGE_DIR` (defaults to `./uploads`).
- Strict MIME type filter: only `image/jpeg`, `image/png`, `image/webp`, and `application/pdf` are accepted.
- Maximum file size enforced at 10 MB.
- High-entropy, collision-resistant filenames (`ev_<timestamp>_<randomHex>.<ext>`) with path traversal sanitization.
- Clean physical unlinking on deletion via `deleteStoredFile()`.

### Why It Was Necessary
Unrestricted file uploads present severe security vulnerabilities (remote code execution, malicious payloads). Orphaned files cause disk space exhaustion on persistent cloud volumes.

---

## 6. Environment Variable Changes

### Old Implementation
- No `.env` template files existed.
- Hostnames and ports were hardcoded across frontend and backend code.

### New Implementation
- **Backend Variables**:
  - `NODE_ENV`: `production` | `development`
  - `PORT`: Server port (default `4000`)
  - `HOST`: Binding address (default `0.0.0.0`)
  - `DATABASE_PATH`: Custom path to persistent SQLite database
  - `STORAGE_DIR`: Custom path to evidence directory
  - `FRONTEND_URL`: Allowed CORS origin(s)
  - `SESSION_SECRET`: Secret key for session security
  - `ALLOW_DEV_AUTH_BYPASS`: Boolean flag (strictly false in production)
  - `SEED_DEMO_USERS`: Boolean flag
- **Frontend Variables**:
  - `VITE_API_URL`: Backend API endpoint URL
  - `VITE_APP_URL`: Public web URL for QR code generation
- Created `.env.example`, `server/.env.example`, and `client/.env.example`.

### Why It Was Necessary
Production environments (Render, Railway, Docker, Vercel) inject environment variables for ports, volume mounts, and domain routing.

---

## 7. Authentication & Session Changes

### Old Implementation
- `server.js` allowed any client to impersonate any user simply by sending an `x-user-id` header without providing credentials or tokens.
- Demo passwords were not hashed using modern cryptographic algorithms.

### New Implementation
- The `x-user-id` header bypass is strictly blocked in production:
  ```javascript
  const isDev = process.env.NODE_ENV !== 'production';
  const allowDevBypass = isDev && process.env.ALLOW_DEV_AUTH_BYPASS === 'true';
  ```
  If attempted in `NODE_ENV=production`, the server returns `HTTP 403 Forbidden`.
- Real session tokens issued by `POST /api/auth/login` (salted `scrypt` hashing) are required for all protected routes.
- Added `--prod` CLI support to `server/seed-demo-users.js`.

### Why It Was Necessary
The development header bypass was a critical privilege escalation vulnerability that would allow anyone to assume administrative or officer roles in production.

---

## 8. CORS Changes

### Old Implementation
- Backend used open CORS middleware (`cors()`) allowing requests from any domain.

### New Implementation
- Configured dynamic origin checking against `FRONTEND_URL`:
  ```javascript
  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map(o => o.trim());
  ```
- Allows comma-separated multi-domain lists for admin and public portals while rejecting unauthorized domains.

### Why It Was Necessary
Prevents cross-origin credential abuse, unauthorized API consumption, and CSRF attacks.

---

## 9. Security Changes

1. **Role-Based Access Control (RBAC)**: All sensitive routes verify database-authenticated permissions via bearer tokens.
2. **Path Traversal Protection**: Evidence serving and deletion validate relative paths to prevent `../` attacks on the host filesystem.
3. **Structured Error Handling**: Stack traces are logged server-side and never exposed to clients in production.
4. **Password Protection**: Passwords use salted `scrypt` hashing.

---

## 10. API Changes

- **Health Endpoint**: Added `GET /api/health`.
- **404 Handler**: Unknown API routes return structured JSON (`{ error: 'Not Found', message: '...' }`).
- **500 Handler**: Centralized error middleware captures unhandled exceptions and returns clean JSON.
- **Process Signals**: Intercepts `SIGTERM` and `SIGINT` to gracefully close active HTTP connections and release SQLite locks.

---

## 11. Frontend API Configuration Changes

### Old Implementation
- `client/src/api.js` had `API_BASE` hardcoded to `'http://localhost:4000/api'`.
- `AddInstrumentModal.jsx` called `fetch('http://localhost:4000/api/instruments')` directly.
- `VerificationWorkspace.jsx` resolved evidence images using `'http://localhost:4000' + item.file_path`.

### New Implementation
- In `client/src/api.js`:
  ```javascript
  const getBaseUrl = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    return import.meta.env.DEV ? 'http://localhost:4000/api' : '/api';
  };
  ```
- Dynamic file URL helper:
  ```javascript
  export const getFileUrl = (filePath) => {
    if (!filePath) return '';
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
    const base = getBaseUrl();
    const origin = base.startsWith('http') ? new URL(base).origin : '';
    return `${origin}${filePath.startsWith('/') ? '' : '/'}${filePath}`;
  };
  ```
- Migrated all modal and workspace views to use centralized `api` methods.

### Why It Was Necessary
In production, the frontend is deployed to a public domain or CDN. Hardcoded `localhost:4000` URLs cause total communication failure for real users.

---

## 12. Certificate & QR Verification Changes

- **Zero-Auth Verification**: `GET /api/public/verify/:token` operates without authentication, allowing consumers and field officers to verify certificates on mobile devices.
- **Dynamic Verification URLs**: Certificate QR codes adapt to `VITE_APP_URL` or relative origins, ensuring physical certificate scans route properly in production.

---

## 13. New Health-Check Endpoint

- **Endpoint**: `GET /api/health`
- **Authentication**: None (Public)
- **Response Format**:
  ```json
  {
    "status": "ok",
    "timestamp": "2026-09-04T11:33:05.123Z",
    "database": "connected",
    "environment": "production"
  }
  ```
- **Error Behavior**: Returns `HTTP 503` if database is unresponsive.
- **Purpose**: Liveness/readiness probes for Docker, Kubernetes, AWS ECS, and cloud platforms.

---

## 14. Production Build Results

Executed command: `npm run build`

```
> client@0.0.0 build
> vite build

vite v8.2.2 building client environment for production...
transforming...
✓ 63 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   1.03 kB │ gzip:  0.55 kB
dist/assets/index-utrlprI4.css   36.24 kB │ gzip:  7.19 kB
dist/assets/index-CGTQKyFV.js   376.15 kB │ gzip: 97.93 kB

✓ built in 866ms
```

**Outcome**: Clean build with zero errors and zero warnings.

---

## 15. Local Production Simulation Test Results

Executed command: `npm run test:prod` via `scripts/verify-production.js`

```
----------------------------------------------------
🚀 CERTIFYMETRIC PRODUCTION SIMULATION STARTING
----------------------------------------------------
[1/9] Spawning server on port 4099 [NODE_ENV=production]...
  ✔ Server booted cleanly and responded.
[2/9] Validating GET /api/health output...
  ✔ /api/health verified: status=ok, database=connected, environment=production
[3/9] Testing Dev Auth Bypass blocking in production (x-user-id header)...
  ✔ Dev bypass correctly rejected in production (HTTP 403).
[4/9] Testing Authentication with seeded role credentials...
✔ Successfully seeded demo accounts with scrypt hashed passwords.
  ✔ Session tokens acquired for Admin, Trader, Authority, and Verifier.
[5/9] Testing Role-Based Access Control (RBAC)...
  ✔ RBAC verified: Trader blocked (403), Platform Admin authorized (200).
[6/9] Testing Complete Statutory Lifecycle & Multipart Storage...
  ✔ Instrument registered: INST_1788521619132
  ✔ Application submitted: APP-2026-2051
  ✔ Authority assigned Field Verifier to application.
  ✔ Field Verifier initiated verification workspace.
  ✔ Evidence uploaded to persistent storage: /uploads/evidence/ev_1788521619185_10e8695cc685ea16.png
  ✔ Verified file exists on disk in custom persistent storage directory.
  ✔ Static evidence file served successfully (HTTP 200).
  ✔ Verification determination PASS recorded and sealed.
  ✔ Statutory Certificate generated: #LM-2026-37600-DL
[7/9] Testing Public QR Certificate Verification Endpoint (Zero Auth)...
  ✔ Public QR verify succeeded: Cert #LM-2026-37600-DL is officially VALID
[8/9] Testing 404 handler for unknown routes...
  ✔ Unknown route cleanly returns structured 404 JSON.
[9/9] Testing Graceful Server Shutdown (SIGTERM)...
  ✔ Server shut down gracefully with database connection closed.
----------------------------------------------------
🎉 ALL 9 PRODUCTION READINESS CHECKS PASSED!
----------------------------------------------------
```

---

## 16. Remaining Deployment Prerequisites

### Application Code Status
- **Zero code blockers remain.** All core features, security checks, and database persistence layers are production-ready.

### Infrastructure Steps (to be performed when deploying live)
1. **Hosting Selection**: Choose single-container Docker deployment or decoupled hosting (e.g., Render/Railway backend + Vercel frontend).
2. **Persistent Storage Volume**: Attach a persistent disk and configure `DATABASE_PATH` and `STORAGE_DIR` to the mounted volume path.
3. **Environment Secrets**: Populate `SESSION_SECRET` with a secure 64-character random string and `FRONTEND_URL` with your production domain in the cloud dashboard.
4. **SSL / TLS**: Ensure HTTPS is enforced on your live domain.

---

## 17. Current Git Status

```
On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   .gitignore
	modified:   client/src/api.js
	modified:   client/src/views/AddInstrumentModal.jsx
	modified:   client/src/views/VerificationWorkspace.jsx
	modified:   package.json
	modified:   server/db.js
	modified:   server/package.json
	modified:   server/seed-demo-users.js
	modified:   server/server.js

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	.env.example
	client/.env.example
	docs/DEPLOYMENT.md
	docs/DEPLOYMENT_READINESS_REPORT.md
	scripts/
	server/.env.example
	server/migrations/
	server/storage.js

no changes added to commit (use "git add" and/or "git commit -a")
```
