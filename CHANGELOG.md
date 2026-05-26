# Changelog

All notable changes to SentinelOps are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Planned
- Phase 3.1: `ReadinessScorer` upgrade — weighted scoring, dynamic threshold, risk_tier computation
- Phase 3.2: `SentinelOpsValidator` Script Include — CMDB relationship validation
- Phase 3.3: ATF Pass 1 — scoring engine tests (ATF-001 through ATF-005)
- Phase 3.4: UI Policies — field behavior by state
- Phase 4: Flow Designer — FL-001 orchestration, SF-001, SF-002
- Phase 5: Dashboards — 4 governance reports
- Phase 6: ATF Pass 2 — full integration suite
- Phase 7: Demo polish and documentation

---

## [Phase 2.5] — 2026-05-25

### Changed — Documentation Upgrade
- `docs/architecture.md` — Rewritten from source: platform overview, governance philosophy, lifecycle state machine (from actual BR adjacency list), table architecture (from XML dictionary entries), Business Rule internals (from XML scripts), scoring engine algorithm (from ReadinessScorer source), ACL model (from 24 committed ACLs), update set strategy, REST API layer, scaling considerations
- `docs/decisions.md` — 12 ADR records (D-001 through D-012) grounded in actual implementation decisions with XML artifact evidence paths
- `docs/flow-specifications.md` — Flow Designer specs aligned to actual state values (1/10/30/40/50/100), scorer output shape ({score, passed, total, gate}), approval routing, SLA escalation, notification orchestration
- `docs/testing-strategy.md` — Testing strategy aligned to actual ReadinessScorer algorithm (unweighted, 70% hardcoded, mandatory override), actual State Transition Guard adjacency list, actual ACL condition scripts, negative testing suite
- `docs/implementation_plan.md` — Rewritten as professional roadmap with completed phase evidence (183 XML artifacts, 24 ACLs, 34 role bindings, 4 Business Rules, 2 Script Includes), known technical debt inventory
- `CHANGELOG.md` — Updated with accurate Phase 2.5 entries

---

## [Phase 2] — 2026-05-25

### Added
- 24 table-level ACLs across 4 primary tables (CRUD × roles)
  - `readiness_assessment`: 6 ACLs (admin full, assessor ownership-scoped, viewer read-only)
  - `readiness_policy`: 4 ACLs (admin full, all read)
  - `policy_criteria`: 4 ACLs (admin full, all read)
  - `checklist_result`: 6 ACLs (admin full, assessor parent-ownership-scoped, viewer read-only)
  - `release_gate`: 4 ACLs
- 34 ACL role binding records
- `src/acl-scripts/assessorRead.js` — assessment read condition: assessor sees own records via `assigned_to == gs.getUserID()`
- `src/acl-scripts/assessorWrite.js` — assessment write condition: assessor edits own records only
- `src/acl-scripts/checklistRead.js` — checklist read condition: assessor sees items linked to own assessment via `getRefRecord()` traversal
- `src/acl-scripts/checklistWrite.js` — checklist write condition: assessor edits items linked to own assessment
- `docs/security-model.md` — full ACL matrix, creation order (Blocks A–D + Field ACLs F1–F6), impersonation testing checklist (22 scenarios)

---

## [Phase 1.5] — 2026-05-24

### Added
- Repository structure: `docs/`, `src/`, `flows/`, `atf/`, `demo/` directories
- `docs/security-model.md` — ACL matrix and role hierarchy reference
- `docs/testing-strategy.md` — ATF test plan and coverage targets
- `docs/flow-specifications.md` — Flow Designer specs for FL-001, SF-001, SF-002
- `docs/demo-script.md` — Interview walkthrough narrative (Phase 7 placeholder)
- `flows/assessment-orchestration.md` — Main flow summary spec
- `flows/cmdb-validation-subflow.md` — CMDB validation subflow spec
- `flows/score-calculation-subflow.md` — Score calculation subflow spec
- `atf/test-plan.md` — ATF test suite structure and test case definitions
- `atf/test-data.md` — Required seed data for ATF test execution
- `demo/seed-data-setup.md` — Demo data loading instructions
- `src/script-includes/README.md` — Placeholder for Script Include mirrors
- `src/business-rules/README.md` — Placeholder for Business Rule mirrors
- `src/acl-scripts/README.md` — ACL condition script documentation
- `src/ui-policies/README.md` — UI Policy behavior documentation
- `.gitignore` — ServiceNow artifacts, IDE files, OS files exclusion
- `CHANGELOG.md` — This file
- `LICENSE` — MIT

