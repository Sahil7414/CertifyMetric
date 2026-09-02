# SIH26036 — MASTER PROJECT CONTEXT

## 1. Source Problem Statement

**Problem Statement ID:** 26036  
**Title:** Development of an Online Verification System for Weighing and Measuring Instruments  
**Organization:** Ministry of Consumer Affairs, Food & Public Distribution  
**Department:** Department of Consumer Affairs (DoCA)  
**Category:** Software  
**Theme:** Miscellaneous

The SIH statement asks for a secure web/mobile platform for online verification, certification and lifecycle management of weighing and measuring instruments under Legal Metrology regulations.

Required capabilities include:
- stakeholder registration;
- verification/re-verification applications;
- scheduling and allocation;
- digital verification certificates with QR;
- digital inspection observations/results;
- validity tracking;
- alerts/reminders;
- dashboards;
- mobile field support;
- role-based secure login;
- documents/photos;
- search/retrieval;
- export/printing.

## 2. Product Goal

Create a credible MVP that demonstrates a complete digital verification lifecycle without pretending to replace statutory physical/technical verification.

## 3. Core Principle

Keep these three categories separate:

### A. Explicit PS requirements
What the SIH statement directly asks for.

### B. Domain/process facts
Things learned from official/state systems or validated research.

### C. Proposed product innovations
Features we design to improve the existing workflow.

Never present B or C as if they were explicitly stated in the PS.

## 4. MVP Vertical Slice

Trader/Instrument Owner
→ Register instrument
→ Submit verification request
→ Application review/eligibility
→ Eligible verifier/GATC options
→ Recommendation
→ Authority assignment/override
→ Scheduling
→ Authorized verification
→ Readings/observations/evidence
→ PASS/FAIL
→ Digital certificate
→ QR verification
→ Instrument history
→ Validity/re-verification

## 5. Primary Users

- Trader / instrument owner
- Authority / administration user
- LMO / authorized verification officer
- GATC user
- Public certificate verifier

The exact internal government hierarchy and legal authority structure must remain configurable unless validated.

## 6. Assignment Principle

The software should provide **decision support**, not claim that software legally determines who must verify a case.

Suggested flow:

Application
→ hard eligibility
→ eligible officers/GATCs
→ availability
→ workload
→ configured operational factors
→ recommended candidate
→ authority accepts or overrides

The final assignment is recorded with an audit trail.

## 7. Verification Principle

Do not assume every verification is a field visit by an LMO.

The product must support the actual configured verification arrangement, including cases where an instrument is presented at an authorized centre/facility if that is the applicable process.

## 8. Rule Principle

Legal rules, instrument categories, tolerances, validity periods, fees, authorization scope, checklists and notification rules should be configurable rather than hard-coded.

## 9. MVP Boundary

Build one polished end-to-end flow first.

Do not begin with:
- all instrument types;
- all states;
- live national integrations;
- AI legal decisions;
- blockchain;
- IoT;
- advanced analytics;
- production government identity/payment integrations.

## 10. Development Order

Context
→ PRD
→ Architecture
→ Rules
→ Design
→ Implementation
→ Testing
→ Demo/PPT

## 11. Source of Truth

`SIH26036_MASTER_CONTEXT.md` is the primary project context.

If another file conflicts with it:
1. identify the conflict;
2. do not silently choose;
3. flag it for resolution.

