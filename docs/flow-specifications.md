# SentinelOps — Flow Designer Specifications

> **Status:** Design specs authored. Flows not yet built in ServiceNow PDI.  
> **Prerequisite:** ATF Pass 1 (scoring engine validation) must complete before flow construction begins.  
> **Design record:** Flow Designer does not export code. This document is the permanent design specification.

---

## 1 — Flow Inventory

| ID | Name | Type | Trigger | Dependencies |
|---|---|---|---|---|
| FL-001 | Assessment Orchestration | Flow | `readiness_assessment.state` → `Submitted (10)` | SF-001, SF-002 |
| SF-001 | CMDB Validation | Subflow | Called by FL-001 | `SentinelOpsValidator` (not yet built) |
| SF-002 | Calculate Readiness Score | Subflow | Called by FL-001 | `ReadinessScorer` (live in PDI) |

### Script Include Readiness

| Script Include | Status | Notes |
|---|---|---|
| `ReadinessScorer` | ✅ Live | `calculateScore(assessmentSysId)` returns `{ score, passed, total, gate }` |
| `ChecklistGenerator` | ✅ Live | Used by BR, not directly by flows |
| `SentinelOpsValidator` | ⬜ Not built | CMDB validation logic — required before SF-001 can be built |

---

## 2 — FL-001: Assessment Orchestration Flow

### Trigger Configuration

| Property | Value |
|---|---|
| Table | `x_1858206_sentin_0_readiness_assessment` |
| Trigger | Record Updated |
| Condition | `state` changes to `10` (Submitted) |
| Run As | System |

**Pre-build validation:** Create a test flow with a single log action on this trigger. Submit an assessment. Confirm the flow execution log shows the trigger firing. Task-extended tables occasionally have quirky trigger behavior with custom state values — test before building the full orchestration.

### Step-by-Step Specification

```
STEP 1 — Notify Assessor: Submission Received
─────────────────────────────────────────────────
  Action:     Send Notification
  To:         trigger_record.assigned_to
  Template:   NOTIF-001
  Note:       Confirmation that submission was received and
              automated validation is underway.

STEP 2 — Subflow: SF-001 CMDB Validation
─────────────────────────────────────────────────
  Input:      trigger_record.service_ci (sys_id)
  Output:     cmdb_valid (Boolean), cmdb_message (String)

STEP 3 — If: CMDB Validation Failed
─────────────────────────────────────────────────
  Condition:  cmdb_valid == false

  STEP 3a — Update Record
    state = 100 (Cancelled)

  STEP 3b — Notify Assessor: CMDB Validation Failed
    Template: NOTIF-002
    Body:     Include cmdb_message with specific failure reason

  STEP 3c — End Flow

STEP 4 — Subflow: SF-002 Calculate Readiness Score
─────────────────────────────────────────────────
  Input:      trigger_record.sys_id
  Output:     score (Integer), gate (String), passed (Integer),
              total (Integer)

STEP 5 — Update Record: Apply Score Results
─────────────────────────────────────────────────
  Target:     trigger_record
  Fields:
    readiness_score  = SF-002.score
    gate_result      = SF-002.gate
    criteria_passed  = SF-002.passed
    criteria_total   = SF-002.total
    state            = 30 (In Review)

STEP 6 — If: Gate Failed
─────────────────────────────────────────────────
  Condition:  SF-002.gate == 'fail'

  STEP 6a — Update Record: state = 50 (Blocked)

  STEP 6b — Notify Assessor: Gate Failed
    Template: NOTIF-003
    Body:     Score, threshold, which mandatory criteria failed

  STEP 6c — End Flow

STEP 7 — Ask For Approval
─────────────────────────────────────────────────
  Condition:  gate == 'pass' (implicit — flow reaches here
              only if gate passed)
  Target:     trigger_record
  Group:      trigger_record.approval_group (if populated)
              OR fallback to assignment_group
  Due Date:   Now + 24 business hours (SLA-002)
  Wait:       Until approved or rejected

STEP 8 — Branch: Approval Decision
─────────────────────────────────────────────────
  Approved:
    STEP 8a — Update Record: state = 40 (Approved)
    STEP 8b — Notify: NOTIF-004 (Assessment Approved)

  Rejected:
    STEP 8c — Update Record: state = 50 (Blocked)
    STEP 8d — Notify: NOTIF-005 (Assessment Rejected)
              Body includes: rejection reason from approver

STEP 9 — End
```

### Error Handling

