# SentinelOps — Technical Architecture

> **Scope:** `x_1858206_sentin_0`
> **Platform:** ServiceNow Australia Release
> **Audience:** Principal Architects, Hiring Managers, Senior Engineers
> **Source of Truth:** `50e1684c3b8d8310982a9dc643e45a23/` (ServiceNow-managed)
> **Human Layer:** `src/`, `docs/`, `flows/`, `atf/` (manually maintained)

---

## Executive Summary

SentinelOps is a **scoped ServiceNow application** implementing an automated CSDM governance and pipeline readiness engine. It is not a GRC platform. It is not ITOM. It is a **precision enforcement gate** that sits between development completion and production promotion — wiring telemetry ingestion, CSDM graph traversal, weighted policy scoring, and approval orchestration into one auditable pipeline.

Every design decision in this system is traceable to three principles:

1. **Auditable scoring.** `Math.round((passed / total) * 100)` with a mandatory-fail override. No black-box ML. Any principal architect can verify the algorithm in under 60 seconds.
2. **Platform-native architecture.** Task extension, ACL condition scripts, Business Rule state enforcement, Flow Designer orchestration. Zero external dependencies.
3. **Defense in depth.** ACL condition scripts (data layer) + Business Rule state guards (logic layer) + UI Policies (presentation layer). A single bypass at any layer does not compromise governance integrity.

---

## 1 — Platform Inventory

### What Is Built and Live

| Layer | Artifact | Count | Status |
|---|---|---|---|
| Data Model | Custom tables, dictionary entries, choice lists, form layouts | 5 tables, 46 columns | ✅ In PDI |
| Roles | Scoped roles with containment hierarchies | 11 roles | ✅ In PDI |
| ACLs | Table-level + field-level ACLs with condition scripts | 26 ACLs | ✅ In PDI |
| Script Includes | OOP server-side libraries | 3 (ReadinessScorer, ChecklistGenerator, CSDMTraversalEngine) | ✅ In PDI |
| Business Rules | Server-side triggers on insert/update | 12 BRs | ✅ In PDI |
| UI Policies | Client-side field behavior | 1 (Require Evidence For Pass) | ✅ In PDI |
| REST API | Scripted REST API with authenticated resource | 1 API, 1 Resource | ✅ In PDI |
| Flow Designer | Orchestration flows and subflows | FL001 + SF001 + SF002 + SF003 | ✅ In PDI |
| UI Builder | Next Experience Workspaces | 2 Workspaces, 6 UX Screens | ✅ In PDI |
| Reporting | PAR Dashboards and Reports | 2 Reports, 3 PAR Dashboards | ✅ In PDI |
| ATF | Automated Test Framework tests | 1 Test Suite, 4 Test Steps | ✅ In PDI |
| Cross-Scope Privileges | Scoped app privileges on global scope | 42 privileges | ✅ Configured |

---

## 2 — Data Model Architecture

### Table Hierarchy

```
readiness_policy ─────(1:N)─────► policy_criteria
       │                                 │
       │ (referenced by)                 │ (referenced by)
       ▼                                 ▼
readiness_assessment ──(1:N)──► checklist_result
  (extends task)

release_gate ← ingested via REST API (independent pipeline)
```

### Table Inventory

| Table | sys_id (partial) | Extends | Purpose |
|---|---|---|---|
| `x_1858206_sentin_0_readiness_assessment` | `941288...` | `task` | Primary governance record |
| `x_1858206_sentin_0_readiness_policy` | `d9d494...` | — | Governance ruleset definitions |
| `x_1858206_sentin_0_policy_criteria` | `6053cd...` | — | Individual readiness checks |
| `x_1858206_sentin_0_checklist_result` | `2708df...` | — | Per-criterion evaluation outcomes |
| `x_1858206_sentin_0_release_gate` | `ebc3bc...` | — | External release submission records |

### Why Task Extension for `readiness_assessment`

This is the single highest-leverage design decision in the application. By extending `task`, the assessment table inherits for free:

- `assigned_to` — used as ownership anchor in all ACL condition scripts
- `state` — used by the State Transition Guard Business Rule
- `number` — auto-numbering via `sys_number`
- The approval engine (`sysapproval_approver`)
- The activity stream (`sys_journal_field`)
- `work_notes` and `additional_comments`

