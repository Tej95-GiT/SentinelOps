# SentinelOps — Demo Seed Data Setup

> Instructions for loading demo policies and criteria data into a fresh PDI.
> Run this setup before any demo or interview walkthrough.
> See `docs/demo-script.md` for the full demo narrative.

---

## Overview

The demo requires a realistic set of governance policies, criteria, and assessments that tell a coherent story. This document defines the exact records to create and the order to create them.

---

## Step 1 — Create Demo Readiness Policy

Navigate to: **SentinelOps → Readiness Policies → New**

| Field | Value |
|---|---|
| Name | Cloud Service Production Readiness |
| Description | Standard readiness gate for cloud-hosted business services entering production |
| Active | true |
| Pass Threshold | 75 |

---

## Step 2 — Create Policy Criteria

Navigate to: **SentinelOps → Policy Criteria → New** (link to the policy above)

Create the following criteria records in order:

| # | Criteria Name | Weight | Mandatory | Rationale |
|---|---|---|---|---|
| 1 | CMDB CI Registered with Upstream Dependencies | 25 | ✅ Yes | Cannot govern what isn't registered |
| 2 | Runbook Documented and Accessible | 20 | ❌ No | Operational prerequisite |
| 3 | Monitoring Alerts Configured | 20 | ❌ No | Must be observable in production |
| 4 | Disaster Recovery Plan Reviewed | 15 | ❌ No | Risk mitigation |
| 5 | Change Advisory Board Sign-Off | 20 | ❌ No | Governance checkpoint |

> [!NOTE]
> Weights sum to 100. Adjust if criteria are added or removed.

---

## Step 3 — Create Demo Assessments

### Assessment 1 — Passing (for "ideal path" demo)

| Field | Value |
|---|---|
| Business Service | (select any registered `cmdb_ci_service` CI) |
| Policy | Cloud Service Production Readiness |
| Assigned To | demo_assessor (or your account) |
| State | Draft |

After creation, mark all checklist results as **pass**. Then submit.

Expected outcome: Score = 100, Gate = Pass, State → In Review → Approved

---

### Assessment 2 — Failing on Mandatory Criterion (for "gate enforcement" demo)

| Field | Value |
|---|---|
| Business Service | (select a CI with no CMDB relationships) |
| Policy | Cloud Service Production Readiness |
| State | Draft |

After creation:
- Mark "CMDB CI Registered" as **fail**
- Mark all others as pass

Expected outcome: Score = 75 (optional criteria pass) but Gate = Fail (mandatory criterion failed)

---

### Assessment 3 — Failing on Score (for "threshold" demo)

| Field | Value |
|---|---|
| Business Service | (any CI) |
| Policy | Cloud Service Production Readiness |
| State | Draft |

After creation:
- Mark "CMDB CI Registered" as **pass**
- Mark "Runbook Documented" as **fail**
- Mark "Monitoring Alerts" as **fail**
- Mark others as pass

Expected outcome: Score = 60 (below 75 threshold), Gate = Fail

---

## Step 4 — Verify Dashboard Population

After submitting the three assessments above, navigate to the SentinelOps dashboard and confirm:

- [ ] Gate pass/fail pie chart shows 1 pass, 2 fails
- [ ] Top failing criteria shows CMDB and Runbook items
- [ ] Readiness by service shows scores for all three

---

## Step 5 — Create Demo User Accounts (Optional)

For impersonation demo:

| Username | Role | Purpose |
|---|---|---|
| `demo_assessor` | assessor | Owns assessments 1–3 |
| `demo_viewer` | viewer | Read-only access demo |

---

## Pre-Demo Checklist

- [ ] All three assessments submitted and in final state
- [ ] Dashboard populated and showing correct data
- [ ] Flows are activated
- [ ] ATF test suite last run is visible with results
- [ ] Screenshots captured and saved to `demo/screenshots/`
- [ ] PDI is responsive (allow warm-up time before interview)

---

## References

- `docs/demo-script.md` — walkthrough narrative
- `atf/test-data.md` — separate seed data for ATF (different records)
