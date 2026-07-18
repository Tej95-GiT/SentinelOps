# SentinelOps — Known Constraints & Phase 2 Enterprise Scaling Roadmap

> **Authored by:** Platform Architecture  
> **Scope:** `x_1858206_sentin_0` · ServiceNow Australia Release  
> **Status:** Phase 1 (PDI) complete. Constraints below are accepted trade-offs for the current deployment envelope, not defects.

These constraints are documented here because hiding technical debt from an architecture review is amateur behavior. Every item below has a known fix, a known cost, and a known priority.

---

## Current Deployment Envelope

Phase 1 targets Personal Developer Instance (PDI) scale:

| Dimension | Phase 1 Limit | Phase 2 Target |
|---|---|---|
| Concurrent assessors | < 10 | 100+ |
| Checklist criteria per policy | < 50 | 500+ |
| CMDB CI relationships traversed | < 5 hops | Graph-bounded |
| REST API throughput | Low (PDI) | Rate-limited, validated |
| `release_gate` volume | Low | High-throughput CI/CD |

---

## Constraint 1 · O(N) Transaction Degradation — Score Recalculation

**Affected components:** `ReadinessScorer.js`, `calculateReadinessScore.js`  
**Current behavior:** Every `checklist_result` update triggers a synchronous `while(gr.next())` full-table scan of all checklist rows for the parent assessment. There is no `setLimit()`. There is no batching. The score is recalculated on every keystroke save.

**Why it was built this way:** Simplicity. A GlideRecord loop over 5–50 rows on a PDI completes in milliseconds. The complexity of a debounce pattern was not justified at v1 scale.

**The break point:** At 200+ criteria per policy with 50+ concurrent assessors, synchronous full-table scans on `checklist_result` will approach ServiceNow's 30-second transaction timeout. Score writes will fail silently. Assessors will see stale scores.

**Phase 2 fix:**
1. Convert `calculateReadinessScore.js` from an `after` synchronous BR to a background script triggered by a Flow Designer script step.
2. Implement a debounce mechanism: queue score recalculations and execute the last-write-wins after a 2-second idle period.
3. Add `gr.setLimit(policy.criteria_count + 10)` as an immediate guard while the async migration is in progress.

---

## Constraint 2 · REST Payload Coercion — No Type Validation on Ingestion Endpoint

**Affected components:** `evaluateOperationalGovernance.js`, `SentinelOps Ingestion` Scripted REST API  
**Current behavior:** The `POST /api/x_1858206_sentin_0/sentinel_ops/submit` endpoint accepts a raw JSON body. The `tech_debt_score` field is passed to `parseInt()` without pre-validation. `parseInt("INVALID", 10)` returns `NaN`. `NaN > 50` evaluates to `false` in JavaScript/Rhino. A non-numeric payload auto-approves a release.

Additionally: the governance threshold (50) is hardcoded in `evaluateOperationalGovernance.js`. Changing the threshold requires a code change and a ServiceNow commit.

**Phase 2 fix:**
1. Add an explicit validation block at the top of the Scripted REST API `POST` operation before GlideRecord insertion:
   ```javascript
   var techDebt = parseInt(request.body.data.tech_debt_score, 10);
   if (isNaN(techDebt) || techDebt < 0 || techDebt > 100) {
       response.setStatus(400);
       response.setBody({ error: "tech_debt_score must be an integer between 0 and 100." });
       return;
   }
   ```
2. Move the governance threshold to a System Property: `x_1858206_sentin_0.governance_debt_threshold`.
3. Document a maximum payload size recommendation in the API spec (suggested: 64KB).

---

## Constraint 3 · Table API Data Exposure — `viewer` Role Has No API-Layer Restriction

**Affected components:** ACLs `assessorRead.js`, `checklistRead.js`, 26-ACL matrix  
**Current behavior:** The `x_1858206_sentin_0.viewer` role ACL condition returns `true` for all rows in `readiness_assessment` and `checklist_result`. This is by design for the UI Workspace — viewers need read-only access to all governance records for reporting purposes.

The gap: the ServiceNow Table API (`/api/now/table/x_1858206_sentin_0_readiness_assessment`) honors the same ACL evaluation. Any user with the `viewer` role can issue a single REST call and retrieve the entire assessment table with no row limit imposed at the application layer. This is a bulk data exfiltration vector for users who have UI read access.

**This is a known ServiceNow platform behavior, not a SentinelOps-specific bug.** Every scoped application with a read-capable role faces this without explicit countermeasures.

