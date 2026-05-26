# SentinelOps — Testing Strategy

> **Framework:** ServiceNow Automated Test Framework (ATF)  
> **Scope:** `x_1858206_sentin_0`  
> **Approach:** Two-pass — isolated scoring validation, then full integration.

---

## 1 — ATF Strategy

### Why ATF

SentinelOps runs entirely within ServiceNow. There is no external test harness. ATF is the platform-native testing framework that runs inside the PDI against real table data, respects scoped application boundaries, supports impersonation for role-based testing, and produces auditable execution logs.

### Two-Pass Rationale

The scoring engine is the intellectual core of SentinelOps. If scoring is wrong, every downstream decision — gate results, approval routing, dashboard reporting — is wrong. Testing the scorer in isolation before wiring it into Business Rules and Flows catches scoring bugs before they can cascade.

| Pass | When | What | Why |
|---|---|---|---|
| **Pass 1** | After Script Includes (Phase 3) | `ReadinessScorer` calculation logic in isolation | Validate the core algorithm before anything depends on it |
| **Pass 2** | After Flows + Dashboards (Phase 6) | Full integration: gates, ACLs, state transitions, BR triggers, flow execution | End-to-end governance validation |

### Test Suite Structure

```
SentinelOps Test Suite
│
├── Suite 1: Scoring Engine (Pass 1)
│   ├── ATF-001  All criteria pass
│   ├── ATF-002  Partial pass
│   ├── ATF-003  Mandatory fail override
│   ├── ATF-004  Score at threshold boundary
│   └── ATF-005  Empty checklist
│
├── Suite 2: Lifecycle Transitions (Pass 2)
│   ├── ATF-012  Invalid path rejected
│   └── ATF-013  Valid path allowed
│
├── Suite 3: ACL Validation (Pass 2)
│   ├── ATF-014  Assessor — own record write
│   ├── ATF-015  Assessor — other record denied
│   └── ATF-016  Viewer — read-only enforcement
│
├── Suite 4: Integration (Pass 2)
│   ├── ATF-010  Gate blocks on score below threshold
│   ├── ATF-011  Gate blocks on mandatory failure
│   ├── ATF-017  Checklist auto-generation on assessment create
│   ├── ATF-018  Score recalculation on checklist update
│   └── ATF-019  Flow trigger on state change
│
└── Suite 5: Negative Testing (Pass 2)
    ├── ATF-020  Assessment without policy — no checklist generated
    ├── ATF-021  Duplicate checklist generation blocked (idempotency)
    └── ATF-022  Unknown source state — guard allows through
```

---

## 2 — Scoring Validation

Tests target the `ReadinessScorer` Script Include directly. Each test creates seed data, calls `scorer.calculateScore(assessmentSysId)`, and asserts the return values.

### ATF-001: All Criteria Pass

```
Setup:
  Policy: threshold 70, 3 criteria (weights 40, 30, 30)
  Assessment: linked to policy, 3 checklist results all = 'pass'

Call:
  var result = new ReadinessScorer().calculateScore(assessmentSysId)

Assert:
  result.total  == 3
  result.passed == 3
  result.score  == 100    // Math.round(3/3 * 100)
  result.gate   == 'pass' // !mandatoryFail && 100 >= 70
```

### ATF-002: Partial Pass

```
Setup:
  3 criteria, 1 pass, 2 fail, none mandatory

Assert:
  result.total  == 3
  result.passed == 1
  result.score  == 33    // Math.round(1/3 * 100)
  result.gate   == 'fail' // 33 < 70
```

### ATF-003: Mandatory Fail Override

This is the most critical scoring test. It validates that a mandatory criterion failure forces the gate to `fail` even when the overall score exceeds the threshold.

```
Setup:
  3 criteria:
    Criterion A: mandatory=true,  result='fail'
    Criterion B: mandatory=false, result='pass'
    Criterion C: mandatory=false, result='pass'

Assert:
  result.total  == 3
  result.passed == 2
  result.score  == 67    // Math.round(2/3 * 100)
  result.gate   == 'fail' // mandatoryFail == true, overrides score
```

Note: In the current unweighted implementation, 2/3 = 67%, which is below the 70% threshold anyway. To properly test the override, the test should use 4 criteria where 3 pass and 1 mandatory fails, giving score = 75% (above threshold) but gate still = fail.

### ATF-004: Threshold Boundary

```
Setup:
  10 criteria, 7 pass, 3 fail, none mandatory

Assert:
  result.score == 70     // Math.round(7/10 * 100)
  result.gate  == 'pass' // 70 >= 70 (threshold is inclusive)
```