This eliminates several weeks of custom field development and gives SentinelOps a first-class citizen in ServiceNow's task framework.

### Why Plain Tables for Everything Else

`readiness_policy`, `policy_criteria`, `checklist_result`, and `release_gate` are plain custom tables. They do not need assignment, workflow, or approvals. Task extension would add 30+ unused inherited fields per record and slow GlideRecord queries with no benefit.

### Field Schema (Critical Fields)

**readiness_assessment** (extends `task`)

| Field | Type | Notes |
|---|---|---|
| `policy` | Reference → `readiness_policy` | Drives checklist generation |
| `service_ci` | Reference → `cmdb_ci_service` | The CI being assessed |
| `assessment_type` | Choice | initial, reassessment, periodic, emergency |
| `target_environment` | Choice | production, staging, dr |
| `readiness_score` | Integer | Computed by ReadinessScorer — write-locked via field ACL |
| `gate_result` | Choice | pending, pass, fail — write-locked via field ACL |
| `risk_tier` | Choice | low, medium, high, critical |
| `pass_threshold` | Integer | Copied from policy at creation |
| `criteria_passed` | Integer | Computed aggregate |
| `criteria_total` | Integer | Computed aggregate |

**checklist_result** (critical design pattern: denormalization)

| Field | Type | Notes |
|---|---|---|
| `assessment` | Reference → `readiness_assessment` | Parent record |
| `criteria` | Reference → `policy_criteria` | Source criterion |
| `result` | Choice | pending, pass, fail, not_applicable |
| `mandatory` | Boolean | **Denormalized from criteria at generation** |
| `weight` | Integer | **Denormalized from criteria at generation** |
| `evidence` | String | Assessor-provided notes |

> **Denormalization is intentional and architecturally critical.** If a policy criterion's weight is modified after checklist generation, in-flight assessments retain the original weight values. Governance outcomes must be immutable once issued. This is a deliberate audit-safety decision, documented in ADR D-007.

---

## 3 — Governance Lifecycle and State Machine

### State Values

| State | Value | Terminal |
|---|---|---|
| Draft | `1` | No |
| Submitted | `10` | No |
| In Review | `30` | No |
| Approved | `40` | **Yes** |
| Blocked | `50` | No |
| Cancelled | `100` | **Yes** |

### Transition Adjacency List

The exact production implementation from `State Transition Guard`:

```javascript
var allowed = {
    '1':   ['10', '100'],                     // Draft → Submitted, Cancelled
    '10':  ['1', '30', '100'],                // Submitted → Draft, In Review, Cancelled
    '30':  ['1', '10', '40', '50', '100'],   // In Review → all
    '40':  [],                                // Approved → nothing (terminal)
    '50':  ['10', '100'],                     // Blocked → Submitted (retry), Cancelled
    '100': []                                 // Cancelled → nothing (terminal)
};
```

```
                    ┌──────────────────────────────────────────────────┐
                    │                                                  ▼
Draft (1) ──────► Submitted (10) ──────► In Review (30) ──────► Approved (40)
  ▲                  │  ▲                  │  │  │                [terminal]
  │                  │  │                  │  │  │
  │                  │  └──────────────────┘  │  └──────► Blocked (50)
  │                  │                        │              │
  │                  └──── (return to draft) ─┘              │
  └──────────────────────────────────────────────── Cancelled (100)
                                                        [terminal]
```

### Why Business Rules for State Enforcement (not Flows)

State transition enforcement runs as a synchronous `before` Business Rule, not a Flow Designer flow. Flows are asynchronous by default — a user could save an invalid transition and see it briefly succeed before the flow catches it. The Business Rule calls `setAbortAction(true)` and blocks the save **atomically**. This is the only correct approach for hard enforcement.

Flows handle orchestration (notifications, approvals, subflow chaining). Business Rules handle enforcement.

---

## 4 — Business Rule Architecture

### Inventory

