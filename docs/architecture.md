# SentinelOps — Architecture

> **Scope:** `x_1858206_sentin_0`  
> **Platform:** ServiceNow Australia Release  
> **Source of Truth:** `50e1684c3b8d8310982a9dc643e45a23/` (ServiceNow-managed)  
> **Human Layer:** `src/`, `docs/`, `flows/`, `atf/` (manually maintained)

---

## 1 — Platform Overview

SentinelOps is a scoped ServiceNow application that enforces operational readiness governance before business services enter production. It answers one question: *Has this service been validated against all mandatory governance criteria before it can go live?*

The application evaluates services against configurable governance policies, computes weighted readiness scores from structured checklist validation, enforces approval gates based on score outcomes and mandatory criterion results, and surfaces governance posture through dashboards — all within the ServiceNow platform.

### What Exists Today

| Layer | Artifact | Status |
|---|---|---|
| Data Model | 5 tables, 3 roles, dictionary entries, choice lists, form layouts | ✅ Committed to SN source control |
| Scoring Engine | `ReadinessScorer` Script Include — unweighted pass/total with mandatory override, 70% hardcoded threshold | ✅ Live in PDI, XML in `update/` |
| Checklist Generator | `ChecklistGenerator` Script Include — auto-creates `checklist_result` records from policy criteria | ✅ Live in PDI |
| State Machine | 6-state lifecycle with `State Transition Guard` Business Rule using adjacency-list enforcement | ✅ Live in PDI, 16 revisions |
| Score Recalculation | `Calculate Readiness Score` Business Rule — fires on `checklist_result` insert/update when `result` changes | ✅ Live in PDI |
| Checklist Generation | `Generate Checklist Results` Business Rule — fires on `readiness_assessment` after insert | ✅ Live in PDI |
| ACL Model | 24 table ACLs + associated role bindings across 4 primary tables, 4 condition scripts | ✅ Live in PDI |
| REST API | `SentinelOps Ingestion` — POST `/api/x_1858206_sentin_0/sentinel_ops/submit` for release gate data | ✅ Live in PDI |
| Release Gate Engine | `Evaluate Operational Governance` Business Rule on `release_gate` — threshold-based tech debt scoring | ✅ Live in PDI |
| Cross-Scope Privileges | `GlideRecord.insert`, `GlideRecord.update`, `sys_choice` read, `Glide API: user roles and groups` | ✅ Configured |
| Flow Designer | Assessment orchestration, CMDB validation subflow, score calculation subflow | ⬜ Design specs authored, not yet built |
| Dashboards | 4 governance reports + dashboard assembly | ⬜ Phase 5 |

### Design Philosophy

SentinelOps is deliberately not a full GRC or ITOM platform. It is a focused governance gate — an enforcement point that sits between development completion and production promotion. The design follows three principles:

1. **Auditable scoring.** Every gate outcome is traceable to individual criterion results. No black-box ML. The `ReadinessScorer` uses `Math.round((passed / total) * 100)` with a mandatory-fail override. An interviewer can read the algorithm in under 60 seconds.

2. **Platform-native architecture.** Task extension, ACL condition scripts, Business Rule state enforcement, Flow Designer orchestration. No external dependencies, no custom UI frameworks, no integrations outside the ServiceNow instance.

3. **Defense in depth.** Security is enforced at three layers simultaneously: ACL condition scripts (data layer), Business Rule state guards (logic layer), and UI Policies (presentation layer). A single bypass at any one layer does not compromise governance integrity.

---

## 2 — Governance Lifecycle and State Machine

The assessment lifecycle is implemented as a finite state machine on the `state` field of `x_1858206_sentin_0_readiness_assessment`. State values are defined as ServiceNow choice list entries and enforced by the `State Transition Guard` Business Rule.

### State Values (from `author_elective_update/sys_choice_..._state.xml`)

| State | Value | Sequence | Terminal |
|---|---|---|---|
| Draft | `1` | 100 | No |
| Submitted | `10` | 200 | No |
| In Review | `30` | 300 | No |
| Approved | `40` | 400 | Yes |
| Blocked | `50` | 500 | No |
| Cancelled | `100` | 600 | Yes |

### Transition Map (from `State Transition Guard` Business Rule)