### ATF-004b: One Below Threshold

```
Setup:
  10 criteria, 6 pass, 4 fail + adjust to get exactly 69

Assert:
  result.score == 60     // Math.round(6/10 * 100)
  result.gate  == 'fail' // 60 < 70
```

### ATF-005: Empty Checklist

```
Setup:
  Assessment with policy linked, but no checklist_result records

Assert:
  result.total  == 0
  result.passed == 0
  result.score  == 0     // (total == 0) ? 0
  result.gate   == 'fail'
```

---

## 3 — Lifecycle Transition Testing

Tests target the `State Transition Guard` Business Rule. Each test attempts a state change on an assessment record and asserts whether the transition was allowed or blocked.

### ATF-012: Invalid Path Rejected

Tests each invalid transition from the guard's adjacency list:

| From State | To State | Expected |
|---|---|---|
| Draft (1) | Approved (40) | **Blocked** — 40 not in allowed[1] = [10, 100] |
| Draft (1) | In Review (30) | **Blocked** — 30 not in allowed[1] |
| Draft (1) | Blocked (50) | **Blocked** — 50 not in allowed[1] |
| Submitted (10) | Approved (40) | **Blocked** — 40 not in allowed[10] = [1, 30, 100] |
| Approved (40) | Draft (1) | **Blocked** — allowed[40] = [] (terminal) |
| Approved (40) | Submitted (10) | **Blocked** — terminal state |
| Cancelled (100) | Draft (1) | **Blocked** — allowed[100] = [] (terminal) |

ATF step pattern:
```
1. Create assessment in source state
2. Update state to target state
3. Assert: state still equals source state (update was aborted)
4. Assert: error message contains "Invalid state transition"
```

### ATF-013: Valid Path Allowed

Tests each valid transition:

| From State | To State | Expected |
|---|---|---|
| Draft (1) | Submitted (10) | **Allowed** |
| Draft (1) | Cancelled (100) | **Allowed** |
| Submitted (10) | Draft (1) | **Allowed** — return for rework |
| Submitted (10) | In Review (30) | **Allowed** |
| Submitted (10) | Cancelled (100) | **Allowed** |
| In Review (30) | Draft (1) | **Allowed** — return for rework |
| In Review (30) | Approved (40) | **Allowed** |
| In Review (30) | Blocked (50) | **Allowed** |
| Blocked (50) | Submitted (10) | **Allowed** — retry after fixing |
| Blocked (50) | Cancelled (100) | **Allowed** |

ATF step pattern:
```
1. Create assessment in source state
2. Update state to target state
3. Assert: state equals target state (update succeeded)
```

---

## 4 — ACL Validation

ACL tests require ATF impersonation steps to switch the running user context. Each test verifies a specific permission grant or denial.

### ATF-014: Assessor Can Write Own Record

```
1. Create assessment assigned_to = atf_assessor_1
2. Impersonate atf_assessor_1
3. Update a non-computed field (e.g., short_description)
4. Assert: update succeeded
5. De-impersonate
```

### ATF-015: Assessor Cannot Write Other User's Record

```
1. Create assessment assigned_to = atf_assessor_2
2. Impersonate atf_assessor_1
3. Attempt to update short_description
4. Assert: update failed / access denied
5. De-impersonate
```

This test validates the ACL condition script `assessorWrite.js`:
```javascript
if (gs.hasRole('x_1858206_sentin_0.assessor')) {
    return current.assigned_to == gs.getUserID();
}
```

### ATF-016: Viewer Cannot Write Any Record

```
1. Create assessment assigned_to = atf_assessor_1
2. Impersonate atf_viewer_1
3. Attempt to update any field
4. Assert: update failed / access denied
5. Assert: form fields render as read-only
6. De-impersonate
```

### Checklist ACL Tests (Extension)

The same ownership pattern applies to `checklist_result` via parent assessment traversal:

```
ATF-014b: Assessor can update checklist_result linked to own assessment
ATF-015b: Assessor cannot update checklist_result linked to another user's assessment
```

These test the `checklistWrite.js` condition script:
```javascript
var assessment = current.assessment.getRefRecord();
return assessment.assigned_to == gs.getUserID();
```

---

## 5 — Negative Testing

Negative tests validate that the system handles edge cases and error conditions gracefully.

### ATF-020: Assessment Without Policy

```
Setup:
  Create assessment with policy field empty

Assert:
  No checklist_result records generated
  (Generate Checklist Results BR checks: if (!current.getValue('policy')) return)
```

### ATF-021: Duplicate Checklist Generation Blocked

