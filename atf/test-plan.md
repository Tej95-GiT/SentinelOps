# SentinelOps — ATF Test Plan

> ATF test suite structure and test case definitions.
> This document tracks which ATF tests exist in ServiceNow PDI and what they validate.
> See `docs/testing-strategy.md` for the full testing strategy and rationale.

---

## Test Suite Structure

All tests are grouped under a single ATF Test Suite in the `x_1858206_sentin_0` scope.

| Suite | Contains |
|---|---|
| SentinelOps — Scoring Engine (Pass 1) | ATF-001 through ATF-005 |
| SentinelOps — Integration Tests (Pass 2) | ATF-010 through ATF-019 |

---

## Pass 1 — Scoring Engine Tests

> Run after Script Includes are committed (Phase 3.2). Before Business Rules and Flows.

| Test ID | Name | Type | Status |
|---|---|---|---|
| ATF-001 | Weighted score — all criteria pass | ATF Test | ⬜ Not built |
| ATF-002 | Weighted score — partial pass | ATF Test | ⬜ Not built |
| ATF-003 | Mandatory criterion fail override | ATF Test | ⬜ Not built |
| ATF-004 | Score at threshold boundary | ATF Test | ⬜ Not built |
| ATF-005 | Empty checklist returns zero score | ATF Test | ⬜ Not built |

---

## Pass 2 — Integration Tests

> Run after Dashboards are complete (Phase 6).

| Test ID | Name | Type | Status |
|---|---|---|---|
| ATF-010 | Gate blocks on score below threshold | ATF Test | ⬜ Not built |
| ATF-011 | Gate blocks on mandatory criterion failure | ATF Test | ⬜ Not built |
| ATF-012 | State transition guard — invalid path | ATF Test | ⬜ Not built |
| ATF-013 | State transition guard — valid path | ATF Test | ⬜ Not built |
| ATF-014 | Assessor ACL — own record write | ATF Test | ⬜ Not built |
| ATF-015 | Assessor ACL — other record denied | ATF Test | ⬜ Not built |
| ATF-016 | Viewer ACL — read-only enforcement | ATF Test | ⬜ Not built |
| ATF-017 | Auto-generate checklist results | ATF Test | ⬜ Not built |
| ATF-018 | Score recalculation on checklist update | ATF Test | ⬜ Not built |
| ATF-019 | Flow trigger on state change | ATF Test | ⬜ Not built |

---

## ATF Step Types Used

| Step Type | Used For |
|---|---|
| Record Create | Set up test assessment / checklist records |
| Record Update | Trigger state changes |
| Record Query | Assert field values after script execution |
| Record Validation | Assert computed field values |
| Impersonation | Switch to assessor/viewer role for ACL tests |

---

## Test Execution Log

> Update this table after each ATF run.

| Run Date | Suite | Pass | Fail | Notes |
|---|---|---|---|---|
| — | — | — | — | Not yet executed |

---

## References

- `docs/testing-strategy.md` — strategy and coverage targets
- `atf/test-data.md` — required seed data for test execution
