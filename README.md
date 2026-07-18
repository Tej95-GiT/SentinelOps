<p align="center">
  <img src="img/SentinelOps0.png" width="400" alt="SentinelOps Logo" />
</p>

<div align="center">

# SentinelOps

**Automated CSDM Governance & Pipeline Readiness Engine for ServiceNow**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![ServiceNow: Australia](https://img.shields.io/badge/ServiceNow-Australia%20Release-00b559?logo=servicenow&logoColor=white)](https://www.servicenow.com)
[![Build: Passing](https://img.shields.io/badge/Build-Passing-brightgreen)](https://github.com/Tej95-GiT/SentinelOps/actions)
[![Scope](https://img.shields.io/badge/Scope-x__1858206__sentin__0-7c3aed)](./docs/architecture.md)
[![UI: Next Experience](https://img.shields.io/badge/UI-Next%20Experience-f97316)](https://www.servicenow.com/products/next-experience.html)
[![RBAC: 11 Roles](https://img.shields.io/badge/RBAC-11%20Roles-dc2626)](./docs/security-model.md)
[![ACLs: 26](https://img.shields.io/badge/ACLs-26-0ea5e9)](./docs/security-model.md)

<br/>

> *Enforce governance before production. Block bad releases. Audit everything.*

<br/>

[📐 Architecture](./docs/architecture.md) &nbsp;·&nbsp; [🔐 Security Model](./docs/security-model.md) &nbsp;·&nbsp; [🚀 Flow Specs](./docs/flow-specifications.md) &nbsp;·&nbsp; [🧪 ATF Strategy](./docs/testing-strategy.md) &nbsp;·&nbsp; [📋 CONTRIBUTING](./CONTRIBUTING.md)

</div>

---

## What is SentinelOps?

SentinelOps is a **scoped ServiceNow application** that enforces operational readiness governance before business services are promoted to production. It acts as a hard gate in your release pipeline — wiring CSDM compliance validation, weighted policy scoring, CMDB relationship traversal, and approval orchestration into a single auditable enforcement surface built **natively** on the ServiceNow platform.

At its core, SentinelOps answers one question:

> **Has this service satisfied every mandatory governance criterion and crossed the readiness score threshold required to go live?**

If the answer is no, the release is blocked — automatically, traceably, and without manual intervention.

**What sets it apart:**
- 🚫 No external dependencies — 100% ServiceNow-native
- 🔍 No black-box ML — deterministic, auditable scoring algorithm
- 🔒 Defense-in-depth RBAC enforced at data, logic, and presentation layers simultaneously
- 📡 REST API webhook for CI/CD pipeline integration (GitHub Actions, Jenkins, Azure DevOps)
- 🗺️ CSDM graph traversal for upstream/downstream CI relationship validation

---

## Screenshots

| Governance Workspace | Assessment Intelligence — Approvals |
|:---:|:---:|
| ![Governance Workspace Dashboard](img/Governance%20Workspace%20dashboard.png) | ![Assessment Intelligence Main](img/Assessment%20intellignece%20main%20page.png) |

| Agent Assist & Now Assist | CSDM Compliance Tab |
|:---:|:---:|
| ![Agent Assist](img/Assessment%20intellignece%20main%20page%20now%20assist%20func.png%20.png) | ![CSDM Compliance](img/Assessment%20intellignece%20main%20page%20tab%203%20CSDM%20complience.png) |

| Governance Evidence Tab | ATF Test Results |
|:---:|:---:|
| ![Governance Evidence](img/Assessment%20intellignece%20main%20page%20tab%202%20governance%20evidance.png) | ![ATF Results](img/SentinelOps%20End-to-End%20Governance%20Engine%20Validation%20ATF%20Test%20Results.png) |

---

## Key Features

### 🏗️ Next Experience Workspace (UI Builder)
Two fully-built **UI Builder Workspaces** — `SentinelOps` and `SentinelOps Workspace` — deliver a premium, role-aware operator experience on the ServiceNow Next Experience platform. 6 UX Screens, 3 custom UX Themes (`SentinelOps Light`, `SentinelOps Theme`, `SentinelOps Theme 0`), and 13 UX Styles. No Classic UI. No legacy portals.

### 🔐 Defense-in-Depth RBAC (11 Roles, 26 ACLs)
Security is enforced at **three independent layers simultaneously**:

| Layer | Mechanism | Artifacts |
|---|---|---|
| **Data** | 26 Table ACLs + condition scripts | `assessorRead.js`, `checklistWrite.js`, etc. |
| **Logic** | Business Rule `setAbortAction(true)` | `State Transition Guard` BR |
| **Presentation** | UI Policy field restrictions | `Require Evidence For Pass` |

Roles: `admin`, `analyst`, `assessor`, `governor`, `requester`, `user`, `viewer`, plus four resource-scoped roles. A bypass at any single layer does **not** compromise governance integrity.

### ⚙️ Flow Designer Orchestration (FL001 + 3 Subflows)

```
FL001 Assessment Orchestration
  ├── SF001 CMDB Validation         → validates CI relationship graph
  ├── SF002 CSDM Validation         → traverses CSDM hierarchy compliance
  └── SF003 Generate Remediation Task → creates remediation work items on failure
```

All flows trigger natively on `readiness_assessment.state` change with zero external dependencies.

### 🧠 CSDMTraversalEngine Script Include
The `CSDMTraversalEngine` is a server-side graph traversal engine that walks the **Common Service Data Model** hierarchy via `cmdb_rel_ci` to validate upstream/downstream CI relationships. It ensures a business service has the required CSDM-compliant structure before an assessment can pass — validating the organizational truth behind the data, not just the data itself.

### 📊 ReadinessScorer: Transparent Scoring

```javascript
// Full algorithm — readable in under 60 seconds
var score = (total == 0) ? 0 : Math.round((passed / total) * 100);
var gate  = (!mandatoryFail && score >= 70) ? 'pass' : 'fail';
```

- **Mandatory override:** any mandatory criterion with result ≠ `pass` forces `gate = fail` regardless of score
- **Idempotent scoring:** `setWorkflow(false)` on the parent update prevents cascade loops
- **Denormalized weights:** `weight` and `mandatory` copied from `policy_criteria` at checklist generation time — in-flight assessments are immutable

### 📡 REST Ingestion API
See [The Ingestion Engine](#the-ingestion-engine-cicd-webhook) below.

---

## The Ingestion Engine: CI/CD Webhook

The `SentinelOps Ingestion` Scripted REST API is the **external pipeline integration point**. It acts as a webhook receiver for CI/CD systems to submit release data directly into the SentinelOps governance engine.

**Endpoint**

```
POST /api/x_1858206_sentin_0/sentinel_ops/submit
Authorization: Basic <credentials>
Content-Type: application/json
```

**Request**
```json
{
  "release_name": "Release 2.4.1",
  "tech_debt_score": 35
}
```

**Response (201 Created)**
```json
{
  "status": "Success",
  "message": "SentinelOps ingested release data.",
  "record_id": "<sys_id>"
}
```

**What happens on ingestion:**

```
CI/CD Pipeline
     │
     │  POST /api/x_1858206_sentin_0/sentinel_ops/submit
     ▼
SentinelOps Ingestion  (Scripted REST API — Auth + ACL required)
     │
     │  Inserts record → x_1858206_sentin_0_release_gate
     ▼
Evaluate Operational Governance  (Business Rule — before, order 100)
     │
     ├─ tech_debt_score > 50 ──► state = rejected
     └─ tech_debt_score ≤ 50 ──► state = approved
```

**GitHub Actions integration example:**

```yaml
- name: Submit Release Gate to SentinelOps
  run: |
    curl -s -o /dev/null -w "%{http_code}" \
      -X POST \
      -u "${{ secrets.SN_USER }}:${{ secrets.SN_PASS }}" \
      -H "Content-Type: application/json" \
      -d "{\"release_name\": \"${{ github.ref_name }}\", \"tech_debt_score\": $DEBT_SCORE}" \
      https://${{ secrets.SN_INSTANCE }}.service-now.com/api/x_1858206_sentin_0/sentinel_ops/submit
```

> The endpoint requires `requires_authentication: true` and `requires_acl_authorization: true`. No unauthenticated writes are permitted.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL PIPELINE                               │
│           CI/CD  (Jenkins · GitHub Actions · Azure DevOps)              │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │  POST /api/.../submit
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        INGESTION LAYER                                  │
│               SentinelOps Ingestion  (Scripted REST API)                │
│                  release_gate record created on receipt                 │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │  Evaluate Operational Governance  (BR)
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      ORCHESTRATION LAYER                                │
│           FL001 Assessment Orchestration  (Flow Designer)               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────────┐ │
│  │  SF001           │  │  SF002           │  │  SF003                │ │
│  │  CMDB Validation │  │  CSDM Validation │  │  Remediation Task     │ │
│  └──────────────────┘  └──────────────────┘  └───────────────────────┘ │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        SCORING LAYER                                    │
│   ReadinessScorer        ChecklistGenerator     CSDMTraversalEngine     │
│            (Script Includes — OOP, scoped, platform-native)             │
│                                                                         │
│   Business Rules (12 total):                                            │
│   • State Transition Guard          • Calculate Readiness Score         │
│   • Generate Checklist Results      • SentinelOps: Recalculate Score    │
│   • SentinelOps: Generate AI Telemetry  • Evaluate Operational Gov.    │
│   • SentinelOps: Trigger CSDM Evaluation (×3)                          │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                      │
│   readiness_assessment (extends task)   readiness_policy                │
│   policy_criteria  ──(1:N)──►  checklist_result    release_gate         │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                                  │
│         SentinelOps Workspace  (UI Builder · Next Experience)           │
│    Reports: Assessments by Risk Tier  ·  SentinelOps Governance Pip     │
│    RBAC: 11 Roles  ·  26 ACLs  ·  4 Condition Scripts                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Repository Structure

```
SentinelOps/
│
├── README.md                         ← You are here
├── CHANGELOG.md                      ← Phase-by-phase change log
├── CONTRIBUTING.md                   ← Contribution guidelines
├── SECURITY.md                       ← Vulnerability reporting policy
├── LICENSE                           ← MIT
├── .gitignore
│
├── assets/                           ← Screenshots and logo for README
│   ├── governance_workspace_dashboard.png
│   ├── assessment_intelligence_approvals.png
│   ├── assessment_intelligence_tabs.png
│   └── studio_inventory_view.png
│
├── docs/                             ← Engineering documentation
│   ├── architecture.md               ← Deep-dive: tables, BRs, scoring, flows, REST API
│   ├── security-model.md             ← 26-ACL matrix, 11-role hierarchy, condition scripts
│   ├── decisions.md                  ← Architectural Decision Records (ADRs)
│   ├── flow-specifications.md        ← Flow Designer step-by-step specs
│   ├── testing-strategy.md           ← ATF test plan and coverage targets
│   ├── demo-script.md                ← Interview walkthrough narrative
│   ├── current-state.md              ← Living doc: what is done, what is next
│   └── implementation-roadmap.md     ← Phase-by-phase execution plan
│
├── src/                              ← JS mirrors of SN scripts (manually maintained)
│   ├── script-includes/              ← ReadinessScorer.js, ChecklistGenerator.js, CSDMTraversalEngine.js
│   ├── business-rules/               ← stateTransitionGuard.js, calculateReadinessScore.js, etc.
│   ├── acl-scripts/                  ← assessorRead.js, assessorWrite.js, checklistRead.js, etc.
│   └── ui-policies/                  ← requireEvidenceForPass.js
│
├── flows/                            ← Human-readable Flow Designer specs
│   ├── FL001-assessment-orchestration.md
│   ├── SF001-cmdb-validation.md
│   ├── SF002-csdm-validation.md
│   └── SF003-generate-remediation-task.md
│
├── atf/                              ← ATF test documentation
│   ├── test-plan.md
│   └── test-data.md
│
├── demo/                             ← Demo materials
│   └── seed-data-setup.md
│
├── diagrams/                         ← Architecture and flow diagrams
│
└── 50e1684c3b8d8310982a9dc643e45a23/ ← ServiceNow-managed. DO NOT manually edit.
    └── update/                       ← XML artifacts managed by SN source control sync
```

> **`src/` is manually maintained.** After each scripting commit in ServiceNow, copy the script body (not the XML) into the corresponding `.js` file. This makes the codebase readable on GitHub without exposing XML update set noise.

> **`50e1684.../` is never manually edited.** ServiceNow source control sync owns it entirely. Manual edits corrupt `checksum.txt` and break future imports.

---

## Core Tables

| Table | Extends | Purpose |
|---|---|---|
| `x_1858206_sentin_0_readiness_assessment` | `task` | Primary governance record — inherits assignment, state, approvals, and activity stream |
| `x_1858206_sentin_0_readiness_policy` | — | Governance ruleset: pass threshold, service type, version, owner |
| `x_1858206_sentin_0_policy_criteria` | — | Individual checks within a policy: weight, mandatory flag, validation type |
| `x_1858206_sentin_0_checklist_result` | — | Per-criterion evaluation outcomes; weight/mandatory denormalized at generation time |
| `x_1858206_sentin_0_release_gate` | — | External release records ingested via REST API |

---

## Implementation Phases

| Phase | Description | Status |
|---|---|---|
| 1 | Foundation — roles, tables, state model, demo data | ✅ Complete |
| 1.5 | Repository structure and documentation | ✅ Complete |
| 2 | Security — table ACLs, field ACLs, RBAC containment | ✅ Complete |
| 3 | Business Logic — Script Includes, Business Rules, UI Policies | ✅ Complete |
| 4 | Flow Designer — CMDB/CSDM validation, scoring, orchestration | ✅ Complete |
| 5 | Dashboards — governance reports and dashboard assembly | ✅ Complete |
| 6 | ATF — full test suite (scoring, gates, ACLs, flows) | ✅ Complete |
| 7 | Finalization — demo walkthrough, screenshots, doc polish | ✅ Complete |

See [`docs/implementation-roadmap.md`](./docs/implementation-roadmap.md) for the detailed phase breakdown.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Platform | ServiceNow Australia Release (Scoped Application) |
| App Scope | `x_1858206_sentin_0` |
| Data Model | Task-extended assessment + 4 custom tables |
| Backend Logic | Script Includes (OOP), 12 Business Rules |
| Orchestration | Flow Designer — 1 Flow (FL001) + 3 Subflows (SF001–SF003) |
| Security | 26 Table ACLs, 11 Roles, 4 ACL Condition Scripts |
| REST API | Scripted REST API — `SentinelOps Ingestion` (1 Resource) |
| UI | Next Experience UI Builder — 2 Workspaces, 6 UX Screens, 3 UX Themes |
| Quality | ATF (Automated Test Framework) |
| Reporting | 2 Governance Reports + PAR Dashboard |
| Source Control | GitHub (ServiceNow native source control integration) |

---

## Getting Started

### Prerequisites

- ServiceNow instance on **Australia release** or later
- `admin` role on the target instance
- GitHub credentials configured in ServiceNow Source Control settings

### Installation

```bash
# 1. Fork this repository
# 2. In your ServiceNow instance:
#    Studio → Import From Source Control
#    Enter your repository URL and branch
```

ServiceNow will import the application from `50e1684c3b8d8310982a9dc643e45a23/` and activate all artifacts automatically.

### Post-Install Configuration

1. Assign roles to user accounts (`admin`, `assessor`, `governor`, etc.)
2. Create a **Readiness Policy** with pass threshold and service type
3. Add **Policy Criteria** (mandatory + weighted checks)
4. Submit an **Assessment** linked to a CMDB CI service record
5. Point your CI/CD pipeline at the ingestion REST endpoint

See [`demo/seed-data-setup.md`](./demo/seed-data-setup.md) for a complete walkthrough with seed data.

---

## License

MIT — see [`LICENSE`](./LICENSE).

---

<div align="center">

Built natively on ServiceNow. No external dependencies. No black-box ML.

**[⭐ Star this repo](https://github.com/Tej95-GiT/SentinelOps) &nbsp;·&nbsp; [🐛 Report a Bug](https://github.com/Tej95-GiT/SentinelOps/issues) &nbsp;·&nbsp; [💡 Request a Feature](https://github.com/Tej95-GiT/SentinelOps/issues)**


</div>