```
Setup:
  Create assessment with policy → checklist results auto-generated
  Manually re-trigger the Generate Checklist Results BR

Assert:
  Checklist result count unchanged
  (ChecklistGenerator idempotency guard: if existing.hasNext() return)
```

### ATF-022: Unknown Source State Allowed Through

```
Setup:
  Directly set assessment state to a non-standard value (e.g., 999)
  Attempt transition to state 1 (Draft)

Assert:
  Transition allowed — guard returns early for unknown states
  (Guard: if (!allowed[fromState]) return)
```

---

## 6 — Governance Integrity Testing

These tests validate that the complete governance chain — from checklist update to score recalculation to gate enforcement — works end-to-end.

### ATF-010: Gate Blocks on Low Score

```
1. Create assessment with policy (threshold: 70)
2. Checklist auto-generates (3 criteria, all 'pending')
3. Update 2 of 3 criteria to 'pass', 1 to 'fail'
4. Assert: readiness_score = 67 (2/3 * 100, rounded)
5. Assert: gate_result = 'fail' (67 < 70)
```

### ATF-011: Gate Blocks on Mandatory Failure

```
1. Create assessment with policy
2. Checklist auto-generates (3 criteria, one mandatory)
3. Update all optional criteria to 'pass'
4. Update mandatory criterion to 'fail'
5. Assert: gate_result = 'fail' regardless of score
```

### ATF-017: Checklist Auto-Generation

```
1. Create policy with 3 active criteria
2. Create assessment linked to that policy
3. Assert: exactly 3 checklist_result records exist for this assessment
4. Assert: each result has result = 'pending'
5. Assert: mandatory and weight values match source criteria
```

### ATF-018: Score Recalculation on Checklist Update

```
1. Create assessment → checklist auto-generates (3 items, all 'pending')
2. Assert: readiness_score = 0, gate_result = 'fail'
3. Update criterion 1 result to 'pass'
4. Assert: readiness_score = 33 (1/3)
5. Update criterion 2 result to 'pass'
6. Assert: readiness_score = 67 (2/3)
7. Update criterion 3 result to 'pass'
8. Assert: readiness_score = 100 (3/3), gate_result = 'pass'
```

This test validates the complete chain: `checklist_result.result.changes()` → `Calculate Readiness Score` BR fires → `ReadinessScorer.calculateScore()` → parent assessment updated with `setWorkflow(false)`.

### ATF-019: Flow Trigger on State Change

```
1. Create assessment in Draft state
2. Update state to Submitted (10)
3. Wait briefly for async flow processing
4. Query sys_flow_context for trigger_record = assessment sys_id
5. Assert: flow execution log entry exists for FL-001
```

Note: This test is only valid after FL-001 is built in Phase 4.

---

## 7 — Test Data Requirements

All test data is specified in `atf/test-data.md`. Summary:

| Record Type | Count | Notes |
|---|---|---|
| Test users | 3 | `atf_assessor_1`, `atf_assessor_2`, `atf_viewer_1` |
| Policy | 1 | "ATF Test Policy", threshold 70, 3 criteria |
| Criteria | 3 | Weights 40/30/30, first is mandatory |
| Assessments | 4 | Varying states and score configurations |
| Checklist results | 12 | 3 per assessment, auto-generated |

### Naming Convention

All ATF test records use `[ATF]` prefix in their short_description or name field for identification and cleanup.

### Teardown

Delete in order: Checklist Results → Assessments → (keep Policy and Users for re-runs).

---

## 8 — ATF Scoped App Constraints

| Constraint | Impact | Mitigation |
|---|---|---|
| **Record Validation** steps | Preferred assertion method — works reliably in scoped apps | Use for all field value assertions |
| **Record Query** steps | Reliable | Use for count assertions (e.g., checklist_result count) |
| **Server-side Script** steps | May have scope context issues | Use sparingly; prefer Record Validation |
| **Impersonation** steps | Work but require correct scoped role assignment | Pre-configure test users with exact scoped roles |
| `gs.log()` unavailable | Scoped app restriction | Use `gs.info()` for all logging |
| `gs.getUser().getID()` unavailable | Scoped app restriction | Use `gs.getUserID()` |

---

## References

| Document | Contents |
|---|---|
| `atf/test-plan.md` | Test suite structure and status tracking |
| `atf/test-data.md` | Seed data records and setup instructions |
| [decisions.md](decisions.md) | D-006 (mandatory override), D-010 (hardcoded threshold) |
| [architecture.md](architecture.md) | Scoring engine internals, BR cascade prevention |