The actual transition adjacency list as implemented in the production Business Rule:

```javascript
var allowed = {
    '1':   ['10', '100'],              // Draft → Submitted, Cancelled
    '10':  ['1', '30', '100'],         // Submitted → Draft, In Review, Cancelled
    '30':  ['1', '10', '40', '50', '100'], // In Review → Draft, Submitted, Approved, Blocked, Cancelled
    '40':  [],                         // Approved → nothing (terminal)
    '50':  ['10', '100'],              // Blocked → Submitted (retry), Cancelled
    '100': []                          // Cancelled → nothing (terminal)
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
  │                                                          ▼
  └──────────────────────────────────────────────── Cancelled (100)
                                                        [terminal]
```

### Enforcement Mechanism

The guard runs as a **before** Business Rule on update (`order: 100`). If `current.state.changes()` is true and the target state is not in the allowed list for the current state, the rule calls `current.setAbortAction(true)` and adds an error message showing the attempted transition. The record is never saved.

Key behaviors:
- Unknown source states are **allowed** through as a safety valve (`if (!allowed[fromState]) return`)
- Terminal states (Approved, Cancelled) have empty allowed-next arrays — no transitions are possible
- Blocked assessments can retry submission (`50 → 10`) or be cancelled (`50 → 100`)
- In Review allows regression to Draft (`30 → 1`) for rework — an intentional design decision

---

## 3 — Table Architecture

SentinelOps defines five tables. Four are part of the core governance model. One (`release_gate`) supports a secondary release ingestion pipeline.

### Table Inventory (from `update/sys_db_object_*.xml`)

| Table | sys_id | Extends | Purpose |
|---|---|---|---|
| `x_1858206_sentin_0_readiness_assessment` | `941288593b450f10982a9dc643e45a32` | `task` | Primary governance record |
| `x_1858206_sentin_0_readiness_policy` | `d9d494113b890f10982a9dc643e45a39` | — | Governance ruleset definitions |
| `x_1858206_sentin_0_policy_criteria` | `6053cd813b81cb10982a9dc643e45a93` | — | Individual readiness checks within a policy |
| `x_1858206_sentin_0_checklist_result` | `2708df013bc10f10982a9dc643e45a61` | — | Per-criterion evaluation outcomes per assessment |
| `x_1858206_sentin_0_release_gate` | `ebc3bc803b41c310982a9dc643e45ad8` | — | External release submission records (REST ingestion) |

### Entity Relationships

```
readiness_policy ─────(1:N)─────► policy_criteria
       │                                 │
       │ (referenced by)                 │ (referenced by)
       ▼                                 ▼
readiness_assessment ──(1:N)──► checklist_result
  (extends task)
```

### Field Schemas (from `update/sys_dictionary_*.xml`)

**readiness_assessment** — extends `task`, inherits `assigned_to`, `state`, `number`, `work_notes`

| Field | Source |
|---|---|
| `policy` | Reference → `readiness_policy` |
| `service_ci` | Reference → `cmdb_ci_service` |
| `assessment_type` | Choice: initial, reassessment, periodic, emergency |
| `target_environment` | Choice: production, staging, dr |
| `readiness_score` | Integer (computed by `ReadinessScorer`) |
| `gate_result` | Choice: pending, pass, fail |
| `risk_tier` | Choice: low, medium, high, critical |
| `pass_threshold` | Integer (copied from policy) |
| `criteria_passed` | Integer (computed) |
| `criteria_total` | Integer (computed) |

**readiness_policy**

| Field | Source |
|---|---|
| `name` | String |
| `description` | String (multi-line) |
| `owner` | Reference → `sys_user` |
| `pass_threshold` | Integer |
| `service_type` | Choice: infrastructure, application, platform, data, security |
| `version` | String |
| `active` | Boolean |

**policy_criteria**

| Field | Source |
|---|---|
| `policy` | Reference → `readiness_policy` |
| `name` | String |
| `category` | Choice: infrastructure, security, monitoring, runbook, change_management, architecture |
| `weight` | Integer |
| `mandatory` | Boolean |
| `validation_type` | Choice: manual, automated, evidence |
| `validation_script` | String (reserved for future automated validators) |
| `active` | Boolean |

