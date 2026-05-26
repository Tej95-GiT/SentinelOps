# SentinelOps — Architectural Decision Records

> Decisions recorded here reflect choices already made and implemented in the production codebase.  
> Each ADR is traceable to specific artifacts in the `update/` directory or `src/` mirror.

---

## ADR Template

```markdown
## D-XXX — [Decision Title]

**Date:** YYYY-MM-DD | **Status:** Accepted / Superseded

### Context
What constraint or trade-off forced this decision.

### Decision
What was decided.

### Rationale
Why this option won out.

### Consequences
What we gained and what we accepted as trade-off.

### Evidence
File paths to the artifacts that implement this decision.
```

---

## D-001 — Assessment Table Extends Task

**Date:** 2026-05-21 | **Status:** Accepted

### Context
The readiness assessment needs assignment, state management, work notes, an activity stream, approval routing, and auto-numbered records. Building these from scratch on a plain custom table would take weeks and produce a worse result than the platform-native implementation.

### Decision
`x_1858206_sentin_0_readiness_assessment` extends `task`.

### Rationale
Task extension provides `assigned_to` (used directly in ACL condition scripts for ownership restriction), `state` (used by the State Transition Guard for lifecycle enforcement), `number` (auto-generated record identifiers), native approval engine support (used by future FL-001 orchestration), work notes and activity stream (audit trail without custom implementation), and Flow Designer trigger support (state-change triggers work natively on task-extended tables).

### Consequences
**Gained:** All of the above, plus compatibility with any ServiceNow plugin or integration that targets the `task` table.

**Accepted:** Custom state values (`1, 10, 30, 40, 50, 100`) coexist with Task's default states. Platform upgrades adding states in this range could collide — mitigated by monitoring ServiceNow release notes. Task extension adds ~30 inherited fields not used by SentinelOps — mitigated with UI Policies hiding irrelevant fields.

### Evidence
- `update/sys_db_object_941288593b450f10982a9dc643e45a32.xml` — table definition showing task extension
- `50e1684c3b8d8310982a9dc643e45a23/README.md` — lists "Task table schema" as a dependency

---

## D-002 — Checklist Results, Policy, Criteria, and Release Gate Are Plain Tables

**Date:** 2026-05-21 | **Status:** Accepted

### Context
The four supporting tables (`readiness_policy`, `policy_criteria`, `checklist_result`, `release_gate`) are configuration records and line-item data. They have no independent lifecycle, no assignment, and no approval requirements.

### Decision
All four tables are plain custom tables. None extend `task`.

### Rationale
Checklist results are lightweight line-item records — one per criterion per assessment. They track a single `result` value (`pending`, `pass`, `fail`, `not_applicable`). Policies and criteria are configuration data. Release gates are simple intake records. Extending task would add unused overhead: inherited fields, unnecessary ACL evaluation chains, and slower GlideRecord queries.

### Consequences
**Gained:** Clean, minimal schemas. Faster queries. No inherited state machine to manage.

**Accepted:** No native work notes or activity stream on these tables. Notes go on the parent assessment record instead, which does extend task.

### Evidence
- `update/sys_db_object_2708df013bc10f10982a9dc643e45a61.xml` — checklist_result (no task extension)
- `update/sys_db_object_d9d494113b890f10982a9dc643e45a39.xml` — readiness_policy
- `update/sys_db_object_6053cd813b81cb10982a9dc643e45a93.xml` — policy_criteria
- `update/sys_db_object_ebc3bc803b41c310982a9dc643e45ad8.xml` — release_gate

---

## D-003 — Terminal States Are Immutable

**Date:** 2026-05-24 | **Status:** Accepted

### Context
Once an assessment is approved, the governance outcome must be permanently recorded. If an approved assessment could be moved back to Draft or Submitted, the historical governance record would be corrupted — there would be no reliable evidence that a service was validated before go-live.

### Decision
Approved (`40`) and Cancelled (`100`) are terminal states with empty allowed-transition arrays in the State Transition Guard.

```javascript
'40':  [],    // Approved — terminal
'100': []     // Cancelled — terminal
```

### Rationale
Governance decisions are audit artifacts. An Approved assessment is evidence that a service met readiness criteria at a specific point in time. Allowing regression (Approved → Draft) would make the governance record unreliable. If a service needs re-evaluation after approval, the correct pattern is to create a new assessment (see D-004).

