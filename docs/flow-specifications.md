# SentinelOps — Flow Designer Specifications

> Human-readable specs for all Flow Designer flows and subflows.
> Author these BEFORE building flows in ServiceNow PDI.
> Flow Designer has no code export — this document is the design record.

---

## Flow Inventory

| ID | Name | Type | Trigger |
|---|---|---|---|
| FL-001 | Assessment Orchestration | Flow | State change → Submitted |
| SF-001 | CMDB Validation | Subflow | Called by FL-001 |
| SF-002 | Calculate Readiness Score | Subflow | Called by FL-001 |

---

## FL-001 — Assessment Orchestration (Main Flow)

### Trigger
- **Table:** `x_1858206_sentin_0_readiness_assessment`
- **Condition:** Record updated AND `state` changes to `Submitted` (value: `10`)

### Inputs
| Input | Type | Source |
|---|---|---|
| `assessment` | Reference (readiness_assessment) | Trigger record |

### Flow Steps

```
1. [Action] Notify Assessor — Submission Received
   → Send email to assessment.assigned_to

2. [Subflow] SF-001 — CMDB Validation
   → Input: assessment.cmdb_ci (business service reference)
   → Output: cmdb_valid (Boolean), cmdb_message (String)

3. [If] cmdb_valid == false
   → [Action] Set assessment.state = Cancelled
   → [Action] Notify Assessor — CMDB Validation Failed (include cmdb_message)
   → [End]

4. [Subflow] SF-002 — Calculate Readiness Score
   → Input: assessment (sys_id)
   → Output: score (Integer), gate_result (String: Pass/Fail), risk_tier (String)

5. [Action] Update Assessment Record
   → Set readiness_score = score
   → Set gate_result = gate_result
   → Set risk_tier = risk_tier
   → Set state = In Review (value: 20)

6. [If] gate_result == Fail
   → [Action] Notify Assessor — Gate Failed, Assessment Returned

7. [Else] gate_result == Pass
   → [Action] Create Approval for assessment.approval_group
   → [Wait] For Approval response

8. [If] Approval == Approved
   → [Action] Set state = Approved (value: 40)
   → [Action] Notify Assessor — Assessment Approved

9. [Else] Approval == Rejected
   → [Action] Set state = Rejected (value: 50)
   → [Action] Notify Assessor — Assessment Rejected (include rejection reason)

10. [End]
```

### Outputs
None (flow mutates the assessment record directly).

---

## SF-001 — CMDB Validation Subflow

### Purpose
Validate that the business service referenced on the assessment exists in CMDB and has required CI relationships.

### Inputs
| Input | Type | Required |
|---|---|---|
| `business_service_sysid` | String (sys_id) | Yes |

### Outputs
| Output | Type | Description |
|---|---|---|
| `cmdb_valid` | Boolean | True if validation passes |
| `cmdb_message` | String | Human-readable result or error detail |

### Steps

```
1. [Script Step] Invoke SentinelOpsValidator.validateCMDBRelationships(business_service_sysid)
   → Returns: { valid: Boolean, message: String }

2. [Action] Set Output Variables
   → cmdb_valid = result.valid
   → cmdb_message = result.message
```

### Script Include Dependency
`SentinelOpsValidator` — see `src/script-includes/SentinelOpsValidator.js`

---

## SF-002 — Calculate Readiness Score Subflow

### Purpose
Aggregate checklist results for an assessment and compute the readiness score, gate result, and risk tier.

### Inputs
| Input | Type | Required |
|---|---|---|
| `assessment_sysid` | String (sys_id) | Yes |

### Outputs
| Output | Type | Description |
|---|---|---|
| `score` | Integer | 0–100 weighted readiness score |
| `gate_result` | String | `Pass` or `Fail` |
| `risk_tier` | String | `Low`, `Medium`, or `High` |

### Steps

```
1. [Script Step] Invoke ReadinessScorer.calculateScore(assessment_sysid)
   → Returns: { score: Integer, gate_result: String, risk_tier: String }

2. [Action] Set Output Variables
   → score = result.score
   → gate_result = result.gate_result
   → risk_tier = result.risk_tier
```

### Script Include Dependency
`ReadinessScorer` — see `src/script-includes/ReadinessScorer.js`

---

## Notification Templates

| Template ID | Trigger | Recipients | Subject |
|---|---|---|---|
| NOTIF-001 | Assessment submitted | Assigned assessor | SentinelOps: Assessment submitted — {assessment.number} |
| NOTIF-002 | CMDB validation failed | Assigned assessor | SentinelOps: CMDB validation failed — {assessment.number} |
| NOTIF-003 | Gate failed | Assigned assessor | SentinelOps: Readiness gate failed — {assessment.number} |
| NOTIF-004 | Assessment approved | Assigned assessor | SentinelOps: Assessment approved — {assessment.number} |
| NOTIF-005 | Assessment rejected | Assigned assessor | SentinelOps: Assessment rejected — {assessment.number} |

---

## Pre-Build Validation Checklist

Before building these flows in PDI:

- [ ] Test flow trigger with a simple log-only flow to confirm state change fires correctly
- [ ] Confirm `SentinelOpsValidator` and `ReadinessScorer` Script Includes are committed and callable
- [ ] Confirm approval group exists and is populated with test approvers
- [ ] Confirm notification templates are created
- [ ] Confirm cross-scope access to `cmdb_ci_service` and `cmdb_rel_ci` passes (see `decisions.md`)

---

## References

- `src/script-includes/ReadinessScorer.js`
- `src/script-includes/SentinelOpsValidator.js`
- `flows/assessment-orchestration.md`
- `flows/cmdb-validation-subflow.md`
- `flows/score-calculation-subflow.md`
