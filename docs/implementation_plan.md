# SentinelOps — Implementation Plan

> **Current Phase:** Phase 3 — Business Logic (in progress)  
> **Last Updated:** 2026-05-25  
> **Platform:** ServiceNow Australia Release, Scope `x_1858206_sentin_0`

---

## Completed Phases

### Phase 1 — Foundation (2026-05-21 to 2026-05-23)

Delivered the data model, role hierarchy, and initial governance logic.

| Deliverable | Status | Evidence |
|---|---|---|
| Scoped application `x_1858206_sentin_0` | ✅ | `sys_app_50e1684c3b8d8310982a9dc643e45a23.xml` (4.4MB) |
| 3 roles: admin, assessor, viewer | ✅ | `update/sys_user_role_*.xml` (8 files) |
| 5 tables: assessment, policy, criteria, checklist, release_gate | ✅ | `update/sys_db_object_*.xml` (5 files) |
| `readiness_assessment` extends `task` | ✅ | Task dependency in `50e1684c3b8d8310982a9dc643e45a23/README.md` |
| Field schemas + dictionary entries | ✅ | `update/sys_dictionary_*.xml` (50 files) |
| Choice lists: state, gate_result, risk_tier, result, assessment_type, etc. | ✅ | `author_elective_update/sys_choice_*.xml` (13 files) |
| State model: Draft → Submitted → In Review → Approved/Blocked/Cancelled | ✅ | 6 state choices committed |
| Form layouts for all tables | ✅ | `update/sys_ui_section_*.xml` (5 files) |
| Application modules and navigation | ✅ | `update/sys_app_module_*.xml`, `sys_ui_module_*.xml` |
| REST API: `SentinelOps Ingestion` POST endpoint | ✅ | `update/sys_ws_definition_*.xml`, `sys_ws_operation_*.xml` |
| Cross-scope privileges: GlideRecord, sys_choice, Glide API | ✅ | `update/sys_scope_privilege_*.xml` (4 files) |
| `ReadinessScorer` Script Include | ✅ | `update/sys_script_include_e4ab54913bc90f10982a9dc643e45ac2.xml` |
| `ChecklistGenerator` Script Include | ✅ | `update/sys_script_include_34481b6d3b810350982a9dc643e45a0b.xml` |
| `State Transition Guard` Business Rule | ✅ | `update/sys_script_ba49e7ed3b050350982a9dc643e45abb.xml` |
| `Generate Checklist Results` Business Rule | ✅ | `update/sys_script_a3aed3ed3b810350982a9dc643e45a9c.xml` |
| `Calculate Readiness Score` Business Rule | ✅ | `update/sys_script_c34d50953bc90f10982a9dc643e45afd.xml` |
| `Evaluate Operational Governance` Business Rule (release_gate) | ✅ | `update/sys_script_bc2c43e03b050b10982a9dc643e45a96.xml` |
| Demo policy + criteria seed data | ✅ | Loaded in PDI |

### Phase 1.5 — Repository Structure (2026-05-24)

Established the human-readable engineering layer alongside ServiceNow's XML artifacts.

| Deliverable | Status |
|---|---|
| `docs/` directory with architecture, decisions, security-model, flow-specs, testing-strategy, demo-script | ✅ |
| `src/` directory with ACL script mirrors and README placeholders | ✅ |
| `flows/` directory with human-readable flow specifications | ✅ |
| `atf/` directory with test plan and test data specifications | ✅ |
| `demo/` directory with seed data setup guide | ✅ |
| `CHANGELOG.md`, `.gitignore`, `LICENSE` | ✅ |

### Phase 2 — Security (2026-05-24 to 2026-05-25)

Delivered the complete ACL model.

| Deliverable | Status | Evidence |
|---|---|---|
| 24 table-level ACLs across 4 tables × CRUD × 3 roles | ✅ | `update/sys_security_acl_*.xml` (24 files) |
| ACL role bindings | ✅ | `update/sys_security_acl_role_*.xml` (34 files) |
| `assessorRead.js` condition script | ✅ | `src/acl-scripts/assessorRead.js` |
| `assessorWrite.js` condition script | ✅ | `src/acl-scripts/assessorWrite.js` |
| `checklistRead.js` condition script | ✅ | `src/acl-scripts/checklistRead.js` |
| `checklistWrite.js` condition script | ✅ | `src/acl-scripts/checklistWrite.js` |
| `docs/security-model.md` — full ACL matrix and impersonation checklist | ✅ |

---

## Current Phase: Phase 3 — Business Logic Refinement

### 3.1 — Scoring Engine Upgrade

The `ReadinessScorer` is live and functional but has two known gaps (documented in `decisions.md` D-010):

| Gap | Current State | Required Change |
|---|---|---|
| Unweighted scoring | `passed / total * 100` — all criteria equal | Multiply by `weight / sum_of_weights` for weighted scoring |
| Hardcoded threshold | `score >= 70` | Read from `pass_threshold` on the assessment or policy record |

### 3.2 — SentinelOpsValidator Implementation

The CMDB validation Script Include referenced by SF-001 does not exist yet.

| Task | Description |
|---|---|
| Create `SentinelOpsValidator` | OOP Script Include with `validateCMDBRelationships(sysid)` |
| Cross-scope access test | `cmdb_ci_service.isValid()` and `cmdb_rel_ci.isValid()` from scoped app |
| Mirror to `src/script-includes/` | Copy script body to `SentinelOpsValidator.js` |