| Name | Table | When | Triggers | Order | Key Behavior |
|---|---|---|---|---|---|
| State Transition Guard | `readiness_assessment` | before | update | 100 | `setAbortAction(true)` on invalid transitions |
| Generate Checklist Results | `readiness_assessment` | after | insert | 200 | Creates `checklist_result` records per policy criterion |
| Calculate Readiness Score | `checklist_result` | after | insert, update | 200 | Invokes ReadinessScorer; writes score back to parent |
| Evaluate Operational Governance | `release_gate` | before | insert, update | 100 | Threshold-based tech debt gate (`score > 50` → rejected) |
| SentinelOps: Auto-Generate Checklist | `readiness_assessment` | after | insert | — | Secondary checklist trigger |
| SentinelOps: Generate AI Telemetry | `readiness_assessment` | after | insert, update | — | Telemetry event generation |
| SentinelOps: Generate Checklist on Submit (×2) | `readiness_assessment` | after | update | — | Checklist generation on state transition to Submitted |
| SentinelOps: Recalculate Score | `checklist_result` | after | update | — | Score recalculation trigger |
| SentinelOps: Trigger CSDM Evaluation (×3) | `readiness_assessment` | after | insert, update | — | CSDM validation pipeline trigger |

### Execution Flow: Assessment Submission

```
User saves readiness_assessment with policy linked
  │
  ▼
[Before Insert] — State Transition Guard (no-op on insert)
  │
  ▼
Record commits to database
  │
  ▼
[After Insert] Generate Checklist Results (order 200)
  │
  ├─ Idempotency guard: existing checklist_results for this assessment?
  ├─ Query: policy_criteria WHERE policy = current.policy AND active = true
  └─ For each criterion: INSERT checklist_result {
       assessment = current.sys_id
       criteria   = criteriaGR.sys_id
       mandatory  = criteriaGR.mandatory  // denormalized
       weight     = criteriaGR.weight     // denormalized
       result     = 'pending'
     }
```

### Execution Flow: Checklist Result Updated

```
Assessor updates checklist_result.result (pending → pass/fail)
  │
  ▼
[After Insert/Update] Calculate Readiness Score (order 200)
  │  Condition: current.result.changes()
  │
  ├─ Instantiates ReadinessScorer
  ├─ Calls scorer.calculateScore(assessmentId)
  ├─ Opens GlideRecord on readiness_assessment
  ├─ Sets: criteria_total, criteria_passed, readiness_score, gate_result
  │
  ├─ gr.autoSysFields(false)    ← preserves sys_updated_on/by
  ├─ gr.setWorkflow(false)      ← CRITICAL: prevents cascade loop
  └─ gr.update()
```

> **`setWorkflow(false)` is architecturally mandatory.** Without it, updating the parent assessment would re-trigger Business Rules on `readiness_assessment`, which would check `checklist_result` changes, causing infinite cascade. This is the most common Business Rule cascade bug in ServiceNow and is explicitly guarded here.

---

## 5 — Script Include Architecture

### ReadinessScorer

The primary scoring engine. Algorithm extracted from production:

```javascript
calculateScore: function(assessmentSysId) {
    var gr = new GlideRecord('x_1858206_sentin_0_checklist_result');
    gr.addQuery('assessment', assessmentSysId.toString());
    gr.query();

    var total = 0, passed = 0, mandatoryFail = false;

    while (gr.next()) {
        total++;
        var result = gr.result + '';
        if (result == 'pass') passed++;
        if (gr.mandatory == true && result != 'pass') mandatoryFail = true;
    }

    var score = (total == 0) ? 0 : Math.round((passed / total) * 100);
    var gate  = (!mandatoryFail && score >= 70) ? 'pass' : 'fail';

    return { score: score, passed: passed, total: total, gate: gate };
}
```

**Algorithm properties:**

| Property | Behavior |
|---|---|
| Scoring model | Unweighted pass ratio (`passed / total * 100`) |
| Threshold | 70% (upgrade path: read from `pass_threshold` on assessment record) |
| Mandatory override | Any mandatory criterion ≠ `pass` → `gate = fail` regardless of score |
| Empty checklist | `score = 0`, `gate = fail` (division guard) |
| Pending items | Counted as non-passing (only `result == 'pass'` counts) |
| Return shape | `{ score, passed, total, gate }` |

