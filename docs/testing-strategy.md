# SentinelOps — Testing Strategy

> ATF test plan: what gets tested, expected coverage targets, and test data requirements.
> Complete this document before beginning Phase 6 (ATF full suite).

---

## Testing Approach

SentinelOps uses the ServiceNow **Automated Test Framework (ATF)** exclusively.
All tests run inside the PDI against real table data using seeded demo records.

Two-pass testing strategy (see `implementation-roadmap.md`):

| Pass | When | Scope |
|---|---|---|
| **ATF Pass 1** | After Script Includes (Phase 3.2) | Scoring engine logic in isolation |
| **ATF Pass 2** | After Dashboards (Phase 6) | Full integration: gates, ACLs, state transitions, end-to-end flow |

---

## ATF Pass 1 — Scoring Engine Tests

### Scope
Validate `ReadinessScorer` Script Include logic in isolation before Business Rules and Flows are built.

| Test ID | Test Name | Validates |
|---|---|---|
| ATF-001 | Weighted score — all criteria pass | Score equals 100 when all checklist items pass |
| ATF-002 | Weighted score — partial pass | Score reflects weighted average of passing items |
| ATF-003 | Mandatory criterion fail override | Gate fails regardless of score if a mandatory item fails |
| ATF-004 | Score at threshold boundary | Gate passes at exactly threshold; fails one point below |
| ATF-005 | Empty checklist | Score returns 0; gate fails |

---

## ATF Pass 2 — Integration Tests

### Scope
Full integration testing after all components (BRs, Flows, Dashboards) are implemented.

| Test ID | Test Name | Validates |
|---|---|---|
| ATF-010 | Gate blocks on score below threshold | Assessment cannot proceed to Approved when score < pass_threshold |
| ATF-011 | Gate blocks on mandatory criterion failure | Assessment blocked even with high score |
| ATF-012 | State transition guard — invalid path | Cannot move from Draft directly to Approved (must pass through Submitted → In Review) |
| ATF-013 | State transition guard — valid path | Correct sequence allowed without error |
| ATF-014 | Assessor ACL — own record write | Assessor can update their own assessment |
| ATF-015 | Assessor ACL — other record denied | Assessor cannot update another user's assessment |
| ATF-016 | Viewer ACL — read-only enforcement | Viewer cannot write any assessment record |
| ATF-017 | Auto-generate checklist results | Creating an assessment auto-generates one checklist result per policy criterion |
| ATF-018 | Score recalculation on checklist update | Updating a checklist result triggers parent assessment score recalculation |
| ATF-019 | Flow trigger on state change | Submitting an assessment triggers the main orchestration flow |

---

## Coverage Targets

| Component | Target Coverage |
|---|---|
| `ReadinessScorer` (scoring logic) | 100% of scoring paths |
| State transition enforcement | All valid and invalid paths |
| ACL rules | All three roles × all four tables |
| Checklist auto-generation | Verified via record count assertion |
| Flow trigger | Verified via flow execution log |

---

## Test Data Requirements

> See `atf/test-data.md` for full seed data specification.

- At least one active Readiness Policy with ≥ 3 criteria (mix of mandatory and optional)
- Two assessor user accounts for ACL cross-user testing
- One viewer account
- Pre-seeded checklist results in pass and fail states

---

## ATF Constraints (Scoped App Notes)

- Use **Record Validation** and **Record Query** step types as primary assertion methods
- Avoid complex Server-side Script steps due to scoped app context issues
- Impersonation steps work but require careful role assignment on test users
- All tests run against the `x_1858206_sentin_0` scope

---

## References

- `atf/test-plan.md` — detailed test suite structure inside ATF
- `atf/test-data.md` — seed data records and setup instructions
- `decisions.md` — D-003 (rule-based scoring rationale)