### 3.3 — ATF Pass 1

Run scoring engine tests (ATF-001 through ATF-005) against the upgraded `ReadinessScorer`.

### 3.4 — UI Policies

| Policy | Table | Condition | Effect |
|---|---|---|---|
| Computed fields read-only | `readiness_assessment` | Always | `readiness_score`, `gate_result`, `risk_tier`, `criteria_passed`, `criteria_total` read-only |
| Form lock on terminal states | `readiness_assessment` | state ∈ {40, 100} | All fields read-only |
| Form lock during review | `readiness_assessment` | state ∈ {30} | Most fields read-only except admin |

---

## Upcoming Phases

### Phase 4 — Flow Designer

| Task | Prerequisite |
|---|---|
| Test flow trigger on state → Submitted | ATF Pass 1 complete |
| Build SF-001 (CMDB Validation subflow) | `SentinelOpsValidator` committed |
| Build SF-002 (Score Calculation subflow) | `ReadinessScorer` upgrade committed |
| Build FL-001 (Assessment Orchestration flow) | SF-001 + SF-002 tested |
| Create notification templates NOTIF-001 through NOTIF-005 | Before FL-001 activation |

See `docs/flow-specifications.md` for complete flow step specifications.

### Phase 5 — Dashboards and Reports

| Report | Type | Data Source |
|---|---|---|
| Gate pass/fail rate | Pie chart | `readiness_assessment.gate_result` |
| Top failing checklist items | Bar chart | `checklist_result` grouped by criteria where result = fail |
| Readiness by business service | Grouped list | `readiness_assessment` grouped by `service_ci` |
| Mean time to readiness | Trend line | `readiness_assessment` — Created to Approved duration |

### Phase 6 — ATF Pass 2 (Full Integration)

| Suite | Tests | Validates |
|---|---|---|
| Lifecycle | ATF-012, ATF-013 | State transition guard — all valid and invalid paths |
| ACL | ATF-014, ATF-015, ATF-016 | Assessor ownership, cross-user denial, viewer read-only |
| Integration | ATF-010, ATF-011, ATF-017, ATF-018, ATF-019 | Gate enforcement, auto-generation, recalculation, flow trigger |
| Negative | ATF-020, ATF-021, ATF-022 | No-policy handling, idempotency, unknown state safety |

See `docs/testing-strategy.md` for complete test specifications.

### Phase 7 — Demo Polish

| Task | Output |
|---|---|
| Walkthrough script | `docs/demo-script.md` |
| Form screenshots | `screenshots/` or `demo/screenshots/` |
| Architecture diagrams | `diagrams/` |
| Final README update | Repository structure, phase statuses |
| Final CHANGELOG update | All phases documented |

---

## Commit Plan

| Commit | Phase | Message |
|---|---|---|
| C1 | 1 | `[Phase 1] Foundation: roles, tables, fields, demo data` |
| C2 | 1.5 | `[Phase 1.5] Repository structure and documentation` |
| C3 | 2 | `[Phase 2] Security: ACLs for all tables and computed fields` |
| C4 | 3 | `[Phase 3] Script Includes: ReadinessScorer upgrade, SentinelOpsValidator` |
| C5 | 3 | `[Phase 3] ATF: scoring engine validation tests` |
| C6 | 3 | `[Phase 3] UI Policies: field behavior by state` |
| C7 | 4 | `[Phase 4] Flows: assessment orchestration, CMDB validation` |
| C8 | 5 | `[Phase 5] Dashboards: governance reports` |
| C9 | 6 | `[Phase 6] ATF: complete integration test suite` |
| C10 | 7 | `[Phase 7] Polish: demo script, screenshots, final docs` |

---

## Known Technical Debt

| Item | Risk | Phase to Address |
|---|---|---|
| `ReadinessScorer` uses unweighted scoring | All criteria counted equally despite weight field existing | Phase 3.1 |
| Gate threshold hardcoded at 70% | `pass_threshold` field exists but unused by scorer | Phase 3.1 |
| `risk_tier` not computed by scorer | Field exists on assessment but never set by any automation | Phase 3.1 |
| `SentinelOpsValidator` not implemented | SF-001 subflow cannot be built | Phase 3.2 |
| Field ACLs for computed fields | Designed in `security-model.md` but not yet created in PDI | Phase 3 |
| `src/script-includes/` has no `.js` mirrors | README placeholder only | Phase 3 (after scripting) |
| `src/business-rules/` has no `.js` mirrors | README placeholder only | Phase 3 (after scripting) |
| SLA definitions not created | Design specs exist in `flow-specifications.md` | Phase 4 |
| Release gate → assessment integration | Two separate governance models not yet linked | Post-MVP |

---

## Workflow Reference

| Tool | Role |
|---|---|
| **ServiceNow PDI** | All implementation — tables, fields, ACLs, flows, dashboards, ATF execution |
| **AI Coding Assistant** | Script drafting, architecture review, documentation |
| **GitHub** | Source control, `src/` mirror updates, portfolio presentation |

Session loop:
```
1. Review spec for next implementation unit
2. Draft scripts if scripting phase
3. Implement in ServiceNow PDI
4. PDI → Source Control → commit to GitHub
5. Update src/ mirrors and docs
6. Update CHANGELOG.md and current-state.md
7. Repeat
```