### Consequences
**Gained:** Immutable governance history. Every approval is a permanent record.

**Accepted:** If an approval was made in error, it cannot be reversed within the system. The admin must handle error correction through a new assessment or out-of-band process.

### Evidence
- `update/sys_script_ba49e7ed3b050350982a9dc643e45abb.xml` — State Transition Guard, lines 56–58: `'40': [], '100': []`

---

## D-004 — Reassessment Creates a New Record, Not a State Regression

**Date:** 2026-05-24 | **Status:** Accepted

### Context
After an assessment is Approved or Rejected, the service may undergo changes that require re-evaluation. The question: should the existing assessment be reopened, or should a new assessment be created?

### Decision
Reassessment always creates a **new** `readiness_assessment` record. The `assessment_type` choice list includes `reassessment` as an explicit type.

### Rationale
Reopening an approved record would destroy the audit trail of the original approval. A new record preserves:
- The original assessment's score, gate result, and approval timestamp
- A clear chronological sequence of governance evaluations for the same service
- The ability to compare current vs. previous assessment outcomes in dashboards

The `assessment_type` field (choices: `initial`, `reassessment`, `periodic`, `emergency`) distinguishes first-time assessments from follow-ups.

### Consequences
**Gained:** Complete audit trail. Every assessment stands as an independent governance record with its own lifecycle, score, and outcome.

**Accepted:** Over time, a single service may accumulate multiple assessment records. This is desirable for trend analysis (dashboard: "readiness by business service over time") but requires dashboard queries to filter by latest assessment per service.

### Evidence
- `author_elective_update/sys_choice_..._assessment_type.xml` — includes `reassessment` choice
- D-003 (terminal states) — makes reopening architecturally impossible

---

## D-005 — Business Rule State Enforcement, Not Flow Designer

**Date:** 2026-05-24 | **Status:** Accepted

### Context
State transitions could be enforced by a Flow Designer flow (reactive, after the fact) or by a synchronous Business Rule (blocking, before the save).

### Decision
The `State Transition Guard` is a **before** Business Rule with `setAbortAction(true)`. Flow Designer handles orchestration (notifications, approvals), not enforcement.

### Rationale
Flows are asynchronous by default. If state enforcement were in a flow:
1. The invalid transition would briefly save to the database
2. The flow would detect it and attempt to revert
3. Between save and revert, other Business Rules, ACLs, and queries would see the invalid state
4. The user would see the form update, then get a delayed error — confusing UX

A `before` Business Rule prevents the invalid record from ever being committed. The user sees an immediate error message: *"Invalid state transition from 'Draft' to 'Approved'"*. The record stays in its original state.

### Consequences
**Gained:** Atomic enforcement. Invalid transitions are never committed to the database, not even briefly.

**Accepted:** Business Rules are harder to debug than flows (no visual execution log). The guard includes `gs.info()` logging at every decision point to compensate.

### Evidence
- `update/sys_script_ba49e7ed3b050350982a9dc643e45abb.xml` — `<when>before</when>`, `current.setAbortAction(true)`

---

## D-006 — Mandatory Fail Override Logic

**Date:** 2026-05-23 | **Status:** Accepted

### Context
Some governance criteria are non-negotiable. If a service doesn't have CMDB CI relationships registered, it cannot go live regardless of how well it scores on other criteria. The scoring engine needs a mechanism to override a high overall score when a mandatory criterion fails.

### Decision
If any `checklist_result` where `mandatory == true` has a result ≠ `'pass'`, the gate result is forced to `'fail'` regardless of the computed score.

```javascript
if (gr.mandatory == true && result != 'pass') {
    mandatoryFail = true;
}
// ...
if (!mandatoryFail && score >= 70) {
    gate = 'pass';
}
```

### Rationale
A service scoring 95% overall but missing its CMDB registration (a mandatory item) is still not production-ready. The mandatory override ensures that governance-critical criteria cannot be compensated for by high scores on optional criteria. This is the core governance integrity mechanism.

### Consequences
**Gained:** Non-negotiable criteria enforcement. The gate cannot be gamed by padding optional criteria scores.

