# CertifyMetric — Complete Technical Handover Document

**Smart India Hackathon 2024 / 2026**  
**Problem Statement ID**: `SIH26036`  
**Problem Statement Title**: Online Verification System for Weighing and Measuring Instruments  
**Repository**: `SIH26036`  
**Document Generation Date**: September 3, 2026  
**Current State**: MVP Phase 1 (Slices 1–4 Complete, Seeded Demo Auth Active)

---

## 1. Actual Current Implementation State

The repository contains a fully working, full-stack implementation of the statutory Legal Metrology MVP. The table below represents the **actual state of the codebase today**:

| Functional Area | Implementation Status | Technical Notes |
| :--- | :--- | :--- |
| **Trader Registration & Login** | `IMPLEMENTED` | Real database accounts, salted `scrypt` password hashing, session tokens, 1-Click Demo selector. |
| **Instrument Registry** | `IMPLEMENTED` | Category definitions, Class III NAWI specifications, serial number uniqueness, owner filtering. |
| **Verification Application Request** | `IMPLEMENTED` | Application number generation (`APP-YYYY-XXXXX`), status transition, statutory fee status tracking. |
| **Authority Review Queue** | `IMPLEMENTED` | Real-time queue, document inspection, compliance checklists, decision logging (`UNDER_REVIEW`). |
| **Candidate Recommendation Engine** | `IMPLEMENTED` | Proximity scoring, workload balancing, officer availability sorting in SQLite. |
| **Assignment Decision Support** | `IMPLEMENTED` | Automated assignment, manual officer override with mandatory justification, audit trail recording. |
| **Verifier Cases Dashboard** | `IMPLEMENTED` | Role-filtered case queue (`VERIFIER` / `GATC`), statutory deadline tracking, status indicators. |
| **5-Step Verification Wizard** | `IMPLEMENTED` | Step-by-step physical test wizard: Overview $\rightarrow$ Visual Checklist $\rightarrow$ Error Readings $\rightarrow$ Evidence Upload $\rightarrow$ Decision. |
| **MPE Automated Error Calculation** | `IMPLEMENTED` | OIML R76 / Legal Metrology 2011 standard error evaluation against Class III MPE limits ($\pm 0.5e, \pm 1.0e, \pm 1.5e$). |
| **Physical Evidence Ingestion** | `IMPLEMENTED` | Multi-file photo upload with captioning, timestamping, local disk storage via `multer`, and deletion. |
| **PASS / FAIL Decision Engine** | `IMPLEMENTED` | Server-side validation requiring checklist completion and error readings before result finalization. |
| **Form 6 Digital Certificate Generation** | `IMPLEMENTED` | Generation of official Form 6 certificate, unique numbering (`CERT-YYYY-CAT-XXXX`), SHA-256 public token. |
| **Client-Side QR Code Engine** | `IMPLEMENTED` | Scannable QR generation (`qrcode` library) rendering SVG, PNG data URIs, and print-ready formats. |
| **Public Unauthenticated Verification** | `IMPLEMENTED` | Public route (`/verify/:token`) resolving certificate validity, expiry calculation, and consumer protection advisory. |
| **Public Route Data Privacy Filtering** | `IMPLEMENTED` | Strict sanitization: 0 phone numbers, 0 emails, 0 internal database IDs exposed to public QR scanners. |
| **Immutable Audit Ledger** | `IMPLEMENTED` | Structured logging of every auth event, status update, assignment, and certificate issuance in `audit_logs`. |
| **Automated Re-verification Notifications** | `PARTIALLY IMPLEMENTED` | Expiry dates calculated and warning banners displayed; SMS/Email gateway dispatch is simulated via server logs. |
| **GATC Laboratory Workspace** | `PARTIALLY IMPLEMENTED` | Uses shared verification workspace; specialized GATC checklist schemas exist in DB but use NAWI rules. |
| **External Government SSO (DigiLocker/Parichay)** | `MOCKED / DEMO` | Seeded demo accounts and local password authentication used in place of production OAuth. |
| **Payment Gateway (Bharatkosh)** | `MOCKED / DEMO` | Payments default to `PAID` / `EXEMPT`; no external banking redirect is active. |
| **PWA Offline Sync for Remote Officers** | `NOT IMPLEMENTED` | Requires active network connection to backend server. |
| **Hardware GPS Geofence Lock** | `NOT IMPLEMENTED` | Coordinates are accepted from form input rather than hardware-enforced GPS chip. |

---

## 2. Project Overview

* **Project Name**: CertifyMetric
* **Problem Statement ID**: `SIH26036` (Ministry of Consumer Affairs, Food & Public Distribution)
* **Problem Statement Title**: Online Verification System for Weighing and Measuring Instruments
* **Purpose of Application**: To modernize and digitize the statutory verification of commercial weighing and measuring instruments under the **Legal Metrology Act, 2009** and **Legal Metrology (General) Rules, 2011**. It establishes a transparent, tamper-evident digital workflow that connects commercial traders, statutory metrology officers, testing laboratories, and consumers.
* **Current MVP Objective**: Deliver a robust, complete end-to-end vertical slice covering instrument registration, application submission, administrative assignment, physical inspection workspace with automated Maximum Permissible Error (MPE) calculations, physical photo evidence capture, official Form 6 digital certificate generation with embedded QR codes, and an unauthenticated public verification page for consumer protection.
* **Current Development Stage**: **MVP Phase 1 Complete** (Vertical Slices 1 through 4 built, verified, and active on development servers).

---

## 3. Technology Stack

Only technologies actually present in the codebase are documented here:

| Category | Technology | Version | Purpose in Repository |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | `^19.2.8` | Declarative UI, state management, and component architecture. |
| **Frontend DOM** | React DOM | `^19.2.8` | DOM rendering. |
| **Frontend Build Tool** | Vite | `^8.2.2` | Fast HMR dev server and production Rollup-based bundling. |
| **Styling Framework** | Tailwind CSS | `^3.4.19` | Utility-first styling with custom government color tokens (`#002046`, `#0f3366`). |
| **CSS Post-processing** | PostCSS / Autoprefixer | `^8.5.26` / `^10.5.4` | Vendor prefixing and CSS compilation. |
| **Icons & Typography** | Google Material Symbols & Inter | CDN / Web Font | Standardized government UI icons and legible typography. |
| **QR Code Library** | `qrcode` | `^1.5.4` | Client-side scannable SVG and canvas data URI generation. |
| **Linter** | Oxlint | `^1.79.0` | High-speed JavaScript/JSX static analysis. |
| **Backend Framework** | Express.js | `^4.21.2` | REST API routing, middleware, and request handling. |
| **Runtime Environment** | Node.js | `>= 22.5.0` | Native ES modules (`import`/`export`) and server runtime. |
| **Database Engine** | SQLite (via `node:sqlite`) | Built-in (`DatabaseSync`) | Embedded, zero-configuration SQL database with prepared statements. |
| **Password Security** | Node.js `node:crypto` | Built-in (`scryptSync`) | Industry-standard salted password hashing and timing-safe comparison. |
| **File Storage** | Multer | `^1.4.5-lts.1` | Multipart form-data handling and disk storage for verification evidence. |
| **CORS Middleware** | `cors` | `^2.8.5` | Cross-origin resource sharing between client (5173) and API (4000). |
| **Package Manager** | npm | `^10.0.0` | Dependency resolution and workspace script execution. |

---

## 4. Repository Structure

```
SIH26036/
├── client/                               # Frontend Single Page Application
│   ├── src/
│   │   ├── assets/                       # Static logo and graphic assets
│   │   ├── components/                   # Reusable UI components
│   │   │   ├── Navbar.jsx                # Top government header, branding, tabs & sign out
│   │   │   ├── QRCodeModal.jsx           # Inspectable QR code inspection modal
│   │   │   └── StatusBadge.jsx           # Consistent lifecycle status pills
│   │   ├── views/                        # Top-level screen views
│   │   │   ├── AddInstrumentModal.jsx    # Modal form to register new instrument
│   │   │   ├── ApplicationReview.jsx     # Authority application assessment & review view
│   │   │   ├── ApplicationTimeline.jsx   # Trader application tracking & status timeline
│   │   │   ├── AssignmentDecisionSupport.jsx # Automated verifier recommendation & assignment
│   │   │   ├── AuditLogView.jsx          # Administrator immutable audit trail ledger
│   │   │   ├── AuthorityDashboard.jsx    # Operations dashboard for LMOs and directors
│   │   │   ├── CertificatesList.jsx      # Filterable registry of issued Form 6 certificates
│   │   │   ├── InstrumentDetail.jsx      # Technical specification & history of instrument
│   │   │   ├── InstrumentsList.jsx       # Trader inventory table of registered units
│   │   │   ├── LoginView.jsx             # Production login card + 1-Click Demo Login selector
│   │   │   ├── OfficialCertificate.jsx   # Print-ready Form 6 certificate viewer
│   │   │   ├── PublicCertificateVerification.jsx # Unauthenticated public consumer QR lookup view
│   │   │   ├── PublicVerify.jsx          # Public lookup wrapper
│   │   │   ├── TraderDashboard.jsx       # Commercial trader primary dashboard
│   │   │   ├── VerificationWorkspace.jsx # 5-step touch-friendly physical inspection wizard
│   │   │   └── VerifierDashboard.jsx     # Assigned inspection cases queue for verifiers
│   │   ├── api.js                        # Centralized API client & Bearer token management
│   │   ├── App.jsx                       # Root application routing, state, and role gating
│   │   ├── App.css                       # Global component overrides
│   │   ├── index.css                     # Tailwind tokens, font declarations & print CSS
│   │   ├── main.jsx                      # React 19 bootstrap root
│   │   └── permissions.js                # Frontend permission checks
│   ├── package.json                      # Frontend dependencies
│   ├── tailwind.config.js                # Design system color and spacing tokens
│   └── vite.config.js                    # Vite server and build configuration
├── server/                               # Backend REST API
│   ├── uploads/
│   │   └── evidence/                     # Uploaded physical inspection photographs
│   ├── auth-utils.js                     # scrypt password hashing & verification utilities
│   ├── db.js                             # SQLite schema creation, migrations & seed data
│   ├── metrology.db                      # Primary SQLite database file
│   ├── permissions.js                    # Centralized RBAC matrix and role definitions
│   ├── seed-demo-users.js                # Standalone demo seeding script & credential generator
│   ├── server.js                         # Express server, 25 REST endpoints & state machine
│   └── package.json                      # Backend dependencies
├── docs/                                 # Official technical documentation
│   ├── ARCHITECTURE.md                   # Mermaid runtime architecture diagram
│   ├── DEVELOPMENT.md                    # Contributor conventions & rules
│   ├── ENVIRONMENT.md                    # Environment variable specification
│   ├── PROJECT_HANDOVER.md               # Master technical handover document (this file)
│   └── SETUP.md                          # Clean machine installation instructions
├── DEMO_CREDENTIALS.md                   # Generated local demo credentials table
├── package.json                          # Root repository scripts coordinator
├── start-dev.js                          # Concurrent dual-server launcher
└── PRD.md / Architecture.md / Design.md  # Original hackathon specifications
```

---

## 5. User Roles & Access Control

The platform implements 5 distinct statutory roles enforced in SQLite (`users.role`) and server-side RBAC:

```
                  ┌─────────────────────────────────────────┐
                  │           PLATFORM_ADMIN                │
                  │   Full System Access & Audit Logs       │
                  └────────────────────┬────────────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
        ▼                              ▼                              ▼
  ┌───────────┐                  ┌───────────┐                  ┌───────────┐
  │  TRADER   │                  │ AUTHORITY │                  │ VERIFIER  │
  │ Commercial│                  │    LMO    │                  │ Inspector │
  └───────────┘                  └─────┬─────┘                  └─────┬─────┘
                                       │                              │
                                       │                              ▼
                                       │                        ┌───────────┐
                                       └───────────────────────►│   GATC    │
                                            Assignment Route    │ Test Lab  │
                                                                └───────────┘
```

### 5.1 TRADER
* **Who they represent**: Commercial shopkeepers, manufacturers, distributors, weighbridge operators.
* **Can Access**: Trader Dashboard (`/`), My Instruments (`/instruments`), Technical Specs (`/instruments/:id`), Application Timeline (`/timeline`), Issued Certificates (`/certificates`).
* **Actions Allowed**: Register new weighing instruments; submit initial or periodic verification requests; view certificate QR codes; download Form 6 certificate copies.
* **Restricted From**: Reviewing applications; assigning officers; modifying inspection readings; accessing audit logs; viewing other traders' instruments.

### 5.2 AUTHORITY (Legal Metrology Officer / Controller)
* **Who they represent**: District Legal Metrology Officers (LMO), Assistant Controllers, Directorate officials.
* **Can Access**: Operations Dashboard (`/authority`), Application Review (`/review`), Assignment Decision Support (`/assign`), Issued Certificates (`/certificates`), Audit Ledger (`/audit-logs`).
* **Actions Allowed**: Review incoming verification requests; accept/reject applications; view recommendation scoring; assign field verifiers or GATC labs; record assignment override justifications; view officer workloads.
* **Restricted From**: Registering commercial trader instruments; submitting fake inspections as a trader.

### 5.3 VERIFIER (Field Metrology Inspector)
* **Who they represent**: Field inspection officers who physically inspect instruments at retail outlets, markets, and factories.
* **Can Access**: Assigned Cases Dashboard (`/cases`), 5-Step Verification Workspace (`/cases/:appId`).
* **Actions Allowed**: Start physical verification sessions; complete statutory inspection checklists; input standard test weights and observed values; compute MPE error compliance; upload photograph evidence; submit final PASS/FAIL verdict; trigger certificate generation upon PASS.
* **Restricted From**: Reviewing trader applications; assigning cases to themselves or others; modifying closed certificates.

### 5.4 GATC (Government Approved Test Centre)
* **Who they represent**: Authorized private or semi-government testing laboratories performing advanced metrological testing on complex instruments.
* **Can Access**: Laboratory Assigned Cases (`/cases`), Verification Workspace (`/cases/:appId`).
* **Actions Allowed**: Conduct laboratory-level calibration; record standard weights and environmental factors; upload test reports and calibration certificates; issue PASS/FAIL outcomes.
* **Restricted From**: Administrative regulatory assignments; altering district officer approvals.

### 5.5 PLATFORM_ADMIN
* **Who they represent**: State Metrology Directorate technical administrators.
* **Can Access**: All dashboards, Operational Overview, System Audit Ledger (`/audit-logs`), Platform Statistics (`/stats`).
* **Actions Allowed**: Inspect immutable audit logs; observe system transaction volume; manage system parameters.
* **Restricted From**: Bypassing statutory state machine rules.

---

## 6. Authentication & Authorization

### 6.1 Authentication Mechanism
* **Endpoint**: `POST /api/auth/login`
* **Input**: `{ email, password }`
* **Password Verification**: Passwords are verified against SQLite `users.password_hash` using `crypto.scryptSync(password, salt, 64)` and `crypto.timingSafeEqual`.
* **Session Creation**: On valid password match, the server generates a cryptographically random session token:
  `tok_<userId>_<timestamp>_<randomHex>`
  and saves it to the `user_sessions` table with a 7-day expiration.
* **Session Termination**: `POST /api/auth/logout` deletes the session token from `user_sessions`.

### 6.2 Server-Side RBAC Enforcement (`getActor`)
Every protected endpoint invokes `getActor(req)`:
1. Reads `Authorization: Bearer <token>` from HTTP headers.
2. Checks token validity and expiration in `user_sessions`.
3. Resolves the user record from `users` and reads `users.role` **directly from the database**.
4. If a client attempts to forge role headers (e.g. sending `x-user-role: AUTHORITY` with a Trader token), the server strictly enforces the database role (`TRADER`) and returns `HTTP 403 Forbidden`.

