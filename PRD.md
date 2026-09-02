# PRD.md — SIH26036 MVP Product Requirements Document

## 1. Document Purpose

This document defines the **MVP product requirements** for SIH Problem Statement 26036:

**Development of an Online Verification System for Weighing and Measuring Instruments**

This PRD is subordinate to `SIH26036_MASTER_CONTEXT.md`.

The goal is not to define the complete national Legal Metrology ecosystem. The goal is to define the **smallest credible, polished, end-to-end MVP** that demonstrates the proposed solution clearly to SIH judges and can later be expanded.

---

# 2. Product Vision

Build a secure digital platform that manages the lifecycle of weighing/measuring instrument verification:

```text
Instrument Owner
      ↓
Instrument Registration
      ↓
Verification Request
      ↓
Application Review / Eligibility
      ↓
Eligible Verification Option
      ↓
Assignment + Scheduling
      ↓
Authorized Verification
      ↓
Readings + Observations + Evidence
      ↓
Result
      ↓
Digital Certificate + QR
      ↓
Public Authentication
      ↓
Instrument History
      ↓
Validity + Re-verification
```

The platform coordinates and records the process.

It does **not** replace the legally required physical/technical verification.

---

# 3. MVP Objective

The MVP must prove one complete verification lifecycle with realistic role-based experiences.

A judge should be able to understand:

1. who uses the system;
2. how an instrument enters the system;
3. how verification is requested;
4. how an eligible verifier/centre is identified;
5. how assignment/scheduling works;
6. how the verification is digitally recorded;
7. how evidence is attached;
8. how a result becomes a certificate;
9. how the certificate is authenticated through QR;
10. how the instrument remains traceable afterward.

---

# 4. MVP Users

## 4.1 Trader / Instrument Owner

Primary external user.

Can:

- register/login;
- manage profile;
- register instruments;
- view instrument records;
- request verification/re-verification;
- upload supporting information;
- track applications;
- view schedules;
- view results;
- access certificates;
- view verification history;
- see validity/due date;
- receive reminders.

---

## 4.2 Authority User

Government-side administrative user.

Can, according to configured permissions:

- view applications in scope;
- review application information;
- see eligibility/verification options;
- view system recommendation;
- assign or override assignment;
- schedule verification;
- monitor pending work;
- monitor workload;
- view verification outcomes;
- access reports/audit information.

The MVP does not assume one universal State hierarchy.

---

## 4.3 Verification Officer / LMO

Authorized verification-side user.

Can:

- view assigned verification cases;
- view instrument/application information;
- open verification checklist;
- enter readings;
- record observations;
- upload evidence;
- submit verification result;
- access relevant verification history.

The exact legal designation and permissions must remain configurable.

---

## 4.4 GATC User

Authorized test-centre user.

Can:

- view cases assigned to the centre;
- verify only instruments/processes within configured authorization;
- manage available verification slots/capacity where applicable;
- perform/record verification;
- submit observations/readings/evidence;
- submit result.

A GATC is not assumed to be eligible for every instrument.

---

## 4.5 Public User

No internal account required.

Can:

- scan certificate QR;
- open public verification page;
- confirm certificate authenticity/status;
- view only public-safe certificate information.

---

# 5. MVP Scope

## IN SCOPE

### Authentication
- role-based login;
- seeded/demo users;
- secure authorization;
- role-specific dashboards.

### Instrument Registry
- add instrument;
- edit allowed details;
- instrument profile;
- instrument status;
- verification history.

### Verification Application
- create verification request;
- create re-verification request;
- attach supporting information;
- track application state.

### Eligibility
- identify applicable configured category/rule set;
- identify eligible verifier/centre options;
- validate basic authorization/jurisdiction constraints.

### Assignment
- show eligible candidates/options;
- show recommendation;
- allow authority override;
- record assignment decision.

### Scheduling
- date/time slot;
- assigned verifier/centre;
- appointment status.

### Verification
- checklist;
- readings;
- observations;
- evidence/photos;
- PASS/FAIL result.

### Certificate
- digital certificate;
- unique certificate ID;
- QR;
- certificate status;
- public verification.

### Lifecycle
- verification date;
- validity/due date;
- expiry status;
- re-verification path.

### Dashboard
- application status;
- pending cases;
- workload;
- expiry;
- recent activity.

### Audit
- important workflow actions;
- assignment changes;
- result submission;
- certificate events.

---

# 6. Explicit MVP OUT OF SCOPE

Do not build these before the core lifecycle works:

- complete coverage of every instrument type;
- complete legal rules for every State;
- live national government integration;
- live eMaap integration without verified API/interface;
- real government identity verification;
- production government payment integration;
- blockchain;
- IoT/hardware integration;
- computer vision measurement;
- AI making legal verification decisions;
- full enforcement/prosecution platform;
- complex national organizational hierarchy;
- advanced predictive analytics;
- large-scale public search;
- arbitrary certificate revocation;
- unrestricted officer self-registration.

These may be future phases.

---

# 7. Core User Journey — Trader

## 7.1 Login

Trader enters credentials.

System identifies:

```text
User
→ Role
→ Organization / Scope
→ Dashboard
```

---

## 7.2 Dashboard

Dashboard should immediately show:

- instruments;
- active verification applications;
- upcoming schedules;
- certificates;
- expiring instruments;
- important notifications.

Primary CTA:

**Add Instrument**

Secondary CTA:

**Request Verification**

---

## 7.3 Add Instrument

Trader enters the minimum information required for the chosen MVP instrument category.

Potential fields:

- instrument type/category;
- manufacturer/brand;
- model;
- serial number;
- capacity/range;
- location;
- purpose/use;
- photographs/documents where required.

The form should not expose irrelevant fields.

---

## 7.4 Instrument Profile

Display:

- Instrument ID;
- category;
- manufacturer;
- model;
- serial number;
- capacity/range;
- current status;
- last verification;
- next due date;
- current certificate;
- verification history.

CTA:

**Request Verification**

---

## 7.5 Verification Request

Trader confirms:

- instrument;
- request type;
- relevant information;
- preferred/available options where applicable;
- supporting documents;
- applicable payment step if configured.

After submission:

```text
Application Created
```

---

## 7.6 Application Tracking

Trader sees a timeline such as:

```text
Submitted
   ↓
Under Review
   ↓
Eligibility Confirmed
   ↓
Assigned
   ↓
Scheduled
   ↓
Verification
   ↓
Result
   ↓
Certificate
```

The UI should make the **current state and next action** obvious.

---

# 8. Authority Journey

## 8.1 Authority Dashboard

Show:

- total applications;
- pending review;
- awaiting assignment;
- scheduled;
- verification pending;
- completed;
- failed;
- expiring;
- workload distribution.

---

## 8.2 Application Review

Authority sees:

- applicant;
- instrument;
- category;
- model/serial;
- documents;
- location;
- request type;
- applicable configured rule set;
- eligibility result;
- eligible verification options.

Actions may include:

- approve/continue;
- request correction;
- reject where configured;
- proceed to assignment.

---

# 9. Smart Assignment

The MVP demonstrates **decision support**, not autonomous legal decision-making.

Process:

```text
Application
    ↓
Hard Eligibility
    ↓
Eligible Officers / GATCs
    ↓
Availability
    ↓
Workload
    ↓
Other configured operational factors
    ↓
Recommended Candidate
```

The authority can:

```text
Accept Recommendation
        OR
Select Another Eligible Candidate
```

If overridden:

- record who changed it;
- timestamp;
- previous recommendation/assignment;
- final assignment;
- reason if required.

---

# 10. Scheduling

After assignment:

```text
Verifier / GATC
        +
Date
        +
Time / Slot
        ↓
Scheduled Verification
```

The exact physical verification arrangement remains configurable.

The UI must not imply that every case requires an LMO to visit the trader's premises.

---

# 11. Verification Officer / GATC Journey

## 11.1 Dashboard

Show:

- today's verifications;
- pending assignments;
- overdue work;
- upcoming schedules;
- completed verifications.

---

## 11.2 Verification Workspace

Display:

### Instrument
- category;
- manufacturer;
- model;
- serial number;
- capacity/range;
- owner;
- relevant location information.

### Checklist
Instrument-specific checks.

### Readings
Structured fields for observed measurements.

### Observations
Free-text/structured notes.

### Evidence
Photos/supporting files.

### Result

```text
PASS
FAIL
```

The exact result options can be expanded later if required.

---

# 12. Evidence

Evidence may include:

- instrument photograph;
- serial/nameplate photograph;
- relevant markings;
- verification evidence;
- supporting document.

Every evidence item should be associated with:

- verification;
- uploader;
- timestamp.

Optional future controls:

- location metadata;
- device metadata;
- tamper/evidence integrity mechanisms.

---

# 13. Verification Result

## PASS

```text
Verification
    ↓
PASS
    ↓
Certificate Generation
```