**Known upgrade targets:**
- `weight` field is denormalized onto every `checklist_result` but currently unused — weighted scoring requires `passed_weight / total_weight`
- Threshold hardcoded at `70` — bridgeable by reading `current.pass_threshold` from the assessment record

### ChecklistGenerator

Creates `checklist_result` records from `policy_criteria` on assessment creation. Key behaviors:

- **Idempotency guard:** checks for existing checklist results before inserting (prevents duplicate generation on re-trigger)
- **Denormalization:** copies `mandatory` and `weight` from `policy_criteria` at generation time — immutable after creation
- Called by Business Rules on `readiness_assessment` insert and on state transition to `Submitted`

### CSDMTraversalEngine

The most architecturally sophisticated component. A server-side graph traversal engine that:

1. Accepts a `cmdb_ci_service` sys_id as entry point
2. Walks the `cmdb_rel_ci` relationship table to discover upstream/downstream CIs
3. Validates that the service's CI hierarchy conforms to CSDM structural requirements
4. Returns validation result with specific relationship gap details for remediation

This engine enables SF002 (CSDM Validation subflow) to perform structured CSDM compliance checks rather than simple field-level lookups — it validates the **organizational truth** of the service model, not just field values.

---

## 6 — Flow Designer Orchestration

### FL001: Assessment Orchestration

**Trigger:** `readiness_assessment.state` changes to `10` (Submitted)

```
STEP 1 — Notify assessor: submission received
  │
STEP 2 — SF001: CMDB Validation
  │  Input:  service_ci (sys_id)
  │  Output: cmdb_valid (Boolean), cmdb_message (String)
  │
STEP 3 — If cmdb_valid == false
  │  ├── Update record: state = 100 (Cancelled)
  │  ├── Notify assessor: CMDB validation failed
  │  └── End flow
  │
STEP 4 — SF002: CSDM Validation
  │  Input:  service_ci (sys_id)
  │  Output: csdm_valid (Boolean), csdm_message (String)
  │
STEP 5 — If csdm_valid == false
  │  ├── SF003: Generate Remediation Task
  │  ├── Update record: state = 50 (Blocked)
  │  └── Notify assessor: CSDM gaps identified, remediation task created
  │
STEP 6 — Update record: apply score results
  │  readiness_score, gate_result, criteria_passed, criteria_total
  │
STEP 7 — If gate_result == fail
  │  ├── Update record: state = 50 (Blocked)
  │  └── Notify assessor: gate failed
  │
STEP 8 — Create approval request
  │  Assigned to: assessment.policy.owner
  │
STEP 9 — Wait for approval decision
  │
STEP 10 — If approved → state = 40 (Approved), notify
STEP 11 — If rejected → state = 50 (Blocked), notify
```

### SF001: CMDB Validation

Validates that the `service_ci` exists in `cmdb_ci_service` and has required CI relationships in `cmdb_rel_ci`. Returns `cmdb_valid` and a human-readable `cmdb_message` for the notification template.

### SF002: CSDM Validation

Invokes `CSDMTraversalEngine` to walk the CI relationship graph. Returns `csdm_valid` and gap details. If gaps are found, the output feeds into SF003.

### SF003: Generate Remediation Task

Creates a structured remediation task record linking back to the blocked assessment. Populated with the CSDM gap details from SF002 so the responsible team has actionable work items.

---

## 7 — REST API: SentinelOps Ingestion

### Endpoint Specification

| Property | Value |
|---|---|
| Name | SentinelOps Ingestion |
| Base URI | `/api/x_1858206_sentin_0/sentinel_ops` |
| Resource | Submit Release |
| Method | `POST` |
| Path | `/submit` |
| Authentication | Required (`requires_authentication: true`) |
| ACL Authorization | Required (`requires_acl_authorization: true`) |

### Integration Pattern

The API acts as a **webhook receiver** for external CI/CD pipelines. The pattern:

```
External system POST → release_gate record created →
Evaluate Operational Governance BR fires (before, order 100) →
tech_debt_score > 50 ? rejected : approved
```

This decouples the release pipeline from ServiceNow's internal approval flows. The `release_gate` table is a separate concern from `readiness_assessment` — it represents a simpler, threshold-only governance primitive for automated pipeline decisions.