**Accepted:** A single mandatory fail blocks the entire assessment. This is intentional — if the criterion is truly mandatory, there is no valid reason to proceed without it. If a criterion is frequently blocking assessments inappropriately, the correct fix is to change its `mandatory` flag in the policy, not to weaken the override logic.

### Evidence
- `update/sys_script_include_e4ab54913bc90f10982a9dc643e45ac2.xml` — ReadinessScorer, lines 42–44: mandatory check
- `update/sys_dictionary_..._checklist_result_mandatory.xml` — mandatory field on checklist_result

---

## D-007 — Denormalized Weight and Mandatory on Checklist Result

**Date:** 2026-05-24 | **Status:** Accepted

### Context
When `ChecklistGenerator` creates `checklist_result` records from `policy_criteria`, it copies `weight` and `mandatory` from the criterion onto the result record.

### Decision
`weight` and `mandatory` are **denormalized** (duplicated) from `policy_criteria` to `checklist_result` at generation time.

### Rationale
If a policy administrator changes a criterion's weight from 5 to 3 after assessments have been generated, in-flight assessments should retain the original weight of 5 — the weight under which the assessor was evaluated. Governance outcomes must be frozen at the point of assessment creation. The denormalized copy ensures immutability.

### Consequences
**Gained:** Assessment scores are immutable historical records. Changing a policy's criteria weights only affects future assessments.

**Accepted:** Data duplication. The same weight value exists on both `policy_criteria` and `checklist_result`. This is a deliberate trade-off for governance integrity.

### Evidence
- `update/sys_script_include_34481b6d3b810350982a9dc643e45a0b.xml` — ChecklistGenerator, lines 46–47:
  ```javascript
  checklistGR.mandatory = criteriaGR.mandatory;
  checklistGR.weight = criteriaGR.weight;
  ```

---

## D-008 — setWorkflow(false) in Score Recalculation

**Date:** 2026-05-25 | **Status:** Accepted

### Context
The `Calculate Readiness Score` Business Rule fires on `checklist_result` insert/update. It computes the score and writes results back to the parent `readiness_assessment` using `gr.update()`. Without safeguards, this update would trigger Business Rules on the assessment table, potentially creating an infinite cascade.

### Decision
The score recalculation update uses `gr.setWorkflow(false)` and `gr.autoSysFields(false)` before calling `gr.update()`.

### Rationale
`setWorkflow(false)` suppresses all Business Rules, workflows, and flow triggers on the parent assessment record during this update. This prevents:
1. The State Transition Guard from evaluating a non-state-change update
2. The Generate Checklist Results rule from re-firing
3. Any flow trigger from interpreting the score update as a state change

`autoSysFields(false)` preserves the original `sys_updated_on` and `sys_updated_by` timestamps — the score recalculation is a system operation, not a user action.

### Consequences
**Gained:** No infinite loops. No false triggers. Clean audit trail.

**Accepted:** If a flow trigger needs to fire when the score changes (e.g., a notification when gate_result flips to 'pass'), it will not fire during the automated recalculation. This is the correct behavior — the flow should trigger on the state change, not the score update.

### Evidence
- `update/sys_script_c34d50953bc90f10982a9dc643e45afd.xml` — lines 48–49:
  ```javascript
  gr.autoSysFields(false);
  gr.setWorkflow(false);
  ```

---

## D-009 — Idempotent Checklist Generation

**Date:** 2026-05-24 | **Status:** Accepted

### Context
The `Generate Checklist Results` Business Rule fires on after insert. If an assessment record is inserted multiple times (e.g., due to import or script re-execution), checklist results would be duplicated.

### Decision
`ChecklistGenerator.generateFromPolicy()` includes an idempotency guard: it checks for existing `checklist_result` records linked to the assessment before generating new ones.

```javascript
var existing = new GlideRecord('x_1858206_sentin_0_checklist_result');
existing.addQuery('assessment', assessmentGR.getUniqueValue());
existing.setLimit(1);
existing.query();
if (existing.hasNext()) {
    return;  // Already generated — skip
}
```

### Rationale
Without the guard, reimporting an assessment record from XML or re-running a script would create duplicate checklist results, corrupting the score calculation. The `setLimit(1)` optimization avoids a full count query — we only need to know if at least one exists.