### Changed
- `README.md` — Updated with repository structure and phase status table

---

## [Phase 1] — 2026-05-21 to 2026-05-23

### Added — Platform Foundation
- Scoped application created: `x_1858206_sentin_0` (SentinelOps)
- Source control linked to GitHub repository (`Tej95-GiT/SentinelOps`)
- Application dependency registered: Task table schema

### Added — Roles
- `x_1858206_sentin_0.admin` — Full CRUD on all tables
- `x_1858206_sentin_0.assessor` — Create and manage own assessments
- `x_1858206_sentin_0.viewer` — Read-only access
- Role containment: admin contains assessor and viewer

### Added — Tables
- `x_1858206_sentin_0_readiness_assessment` — extends `task`, primary governance record
- `x_1858206_sentin_0_readiness_policy` — governance ruleset definitions
- `x_1858206_sentin_0_policy_criteria` — individual readiness checks with weight and mandatory flags
- `x_1858206_sentin_0_checklist_result` — per-criterion evaluation outcomes
- `x_1858206_sentin_0_release_gate` — external release submission records

### Added — Choice Lists
- `readiness_assessment.state`: Draft (1), Submitted (10), In Review (30), Approved (40), Blocked (50), Cancelled (100)
- `readiness_assessment.gate_result`: pending, pass, fail
- `readiness_assessment.risk_tier`: low, medium, high, critical
- `readiness_assessment.assessment_type`: initial, reassessment, periodic, emergency
- `readiness_assessment.target_environment`: production, staging, dr
- `readiness_policy.service_type`: infrastructure, application, platform, data, security
- `policy_criteria.category`: infrastructure, security, monitoring, runbook, change_management, architecture
- `policy_criteria.validation_type`: manual, automated, evidence
- `checklist_result.result`: pending, pass, fail, not_applicable
- `checklist_result.validation_method`: manual, automated, evidence
- `release_gate.state`: pending, approved, rejected

### Added — Script Includes
- `ReadinessScorer` — scoring engine: `calculateScore(assessmentSysId)` returns `{ score, passed, total, gate }`
- `ChecklistGenerator` — auto-generates checklist results from policy criteria with idempotency guard

### Added — Business Rules
- `State Transition Guard` — before/update on `readiness_assessment`, order 100, enforces adjacency-list state transitions via `setAbortAction(true)`
- `Generate Checklist Results` — after/insert on `readiness_assessment`, order 200, delegates to `ChecklistGenerator`
- `Calculate Readiness Score` — after/insert+update on `checklist_result`, order 200, condition `result.changes()`, delegates to `ReadinessScorer`, uses `setWorkflow(false)` to prevent cascades
- `Evaluate Operational Governance` — before/insert+update on `release_gate`, order 100, threshold comparison on `tech_debt_score`

### Added — REST API
- `SentinelOps Ingestion` — Scripted REST API at `/api/x_1858206_sentin_0/sentinel_ops`
- `Submit Release` — POST `/submit`, creates `release_gate` record, triggers governance evaluation

### Added — Cross-Scope Privileges
- `GlideRecord.insert` — execute access to Global
- `GlideRecord.update` — execute access to Global
- `sys_choice` — read access to Global
- `Glide API: user roles and groups` — execute access to Global

### Added — Infrastructure
- Auto-numbering configured for `release_gate` (`sys_number` record)
- Form layouts for assessment (4 sections), policy, criteria, checklist
- Application modules and navigation menus for all tables
- Embedded help role records

### Resolved
- Choice list conflicts on `state` field — custom values (1/10/30/40/50/100) coexisting with inherited Task state choices
- Reference relationship configuration between all four primary tables
- Scope privilege requirements for GlideRecord operations in condition scripts