**checklist_result**

| Field | Source |
|---|---|
| `assessment` | Reference → `readiness_assessment` |
| `criteria` | Reference → `policy_criteria` |
| `result` | Choice: pending, pass, fail, not_applicable |
| `mandatory` | Boolean (denormalized from criteria at generation time) |
| `weight` | Integer (denormalized from criteria at generation time) |
| `evidence` | String (assessor-provided evidence or notes) |
| `validation_method` | Choice: manual, automated, evidence |

**release_gate**

| Field | Source |
|---|---|
| `number` | String (auto-numbered via `sys_number`) |
| `release_name` | String |
| `tech_debt_score` | Integer |
| `state` | Choice: pending, approved, rejected |
| `target_go_live` | Date/Time |

### Design Decision: Denormalized Fields on checklist_result

`mandatory` and `weight` are copied from `policy_criteria` into `checklist_result` at generation time by `ChecklistGenerator`. This is intentional: if a policy criterion's weight is later modified, existing in-flight assessments retain the weight values they were evaluated against. Governance outcomes must be immutable once generated.

---

## 4 — Business Rule Architecture

Four Business Rules are committed and active in the PDI. Each has a specific table target, trigger condition, timing, and execution order.

### Business Rule Inventory (from `update/sys_script_*.xml`)

| Name | sys_id | Table | When | Insert | Update | Order | Condition |
|---|---|---|---|---|---|---|---|
| State Transition Guard | `ba49e7ed3b...` | `readiness_assessment` | before | — | ✅ | 100 | `state.changes()` (inline) |
| Generate Checklist Results | `a3aed3ed3b...` | `readiness_assessment` | after | ✅ | — | 200 | `policy` is non-empty (inline) |
| Calculate Readiness Score | `c34d50953b...` | `checklist_result` | after | ✅ | ✅ | 200 | `current.result.changes()` |
| Evaluate Operational Governance | `bc2c43e03b...` | `release_gate` | before | ✅ | ✅ | 100 | `tech_debt_score VALCHANGES` |

### Execution Flow: Assessment Creation

```
User creates readiness_assessment with policy linked
  │
  ▼
[Before Insert] — no state guard needed (first save)
  │
  ▼
Record commits to database (sys_id assigned)
  │
  ▼
[After Insert] Generate Checklist Results (order 200)
  │
  ├─ Checks: policy field populated?
  ├─ Checks: existing checklist results for this assessment? (idempotency guard)
  ├─ Queries policy_criteria where policy = current.policy AND active = true
  └─ For each criterion: inserts checklist_result with:
       assessment = current.sys_id
       criteria = criteriaGR.sys_id
       mandatory = criteriaGR.mandatory  (denormalized)
       weight = criteriaGR.weight        (denormalized)
       result = 'pending'
```

### Execution Flow: Checklist Result Updated

```
Assessor updates a checklist_result.result (pending → pass/fail)
  │
  ▼
[After Insert/Update] Calculate Readiness Score (order 200)
  │  Condition: current.result.changes()
  │
  ├─ Gets assessment sys_id from current.assessment
  ├─ Instantiates ReadinessScorer
  ├─ Calls scorer.calculateScore(assessmentId)
  │
  ├─ Opens GlideRecord on readiness_assessment
  ├─ Sets: criteria_total, criteria_passed, readiness_score, gate_result
  │
  ├─ gr.autoSysFields(false)   ← preserves sys_updated_on/by
  ├─ gr.setWorkflow(false)     ← CRITICAL: prevents cascade loop
  └─ gr.update()
```

The `setWorkflow(false)` call is architecturally critical. Without it, updating the parent assessment would re-trigger Business Rules on `readiness_assessment`, which could cascade indefinitely if any of those rules modify `checklist_result`.

### Release Gate Engine

The `Evaluate Operational Governance` Business Rule operates on the separate `release_gate` table. It implements a simple threshold comparison: if `tech_debt_score > 50`, the release state is set to `rejected`; otherwise `approved`. This is the original SentinelOps governance primitive, predating the full assessment model.

---

## 5 — Scoring Engine Internals

