# SIH26036 — PROJECT MEMORY & DECISION LOG

## Purpose

This file records important decisions made during development so future agents do not repeatedly revisit settled questions.

---

## Current Decisions

### 1. MVP First
The project will prioritize a complete vertical slice before advanced features.

### 2. Product Name
Internal project name remains:

`SIH26036`

A public/product brand name has not yet been finalized.

### 3. Core Product
The platform is an online verification, certification and lifecycle-management system.

### 4. Instrument-Centric
The instrument is the persistent object around which applications, verification events, certificates and history are organized.

### 5. Assignment
The product proposes eligible candidates and a recommendation; the authority remains able to override. "Eligible" means jurisdiction-matched first (hard, statutory) — workload ranking only applies within that set. See resolved decision log entries below.

### 6. Verification
The software records and coordinates verification; it does not replace the authorized physical/technical verification.

### 7. LMO/GATC Process
Do not assume a universal physical arrangement. The workflow must support configured verification arrangements.

### 8. Rules
Legal/process rules must be configurable where they are not universally established.

### 9. Certificate
Successful verification can lead to a digital certificate with QR authentication.

### 10. Public Verification
QR lookup should expose only public-safe certificate information.

---

# Decision Log

## [OPEN] MVP Instrument

Decision required:
Select one instrument/category for the first demonstrable workflow.

Status:
Open.

---

## [OPEN] Payment

Decision required:
Whether payment should be included in the first demo and which stage.

Status:
Open / configurable.

---

## [RESOLVED] Exact Authority Hierarchy

Decision:
Real hierarchy (researched, sourced below) is Controller → Deputy Controller → **Assistant Controller** (district-level head; the actual decision/sign-off authority, supervises Inspectors/LMOs, has delegated statutory power to approve/reject/return) → Inspector / Legal Metrology Officer (LMO, does the physical inspection, reports up for sign-off). This app's `AUTHORITY` role represents the **Assistant Controller** specifically — not a vague "authority." `PLATFORM_ADMIN` is a software-governance role with no statutory equivalent (out of scope to model Controller/Deputy Controller oversight for MVP, per Phases.md).

Sources:
- Kerala LMOMS eservices page — verification service officer chain named as "Inspector, Assistant Controller, Deputy Controller" (lmoms.kerala.gov.in/lmoms/eservices)
- District-level process description: application → district nodal officer → Local Senior Inspector/Inspector → report → Assistant Controller (alephindia.in/legal-metrology.php)
- Assistant Controller duties/supervision confirmed via Assam APSC exam notes (assam.pscnotes.com/apsc-legal-metrology)

Status:
Resolved — see [Architecture.md §3.2](docs/ARCHITECTURE.md).

---

## [RESOLVED] Exact LMO/GATC Assignment Process

Decision:
Real-world assignment is **jurisdiction-first, geography-based** — an LMO/GATC only has statutory authority within their government-notified jurisdiction (district/circle); there is no workload-based smart ranking in the real manual process today, just static routing to whoever holds that territory. The only real exception is an officer holding "additional charge" of a neighbouring vacant jurisdiction.