### Consequences
**Gained:** Safe re-execution. Assessment records can be imported, recreated, or script-tested without side effects.

**Accepted:** If an administrator deletes some (but not all) checklist results and wants to regenerate them, the idempotency guard will prevent it. The workaround is to delete all checklist results for the assessment first.

### Evidence
- `update/sys_script_include_34481b6d3b810350982a9dc643e45a0b.xml` — ChecklistGenerator, lines 22–30

---

## D-010 — Hardcoded 70% Gate Threshold

**Date:** 2026-05-23 | **Status:** Accepted — targeted for upgrade

### Context
The `ReadinessScorer` needs a threshold to determine pass/fail. The `pass_threshold` field exists on both `readiness_policy` and `readiness_assessment`, but the scorer currently hardcodes `70`.

### Decision
The initial implementation uses a hardcoded threshold of 70%. The fields for dynamic threshold exist but are not yet wired.

### Rationale
During initial development, the priority was validating the scoring algorithm end-to-end. Wiring the threshold to the database field was deferred to avoid adding another variable during debugging. The hardcoded value made it trivial to verify expected gate outcomes during manual testing.

### Consequences
**Gained:** Simplified debugging during initial development. Deterministic behavior during testing.

**Accepted:** All assessments are evaluated against the same 70% threshold regardless of their policy configuration. This must be upgraded before Phase 4 flows go live — the fix is a single-line change to read from the assessment or policy record.

### Evidence
- `update/sys_script_include_e4ab54913bc90f10982a9dc643e45ac2.xml` — line 51: `if (!mandatoryFail && score >= 70)`
- `update/sys_dictionary_..._readiness_assessment_pass_threshold.xml` — field exists, unused by scorer
- `update/sys_dictionary_..._readiness_policy_pass_threshold.xml` — field exists on policy

---

## D-011 — Repository as Project Memory Layer

**Date:** 2026-05-24 | **Status:** Accepted

### Context
SentinelOps is developed with multiple tools: ServiceNow PDI (implementation), AI coding assistants (scripting), and GitHub (portfolio). Without a persistent shared context, each tool session starts from zero.

### Decision
The GitHub repository serves as the authoritative human-readable project memory alongside ServiceNow's XML artifacts.

### Rationale
- `src/` mirrors ServiceNow scripts as readable `.js` files — reviewers read JavaScript, not XML
- `docs/` persists architectural decisions, specifications, and implementation plans
- `CHANGELOG.md` tracks implementation progression phase by phase
- Any assistant can be re-briefed by reading the repository documentation

### Consequences
**Gained:** Zero context loss between sessions. Portfolio-grade repository presentation.

**Accepted:** The `src/` mirror must be manually synchronized after each ServiceNow scripting commit. There is no automated export from ServiceNow to `.js` files.

### Evidence
- Repository structure itself: `src/`, `docs/`, `flows/`, `atf/`, `demo/`
- `src/acl-scripts/*.js` — manually maintained mirrors of ACL condition scripts

---

## D-012 — Business Rule Ordering by Explicit Order Values

**Date:** 2026-05-25 | **Status:** Accepted

### Context
Multiple Business Rules target the same tables. Without explicit ordering, ServiceNow executes them in an undefined sequence, which can cause data integrity issues.

### Decision
All Business Rules use explicit `order` values. On `readiness_assessment`:
- State Transition Guard: order `100` (runs first)
- Generate Checklist Results: order `200` (runs after state validation)

On `checklist_result`:
- Calculate Readiness Score: order `200`

### Rationale
The state guard must reject invalid transitions before any downstream logic runs. If checklist generation ran first and the state guard ran second and aborted, orphaned checklist records would exist for an assessment that was never actually saved.

### Consequences
**Gained:** Deterministic, documented execution sequence.

**Accepted:** New Business Rules added to these tables must be assigned order values that respect the existing sequence. This is documented here and in `src/business-rules/README.md`.

### Evidence
- `update/sys_script_ba49e7ed3b050350982a9dc643e45abb.xml` — `<order>100</order>`
- `update/sys_script_a3aed3ed3b810350982a9dc643e45a9c.xml` — `<order>200</order>`
- `update/sys_script_c34d50953bc90f10982a9dc643e45afd.xml` — `<order>200</order>`
