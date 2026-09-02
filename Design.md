# SIH26036 — MVP UI/UX DESIGN SYSTEM

## 1. Design Goal

The interface should look like a serious modern government digital service.

It should be:
- clean;
- professional;
- trustworthy;
- accessible;
- information-dense without clutter;
- easy to demonstrate.

## 2. Avoid

- excessive gradients;
- excessive glassmorphism;
- giant illustrations;
- unnecessary 3D;
- futuristic AI aesthetics;
- excessive animation;
- overly decorative dashboards.

## 3. UX Principle

Every screen should prioritize:

```text
STATUS
  ↓
CONTEXT
  ↓
NEXT ACTION
```

A user should quickly understand:
- where they are;
- what happened;
- what is pending;
- what they can do next.

## 4. Visual Language

Recommended:
- light neutral base;
- restrained primary brand color;
- semantic status colors;
- clear typography;
- strong spacing;
- consistent cards;
- readable tables;
- clear badges.

## 5. Responsive Strategy

### Trader
Desktop + mobile responsive.

### Authority
Desktop-first with responsive support.

### Verifier
Mobile-first because the verification workspace may be used during operational work.

### Public QR
Mobile-first.

## 6. Navigation

### Trader
Dashboard
Instruments
Applications
Certificates
Notifications
Profile

### Authority
Dashboard
Applications
Assignments
Schedule
Monitoring
Reports
Settings

### Verifier/GATC
Dashboard
Assignments
Schedule
Verification
History

## 7. Core Screen Rules

### Dashboard
Show:
- key counts;
- urgent items;
- recent activity;
- primary CTA.

### Tables
Always show:
- status;
- important identity;
- date;
- next action.

### Forms
Use progressive disclosure.

Do not show every possible field if it does not apply to the selected instrument/category.

### Timeline
Use for application lifecycle.

### Verification Workspace
Keep critical instrument identity visible while entering readings.

## 8. Trader Core Journey

```text
Login
 ↓
Dashboard
 ↓
My Instruments
 ↓
Add Instrument
 ↓
Instrument Details
 ↓
Request Verification
 ↓
Application Tracking
 ↓
Certificate
```

## 9. Authority Journey

```text
Dashboard
 ↓
Application Queue
 ↓
Application Review
 ↓
Eligibility
 ↓
Assignment Recommendation
 ↓
Accept / Override
 ↓
Schedule
```

## 10. Verifier Journey

```text
Dashboard
 ↓
Assigned Verification
 ↓
Instrument Details
 ↓
Checklist
 ↓
Readings
 ↓
Evidence
 ↓
Result
```

## 11. Certificate

Certificate screen should feel official and printable.

Show:
- certificate number;
- instrument;
- owner;
- verification date;
- due date;
- verifier/centre;
- result;
- QR.

## 12. Public Verification

Minimal interface:

```text
Certificate
Status: VALID / EXPIRED / INVALID / CONFIGURED STATUS
Instrument
Verification Date
Due Date
Issuing/Verifying Information
```

Avoid exposing private owner information unless explicitly configured as public-safe.

## 13. Prototype Priority

Design in this order:

1. Trader flow
2. Authority flow
3. Verifier/GATC flow
4. Certificate/QR
5. Cross-cutting states

Do not design every future feature before these flows are coherent.
