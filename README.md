# CertifyMetric (SIH 26036)

> **Online Statutory Verification & Certification Platform for Weighing and Measuring Instruments**  
> Developed for the Department of Consumer Affairs (Legal Metrology Division), Government of India.

---

## 🏛️ Project Overview

**CertifyMetric** is a national-grade statutory metrological verification and compliance platform that digitizes the end-to-end lifecycle of commercial weights and measures under the **Legal Metrology Act, 2009** and **Legal Metrology (General) Rules, 2011**.

The platform is modeled after proven government metrology systems (such as the Kerala LMOMS verification framework), delivering a transparent, tamper-proof, and streamlined experience for applicants, enforcement officers, accredited laboratories, and the public.

---

## 🚀 Key Architectural Pillars & Workflows

### 1. 🧑‍💼 Trader / Applicant Experience (LMOMS-Aligned Workflow)
* **Digital Instrument Registry**: Register, update, and manage commercial weighing and measuring instruments with capacity, verification scale interval ($e$), serial numbers, and premises location.
* **Full-Page Multi-Step Statutory Verification**:
  1. *Instrument Selection*: Select existing instrument or register a new one.
  2. *Verification Mode & Type*: Initial (Original) verification or Re-verification under Section 24; In-Situ (On-Site) visit or Camp / Centre presentation.
  3. *Supporting Evidence*: Upload commercial invoices, prior calibration certificates, and model approval documents.
  4. *Statutory Fee Calculation*: Real-time Schedule V statutory fee computation with visit charges and user convenience fee.
  5. *Submission & Remittance*: Instant application filing with integrated fee payment or challan reference.
* **Statutory Return Clarification & Resubmission**: View officer deficiency remarks in the **Application Details Modal** or Return Notice Banner, update documents, and resubmit without re-filing or paying extra statutory fees.
* **Comprehensive Application Details Modal**: Full inspection of technical specifications, fee breakdown, assigned officer/lab, documents, and lifecycle status.
* **Official Form 6 Certificate**: Instant access to digital verification certificates with cryptographic QR tokens.

### 2. 🛡️ Authority Review & Assignment Workspace (Legal Metrology Officer)
* **Application Review Queue**: Verify instrument eligibility against Schedule V classes (Commercial NAWI Class III, etc.).
* **Automated & Manual Allocation**: Smart load-balanced assignment of field verifiers or GATC labs, with recorded authority override capability.
* **Statutory Actions**: Approve, return for rectification with detailed remarks, or reject on statutory grounds.
* **Final Certificate Sign-off**: Authorize physical verification outcomes and trigger Form 6 certificate generation.

### 3. 🔍 Field Verifier & Inspector Workspace
* **Assigned Inspection Workspace**: Step-by-step digital verification matrix.
* **Metrological Testing**:
  * *Zero Load Test*
  * *Minimum Capacity Test*
  * *Quarter Capacity & Half Capacity Tests*
  * *Maximum Capacity & Eccentricity Tests*
  * *Repeatability Analysis*
* **Automated MPE Compliance Check**: Real-time evaluation of error against Maximum Permissible Error (MPE) thresholds.
* **Evidence & Tamper-Seal Logging**: Photo capture of physical lead/security seals, nameplates, and verified readings.

### 4. 🔬 GATC Laboratory Testing Workspace
* **Government Approved Test Centre**: Lab bench verification workflows for high-precision, industrial, and specialized measuring instruments.

### 5. ⚙️ Platform Administration & Public Transparency
* **Admin Governance Console**: Manage legal metrology organizations, jurisdictions, statutory fee schedules, and user credentials.
* **Audit Trail**: Immutable event logs for all statutory decisions and status transitions.
* **Public QR Verification**: Scan QR code on any physical certificate to verify statutory validity in real time without authentication.

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS / Vanilla CSS | Responsive SPA with custom glassmorphism design system |
| **Backend** | Node.js, Express.js | REST API with role-based access control (RBAC) |
| **Database** | MongoDB Atlas (Mongoose ODM) & SQLite fallback | Scalable cloud document persistence with schema enforcement |
| **Security** | Scrypt Password Hashing, Session Management | Secure cryptographic password storage and session validation |
| **Storage** | Multer File Storage | Persistent upload handler for test evidence and documents |

---

## 📦 Quick Start & Local Setup

### Prerequisites
* **Node.js**: `v20.0.0` or higher
* **npm**: `v10.0.0` or higher
* **MongoDB**: Local MongoDB instance or MongoDB Atlas connection string (configured in `.env` / `server/.env`)

### 1. Installation
```bash
# Clone repository
git clone https://github.com/Sahil7414/CertifyMetric.git
cd CertifyMetric

# Install dependencies for root, client, and server
npm install
npm --prefix client install
npm --prefix server install
```

### 2. Environment Configuration
Create environment files from templates:
```bash
# Server configuration
cp server/.env.example server/.env

# Client configuration
cp client/.env.example client/.env.local
```

Configure your `MONGODB_URI` in `server/.env` (or use the configured default).