Implementation decision (this codebase):
- `Organization.jurisdictions: string[]` (not a single value) — supports the additional-charge case.
- `Instrument.district: string` — structured jurisdiction key, separate from the free-text `location` address.
- Recommendation engine (`GET /api/applications/:id/candidates`) applies jurisdiction match as a **hard filter first**; workload-based scoring is a **soft rank applied only within the eligible set**. An out-of-jurisdiction candidate always scores 0 and is marked `is_eligible: false`, never the top recommendation.
- Assignment endpoint (`POST /api/applications/:id/assign`) re-derives eligibility server-side (never trusts the client) and requires a non-empty `override_reason` for any cross-jurisdiction assignment; such assignments are always recorded with `is_override: true` regardless of what the client sent.
- The workload-ranking layer on top of jurisdiction filtering is explicitly **Category C (this product's own innovation)** — do not present it as existing LMOMS behavior in the demo pitch.

Status:
Resolved — implemented in `server/models/index.js` and `server/server.js`; documented in [Architecture.md §3.2](docs/ARCHITECTURE.md) and [PRD.md §9](PRD.md).

---

## [OPEN] Certificate Format

Decision required:
Define MVP certificate fields and visual format after domain validation.

Status:
Open. Note: "Form 6" as the certificate name is used throughout the codebase (`OfficialCertificate.jsx`, `server.js`, docs) but has NOT been verified against a primary source (Legal Metrology (General) Rules, 2011 schedules). Treat it as a placeholder, not a confirmed fact, until checked.

---

## [RESOLVED] Self-Registration for Statutory Roles

Decision:
Self-registration is implemented for TRADER, VERIFIER (LMO), AUTHORITY (Assistant Authority), and GATC — all instantly active, no admin-approval gate. `PLATFORM_ADMIN` is excluded from self-registration (seed/admin-provisioned only).

**This is a deliberate demo simplification, not a realistic claim.** In the real system, LMO/Assistant Controller/GATC accounts are provisioned by government appointment or a formal GATC certification process (Legal Metrology (GATC) Rules, 2013) — nobody self-registers as a statutory officer. This was raised explicitly before implementing and the open/instant approach was chosen for hackathon demo speed over realism. If this project moves past demo stage, revisit: gate VERIFIER/AUTHORITY/GATC registration behind Platform Admin approval (`status: PENDING_APPROVAL` → `ACTIVE`).

Implementation:
- `POST /api/auth/register` (`server/server.js`) creates both the `User` and a new `Organization` for the registrant, auto-logs them in (same session mechanism as login).
- Statutory roles (VERIFIER/AUTHORITY/GATC) must declare `jurisdictions` at registration — semicolon-separated (district names contain commas, so ',' can't be the separator) — which feeds directly into the jurisdiction hard-filter in the allocation engine.
- Role-based dashboard routing after registration reuses the existing `handleLoginSuccess` / `getInitialRoleTab` logic in `client/src/App.jsx` — no separate routing code was needed.

Status:
Resolved — implemented in `server/server.js`, `client/src/views/RegisterView.jsx`, `client/src/api.js`, `client/src/App.jsx`.

---

## [RESOLVED] Multi-Category Instrument Support

Decision:
Expanded from a single hardcoded category (NAWI Class III) to 10 real Legal Metrology categories: NAWI (with accuracy class I/II/III/IIII as a spec field), Automatic Weighing Instruments, Weighbridges, Fuel Dispensing Pumps, CNG/LPG/LNG/Hydrogen Dispensers, Water Meters, Energy Meters, Gas Meters, Length Measures, Volumetric/Capacity Measures.

Architecture: `InstrumentCategory.spec_schema` (array of `{key, label, type, options, unit, required}`) declares each category's real technical fields — a water meter asks for meter type + nominal diameter (DN), a weighbridge asks for platform dimensions + installation type, etc. `Instrument.specs` (flexible object) stores whatever that category's schema calls for. NAWI's `max_capacity`/`min_capacity`/`verification_scale_interval_e` stay as dedicated top-level columns (not in `specs`) for backward compatibility with the existing MPE-testing/VerificationWorkspace code, which is still NAWI-specific.

The registration form (`AddInstrumentModal.jsx`) now fetches categories via `GET /api/instrument-categories` and renders fields dynamically per selected category — this was the actual ask ("highly accurate category selecting dropdown... accurate and user-friendly form").

**Data provenance honesty check:** NAWI classes, weighbridge/dispenser/water-meter/gas-meter sub-types and size ranges are sourced from real OIML/ISO/BIS documentation (sources: OIML R76, R61, R106, R117; ISO 4064; EN 1359 — see chat history). The `mpe_rules`/`checklist_schema` for every category OTHER than NAWI are simplified placeholders (generic seal/tamper checklist, no MPE table) — NOT transcribed from a verified primary statutory table. Energy meter accuracy classes (0.2S/0.5S/1/2) are industry-standard IEC 62053 classes, not yet checked against a specific Indian statutory schedule.

Status:
Resolved (registration) — Open sub-item: per-category MPE tables need real domain validation before the Verification Workspace could meaningfully test anything beyond NAWI. The workspace itself is still NAWI-only (zero/min/¼/½/max load test matrix doesn't apply to a water meter or length tape) — extending it to other categories is a separate, larger task not yet started.

---

## [RESOLVED] Server Crash on Bad Request (Regression Found & Fixed)

What happened: adding `district: { required: true }` to the Instrument schema (for the jurisdiction feature) without updating `AddInstrumentModal.jsx` to collect it meant ANY instrument registration attempt threw a Mongoose ValidationError. Because `POST /api/instruments` had no try/catch, that error became an unhandled promise rejection that **crashed the entire Node process** — taking the whole backend down for every user, not just failing that one request. Reproduced and confirmed via direct testing (see chat history).

Fix:
- Added `district` field (with the same search-select UX as `RegisterView.jsx`) to `AddInstrumentModal.jsx`.
- Wrapped `POST /api/instruments` in try/catch with a clean 400 response.
- Added a process-level safety net (`process.on('unhandledRejection'/'uncaughtException', ...)`) in `server.js` so a similar bug elsewhere logs instead of taking the whole server down.

**Not fully fixed:** only 6 of ~40 route handlers in `server.js` have try/catch. The safety net prevents a full process crash, but individual routes without try/catch will still hang/error ungracefully rather than returning a clean error response. A full pass adding try/catch to every route is a real follow-up task, not done here.

Status:
Resolved for the specific crash; broader route-hardening left as an open item.

---

## [OPEN] India Districts Dataset Currency

Decision required:
The jurisdiction picker (`client/src/data/indiaDistricts.js`) uses a third-party community dataset (35 states/UTs, 722 districts) sourced from `sab99r/Indian-States-And-Districts` on GitHub — not an official government source. India's district count changes periodically (new districts get carved out; Jammu & Kashmir's 2019 split into J&K UT + Ladakh UT is NOT reflected — the dataset still lists one combined "Jammu and Kashmir"). Treat this list as a reasonable demo approximation, not an authoritative statutory register.

Status:
Open — acceptable for MVP/demo; revisit against an official Ministry of Home Affairs / Census source before any real deployment. Note also: registering as a Trader, LMO, Authority, or GATC is fully open/instant per the resolved decision above — this is a demo simplification, not how real government accounts get provisioned.

---

## [OPEN] LMOMS Alignment Scope in Marketing Copy

Decision required:
README/UI copy describes this product as "LMOMS-Aligned" / "Inspired by Kerala LMOMS Structure," but the real Kerala LMOMS (lmoms.kerala.gov.in) bundles three pillars — Licensing, Registration, Verification — and this MVP only builds Verification. Copy should be corrected to avoid overstating alignment (e.g. "aligned with the Verification module of Kerala's LMOMS," not "LMOMS-Aligned" unqualified).

Status:
Open — flagged, not yet corrected in README.md/PortalLanding.jsx copy.

---

# Agent Rules

1. Read `MASTER_CONTEXT.md` first.
2. Read this file before revisiting decisions.
3. Never silently overwrite an OPEN decision.
4. Record significant new decisions here.
5. Distinguish researched facts from product proposals.
6. Keep MVP scope narrow.
