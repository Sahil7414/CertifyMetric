# System Architecture

This document describes the actual runtime architecture, data flows, and technical components implemented in the CertifyMetric platform (`SIH26036`).

---

## 1. High-Level Architecture Diagram

```mermaid
graph TD
    %% User Personas
    subgraph Users ["Statutory Personas & Citizens"]
        Trader["Trader / Manufacturer"]
        Authority["Legal Metrology Officer (Authority)"]
        Verifier["Field Verifier / Inspector"]
        GATC["GATC Testing Laboratory"]
        Admin["Platform Administrator"]
        PublicCitizen["Public Consumer / Citizen (QR Scan)"]
    end

    %% Frontend Layer
    subgraph ClientApp ["Frontend Client (React 19 + Vite SPA)"]
        Router["Route & Session Guard (App.jsx)"]
        LoginView["Login & 1-Click Demo Selector"]
        TraderDash["Trader Dashboard & Registry"]
        AuthDash["Operations Dashboard & Review"]
        VerifierWS["Verification Workspace Wizard (5-Step)"]
        CertViewer["Official Form 6 Certificate Viewer"]
        PublicVerify["Public Verification View (/verify/:token)"]
        ApiClient["API Client & Bearer Token Manager (api.js)"]
        QREngine["Client QR Generator (qrcode npm)"]
    end

    %% Backend Layer
    subgraph ServerApp ["Backend REST API (Node.js + Express)"]
        AuthMiddleware["Session & RBAC Middleware (getActor)"]
        AuthEndpoints["/api/auth (Login, Logout, Users)"]
        InstrumentAPI["/api/instruments (Registry CRUD)"]
        ApplicationAPI["/api/applications (Review, Assign, Transition)"]
        VerificationAPI["/api/verifications (Cases, Readings, Evidence, Submit)"]
        CertificateAPI["/api/certificates (Generate, List, Form 6)"]
        PublicVerifyAPI["/api/public/verify/:token (Unauthenticated Lookup)"]
        AuditAPI["/api/audit-logs & /api/stats"]
        MulterStorage["Multer Disk Storage (/uploads/evidence)"]
    end

    %% Data Storage Layer
    subgraph Persistence ["Data Storage Layer (Node.js Native SQLite)"]
        DB[(metrology.db)]
        UsersTable["users & user_sessions"]
        InstrumentsTable["instruments & categories & rule_sets"]
        AppsTable["applications, assignments, appointments"]
        VerificationsTable["verifications, readings, checklist, evidence"]
        CertsTable["certificates"]
        AuditTable["audit_logs"]
        EvidenceFS["File System: server/uploads/evidence"]
    end

    %% User Interactions to Client
    Trader -->|Authenticates| LoginView
    Authority -->|Authenticates| LoginView
    Verifier -->|Authenticates| LoginView
    GATC -->|Authenticates| LoginView
    Admin -->|Authenticates| LoginView
    PublicCitizen -->|Scans QR (No Auth)| PublicVerify

    LoginView --> Router
    Router --> TraderDash
    Router --> AuthDash
    Router --> VerifierWS
    Router --> CertViewer
    Router --> PublicVerify

    TraderDash --> ApiClient
    AuthDash --> ApiClient
    VerifierWS --> ApiClient
    CertViewer --> ApiClient
    CertViewer --> QREngine
    PublicVerify --> ApiClient

    %% Client to Server
    ApiClient -->|HTTP / JSON + Bearer Token| AuthMiddleware
    PublicVerify -->|HTTP GET (Public Token)| PublicVerifyAPI

    AuthMiddleware --> AuthEndpoints
    AuthMiddleware --> InstrumentAPI
    AuthMiddleware --> ApplicationAPI
    AuthMiddleware --> VerificationAPI
    AuthMiddleware --> CertificateAPI
    AuthMiddleware --> AuditAPI

    %% Server to Persistence
    AuthEndpoints --> UsersTable
    InstrumentAPI --> InstrumentsTable
    ApplicationAPI --> AppsTable
    VerificationAPI --> VerificationsTable
    VerificationAPI --> MulterStorage
    MulterStorage --> EvidenceFS
    CertificateAPI --> CertsTable
    PublicVerifyAPI --> CertsTable
    PublicVerifyAPI --> InstrumentsTable
    PublicVerifyAPI --> VerificationsTable
    ServerApp --> AuditTable
```

---

## 2. Layer Descriptions

### 2.1 Client Application Layer (`client/`)
* **Technology**: React 19 SPA powered by Vite 8 with Tailwind CSS.
* **Component Architecture**: Modular view components (`views/`) wrapped by a central state router (`App.jsx`) and consistent government branding navigation (`Navbar.jsx`).
* **Session Management**: JWT-style session tokens stored in `localStorage` and dispatched via `Authorization: Bearer <token>` on all mutation requests.
* **No Direct Role Overrides**: User role is derived strictly from the authenticated database payload, locking client tabs to designated authority.
* **QR Engine**: Client-side rendering of scannable SVG and data URIs via the `qrcode` library, pointing to `/verify/:token`.

### 2.2 API & Business Logic Layer (`server/`)
* **Technology**: Express.js running on Node.js v22 (ES Modules).
* **Actor Resolution (`getActor`)**: Authenticates Bearer tokens against `user_sessions` and resolves the authoritative user record directly from the `users` SQLite table.
* **Strict Role-Based Access Control**: Rejects privilege elevation attacks. For example, a Trader token attempting to review applications or query audit logs receives `HTTP 403 Forbidden`.
* **Statutory State Machine**:
  `SUBMITTED` $\rightarrow$ `UNDER_REVIEW` $\rightarrow$ `ASSIGNED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `PASSED` / `FAILED` $\rightarrow$ `CERTIFICATE_ISSUED`.
* **Evidence Ingestion**: Uses `multer.diskStorage` to validate and store timestamped inspection photographs and calibration certificates on disk.

### 2.3 Data Storage Layer (`server/metrology.db`)
* **Technology**: SQLite managed through Node.js native `node:sqlite` (`DatabaseSync`).
* **Direct Prepared Statements**: Zero ORM overhead. All queries use parameterized statements (`db.prepare(...).run/get/all`) providing native protection against SQL injection.
* **Audit Trail**: Every significant business mutation (login, instrument creation, application assignment, inspection submission, certificate generation) writes an immutable record to the `audit_logs` table.