## FAIL

```text
Verification
    ↓
FAIL
    ↓
Reason / Observations
    ↓
Applicable Next Step
    ↓
Re-verification where applicable
```

Do not invent legal consequences beyond the configured process.

---

# 14. Certificate Journey

After successful verification:

```text
Result
 ↓
Certificate
 ↓
Certificate Number
 ↓
QR
 ↓
Digital Record
```

Certificate should include appropriate:

- certificate number;
- instrument identity;
- owner information;
- verification date;
- validity/due date;
- issuing/verifying information;
- relevant verification information;
- QR.

Exact certificate format remains configurable.

---

# 15. Public QR Verification

Public flow:

```text
Scan QR
   ↓
Official Verification Page
   ↓
Lookup Certificate
   ↓
Status
```

Possible status examples:

- VALID;
- EXPIRED;
- INVALID;
- CANCELLED/SUPERSEDED where implemented.

Only public-safe information is displayed.

The QR should contain or resolve through a non-guessable identifier/token rather than exposing sensitive data directly.

---

# 16. Instrument Lifecycle

The instrument is persistent.

Example:

```text
Instrument
  │
  ├── Verification #1
  │      └── Certificate #1
  │
  ├── Verification #2
  │      └── Certificate #2
  │
  └── Current Status
```

This allows the system to provide:

- current verification status;
- certificate history;
- verification history;
- due date;
- re-verification continuity.

---

# 17. Notifications

MVP notifications:

### Trader
- application submitted;
- correction requested;
- assignment/schedule;
- verification completed;
- result;
- certificate issued;
- expiry reminder.

### Verifier
- new assignment;
- schedule;
- changed assignment.

### Authority
- pending workload;
- overdue cases;
- expiry overview.

Channels can initially be in-app notifications.

Email/SMS/WhatsApp can be added later.

---

# 18. Core Status Model

Use a simple state machine.

```text
DRAFT
 ↓
SUBMITTED
 ↓
UNDER_REVIEW
 ↓
ELIGIBLE
 ↓
AWAITING_ASSIGNMENT
 ↓
ASSIGNED
 ↓
SCHEDULED
 ↓
VERIFICATION_IN_PROGRESS
 ↓
RESULT_SUBMITTED
```

Success:

```text
RESULT_SUBMITTED
 ↓
PASSED
 ↓
CERTIFICATE_ISSUED
 ↓
ACTIVE
 ↓
EXPIRING
 ↓
EXPIRED / RE-VERIFICATION_DUE
```

Failure:

```text
RESULT_SUBMITTED
 ↓
FAILED
 ↓
APPLICABLE_NEXT_STEP
 ↓
RE-VERIFICATION
```

The backend, not the frontend, must enforce valid state transitions.

---

# 19. Core Entities

Minimum MVP data model:

```text
User
Role
Permission
Organization
Jurisdiction
Instrument
InstrumentCategory
RuleSet
Application
ApplicationDocument
Assignment
Appointment
Verification
VerificationObservation
VerificationEvidence
Certificate
CertificateEvent
Notification
AuditLog
GATC
GATCAuthorization
```

Payment can be included as a separate entity if payment is part of the selected demo workflow.

---

# 20. MVP Permission Model

| Capability | Trader | Officer | GATC | Authority | Public |
|---|---:|---:|---:|---:|---:|
| Register instrument | ✓ | — | — | — | — |
| Submit application | ✓ | — | — | — | — |
| View own application | ✓ | — | — | — | — |
| View assigned work | — | ✓ | ✓ | ✓ | — |
| Enter verification data | — | ✓ | ✓ | configured | — |
| Upload evidence | — | ✓ | ✓ | configured | — |
| Assignment control | — | — | — | ✓ | — |
| View certificate | ✓ | ✓ | ✓ | ✓ | public-safe |
| QR verification | ✓ | ✓ | ✓ | ✓ | ✓ |

---

# 21. Non-Functional Requirements

## Security

- secure authentication;
- server-side authorization;
- RBAC;
- secure password storage;
- input validation;
- file validation;
- protected evidence;
- audit logging;
- non-guessable public certificate identifiers.

## Usability

- responsive;
- mobile-friendly verifier experience;
- clear current status;
- clear next action;
- accessible forms;
- low cognitive load.

## Reliability

- transactional state changes;
- no duplicate certificate generation;
- auditable assignment;
- safe file upload;
- graceful failure handling.

## Performance

MVP should feel responsive under realistic demo data.

Do not optimize for national-scale infrastructure before proving the workflow.