### 6.3 Development & Demo Authentication
To facilitate development and testing without manual typing:
* A **1-Click Demo Login** grid is built into [LoginView.jsx](file:///c:/Users/Sahil/OneDrive/Desktop/SIH26036/client/src/views/LoginView.jsx).
* Clicking any role button sends the corresponding credentials to `POST /api/auth/login` and logs the user directly into that role.
* Demo credentials are kept in [DEMO_CREDENTIALS.md](file:///c:/Users/Sahil/OneDrive/Desktop/SIH26036/DEMO_CREDENTIALS.md) and seeded via `node server/seed-demo-users.js`.

---

## 7. Database Schema & Persistence

The database engine is native SQLite (`server/metrology.db`). Below are the 15 tables currently in use:

### 7.1 `users`
* `id` (TEXT, PK): Unique user ID (e.g. `USR_TRADER_01`).
* `email` (TEXT, UNIQUE): Registered email address.
* `password_hash` (TEXT): Salted `scrypt` hash (`<salt>:<derivedKeyHex>`).
* `full_name` (TEXT): Full legal name of user or officer.
* `role` (TEXT): One of `TRADER`, `AUTHORITY`, `VERIFIER`, `GATC`, `PLATFORM_ADMIN`.
* `organization_id` (TEXT, FK): Associated organization ID.
* `phone` (TEXT): Contact number.
* `avatar` (TEXT): Profile photo URL.
* `is_demo` (INTEGER): `1` if seeded demo user, `0` otherwise.
* `created_at` (TEXT): ISO timestamp.

### 7.2 `user_sessions`
* `token` (TEXT, PK): Active session token.
* `user_id` (TEXT, FK): Pointer to `users.id`.
* `role` (TEXT): Cached authoritative role.
* `created_at` (TEXT): Session start timestamp.
* `expires_at` (TEXT): Session expiration timestamp.

### 7.3 `organizations`
* `id` (TEXT, PK): E.g. `ORG_TRADER_01`, `ORG_GOV_DOCA`, `ORG_GATC_01`.
* `name` (TEXT): Registered enterprise or department name.
* `type` (TEXT): `TRADER_ORG`, `GOV_DIRECTORATE`, `TEST_CENTRE`.
* `jurisdiction` (TEXT): Territorial coverage (e.g. `Central District, Delhi`).
* `created_at` (TEXT): ISO timestamp.

### 7.4 `instrument_categories`
* `id` (TEXT, PK): Category identifier (e.g. `CAT_NAWI_III`).
* `code` (TEXT): Short code (e.g. `NAWI_CLASS_III`).
* `name` (TEXT): Standard name (e.g. `Commercial Non-Automatic Weighing Instrument (Class III)`).
* `description` (TEXT): Category scope.
* `active` (INTEGER): `1` if active.

### 7.5 `rule_sets`
* `id` (TEXT, PK): Rule identifier (e.g. `RULES_NAWI_III`).
* `category_id` (TEXT, FK): Associated category.
* `name` (TEXT): Standard rule title.
* `validity_period_months` (INTEGER): Default validity (e.g. `12` months).
* `mpe_rules_json` (TEXT): JSON array defining load steps ($0-500e, 500e-2000e, 2000e-10000e$) and MPE tolerances.
* `checklist_schema_json` (TEXT): JSON array of mandatory physical checklist items.

### 7.6 `instruments`
* `id` (TEXT, PK): Instrument identifier (e.g. `INST-2026-001`).
* `owner_id` (TEXT, FK): Pointer to `users.id`.
* `category_id` (TEXT, FK): Pointer to `instrument_categories.id`.
* `manufacturer` (TEXT): Device maker (e.g. `Avery India Ltd`).
* `model` (TEXT): Model number.
* `serial_number` (TEXT, UNIQUE): Hardware serial number.
* `max_capacity` (TEXT): Maximum rated capacity (e.g. `30 kg`).
* `min_capacity` (TEXT): Minimum load (e.g. `100 g`).
* `verification_scale_interval_e` (TEXT): Scale interval $e$ (e.g. `5 g`).
* `location` (TEXT): Operating address.
* `status` (TEXT): `REGISTERED`, `VERIFIED`, `EXPIRED`, `REJECTED`.
* `created_at` (TEXT): ISO timestamp.

### 7.7 `applications`
* `id` (TEXT, PK): Application identifier (e.g. `APP-2026-001`).
* `application_no` (TEXT, UNIQUE): Human-readable application number.
* `instrument_id` (TEXT, FK): Target instrument.
* `trader_id` (TEXT, FK): Applicant user ID.
* `request_type` (TEXT): `INITIAL_VERIFICATION`, `PERIODIC_REVERIFICATION`.
* `status` (TEXT): `SUBMITTED`, `UNDER_REVIEW`, `ASSIGNED`, `IN_PROGRESS`, `VERIFIED`, `REJECTED`.
* `documents_json` (TEXT): JSON array of attached documentation.
* `fee_status` (TEXT): `PAID`, `EXEMPT`, `PENDING`.
* `created_at` / `updated_at` (TEXT): ISO timestamps.

### 7.8 `assignments`
* `id` (TEXT, PK): Assignment ID.
* `application_id` (TEXT, UNIQUE, FK): Associated application.
* `assigned_type` (TEXT): `VERIFIER` or `GATC`.
* `assigned_id` (TEXT, FK): Assigned officer or lab user ID.
* `recommended_id` (TEXT): Top algorithm recommendation.
* `is_override` (INTEGER): `1` if authority overrode the recommendation.
* `override_reason` (TEXT): Mandatory justification if overridden.
* `assigned_by` (TEXT, FK): Authority officer user ID.
* `created_at` (TEXT): ISO timestamp.

### 7.9 `appointments`
* `id` (TEXT, PK): Appointment identifier.
* `assignment_id` (TEXT, UNIQUE, FK): Pointer to `assignments.id`.
* `scheduled_date` (TEXT): Target inspection date.
* `time_slot` (TEXT): Scheduled window (e.g. `10:00 - 13:00`).
* `arrangement_type` (TEXT): `ON_SITE` or `LABORATORY`.
* `status` (TEXT): `SCHEDULED`, `COMPLETED`, `CANCELLED`.
* `created_at` (TEXT): ISO timestamp.

### 7.10 `verifications`
* `id` (TEXT, PK): Primary verification session ID.
* `application_id` (TEXT, UNIQUE, FK): Target application.
* `appointment_id` (TEXT, FK): Associated appointment.
* `verifier_id` (TEXT, FK): Assigned inspector.
* `status` (TEXT): `IN_PROGRESS`, `COMPLETED`.
* `result` (TEXT): `PASS`, `FAIL`.
* `remarks` (TEXT): Inspector's statutory notes.
* `started_at` / `completed_at` / `created_at` / `updated_at` (TEXT): Timestamps.

### 7.11 `verification_checklist_responses`
* `id` (TEXT, PK): Response ID.
* `verification_id` (TEXT, FK): Associated verification.
* `item_id` (TEXT): Item code (e.g. `CHK_MAKE_MODEL`, `CHK_SEAL_INTEGRITY`).
* `status` (TEXT): `PASS`, `FAIL`, `NA`.
* `note` (TEXT): Optional note.
* `updated_at` (TEXT): ISO timestamp.
* *Constraint*: `UNIQUE(verification_id, item_id)`.

### 7.12 `verification_readings`
* `id` (TEXT, PK): Reading record ID.
* `verification_id` (TEXT, FK): Pointer to `verifications.id`.
* `test_point` (TEXT): Nominal test weight (e.g. `Min (100g)`, `1/2 Max (15kg)`, `Max (30kg)`).
* `reference_value` (REAL): Certified reference standard mass.
* `observed_value` (REAL): Value displayed on scale.
* `unit` (TEXT): `kg`, `g`.
* `reading_result` (TEXT): `PASS` or `FAIL` (evaluated against MPE).
* `updated_at` (TEXT): ISO timestamp.

### 7.13 `verification_evidence`
* `id` (TEXT, PK): Evidence item ID.
* `verification_id` (TEXT, FK): Pointer to `verifications.id`.
* `file_name` (TEXT): Original filename.
* `file_path` (TEXT): Disk path under `uploads/evidence/`.
* `file_type` (TEXT): MIME type (e.g. `image/jpeg`).
* `category` (TEXT): `DEVICE_PHOTO`, `SEAL_PHOTO`, `STAMP_PHOTO`, `CERT_DOC`.
* `caption` (TEXT): Officer caption.
* `created_at` (TEXT): ISO timestamp.

### 7.14 `certificates`
* `id` (TEXT, PK): Certificate ID.
* `certificate_no` (TEXT, UNIQUE): Legal Metrology Form 6 Certificate number.
* `verification_id` (TEXT, FK): Associated successful verification.
* `instrument_id` (TEXT, FK): Target instrument.
* `public_token` (TEXT, UNIQUE): URL-safe public verification token.
* `issue_date` (TEXT): Verification completion date.
* `valid_until` (TEXT): Expiration timestamp (e.g. +12 months).
* `status` (TEXT): `VALID`, `EXPIRED`, `SUSPENDED`, `REVOKED`.
* `issuing_officer` (TEXT): Full name of LMO.
* `issuing_authority` (TEXT): Directorate/Office name.
* `created_at` (TEXT): ISO timestamp.

### 7.15 `audit_logs`
* `id` (TEXT, PK): Audit entry ID.
* `entity_name` (TEXT): E.g. `Application`, `Certificate`, `UserAuth`.
* `entity_id` (TEXT): ID of affected record.
* `action` (TEXT): E.g. `CREATED`, `ASSIGNED`, `COMPLETED_PASS`, `CERTIFICATE_GENERATED`.
* `actor_id` (TEXT): User ID performing mutation.
* `actor_role` (TEXT): Role of actor.
* `details_json` (TEXT): Serialized mutation payload.
* `created_at` (TEXT): ISO timestamp.

---

## 8. Current Implemented Workflow

```
1. TRADER
   Log In ──► Dashboard ──► Register Instrument ──► Submit Verification Request
                                                           │
                                                           ▼ (Status: SUBMITTED)
2. AUTHORITY
   Operations Queue ◄── Review Application ◄───────────────┘
          │
          ├──► View Workload / Proximity Recommendation
          │
          └──► Assign Verifier (Status: ASSIGNED)
                     │
                     ▼
3. VERIFIER
   Assigned Queue ──► Open 5-Step Workspace ──► Physical Inspection
                                                      │
         ┌────────────────────────────────────────────┴──────────────────────────────┐
         ▼                                            ▼                              ▼
   Step 2: Checklist                            Step 3: Readings               Step 4: Evidence
   (Make, Model, Stamping Plugs, Seal)          (Min, 1/2 Max, Max)            (Device, Seal, Plugs Photos)
         │                                            │                              │
         └────────────────────────────────────────────┬──────────────────────────────┘
                                                      │
                                                      ▼
                                                Step 5: PASS / FAIL Evaluation
                                                      │
                            ┌─────────────────────────┴────────────────────────┐
                            ▼ (PASS)                                           ▼ (FAIL)
                     Generate Certificate                           Mark Rejected / Expired
                            │
                            ▼
4. CERTIFICATE & QR
   Official Form 6 Certificate Generated
   Public Verification Token Created
   Client-Side QR Generated
                            │
                            ▼
5. CITIZEN / CONSUMER
   Scan QR Code (No Login) ──► GET /verify/:token ──► View Authenticity, Validity & Advisory
```

| Step # | Workflow Stage | Responsible Role | Implementation Status |
| :---: | :--- | :--- | :---: |
| **1** | Register instrument & specifications | TRADER | `IMPLEMENTED` |
| **2** | Submit verification application | TRADER | `IMPLEMENTED` |
| **3** | Administrative review & readiness evaluation | AUTHORITY | `IMPLEMENTED` |
| **4** | Candidate recommendation & officer assignment | AUTHORITY | `IMPLEMENTED` |
| **5** | Physical inspection checklist | VERIFIER / GATC | `IMPLEMENTED` |
| **6** | Standard error readings entry & MPE calculation | VERIFIER / GATC | `IMPLEMENTED` |
| **7** | Photographic evidence upload | VERIFIER / GATC | `IMPLEMENTED` |
| **8** | PASS / FAIL verdict submission | VERIFIER / GATC | `IMPLEMENTED` |
| **9** | Form 6 digital certificate generation | SYSTEM / VERIFIER | `IMPLEMENTED` |
| **10**| Scannable QR code generation | SYSTEM / FRONTEND | `IMPLEMENTED` |
| **11**| Unauthenticated public consumer verification | PUBLIC CITIZEN | `IMPLEMENTED` |

---

## 9. Routes & Page Navigation

Navigation is managed via single-page application state in `client/src/App.jsx`. The public QR route operates unauthenticated:

| Route / View Identifier | Target Role | Page Purpose | Implementation Status |
| :--- | :--- | :--- | :--- |
| `/login` (`LoginView`) | Unauthenticated | User credentials login + 1-Click Demo role selector | `IMPLEMENTED` |
| `/verify/:token` (`PublicCertificateVerification`) | Public / Anyone | Unauthenticated consumer QR certificate verification | `IMPLEMENTED` |
| `dashboard` (`TraderDashboard`) | `TRADER` | Summary metrics, expiry warnings, quick actions, instruments table | `IMPLEMENTED` |
| `instruments` (`InstrumentsList`) | `TRADER` | Inventory list of registered weighing instruments | `IMPLEMENTED` |
| `instrument-detail` (`InstrumentDetail`) | `TRADER` | Technical specs, verification scale interval $e$, test history | `IMPLEMENTED` |
| `application-timeline` (`ApplicationTimeline`) | `TRADER` | Live statutory stage progression for submitted applications | `IMPLEMENTED` |
| `authority-dashboard` (`AuthorityDashboard`) | `AUTHORITY` / `ADMIN` | Workload analytics, review queue, officer utilization stats | `IMPLEMENTED` |
| `application-review` (`ApplicationReview`) | `AUTHORITY` | Document verification and readiness review | `IMPLEMENTED` |
| `assignment-support` (`AssignmentDecisionSupport`) | `AUTHORITY` | Proximity scoring, officer assignment & override logging | `IMPLEMENTED` |
| `verifier-dashboard` (`VerifierDashboard`) | `VERIFIER` / `GATC` | Assigned inspection queue with status and due dates | `IMPLEMENTED` |
| `verification-workspace` (`VerificationWorkspace`)| `VERIFIER` / `GATC` | 5-step touch-friendly physical inspection wizard | `IMPLEMENTED` |
| `certificates` (`CertificatesList`) | All Authenticated | Searchable register of issued Form 6 certificates | `IMPLEMENTED` |
| `certificate-view` (`OfficialCertificate`) | All Authenticated | Full official Legal Metrology Form 6 printable certificate | `IMPLEMENTED` |
| `audit-logs` (`AuditLogView`) | `AUTHORITY` / `ADMIN` | Immutable system transaction and compliance event ledger | `IMPLEMENTED` |

---

## 10. Backend REST API Endpoints

All 25 endpoints currently running in `server/server.js`:

| Method | Endpoint Path | Authentication | Authorized Roles | Input | Output Summary | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | None | Anyone | `{ email, password }` | `{ token, user, organization }` | `IMPLEMENTED` |
| `POST` | `/api/auth/logout` | Bearer Token | Authenticated | None | `{ success: true }` | `IMPLEMENTED` |
| `GET` | `/api/auth/users` | Optional | All | None | Array of sanitized user objects | `IMPLEMENTED` |
| `GET` | `/api/instruments` | Bearer Token | All | `?owner_id` (optional) | Array of instruments with category specs | `IMPLEMENTED` |
| `GET` | `/api/instruments/:id` | Bearer Token | All | Route param `:id` | Instrument details + rule sets | `IMPLEMENTED` |
| `POST` | `/api/instruments` | Bearer Token | `TRADER`, `ADMIN` | Instrument specs payload | Created instrument record | `IMPLEMENTED` |
| `GET` | `/api/applications` | Bearer Token | All | `?trader_id`, `?status` | Filtered list of applications | `IMPLEMENTED` |
| `GET` | `/api/applications/:id` | Bearer Token | All | Route param `:id` | Application, instrument & assignment | `IMPLEMENTED` |
| `POST` | `/api/applications` | Bearer Token | `TRADER` | `{ instrument_id, request_type }` | Created application record | `IMPLEMENTED` |
| `POST` | `/api/applications/:id/review` | Bearer Token | `AUTHORITY`, `ADMIN` | `{ status, notes }` | Updated application status | `IMPLEMENTED` |
| `GET` | `/api/applications/:id/candidates` | Bearer Token | `AUTHORITY`, `ADMIN` | Route param `:id` | Ranked list of verifiers & GATCs | `IMPLEMENTED` |
| `POST` | `/api/applications/:id/assign` | Bearer Token | `AUTHORITY`, `ADMIN` | `{ assigned_type, assigned_id, override... }` | Created assignment & appointment | `IMPLEMENTED` |
| `GET` | `/api/verifications/cases` | Bearer Token | `VERIFIER`, `GATC`, `AUTH`| None | Filtered inspection cases queue | `IMPLEMENTED` |
| `GET` | `/api/verifications/cases/:appId` | Bearer Token | `VERIFIER`, `GATC`, `AUTH`| Route param `:appId` | Full workspace data, checklist, readings | `IMPLEMENTED` |
| `POST` | `/api/verifications/cases/:appId/start` | Bearer Token | `VERIFIER`, `GATC` | Route param `:appId` | Initialized verification session | `IMPLEMENTED` |
| `POST` | `/api/verifications/cases/:appId/draft` | Bearer Token | `VERIFIER`, `GATC` | `{ checklist, readings, remarks }` | Saved draft readings and answers | `IMPLEMENTED` |
| `POST` | `/api/verifications/cases/:appId/evidence` | Bearer Token | `VERIFIER`, `GATC` | `multipart/form-data` (file, category) | Uploaded evidence record | `IMPLEMENTED` |
| `DELETE`| `/api/verifications/cases/:appId/evidence/:evidenceId` | Bearer Token | `VERIFIER`, `GATC` | Evidence ID | `{ success: true }` | `IMPLEMENTED` |
| `POST` | `/api/verifications/cases/:appId/submit` | Bearer Token | `VERIFIER`, `GATC` | `{ result: 'PASS'/'FAIL', remarks }` | Completed verification record | `IMPLEMENTED` |
| `POST` | `/api/certificates/generate/:appId` | Bearer Token | `VERIFIER`, `AUTH`, `ADMIN` | Route param `:appId` | Generated Form 6 certificate | `IMPLEMENTED` |
| `GET` | `/api/certificates` | Bearer Token | All | `?trader_id` (optional) | Array of certificates | `IMPLEMENTED` |
| `GET` | `/api/certificates/:id` | Bearer Token | All | Route param `:id` | Full certificate record | `IMPLEMENTED` |
| `GET` | `/api/public/verify/:token` | **None** | **Public** | Route param `:token` | Sanitized public validity payload | `IMPLEMENTED` |
| `GET` | `/api/audit-logs` | Bearer Token | `AUTHORITY`, `ADMIN` | None | Array of immutable audit logs | `IMPLEMENTED` |
| `GET` | `/api/stats` | Bearer Token | All | None | Operational KPI statistics | `IMPLEMENTED` |

---

## 11. Verification System Implementation

The physical verification system is encapsulated in [VerificationWorkspace.jsx](file:///c:/Users/Sahil/OneDrive/Desktop/SIH26036/client/src/views/VerificationWorkspace.jsx) and the `/api/verifications/` endpoints:

1. **Step 1 — Overview & Device Confirmation**:
   * Inspects manufacturer, model, serial number, max/min capacity, and verification scale interval $e$.
   * Verifies operating location and legal trader details.
2. **Step 2 — Statutory Visual & Technical Checklist**:
   * Inspects physical components required under Rule 14 of Legal Metrology General Rules, 2011:
     * Verification Mark / Stamping Plugs intact and accessible.
     * Lead/wire physical security seals intact.
     * Level indicator bubble centered.
     * Zero-setting and tare operation within $\pm 0.25e$.
     * Markings, model approval plate, and serial numbers legible.
3. **Step 3 — Metrological Test Readings & MPE Calculation**:
   * Verifier records standard test weight applied ($L$) and indicated scale display ($I$).
   * Calculates error $E = I - L$.
   * Compares against statutory Maximum Permissible Error (MPE) for Class III NAWI:
     * $0 \le m \le 500e$: $\text{MPE} = \pm 0.5e$ (initial) / $\pm 1.0e$ (in-service)
     * $500e < m \le 2000e$: $\text{MPE} = \pm 1.0e$ (initial) / $\pm 2.0e$ (in-service)
     * $2000e < m \le 10000e$: $\text{MPE} = \pm 1.5e$ (initial) / $\pm 3.0e$ (in-service)
   * System highlights green (`PASS`) or red (`FAIL`) in real-time.
4. **Step 4 — Photographic Evidence Capture**:
   * Ingests high-resolution inspection photos via `multer`:
     * Photo of device display showing serial number.
     * Photo of physical stamping plugs.
     * Photo of applied lead seal.
     * Calibration test certificate (for GATC labs).
5. **Step 5 — Final Assessment & Statutory Verdict**:
   * Synthesizes checklist results and error readings.
   * If any mandatory check fails or error exceeds MPE, the submission enforces a `FAIL` verdict.
   * On `PASS`, unlocks instant Form 6 certificate generation.

---

## 12. Certificate System Implementation

1. **Eligibility Enforcement**:
   * A certificate **cannot** be generated for uncompleted, in-progress, or failed verifications.
   * The endpoint `/api/certificates/generate/:appId` checks that `verifications.result === 'PASS'`.
2. **Numbering & Token Format**:
   * Certificate Number: `CERT-YYYY-<CATEGORY_CODE>-<RANDOM_6_DIGIT>` (e.g. `CERT-2026-NAWI-849201`).
   * Public Token: `PUB-<SHA256_HEX_16>` (e.g. `PUB-9b1c7f4a2d8e3f01`).
3. **Validity Period**:
   * Read from `rule_sets.validity_period_months` (defaults to 12 months for commercial trade).
   * Expiration date calculated: `valid_until = issue_date + 12 months`.
4. **Official Form 6 Layout**:
   * Follows Schedule XI Form 6 format under Legal Metrology (General) Rules, 2011.
   * Includes National Emblem placeholder, government directorate name, fee received, officer signature block, and embedded dynamic QR code.
   * Includes dedicated `@media print` CSS stylesheet for one-click browser printing.

---

## 13. Public QR Verification Implementation

1. **Zero Authentication Required**:
   * Accessible by any citizen or consumer by scanning the physical QR sticker or visiting `/verify/:token`.
2. **Backend Engine (`GET /api/public/verify/:token`)**:
   * Queries `certificates` joined with `instruments` and `verifications`.
   * Evaluates validity dynamically against the current time:
     * If `valid_until > now` and `status === 'VALID'` $\rightarrow$ **`VALID`**.
     * If `valid_until < now` $\rightarrow$ **`EXPIRED`**.
     * If token does not exist $\rightarrow$ **`NOT_FOUND` / `INVALID`**.
3. **Data Privacy Protection**:
   * The public payload exposes **only** consumer protection particulars:
     * Certificate Number, Validity Dates, Issuing Office.
     * Instrument Make, Model, Serial Number, Accuracy Class.
     * Business Name and District.
   * Personal trader phone numbers, email addresses, fees paid, and internal database IDs are strictly omitted.

---

## 14. Security Assessment

### 14.1 Working Security Controls
* **Salted Password Hashing**: Passwords are never stored in plaintext. Hashed with Node's native `scryptSync` with unique 16-byte random salts.
* **SQL Injection Prevention**: 100% of SQLite queries utilize parameterized prepared statements (`db.prepare('... ? ...').run/get/all`).
* **Server-Side Role Enforcement**: Role checks are resolved from the database session record, preventing client-side role manipulation.
* **Multipart File Ingestion Safety**: Multer disk storage restricts upload directory paths, enforces a 10MB maximum file size limit, and sanitizes filenames using random hexadecimal suffixes.
* **Timing Attack Prevention**: Password comparison utilizes `crypto.timingSafeEqual`.

### 14.2 Known Security Gaps for Future Phases
* **HTTP Only (Local Development)**: HTTPS is not configured for the local development server.
* **No Rate Limiting**: The `/api/auth/login` and `/api/public/verify/:token` endpoints do not yet implement rate limiting (e.g. `express-rate-limit`).
* **Static File Serving**: Static files under `/uploads` are served without authentication checks.
* **Session Storage Invalidation on Server Restart**: Sessions in SQLite persist across restarts, but tokens do not have a sliding expiration refresh mechanism.

---

## 15. Current MVP Status Checklist

| Feature Area | Status | Notes |
| :--- | :---: | :--- |
| **Authentication System** | `[x]` | Seeded demo accounts, scrypt hashing, session tokens, 1-Click login. |
| **Trader Portal** | `[x]` | Dashboard, instrument inventory, detail cards, application timeline. |
| **Instrument Registration** | `[x]` | Validation of make, model, serial number uniqueness, and Class III specs. |
| **Application Submission** | `[x]` | Generation of application numbers and status tracking. |
| **Authority Review Queue** | `[x]` | Review queue, verification status transitions (`UNDER_REVIEW`). |
| **Assignment Engine** | `[x]` | Officer proximity scoring, assignment logging, and override recording. |
| **Verifier Cases Queue** | `[x]` | Role-gated queue of assigned inspections. |
| **Verification Workspace** | `[x]` | 5-step wizard, interactive checklist, reading inputs. |
| **MPE Automated Error Calculation**| `[x]` | Evaluates error compliance against Legal Metrology 2011 limits. |
| **Evidence Photos Upload** | `[x]` | Multer disk storage with captioning and deletion. |
| **PASS / FAIL Decision Engine** | `[x]` | Blocks invalid submissions; updates application status. |
| **Digital Certificate Issuance** | `[x]` | Form 6 numbering, 12-month validity calculation, token creation. |
| **QR Code Generation** | `[x]` | Client-side SVG/PNG rendering pointing to unauthenticated public route. |
| **Public QR Verification Page** | `[x]` | Mobile-friendly public verification with dynamic validity engine. |
| **Audit Logging** | `[x]` | Comprehensive mutation logging in `audit_logs` table. |
| **Re-verification Expiry Warnings** | `[~]` | Warnings displayed in UI; automated push alerts/SMS not connected. |
| **GATC Laboratory Cases** | `[~]` | Shares Verifier workspace; custom lab checklist schemas partially stubbed. |
| **Notifications (SMS / Email)** | `[ ]` | Out of scope for MVP Phase 1; logged to console. |
| **Payment Gateway Integration** | `[ ]` | Out of scope for MVP Phase 1; marked as `PAID`/`EXEMPT`. |
| **External Gov SSO (DigiLocker)** | `[ ]` | Out of scope for MVP Phase 1; seeded demo accounts used. |

---

## 16. Known Issues & Technical Debt

1. **Dual Routing Architecture**:
   * Application routing is predominantly state-based (`activeTab` state in `App.jsx`) with a special popstate listener for `/verify/:token`. Full URL route parity using `react-router` will be beneficial for deep-linking in future phases.
2. **Local Evidence Storage**:
   * Uploaded evidence photos are written to local disk (`server/uploads/evidence`). In multi-server or cloud deployments, this needs transition to S3 or GCS object storage.
3. **Database Concurrency**:
   * Uses single-process SQLite via `node:sqlite`. While adequate for MVP evaluation and local demos, transition to PostgreSQL is recommended for large multi-state production deployments.
4. **Single Category Seeded**:
   * Currently, the system ruleset and checklist are populated for `NAWI_CLASS_III` (Commercial Weighing Instruments). Additional categories (e.g. Weighbridges, Fuel Dispensers, Water Meters) need ruleset definition in `rule_sets`.

---

## 17. Recommended Next Development Priorities

1. **Automated Expiry & Re-verification Alerts**:
   * Implement a background scheduler (e.g. node-cron) to automatically flag certificates nearing their 12-month expiration date (30-day and 15-day notices) and trigger renewal drafts.
2. **Rate Limiting & Brute-Force Protection**:
   * Attach `express-rate-limit` to `/api/auth/login` and `/api/public/verify/:token` to protect against credential stuffing and automated scraping.
3. **Dedicated GATC Laboratory Checklist Expansion**:
   * Provide custom checklist schemas for high-precision laboratory calibrations (Class I/II balances and testing masses).
4. **Production PDF Rendering Engine**:
   * Supplement the current browser `@media print` layout with server-side PDF compilation (e.g. `pdfkit` or `puppeteer`) for direct binary PDF downloads.
5. **Offline PWA Support**:
   * Implement Service Worker caching for field verifiers working in rural weekly markets (*haats*) without cellular data.