The scoring engine is implemented in `ReadinessScorer` (`sys_script_include_e4ab54913bc90f10982a9dc643e45ac2`). The actual algorithm extracted from the production code:

```javascript
calculateScore: function(assessmentSysId) {
    var gr = new GlideRecord('x_1858206_sentin_0_checklist_result');
    gr.addQuery('assessment', assessmentSysId.toString());
    gr.query();

    var total = 0;
    var passed = 0;
    var mandatoryFail = false;

    while (gr.next()) {
        total++;
        var result = gr.result + '';

        if (result == 'pass') {
            passed++;
        }
        if (gr.mandatory == true && result != 'pass') {
            mandatoryFail = true;
        }
    }

    var score = (total == 0) ? 0 : Math.round((passed / total) * 100);
    var gate = 'fail';

    if (!mandatoryFail && score >= 70) {
        gate = 'pass';
    }

    return { score: score, passed: passed, total: total, gate: gate };
}
```

### Algorithm Characteristics

| Property | Current Implementation | Notes |
|---|---|---|
| **Scoring model** | Unweighted pass ratio | `passed / total * 100`, not weight-based. Weight field exists on `checklist_result` but is not used in scoring yet. |
| **Threshold** | Hardcoded 70% | Not read from `pass_threshold` field on the assessment. Upgrade path: read from `current.pass_threshold`. |
| **Mandatory override** | Yes | Any mandatory criterion with result ≠ 'pass' forces `gate = 'fail'` regardless of score. |
| **Empty checklist** | Score = 0, gate = fail | Division guard: `total == 0 ? 0` |
| **Pending items** | Counted as non-passing | Only `result == 'pass'` counts. Pending/fail/not_applicable all count against. |
| **Return shape** | `{ score, passed, total, gate }` | Note: does not currently return `risk_tier` — that field is not computed by the scorer. |

### Scoring Gap: Weight Not Used

The `weight` field is denormalized onto every `checklist_result` record by `ChecklistGenerator`, but `ReadinessScorer` does not use it. All criteria are counted equally. The intended upgrade is to multiply each pass by `weight / total_weight` for a weighted percentage.

### Scoring Gap: Threshold Not Dynamic

The scorer compares against a hardcoded `70`. The `pass_threshold` field exists on both `readiness_policy` and `readiness_assessment` but is not read by the scorer. Bridging this requires passing the assessment GR (not just the sys_id) to `calculateScore`, or querying the assessment inside the scorer.

---

## 6 — ACL and Security Model

SentinelOps defines three scoped roles and enforces access through 24 table-level ACLs, 4 condition scripts, and 6 planned field-level ACLs.

### Roles (from `update/sys_user_role_*.xml`)

| Role | Internal Name |
|---|---|
| Admin | `x_1858206_sentin_0.admin` |
| Assessor | `x_1858206_sentin_0.assessor` |
| Viewer | `x_1858206_sentin_0.viewer` |

Role containment records exist (`sys_user_role_contains_*.xml`), establishing admin as the parent role.

### ACL Architecture

The ACL model follows a layered pattern:

1. **Admin ACLs** — role-only check, no condition script. Admin always passes.
2. **Assessor/Viewer ACLs** — role check plus condition script for ownership restriction.
3. **Deny-by-default** — ServiceNow's default deny for operations without an explicit ACL.

### Condition Script Logic (from `src/acl-scripts/`)

All four condition scripts follow the same evaluation cascade:

```
1. If user has admin role → return true (unrestricted)
2. If user has viewer role → return true (read-only contexts only)
3. If user has assessor role → compare current record's ownership to current user
4. Default → return false (deny)
```

**Assessment ownership check:** `current.assigned_to == gs.getUserID()`  
**Checklist ownership check:** `current.assessment.getRefRecord().assigned_to == gs.getUserID()` (traverses the reference to parent assessment)

### Cross-Scope Privileges (from `update/sys_scope_privilege_*.xml`)

The scoped application has been granted four cross-scope privileges:

| Privilege | Target | Operation |
|---|---|---|
| `GlideRecord.insert` | Global | execute |
| `GlideRecord.update` | Global | execute |
| `sys_choice` | Global | read |
| `Glide API: user roles and groups` | Global | execute |