### Security Architecture

Both `requires_authentication` and `requires_acl_authorization` flags are enabled. This means:

1. Every API call must present valid ServiceNow credentials (Basic Auth or OAuth)
2. The authenticated user must have ACL permission to write to `release_gate`
3. Only users with the appropriate role (`x_1858206_sentin_0.admin` or designated API role) can trigger ingestion

---

## 8 — Security Model: RBAC Architecture

### Role Hierarchy (11 Roles)

| Role | Internal Name | Scope |
|---|---|---|
| Admin | `x_1858206_sentin_0.admin` | Full CRUD — all tables, all records |
| Governor | `x_1858206_sentin_0.governor` | Policy management and approval authority |
| Analyst | `x_1858206_sentin_0.analyst` | Read access + reporting |
| Assessor | `x_1858206_sentin_0.assessor` | Create/update own assessments |
| Requester | `x_1858206_sentin_0.requester` | Submit assessment requests |
| User | `x_1858206_sentin_0.user` | Basic platform user |
| Viewer | `x_1858206_sentin_0.viewer` | Read-only across all tables |
| Checklist Result User | `x_1858206_sentin_0.checklist_result_user` | Scoped checklist access |
| Policy Criteria User | `x_1858206_sentin_0.policy_criteria_user` | Scoped criteria access |
| Readiness Assessment User | `x_1858206_sentin_0.readiness_assessment_user` | Scoped assessment access |
| Readiness Policy User | `x_1858206_sentin_0.readiness_policy_user` | Scoped policy access |

### ACL Matrix (26 ACLs)

| Table | read | create | write | delete |
|---|---|---|---|---|
| `readiness_assessment` | admin ✅ / assessor+viewer 🔒 own | admin + assessor | admin ✅ / assessor 🔒 own | admin only |
| `readiness_policy` | admin + assessor + viewer | admin only | admin only | admin only |
| `policy_criteria` | admin + assessor + viewer | admin only | admin only | admin only |
| `checklist_result` | admin ✅ / assessor+viewer 🔒 own | admin + assessor | admin ✅ / assessor 🔒 own | admin only |
| `release_gate` | admin + analyst + viewer | admin (REST API) | admin | admin only |

🔒 = conditional ACL script enforcing ownership restriction

### Condition Script Pattern

All conditional ACLs follow the same evaluation cascade:

```javascript
(function() {
    if (gs.hasRole('x_1858206_sentin_0.admin')) return true;
    if (gs.hasRole('x_1858206_sentin_0.viewer')) return true;  // read ACLs only
    if (gs.hasRole('x_1858206_sentin_0.assessor')) {
        // For readiness_assessment:
        return current.assigned_to == gs.getUserID();
        // For checklist_result:
        // return current.assessment.getRefRecord().assigned_to == gs.getUserID();
    }
    return false;
})();
```

The `checklist_result` variant traverses the reference (`getRefRecord()`) to the parent assessment to enforce ownership through the join. This requires cross-scope privilege on `GlideRecord` read — one of the 42 configured cross-scope privileges.

### Cross-Scope Privileges

The scoped application has 42 cross-scope privileges configured, covering:

| Privilege | Required For |
|---|---|
| `GlideRecord.insert` | Business Rules and Script Includes inserting records |
| `GlideRecord.update` | Score recalculation writing back to `readiness_assessment` |
| `sys_choice` read | Reading state/result choice list values in condition scripts |
| `Glide API: user roles and groups` | `gs.hasRole()` calls in ACL condition scripts |

---

## 9 — Source Control Architecture

### Dual-Layer Repository

| Layer | Path | Owner | Contents |
|---|---|---|---|
| **Platform Source of Truth** | `50e1684c3b8d8310982a9dc643e45a23/` | ServiceNow Source Control | XML artifacts (183 files), `checksum.txt` |
| **Human-Readable Mirror** | `src/`, `docs/`, `flows/`, `atf/` | Engineering team (manual) | `.js` script mirrors, markdown specs |

### How ServiceNow Source Control Works

```properties
# sn_source_control.properties
path=50e1684c3b8d8310982a9dc643e45a23
```

