# SIH26036 — DEVELOPMENT PHASES

## Phase 0 — Context & Scope

Goal:
Freeze what the MVP is.

Tasks:
- read all context files;
- confirm users;
- confirm vertical slice;
- select MVP instrument/category;
- identify unresolved domain assumptions.

Output:
Approved MVP scope.

---

## Phase 1 — UX / Product Design

Goal:
Design the complete MVP journey before coding.

Order:

### Trader
Login
→ Dashboard
→ Instruments
→ Add Instrument
→ Instrument Details
→ Request Verification
→ Application Tracking

### Authority
Dashboard
→ Application Review
→ Assignment
→ Scheduling

### Verifier/GATC
Dashboard
→ Verification Workspace
→ Readings
→ Evidence
→ Result

### Certificate
Certificate
→ QR
→ Public Verification

Output:
Approved UI/UX and component system.

---

## Phase 2 — Data Model

Goal:
Freeze MVP database schema.

Tasks:
- entities;
- relationships;
- indexes;
- enums/state machine;
- permissions;
- audit structure.

Output:
Migration-ready schema.

---

## Phase 3 — Backend Foundation

Tasks:
- project setup;
- database;
- authentication;
- RBAC;
- validation;
- error handling;
- audit logging.

Output:
Secure backend foundation.

---

## Phase 4 — Trader Flow

Implement:

Login
→ Instrument
→ Application
→ Tracking

Output:
Trader can submit a real MVP request.

---

## Phase 5 — Authority Flow

Implement:

Review
→ Eligibility
→ Recommendation
→ Assignment/Override
→ Scheduling

Output:
Authority can process the request.

---

## Phase 6 — Verification Flow

Implement:

Assigned case
→ Verification
→ Readings
→ Observations
→ Evidence
→ Result

Output:
Verifier can complete a case.

---

## Phase 7 — Certificate

Implement:

PASS
→ Certificate
→ QR
→ Public Verification

Output:
End-to-end successful case.

---

## Phase 8 — Lifecycle

Implement:
- history;
- validity;
- expiry state;
- re-verification path;
- notifications.

---

## Phase 9 — Testing

Test:
- happy path;
- failed verification;
- unauthorized access;
- invalid transitions;
- assignment override;
- certificate access;
- QR lookup;
- file upload;
- expiry.

---

## Phase 10 — Demo Hardening

Tasks:
- realistic seed data;
- polished empty/loading/error states;
- responsive layout;
- performance;
- demo account setup;
- stable end-to-end script.

---

## Phase 11 — Advanced Features

Only after MVP:
- offline mobile;
- richer analytics;
- AI assistance;
- integrations;
- broader instrument coverage;
- advanced evidence integrity.