**Phase 2 fix:**
1. Create a dedicated `viewer_api` role. The standard `viewer` role grants UI access only. The `viewer_api` role is required for programmatic/API access.
2. Add a Scripted REST API endpoint for approved read operations (e.g., `GET /sentinel_ops/assessments`) that enforces pagination and field masking. Redirect viewer API access to this endpoint via documentation.
3. File a ServiceNow-level request to enable `sys_rest_message` per-table API access controls (available in enterprise instances via `glide.rest.access_control.enabled`).

---

## Constraint 4 · Synchronous Flow Execution — FL001 Blocks Worker Threads During CSDM Traversal

**Affected components:** `triggerCSDMEvaluation.js`, FL001 Assessment Orchestration, SF001, SF002  
**Current behavior:** The `SentinelOps: Trigger CSDM Evaluation` Business Rule fires synchronously on every `readiness_assessment` insert/update where `service_ci` is populated. The `CSDMTraversalEngine` recursive traversal runs in the same transaction as the user's form save.

Additionally, `SentinelOps: Trigger CSDM Evaluation` has **three active copies** in the ServiceNow instance (discovered during code extraction — `sys_script_8f0bf0de`, `sys_script_1248e15b`, `sys_script_e02531c1`). All three are functionally identical. All three fire on the same trigger condition. This is a development artifact that was not cleaned up before the application was committed to source control.

**Phase 2 fix:**
1. **Immediately:** Delete two of the three redundant `Trigger CSDM Evaluation` Business Rules. Retain only `sys_script_8f0bf0de98b94269bb619957fd914b99.xml`. Verify no behavior change.
2. Move the CSDM traversal call from a synchronous Business Rule into FL001's Step 2 (SF001 script step). Flow Designer executes asynchronously relative to the triggering user transaction. The form save returns immediately. The traversal runs in the flow action queue.
3. Implement a configurable `maxDepth` system property (`x_1858206_sentin_0.csdm_traversal_max_depth`, default: 5) so the depth cap does not require a code change to tune.

---

## Constraint 5 · `risk_tier` Is a User-Defined Classification, Not a Computed Metric

**Affected components:** `readiness_assessment` form, `generateAITelemetry.js`, Governance Dashboard  
**Current behavior:** `risk_tier` is a Choice field (`low`, `medium`, `high`, `critical`) that assessors populate manually. It is not computed by `ReadinessScorer` or any other engine. The "Assessments by Risk Tier" report reflects user-entered labels.

**This is a v1 scope decision, not an oversight.** Automated risk tier classification requires defining a classification matrix that maps score ranges and mandatory-fail combinations to tiers — which requires stakeholder sign-off on the thresholds.

**Phase 2 fix:**
Add computed risk tier classification to `ReadinessScorer.calculateScore()`:

```javascript
// Proposed Phase 2 classification matrix
var risk_tier;
if (mandatoryFail) {
    risk_tier = 'critical';
} else if (score >= 90) {
    risk_tier = 'low';
} else if (score >= 70) {
    risk_tier = 'medium';
} else if (score >= 50) {
    risk_tier = 'high';
} else {
    risk_tier = 'critical';
}
```

The `risk_tier` field on `readiness_assessment` would then be a computed, locked field — write-restricted to the system. The UI Policy would hide the manual input for non-admin users.

---

## Constraint 6 · SLA Definitions Are Designed But Not Implemented

**Affected components:** FL001 Approval step, `flow-specifications.md` §6  
**Current behavior:** FL001's approval step (STEP 7) references a 24-business-hour due date. The SLA definition (SLA-002) that would enforce this escalation has not been created in the ServiceNow instance. Approval steps with no SLA definition have no enforced timeout — they wait indefinitely if the approver does not respond.

**Phase 2 fix:**
1. Create SLA-001 (Submission Processing: 4 business hours, start on state → Submitted, stop on state → In Review or Cancelled).
2. Create SLA-002 (Approval Response: 24 business hours, start on state → In Review AND gate_result = pass, stop on state → Approved or Blocked).
3. Create notification templates NOTIF-ESC-001 through NOTIF-ESC-004 for escalation chains.
4. Test that Flow Designer's "Ask For Approval" due date field links correctly to SLA-002 records.

---

## Summary

| Constraint | Severity | Phase | Fix Type |
|---|---|---|---|
| O(N) score recalculation | High | Phase 2 | Async BR + debounce |
| REST payload coercion | High | Phase 2 | Validation block at API layer |
| Table API bulk read via viewer role | High | Phase 2 | Dedicated API role + endpoint |
| Three redundant CSDM BRs | High | Immediate | Delete 2 of 3 in PDI |
| Synchronous CSDM traversal | Medium | Phase 2 | Move to FL001 flow step |
| `risk_tier` not computed | Medium | Phase 2 | Classification matrix in scorer |
| SLA-001/002 not created | Medium | Phase 2 | SLA definitions + escalation |