These are required because the scoped app needs to:
- Insert/update records via GlideRecord across Business Rules and Script Includes
- Read choice list values (for state/result fields)
- Call `gs.hasRole()` and `gs.getUserID()` in ACL condition scripts

### Full ACL Matrix

See `docs/security-model.md` for the complete 24-ACL matrix, creation order, and impersonation testing checklist.

---

## 7 — Update Set and Source Control Strategy

### Dual-Layer Architecture

SentinelOps maintains two parallel layers in the repository:

| Layer | Path | Managed By | Contents |
|---|---|---|---|
| **Platform Source of Truth** | `50e1684c3b8d8310982a9dc643e45a23/` | ServiceNow Source Control | XML artifacts, dictionary definitions, choice lists, checksums |
| **Human-Readable Mirror** | `src/`, `docs/`, `flows/`, `atf/` | Engineers (manual) | `.js` script mirrors, markdown specs, test plans |

### How ServiceNow Source Control Works

The `sn_source_control.properties` file at the repository root tells ServiceNow where to find the application artifacts:

```properties
path=50e1684c3b8d8310982a9dc643e45a23
```

ServiceNow owns the `50e1684c3b8d8310982a9dc643e45a23/` directory entirely. It contains:

- **`update/`** — 183 XML files: table definitions, dictionary entries, ACLs, ACL role bindings, Business Rules, Script Includes, UI sections, user roles, REST definitions, scope privileges
- **`dictionary/`** — 4 XML files: table-level dictionary schemas for the four primary tables
- **`author_elective_update/`** — 13 XML files: choice list definitions that the developer explicitly elected to include in source control
- **`checksum.txt`** — integrity hash used by ServiceNow to detect manual tampering
- **`sys_app_*.xml`** — application metadata (4.4MB)

### Update Set Consolidation Strategy

ServiceNow does not use traditional update sets for source-controlled apps. Instead, every commit from ServiceNow PDI represents a consolidated snapshot of the entire application state. The `checksum.txt` validates integrity — if any file in the managed directory is edited outside a ServiceNow instance, the import will fail until the checksum is repaired.

**Rules:**
- Never manually edit files under `50e1684c3b8d8310982a9dc643e45a23/`
- All configuration changes flow through ServiceNow PDI → commit to GitHub
- The `src/` mirror is maintained manually after each SN commit

### Commit Strategy

One commit per completed implementation unit. Message format: `[Phase X.Y] Brief description`

| Commit | Contents |
|---|---|
| C1 | Roles, tables, fields, demo data |
| C2 | Repository structure and documentation |
| C3 | ACLs for all tables and computed fields |
| C4 | Script Includes: ReadinessScorer, ChecklistGenerator |
| C5 | ATF: scoring engine validation tests |
| C6 | Business Rules: state enforcement, score triggers, checklist generation |
| C7 | Flow Designer: orchestration, CMDB validation, scoring |
| C8 | Dashboards: governance reports |
| C9 | ATF: complete integration suite |
| C10 | Demo polish, screenshots, final docs |

---

## 8 — REST API Layer

SentinelOps exposes a Scripted REST API for external release data ingestion.

### Endpoint

| Property | Value |
|---|---|
| Name | SentinelOps Ingestion |
| Base URI | `/api/x_1858206_sentin_0/sentinel_ops` |
| Operation | Submit Release |
| Method | POST |
| Path | `/submit` |
| Auth | Required (`requires_authentication: true`) |
| ACL | Required (`requires_acl_authorization: true`) |

### Request/Response

**Request body:**
```json
{
    "release_name": "Release 2.4.1",
    "tech_debt_score": 35
}
```

**Response (201 Created):**
```json
{
    "status": "Success",
    "message": "SentinelOps ingested release data.",
    "record_id": "<sys_id>"
}
```

The POST operation creates a record in `x_1858206_sentin_0_release_gate`, which triggers the `Evaluate Operational Governance` Business Rule. If `tech_debt_score > 50`, the release is automatically rejected.

---

## 9 — Future Flow Designer Orchestration

Flow Designer flows will be built after Business Rules and Script Includes have been validated by ATF Pass 1. The flows exist as authored design specifications today — not as built ServiceNow flow records.

### Flow Inventory

