# Changelog

All notable changes to SentinelOps are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Commit references follow the format `[Phase X.Y]`.

---

## [Unreleased]

### Planned
- Phase 2: ACL security layer
- Phase 3: Script Includes and Business Rules
- Phase 4: Flow Designer orchestration
- Phase 5: Dashboards and Reports
- Phase 6: ATF full test suite
- Phase 7: Demo polish and documentation

---

## [Phase 1.5] — 2026-05-24

### Added
- Repository structure: `docs/`, `src/`, `flows/`, `atf/`, `demo/` folders
- `docs/security-model.md` — ACL matrix and role hierarchy reference
- `docs/testing-strategy.md` — ATF test plan and coverage targets
- `docs/flow-specifications.md` — Flow Designer specs for all flows and subflows
- `docs/demo-script.md` — Interview walkthrough narrative (Phase 7 placeholder)
- `flows/assessment-orchestration.md` — Main flow spec
- `flows/cmdb-validation-subflow.md` — CMDB validation subflow spec
- `flows/score-calculation-subflow.md` — Score calculation subflow spec
- `atf/test-plan.md` — ATF test suite structure and test case definitions
- `atf/test-data.md` — Required seed data for ATF test execution
- `demo/seed-data-setup.md` — Demo data loading instructions
- `src/script-includes/README.md` — Placeholder for Script Include mirrors
- `src/business-rules/README.md` — Placeholder for Business Rule mirrors
- `src/acl-scripts/README.md` — Placeholder for ACL condition script mirrors
- `src/ui-policies/README.md` — UI Policy behavior documentation
- `.gitignore` — Excludes macOS, IDE, ServiceNow local artifacts, node_modules
- `CHANGELOG.md` — This file

### Changed
- `README.md` — Updated repository structure section

---

## [Phase 1] — 2026-05-24

### Added
- Scoped application created (`x_1858206_sentin_0`)
- Source control linked to GitHub repository
- Roles: admin, assessor, viewer
- Tables:
  - `x_1858206_sentin_0_readiness_assessment` (extends Task)
  - `x_1858206_sentin_0_readiness_policy`
  - `x_1858206_sentin_0_policy_criteria`
  - `x_1858206_sentin_0_checklist_result`
- Reference relationships configured between tables
- State model stabilized (Draft → Submitted → In Review → Approved/Rejected/Cancelled)
- Choice list conflicts resolved
- Demo policy + criteria seed data loaded
- `docs/architecture.md`
- `docs/current-state.md`
- `docs/implementation-roadmap.md`
- `docs/decisions.md`
- `LICENSE` (MIT)
- Initial `README.md`
