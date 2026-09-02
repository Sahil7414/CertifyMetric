# SIH26036 — RULES & DOMAIN LOGIC

## 1. Purpose

This file defines business-rule principles for the MVP.

It must not invent statutory requirements.

## 2. Configurable Rule Categories

The system should support configuration for:

- instrument categories;
- applicable rule sets;
- tolerances;
- required checks;
- validity period;
- authorization scope;
- jurisdiction;
- appointment requirements;
- documents;
- fees if applicable;
- notification timing;
- certificate format;
- result requirements.

## 3. Eligibility

Eligibility should be evaluated before assignment.

Conceptually:

```text
Instrument Category
+
Applicable Rule Set
+
Verifier/GATC Authorization
+
Configured Jurisdiction/Scope
+
Other Configured Constraints
=
Eligible Options
```

## 4. Hard Constraints vs Recommendation

Hard constraints decide whether an option is eligible.

Recommendation ranking may consider:
- workload;
- availability;
- distance/logistics where valid;
- queue age;
- configured operational priorities.

Recommendation must never bypass a hard constraint.

## 5. Authority Override

Authority may select another eligible option.

An override should record:
- authority user;
- timestamp;
- original recommendation;
- selected option;
- reason if configured as mandatory.

## 6. Verification Result

The system records the result based on authorized verifier input.

It should not independently claim that it has legally verified the instrument.

## 7. Tolerance Engine

If tolerance calculation is included in MVP:

```text
Observed Reading
        ↓
Expected/Reference Value
        ↓
Configured Tolerance
        ↓
Pass/Fail Calculation
```

All formulas and limits must be configuration-driven.

## 8. Certificate Issuance

A certificate can be issued only after required verification/result conditions are satisfied.

No frontend-only certificate issuance.

## 9. Expiry

Validity should be derived from configured rules and verification date.

Example:

```text
Verification Date + Configured Validity
= Due Date
```

Do not hard-code a universal validity period.

## 10. Failure

A failed verification should record:
- result;
- observations;
- readings;
- evidence;
- date;
- verifier;
- applicable configured next step.

Do not automatically invent enforcement consequences.

## 11. Payment

Payment should be treated as configurable because the PS requires a platform capability but does not specify one universal payment flow.

If payment is included in the MVP, isolate it from the verification logic.

## 12. Unknown Processes

If a process is not established by the PS or validated research:

```text
Do not assume
→ make configurable
→ validate later
→ freeze before production
```

