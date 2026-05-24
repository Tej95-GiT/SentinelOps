# SentinelOps

**Operational Readiness Governance Platform for ServiceNow.**

SentinelOps is a scoped ServiceNow application that enforces readiness validation before business services enter production. It evaluates services against configurable governance policies, runs CMDB relationship checks, computes weighted readiness scores, enforces approval gates, and provides reporting dashboards — all within the ServiceNow platform.

---

## Platform

| Item | Detail |
|---|---|
| Platform | ServiceNow (Australia Release) |
| App Scope | `x_1858206_sentin_0` |
| App Type | Scoped Application |
| Source Control | GitHub (this repository) |

## Tech Stack

| Layer | Technology |
|---|---|
| Data Model | Task-extended assessment, rule-based policy tables |
| Backend Logic | Script Includes (OOP), Business Rules |
| Orchestration | Flow Designer (flows + subflows) |
| Security | Table ACLs, Field ACLs, ACL condition scripts |
| Quality | ATF (Automated Test Framework) |
| Reporting | ServiceNow Reports + Dashboard |

---

## Repository Structure

```
sentinelops/
│
├── README.md                         ← You are here
├── CHANGELOG.md                      ← Phase-by-phase change log
├── LICENSE                           ← MIT
├── .gitignore
│
├── docs/                             ← Engineering documentation
│   ├── architecture.md               ← Table model, design decisions, non-goals
│   ├── current-state.md              ← Living doc: what's done, what's next
│   ├── implementation-roadmap.md     ← Phase-by-phase execution plan
│   ├── decisions.md                  ← Architectural Decision Records (ADRs)
│   ├── security-model.md             ← ACL matrix, role hierarchy, field-level rules
│   ├── flow-specifications.md        ← Flow Designer specs (triggers, steps, subflow interfaces)
│   ├── testing-strategy.md           ← ATF test plan and coverage targets
│   └── demo-script.md                ← Interview walkthrough narrative
│
├── src/                              ← JS mirrors of ServiceNow scripts (manually maintained)
│   ├── script-includes/              ← ReadinessScorer.js, SentinelOpsValidator.js
│   ├── business-rules/               ← stateTransitionGuard.js, scoreRecalculation.js, etc.
│   ├── acl-scripts/                  ← assessorWriteCondition.js
│   └── ui-policies/                  ← Field behaviour documentation by state
│
├── flows/                            ← Human-readable Flow Designer specs
│   ├── assessment-orchestration.md   ← Main flow: submission → approval/rejection
│   ├── cmdb-validation-subflow.md    ← SF-001: CMDB relationship check
│   └── score-calculation-subflow.md  ← SF-002: Weighted readiness score
│
├── atf/                              ← ATF test documentation
│   ├── test-plan.md                  ← Test suite structure and test case definitions
│   └── test-data.md                  ← Required seed data for test execution
│
├── demo/                             ← Demo materials
│   ├── seed-data-setup.md            ← How to load demo policies and assessments
│   └── screenshots/                  ← Dashboard and form screenshots
│
└── 50e1684c3b8d8310982a9dc643e45a23/ ← ServiceNow-managed. DO NOT manually edit.
    └── update/                       ← XML artifacts managed by SN source control sync
```

> **`src/` is manually maintained.** After each scripting commit in ServiceNow, copy the script body (not the XML) into the corresponding `.js` file. This makes the codebase readable on GitHub.

> **`update/` is never manually edited.** ServiceNow source control sync owns it.

---

## Implementation Phases

| Phase | Description | Status |
|---|---|---|
| 1 | Foundation — roles, tables, state model, demo data | ✅ Complete |
| 1.5 | Repository structure and documentation | ✅ Complete |
| 2 | Security — table ACLs, field ACLs, role validation | ⬜ Next |
| 3 | Business Logic — Script Includes, Business Rules, UI Policies | ⬜ Planned |
| 4 | Flow Designer — CMDB validation, scoring, orchestration | ⬜ Planned |
| 5 | Dashboards — governance reports and dashboard assembly | ⬜ Planned |
| 6 | ATF — full test suite (scoring, gates, ACLs, flows) | ⬜ Planned |
| 7 | Finalization — demo walkthrough, screenshots, doc polish | ⬜ Planned |

See [`docs/implementation-roadmap.md`](docs/implementation-roadmap.md) for the detailed phase breakdown.

---

## Core Tables

| Table | Purpose |
|---|---|
| `x_1858206_sentin_0_readiness_assessment` | Primary governance record (extends Task) |
| `x_1858206_sentin_0_readiness_policy` | Governance rules and pass thresholds |
| `x_1858206_sentin_0_policy_criteria` | Individual readiness checks with weights |
| `x_1858206_sentin_0_checklist_result` | Per-criterion validation outcomes per assessment |

---

## License

MIT — see [`LICENSE`](LICENSE).
