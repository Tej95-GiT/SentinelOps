# SentinelOps — ATF Test Data

> Required seed data for ATF test execution.
> All records must be present in PDI before running the ATF suites.

---

## Overview

ATF tests run against real PDI records. This document specifies the exact records that must exist before test execution, and the state each record must be in.

---

## Required User Accounts

| Username | Role | Purpose |
|---|---|---|
| `atf_assessor_1` | `x_1858206_sentin_0.assessor` | Primary assessor for own-record tests |
| `atf_assessor_2` | `x_1858206_sentin_0.assessor` | Second assessor for cross-user ACL tests |
| `atf_viewer_1` | `x_1858206_sentin_0.viewer` | Read-only ACL tests |

---

## Required Policy Records

### Policy: ATF Test Policy

| Field | Value |
|---|---|
| Name | ATF Test Policy |
| Active | true |
| Pass Threshold | 70 |

### Policy Criteria (linked to ATF Test Policy)

| Criteria Name | Weight | Mandatory |
|---|---|---|
| CMDB CI Registered | 40 | true |
| Runbook Exists | 30 | false |
| Monitoring Configured | 30 | false |

---

## Required Assessment Records

### Assessment A — High Score (Gate Pass)

| Field | Value |
|---|---|
| Number | (auto-assigned) |
| State | Draft |
| Policy | ATF Test Policy |
| Assigned To | `atf_assessor_1` |
| Business Service | (any valid `cmdb_ci_service` CI) |

**Checklist Results** (auto-generated on create):
- CMDB CI Registered → `pass`
- Runbook Exists → `pass`
- Monitoring Configured → `pass`

Expected score: 100 | Expected gate: Pass

---

### Assessment B — Low Score (Gate Fail)

| Field | Value |
|---|---|
| State | Draft |
| Policy | ATF Test Policy |
| Assigned To | `atf_assessor_1` |

**Checklist Results:**
- CMDB CI Registered → `fail` (mandatory)
- Runbook Exists → `fail`
- Monitoring Configured → `fail`

Expected score: 0 | Expected gate: Fail (mandatory criterion)

---

### Assessment C — Cross-User ACL Test

| Field | Value |
|---|---|
| State | Draft |
| Assigned To | `atf_assessor_2` |

Used by ATF-015 — `atf_assessor_1` should be denied write access to this record.

---

### Assessment D — Threshold Boundary Test

| Field | Value |
|---|---|
| Policy | ATF Test Policy (threshold: 70) |

**Checklist Results:**
- CMDB CI Registered → `pass` (40 pts, mandatory)
- Runbook Exists → `fail` (0 pts)
- Monitoring Configured → `fail` (0 pts)

Expected score: 40 | Expected gate: Fail (score < threshold even though mandatory passes)

---

## Setup Instructions

1. Create the three user accounts and assign roles
2. Create the ATF Test Policy and three criteria records
3. Create Assessments A, B, C, D in Draft state
4. Verify checklist results auto-generate on assessment creation (4 per assessment = 16 total)
5. Confirm no flows are triggered (assessments remain in Draft)

> [!IMPORTANT]
> Do NOT submit any of these assessments before running Pass 1 tests. Submission triggers the orchestration flow and will mutate the records.

---

## Teardown

After ATF run, these records can be left in place for re-testing.
If cleaning up: delete in this order — Checklist Results → Assessments → (keep Policy and Users for next run).

---

## References

- `atf/test-plan.md` — test case definitions
- `docs/testing-strategy.md` — strategy and coverage targets
- `demo/seed-data-setup.md` — separate seed data for demo (not ATF)