| Failure Point | Strategy |
|---|---|
| SF-001 script step throws exception | Catch: `cmdb_valid = false`, `cmdb_message = 'System error during CMDB validation'` → proceed to Step 3 |
| SF-002 script step throws exception | Catch: `score = 0`, `gate = 'fail'` → proceed to Step 6 |
| Approval group is empty | Approval action has no target → SLA-002 escalation fires after 24 hours |

### State Transitions Triggered by FL-001

| From | To | Condition |
|---|---|---|
| Submitted (10) | Cancelled (100) | CMDB validation fails |
| Submitted (10) | In Review (30) | CMDB valid, score computed |
| In Review (30) | Blocked (50) | Gate fails |
| In Review (30) | Approved (40) | Gate passes, approver approves |
| In Review (30) | Blocked (50) | Gate passes, approver rejects |

Note: These transitions must be present in the State Transition Guard's allowed map. The current guard allows all of these paths from state `30`.

---

## 3 — SF-001: CMDB Validation Subflow

### Purpose

Validates that the business service CI referenced on the assessment:
1. Exists in `cmdb_ci_service`
2. Has at least one registered relationship in `cmdb_rel_ci`

This is a single-hop relationship check. The subflow does not traverse multi-hop dependency chains.

### Interface

**Inputs:**

| Name | Type | Required |
|---|---|---|
| `business_service_sysid` | String (sys_id) | Yes |

**Outputs:**

| Name | Type | Description |
|---|---|---|
| `cmdb_valid` | Boolean | `true` if both checks pass |
| `cmdb_message` | String | Human-readable result or failure detail |

### Steps

```
STEP 1 — Script Step
─────────────────────────────────────────────────
  var validator = new SentinelOpsValidator();
  var result = validator.validateCMDBRelationships(
      inputs.business_service_sysid
  );
  outputs.cmdb_valid = result.valid;
  outputs.cmdb_message = result.message;
```

### Validation Logic (SentinelOpsValidator — to be implemented)

```javascript
validateCMDBRelationships: function(sysid) {
    // 1. Check CI exists
    var ci = new GlideRecord('cmdb_ci_service');
    if (!ci.get(sysid)) {
        return { valid: false, message: 'Business service not found in CMDB' };
    }

    // 2. Check relationships exist
    var rel = new GlideRecord('cmdb_rel_ci');
    rel.addQuery('parent', sysid)
       .addOrCondition('child', sysid);
    rel.query();

    if (!rel.hasNext()) {
        return { valid: false, message: 'No CI relationships found for this service' };
    }

    return { valid: true, message: 'CMDB validation passed' };
}
```

### Cross-Scope Prerequisite

Before building this subflow, verify cross-scope access from the scoped app to `cmdb_ci_service` and `cmdb_rel_ci`:

```javascript
// Run in Scripts - Background (scoped app context)
gs.info(new GlideRecord('cmdb_ci_service').isValid());  // Must: true
gs.info(new GlideRecord('cmdb_rel_ci').isValid());       // Must: true
```

If either returns `false`, a cross-scope access request must be configured before SF-001 can function.

---

## 4 — SF-002: Calculate Readiness Score Subflow

### Purpose

Wraps the existing `ReadinessScorer` Script Include for use within Flow Designer's script step context.

### Interface

**Inputs:**

| Name | Type | Required |
|---|---|---|
| `assessment_sysid` | String (sys_id) | Yes |

**Outputs:**

| Name | Type | Description |
|---|---|---|
| `score` | Integer | 0–100 |
| `gate` | String | `pass` or `fail` |
| `passed` | Integer | Count of passing criteria |
| `total` | Integer | Total criteria evaluated |

### Steps

```
STEP 1 — Script Step
─────────────────────────────────────────────────
  var scorer = new ReadinessScorer();
  var result = scorer.calculateScore(inputs.assessment_sysid);
  outputs.score  = result.score;
  outputs.gate   = result.gate;
  outputs.passed = result.passed;
  outputs.total  = result.total;
```

**Note on output naming:** The production `ReadinessScorer` returns `{ score, passed, total, gate }` — not `gate_result` or `risk_tier`. The subflow outputs must match these exact property names.

### Pre-Build Validation

The `ReadinessScorer` is already callable from Business Rule context (proven by `Calculate Readiness Score` BR running successfully in PDI). However, Flow Designer script steps execute in a slightly different scope context. Verify by running the scorer from a test flow script step before building the full subflow.

---

## 5 — Approval Routing

### Current Design

Approval routing uses the ServiceNow native **Ask For Approval** flow action. The approval target is determined at runtime from the assessment record:

1. If `approval_group` is populated on the assessment → route to that group
2. If empty → route to `assignment_group` (inherited from task)
3. If both empty → approval hangs with no target, SLA escalation fires

### Approval Decision Handling

| Decision | Flow Action | State Transition |
|---|---|---|
| Approved | Update record | In Review (30) → Approved (40) |
| Rejected | Update record + notify | In Review (30) → Blocked (50) |

The approval rejection reason is captured by the native approval action and included in NOTIF-005.

### Why "Blocked" Instead of "Rejected"

The actual state choice list uses the label **Blocked** (value `50`), not "Rejected". This is intentional: a blocked assessment can be resubmitted (`50 → 10`) after the assessor addresses the deficiencies. A "rejected" label would imply finality. Blocked implies "fix and retry".

---

## 6 — SLA Escalation Logic

> **Status:** Design specification. SLA definitions will be created after FL-001 is stable.

### SLA Definitions

**SLA-001 — Submission Processing**

| Property | Value |
|---|---|
| Table | `readiness_assessment` |
| Start condition | `state` changes to `10` (Submitted) |
| Stop condition | `state` changes to `30` (In Review) OR `100` (Cancelled) |
| Duration | 4 business hours |

Escalation:
- 50% elapsed (2 hours): Warning notification to assessor
- 100% breached: Notification to assessor's manager

**SLA-002 — Approval Response**

| Property | Value |
|---|---|
| Table | `readiness_assessment` |
| Start condition | `state` changes to `30` (In Review) AND `gate_result` = `pass` |
| Stop condition | `state` changes to `40` (Approved) OR `50` (Blocked) |
| Duration | 24 business hours |

Escalation:
- 75% elapsed (18 hours): Reminder to approval group
- 100% breached: Notification to approval group lead + assessor's manager

---

## 7 — Notification Orchestration

### Template Inventory

| ID | Trigger | Recipient | Subject |
|---|---|---|---|
| NOTIF-001 | Assessment submitted | Assigned assessor | `SentinelOps: Assessment submitted — {number}` |
| NOTIF-002 | CMDB validation failed | Assigned assessor | `SentinelOps: CMDB validation failed — {number}` |
| NOTIF-003 | Gate failed | Assigned assessor | `SentinelOps: Readiness gate failed — {number}` |
| NOTIF-004 | Approval granted | Assigned assessor | `SentinelOps: Assessment approved — {number}` |
| NOTIF-005 | Approval rejected | Assigned assessor | `SentinelOps: Assessment blocked — {number}` |
| NOTIF-ESC-001 | SLA-001 50% | Assessor | `SentinelOps: Submission processing delayed — {number}` |
| NOTIF-ESC-002 | SLA-001 100% | Assessor's manager | `SentinelOps: SLA breached on submission — {number}` |
| NOTIF-ESC-003 | SLA-002 75% | Approval group | `SentinelOps: Approval pending — {number}` |
| NOTIF-ESC-004 | SLA-002 100% | Approval group lead | `SentinelOps: Approval SLA breached — {number}` |

---

## 8 — Pre-Build Validation Checklist

Complete all items before constructing any flow in ServiceNow PDI:

**Script Include readiness:**
- [x] `ReadinessScorer` committed and live in PDI
- [x] `ChecklistGenerator` committed and live in PDI
- [ ] `SentinelOpsValidator` implemented and tested
- [ ] ATF Pass 1 (scoring engine tests ATF-001 through ATF-005) passing

**Cross-scope access:**
- [ ] `cmdb_ci_service` accessible from scoped app (`isValid()` returns true)
- [ ] `cmdb_rel_ci` accessible from scoped app (`isValid()` returns true)

**Flow trigger verification:**
- [ ] Test flow with log-only action confirms trigger fires on state → 10

**Approval group setup:**
- [ ] At least one approval group exists with ≥ 1 active member
- [ ] Test assessment has approval group populated

**Notification templates:**
- [ ] NOTIF-001 through NOTIF-005 created in ServiceNow

---

## References

| Document | Contents |
|---|---|
| [architecture.md](architecture.md) | System architecture and Business Rule internals |
| [decisions.md](decisions.md) | D-005 (BR vs Flow), D-006 (mandatory override), D-008 (setWorkflow) |
| [testing-strategy.md](testing-strategy.md) | ATF-019 (flow trigger test) |
| `flows/assessment-orchestration.md` | Summary spec for FL-001 |
| `flows/cmdb-validation-subflow.md` | Summary spec for SF-001 |
| `flows/score-calculation-subflow.md` | Summary spec for SF-002 |