| ID | Name | Type | Trigger |
|---|---|---|---|
| FL-001 | Assessment Orchestration | Flow | `state` changes to `Submitted (10)` |
| SF-001 | CMDB Validation | Subflow | Called by FL-001 |
| SF-002 | Calculate Readiness Score | Subflow | Called by FL-001 |

### FL-001 Orchestration Sequence

1. Notify assessor of submission receipt
2. Invoke SF-001 (CMDB Validation) → if fail, cancel assessment
3. Invoke SF-002 (Score Calculation) → update assessment with score
4. If gate fails → reject assessment
5. If gate passes → create approval request, wait for decision
6. Route to Approved or Rejected based on approver action

### Key Prerequisite

Both Script Includes must pass ATF validation before flows are built. The `ReadinessScorer` must be callable from a Flow Designer script step context, which requires testing since scoped-app script steps have different execution contexts than standalone Business Rules.

---

## 10 — Scaling Considerations

### Current Scale Targets

SentinelOps is designed for PDI demonstration and portfolio use. The data model and architecture, however, are structured to scale:

| Dimension | Current | Scale Path |
|---|---|---|
| Concurrent assessments | Tens | The scoring engine queries only checklist_results for a single assessment — O(n) per assessment, not O(n²) |
| Policy criteria per policy | 3–10 | No architectural limit; ChecklistGenerator iterates with a GlideRecord cursor |
| Checklist results per assessment | Matches criteria count | 1:1 with policy criteria; no fan-out |
| Business Rule cascades | Controlled | `setWorkflow(false)` in the score recalculation BR prevents infinite loops |

### Known Scaling Constraints

1. **Score recalculation is synchronous.** Each `checklist_result` update triggers a full rescore. If an assessor updates 10 items in rapid succession, 10 rescore operations fire. At scale, this should be debounced via an event + Script Action pattern.

2. **Weight field unused.** The current scorer treats all criteria equally. Weighted scoring requires modifying `ReadinessScorer.calculateScore()` to multiply by `weight / sum(weights)`.

3. **Single-hop CMDB validation.** The planned `SentinelOpsValidator` checks direct relationships in `cmdb_rel_ci`. Multi-hop dependency analysis (A → B → C) is a Phase 4+ enhancement.

4. **Threshold is hardcoded.** The 70% gate threshold is embedded in `ReadinessScorer`. Moving to `pass_threshold` from the assessment/policy record is a targeted one-line change.

---

## 11 — Enterprise Design Rationale

### Why a Scoped Application

Scoped apps provide namespace isolation (`x_1858206_sentin_0`), controlled cross-scope access, independent ACL evaluation, and safe upgrade paths. All SentinelOps artifacts are contained within the scope — nothing is installed in Global.

### Why Task Extension for Assessments

The `readiness_assessment` extends `task` to inherit `assigned_to` (used in ACL ownership checks), `state` (used by the transition guard), `number` (auto-numbering), the approval engine, and the activity stream. This is the single highest-leverage design decision in the application — it eliminates weeks of custom development.

### Why Plain Tables for Everything Else

`readiness_policy`, `policy_criteria`, `checklist_result`, and `release_gate` are plain custom tables. They don't need assignment, workflow, or approvals. Task extension would add 30+ unused inherited fields per record and slow GlideRecord queries.

### Why Business Rules Instead of Flows for State Enforcement

State transition enforcement runs as a synchronous `before` Business Rule, not a Flow Designer flow. Flows are asynchronous by default — a user could save an invalid transition and see it briefly succeed before the flow catches it. The Business Rule calls `setAbortAction(true)` and blocks the save atomically. Flows will handle orchestration (notifications, approvals, subflow chaining), not enforcement.

---

## Artifact Cross-Reference

| Document | What It Contains |
|---|---|
| [security-model.md](security-model.md) | Full 24-ACL matrix, condition script bodies, impersonation testing checklist |
| [decisions.md](decisions.md) | Architectural Decision Records with rationale |
| [flow-specifications.md](flow-specifications.md) | Flow Designer step-by-step specs |
| [testing-strategy.md](testing-strategy.md) | ATF test plan and coverage targets |
| [implementation_plan.md](implementation_plan.md) | Phase execution roadmap |