Every commit from the ServiceNow PDI is a consolidated snapshot of the **entire application state**. The `checksum.txt` validates integrity — any file edited outside a ServiceNow instance will corrupt the checksum and fail on import.

**Rules:**
- Never manually edit files under `50e1684c3b8d8310982a9dc643e45a23/`
- All configuration changes flow: ServiceNow PDI → commit to GitHub
- The `src/` mirror is maintained manually after each SN commit

### Commit History Strategy

| Commit | Phase | Contents |
|---|---|---|
| C1 | 1 | Roles, tables, fields, demo data |
| C2 | 1.5 | Repository structure and documentation |
| C3 | 2 | ACLs for all tables and computed fields |
| C4 | 3 | Script Includes: ReadinessScorer, ChecklistGenerator |
| C5 | 3-ATF | ATF: scoring engine validation tests |
| C6 | 3 | Business Rules: state enforcement, score triggers, checklist generation |
| C7 | 4 | Flow Designer: orchestration, CMDB/CSDM validation, remediation |
| C8 | 5 | Dashboards: governance reports |
| C9 | 6 | ATF: complete integration suite |
| C10 | 7 | Demo polish, screenshots, final docs |

---

## 10 — UI Builder: Next Experience Workspaces

### Workspace Inventory

| Experience | Type | Target Audience |
|---|---|---|
| SentinelOps | Workspace | Admin, Governor, Analyst |
| SentinelOps Workspace | Workspace | Assessor, Requester |

### UX Architecture

| Component | Count | Details |
|---|---|---|
| UX Screens | 6 | Dashboard, Assessment List, Assessment Detail, Policy List, Criteria List, Release Gate |
| UX Screen Collections | 6 | Screen-to-screen navigation routing |
| UX Themes | 3 | SentinelOps Light, SentinelOps Theme, SentinelOps Theme 0 |
| UX Styles | 13 | Custom component styles |
| UX Style Assets | 35 | Icons, tokens, visual assets |
| UX Page Properties | 10 | Per-screen configuration |

### Application Modules (Classic Nav)

| Module | Table |
|---|---|
| SentinelOps | App landing |
| Readiness Assessments | `readiness_assessment` |
| Readiness Policies | `readiness_policy` |
| Policy Criterias | `policy_criteria` |
| Checklist Results | `checklist_result` |

---

## 11 — Reporting and Observability

### Reports

| Report | Purpose |
|---|---|
| Assessments by Risk Tier | Distribution of assessments across low/medium/high/critical risk tiers |
| SentinelOps Governance Pip | Pipeline governance throughput and gate outcome trends |

### PAR Dashboards

| Dashboard | Pages | Visibility |
|---|---|---|
| SentinelOps Governance | 2 tabs | Admin, Analyst, Governor |

---

## 12 — Scaling Considerations

| Dimension | Current Design | Scale Path |
|---|---|---|
| Concurrent assessments | Tens | O(n) per assessment — scorer only queries one assessment's checklist results |
| Criteria per policy | 3–10 | No architectural limit; ChecklistGenerator uses GlideRecord cursor |
| Score recalculation | Synchronous per update | At scale: debounce via event + Script Action pattern |
| Weight-based scoring | Not yet active | Modify scorer: `passed_weight / total_weight` |
| Dynamic threshold | Hardcoded 70% | One-line change: read from `assessment.pass_threshold` |
| Multi-hop CMDB | Single-hop today | CSDMTraversalEngine designed for extension to multi-hop traversal |

---

## Artifact Cross-Reference

| Document | Contents |
|---|---|
| [security-model.md](./security-model.md) | Full 26-ACL matrix, condition script bodies, impersonation testing checklist |
| [decisions.md](./decisions.md) | Architectural Decision Records (ADRs) with rationale |
| [flow-specifications.md](./flow-specifications.md) | Flow Designer step-by-step specs for FL001, SF001, SF002, SF003 |
| [testing-strategy.md](./testing-strategy.md) | ATF test plan and coverage targets |
| [implementation-roadmap.md](./implementation-roadmap.md) | Phase execution roadmap |
| [demo-script.md](./demo-script.md) | Structured interview walkthrough narrative |