### 3. Seed Demo Data & User Credentials
```bash
node server/scripts/seedDemoUsers.js
```
*Seeds standard statutory reference data, sample commercial instruments, mock return applications, and 5 demo role accounts.*

### 4. Run Development Servers
```bash
# Concurrent launcher for Frontend (:5173) and Backend API (:4000)
node start-dev.js
```
Visit **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## 🔑 Demo Role Credentials

| Role | Username / Email | Password | Primary Workspace |
| :--- | :--- | :--- | :--- |
| **Trader / Applicant** | `demo.trader@certifymetric.local` | `DemoTrader@2026` | Trader Dashboard, Apply Verification, Instrument Registry |
| **Authority Officer** | `demo.authority@certifymetric.local` | `DemoAuthority@2026` | Authority Review, Allocations, Statutory Decisions |
| **Field Verifier** | `demo.verifier@certifymetric.local` | `DemoVerifier@2026` | Inspection Workspace, Test Matrix, Evidence Capture |
| **GATC Lab** | `demo.gatc@certifymetric.local` | `DemoGatc@2026` | Laboratory Testing & Batch Certifications |
| **Platform Admin** | `demo.admin@certifymetric.local` | `DemoAdmin@2026` | Admin Console, Audit Logs, Organization Governance |

*Tip: You can also use the 1-Click Role Switcher on the Login screen (`http://localhost:5173`).*

---

## 📂 Project Directory Structure

```
├── client/                                 # Vite + React 19 Frontend SPA
│   ├── src/
│   │   ├── api.js                          # Centralized API service layer
│   │   ├── App.jsx                         # Main router & role-based view switcher
│   │   ├── components/
│   │   │   ├── AppSidebar.jsx              # Responsive collapsible sidebar navigation
│   │   │   ├── ApplicationDetailsModal.jsx # Comprehensive particulars & return modal
│   │   │   ├── Navbar.jsx                  # Top navigation bar & user profile
│   │   │   ├── StatusBadge.jsx             # Statutory lifecycle badge indicators
│   │   │   └── QRCodeModal.jsx             # Cryptographic QR viewer modal
│   │   └── views/
│   │       ├── ApplyVerificationView.jsx   # Dedicated full-page verification application
│   │       ├── ApplicationsList.jsx        # Applications list with statutory return notices
│   │       ├── ApplicationTimeline.jsx     # Full lifecycle stepper & technical specs
│   │       ├── TraderDashboard.jsx         # Applicant control center & quick actions
│   │       ├── AuthorityDashboard.jsx      # Officer operational dashboard
│   │       ├── ApplicationReview.jsx       # Statutory review, assignment & return modal
│   │       ├── VerifierDashboard.jsx       # Inspector queue
│   │       ├── VerificationWorkspace.jsx   # 5-Step MPE inspection wizard
│   │       ├── GatcDashboard.jsx           # Lab testing workspace
│   │       ├── AdminDashboard.jsx          # Admin audit logs & system stats
│   │       ├── OfficialCertificate.jsx     # Form 6 statutory certificate
│   │       └── PublicVerify.jsx            # Unauthenticated public QR scanner
│   └── package.json
│
├── server/                                 # Express.js REST API Backend
│   ├── models/
│   │   └── index.js                        # Mongoose schemas (Users, Instruments, Applications, etc.)
│   ├── permissions.js                      # Statutory Role-Based Access Control (RBAC)
│   ├── auth-utils.js                       # Cryptographic scrypt password hashing
│   ├── scripts/
│   │   └── seedDemoUsers.js                # Database initialization and demo seeding
│   ├── uploads/evidence/                   # Physical inspection photos & documents
│   ├── server.js                           # Express routes, workflow state machine, error handling
│   └── package.json
│
├── docs/                                   # Architectural & Engineering Documentation
│   ├── ARCHITECTURE.md                     # System architecture & sequence diagrams
│   ├── DEVELOPMENT.md                      # Contributor guidelines & invariants
│   ├── SETUP.md                            # Complete setup & troubleshooting manual
│   └── DEPLOYMENT.md                       # Production cloud deployment guide
│
├── start-dev.js                            # Concurrent multi-process launcher
└── package.json                            # Root scripts & dev tooling
```

---

## 📜 Statutory Standards Compliance

* **The Legal Metrology Act, 2009** (Section 24: Mandatory Verification & Re-verification).
* **The Legal Metrology (General) Rules, 2011** (Schedule V: Testing procedure for Non-Automatic Weighing Instruments).
* **Form 6 Certificate of Verification**: Automated digital certificate generation with verifiable authenticity token.
* **Maximum Permissible Error (MPE)**: Dynamic tolerance checks at nominal test loads ($0, \text{Min}, \frac{1}{4}\text{Max}, \frac{1}{2}\text{Max}, \text{Max}$).

---

## 📄 License & Attribution

Developed for **Smart India Hackathon (SIH 26036)** by Team CertifyMetric under the guidance of the Ministry of Consumer Affairs, Food & Public Distribution, Government of India.
