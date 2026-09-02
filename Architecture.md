# SIH26036 — MVP ARCHITECTURE

## 1. Architecture Goal

Build a modular web application that can demonstrate the MVP end-to-end while allowing future expansion to multiple states, instruments, rules and integrations.

## 2. Recommended High-Level Architecture

```text
Web / Mobile Clients
        |
        v
API / Application Layer
        |
  +-----+---------+-----------+-----------+
  |               |           |           |
Auth/RBAC      Workflow    Assignment  Certificate
  |               |           |           |
  +---------------+-----------+-----------+
                  |
             Rule Engine
                  |
             PostgreSQL
                  |
        File/Object Storage
                  |
             Audit Log
```

## 3. Frontend

Recommended:
- responsive web application;
- mobile-first verifier workspace;
- component-based UI;
- role-aware navigation.

The exact framework can be selected during implementation.

## 4. Backend Modules

### Auth
- login;
- session/token handling;
- RBAC.

### Users/Organizations
- users;
- roles;
- organizations;
- jurisdiction/scope.

### Instrument
- instrument;
- category;
- owner;
- history.

### Application
- application creation;
- status transitions;
- documents.

### Eligibility/Rules
- category;
- configured rule set;
- authorization;
- eligibility result.

### Assignment
- candidate generation;
- scoring/recommendation;
- authority override;
- assignment audit.

### Scheduling
- slots;
- appointments;
- schedule state.

### Verification
- checklist;
- readings;
- observations;
- evidence;
- result.

### Certificate
- certificate number;
- rendering;
- QR token;
- lifecycle status.

### Notifications
- in-app notifications;
- future email/SMS integration.

### Audit
- critical state/action history.

## 5. Database Entities

Minimum entities:

- User
- Role
- Permission
- Organization
- Jurisdiction
- Instrument
- InstrumentCategory
- RuleSet
- Application
- ApplicationDocument
- Assignment
- Appointment
- Verification
- VerificationObservation
- VerificationEvidence
- Certificate
- CertificateEvent
- Notification
- AuditLog
- GATC
- GATCAuthorization

Payment can be added when included in the selected demo flow.

## 6. Important Relationships

```text
User → Organization
Trader/User → Instrument
Instrument → Application
Application → Assignment
Assignment → Appointment
Appointment → Verification
Verification → Evidence
Verification → Certificate
Instrument → Verification History
Certificate → QR/Public Verification
```

## 7. API Boundary

Use resource-oriented endpoints.

Examples:

```text
POST   /auth/login
GET    /me

GET    /instruments
POST   /instruments
GET    /instruments/:id

POST   /applications
GET    /applications
GET    /applications/:id

GET    /applications/:id/eligible-verifiers
POST   /applications/:id/assignment
POST   /applications/:id/assignment/override

POST   /appointments
GET    /appointments

GET    /verifications/:id
POST   /verifications/:id/readings
POST   /verifications/:id/evidence
POST   /verifications/:id/result

GET    /certificates/:id
GET    /public/certificates/:token
```

Exact endpoints can change during implementation.

## 8. Workflow Enforcement

State transitions must be enforced on the backend.

The frontend should not be able to:
- mark an application complete without required data;
- create a certificate without a successful result;
- access unauthorized cases;
- modify another organization's data.

## 9. Certificate/QR

Use:
- non-guessable public token;
- certificate ID;
- server-side lookup;
- public-safe response.

Do not put sensitive information directly into the QR.

## 10. File Storage

Evidence and documents should be stored separately from relational records.

Database stores:
- file metadata;
- uploader;
- verification/application;
- timestamps;
- storage reference.

## 11. Security

Minimum:
- hashed passwords;
- RBAC;
- server-side authorization;
- input validation;
- upload validation;
- protected internal records;
- audit logs;
- non-guessable public certificate token.

## 12. MVP Deployment

Prefer a simple deployment architecture:
- frontend;
- backend API;
- PostgreSQL;
- object/file storage.

Avoid unnecessary microservices for MVP.