---

# 22. UX Requirements

The product should look:

- professional;
- trustworthy;
- modern;
- clean;
- government-appropriate;
- visually polished.

Avoid:

- excessive gradients;
- excessive glassmorphism;
- giant decorative illustrations;
- unnecessary 3D;
- overly futuristic AI styling;
- excessive animation;
- decorative dashboards that hide operational information.

The interface should prioritize:

```text
Status
→ Context
→ Action
```

---

# 23. Required MVP Screens

## Authentication
1. Login

## Trader
2. Trader Dashboard
3. My Instruments
4. Add Instrument
5. Instrument Details
6. Request Verification
7. Application Tracking
8. Certificate Details

## Authority
9. Authority Dashboard
10. Application Review
11. Assignment / Allocation
12. Scheduling

## Verifier / GATC
13. Verification Dashboard
14. Verification Workspace
15. Checklist + Readings
16. Evidence
17. Result

## Public
18. QR Verification

These screens can be combined where appropriate; the list is a functional inventory, not a requirement for 18 separate pages.

---

# 24. MVP Demo Data

Seed realistic but fictional data.

Example:

```text
Trader:
Demo Retail Store

Instrument:
Commercial Weighing Instrument

Manufacturer:
Demo Instruments Pvt. Ltd.

Model:
DW-30

Serial:
DW30-2026-00124

Category:
Configured MVP category

Location:
Demo District

Verifier:
Demo Authorized Officer

GATC:
Demo Approved Test Centre
```

Do not use fake real government officials.

---

# 25. Demo Story

The demo should tell one simple story:

> A trader has a regulated weighing instrument that needs verification. They register the instrument and submit a verification request. The system checks the configured eligibility rules and presents an eligible verification option with a smart recommendation. The authority can accept or override the recommendation. A verifier receives the assignment, records readings and evidence, and submits the result. The system generates a digital certificate with QR authentication. The trader can view the certificate and the public can independently verify it. The instrument remains in the system with its verification history and future due date.

---

# 26. Success Criteria

The MVP succeeds if a judge can see, without explanation:

### Before
- fragmented/manual lifecycle;
- difficulty tracking;
- certificate/history problem.

### After
- one digital lifecycle;
- transparent status;
- coordinated assignment;
- digital verification record;
- authenticated certificate;
- lifecycle tracking.

The demo must work from start to finish without relying on external government systems.

---

# 27. Future Enhancements

After MVP:

1. multi-state configuration;
2. advanced organizational scopes;
3. offline mobile verification;
4. richer evidence integrity;
5. automated expiry communication;
6. advanced workload forecasting;
7. anomaly detection;
8. document extraction;
9. government identity integration;
10. payment integration;
11. state/national system integration;
12. eMaap/API integration if officially available;
13. broader instrument coverage.

---

# 28. Product Guardrails

Never implement a domain assumption just because it makes the demo easier.

If uncertain:

```text
Unknown
 ↓
Configurable
 ↓
Research / validate
 ↓
Freeze
```

If a feature is our innovation:

> label it as a proposed product capability.

If it is a legal/process requirement:

> verify it before hard-coding.

---

# 29. MVP Definition of Done

The MVP is considered complete when:

- Trader can log in;
- Trader can register an instrument;
- Trader can submit a verification request;
- system can evaluate configured eligibility;
- eligible verifier/centre options can be shown;
- authority can assign;
- authority can override recommendation;
- verification can be scheduled;
- verifier/GATC can receive case;
- verifier can enter readings;
- verifier can add observations;
- verifier can upload evidence;
- verifier can submit PASS/FAIL;
- PASS can generate a certificate;
- certificate has QR;
- public can verify QR;
- instrument history is stored;
- validity/due date is stored;
- expiry state can be demonstrated;
- all critical actions are auditable.

---

# 30. Development Rule

**Do not expand the MVP until the complete vertical slice works.**

Priority:

```text
Correct Workflow
      ↓
Correct Data
      ↓
Correct Permissions
      ↓
Correct UI
      ↓
Visual Polish
      ↓
Advanced Features
```

The first release should be **small but complete**, not large but disconnected.

---

# 31. Next Document

After this PRD, the next development document should be:

**`Architecture.md`**

It should define:

- application architecture;
- modules;
- database relationships;
- API boundaries;
- authentication/authorization architecture;
- rule engine architecture;
- assignment engine;
- certificate/QR architecture;
- file/evidence storage;
- audit architecture;
- frontend/backend boundaries.

