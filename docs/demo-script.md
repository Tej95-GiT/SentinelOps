# SentinelOps — Demo Script

> Interview walkthrough narrative. Target: 3–5 minutes.
> Complete this document during Phase 7 (Finalization) once all components are built.

---

## Demo Overview

**Application:** SentinelOps — Operational Readiness Governance Platform
**Platform:** ServiceNow (Australia Release), Scoped Application
**Audience:** Technical interviewer or hiring panel

---

## Opening Statement (30 seconds)

> *To be written in Phase 7.*

Placeholder: Briefly explain what SentinelOps does and why it matters — preventing services from entering production without validated operational readiness.

---

## Demo Flow (Step-by-Step)

> *To be written in Phase 7 once all components are implemented and verified.*

### Step 1 — Show the Dashboard (~45 seconds)

- Navigate to: SentinelOps → Governance Dashboard
- Highlight: gate pass/fail rate, top failing criteria, readiness by business service
- Talking point: *"The dashboard gives ops leaders immediate visibility into which services are blocked and why."*

### Step 2 — Create a Readiness Assessment (~60 seconds)

- Navigate to: SentinelOps → Readiness Assessments → New
- Fill in: business service (select a demo CI), assigned policy, assignee
- Submit the assessment
- Talking point: *"The moment the assessor submits, the orchestration flow fires automatically."*

### Step 3 — Show the Flow Execution (~30 seconds)

- Navigate to: Flow Designer → Execution log for the assessment
- Show: CMDB validation step, scoring step, gate evaluation
- Talking point: *"CMDB validation runs first — if the CI has no upstream dependencies registered, the assessment is cancelled automatically."*

### Step 4 — Show the Scoring Engine Result (~30 seconds)

- Return to the assessment record
- Show: readiness_score, gate_result, risk_tier fields populated
- Talking point: *"The ReadinessScorer Script Include computes a weighted score. If any mandatory criterion fails, the gate fails regardless of the total score — that's the safety net."*

### Step 5 — Show ACL Enforcement (~30 seconds)

- Impersonate a viewer role
- Attempt to edit the assessment
- Show: write access denied
- Talking point: *"Role-based access is enforced at the platform level — not just in the UI. The ACL condition scripts ensure assessors can only modify their own records."*

### Step 6 — Show ATF Test Suite (~30 seconds)

- Navigate to: Automated Test Framework → SentinelOps test suite
- Show: test results for scoring, gate enforcement, ACL tests
- Talking point: *"I built the scoring engine tests before wiring it into flows. That's a deliberate engineering choice — isolate the core logic, validate it, then build on top of it."*

---

## Closing Statement (30 seconds)

> *To be written in Phase 7.*

Placeholder: Summarise the engineering decisions that would resonate with the interviewer — scoped app architecture, Flow Designer orchestration, ATF discipline, no external integrations.

---

## Preparation Checklist

> Complete before any demo or interview.

- [ ] PDI is running and accessible
- [ ] Demo policy and criteria seed data is loaded (see `demo/seed-data-setup.md`)
- [ ] All flows are activated
- [ ] Test assessor and viewer user accounts are created
- [ ] Dashboard is populated with at least one pass and one fail assessment
- [ ] ATF test suite has been executed and results are visible
- [ ] Screenshots saved to `demo/screenshots/`

---

## Anticipated Interview Questions

> *To be populated in Phase 7.*

| Question | Talking Point |
|---|---|
| Why extend Task for assessments? | Native workflow, assignments, approvals, activity stream |
| Why not use Predictive Intelligence for scoring? | Avoid unstable dependency; preserve MVP realism (see D-003) |
| How do you handle cross-scope CMDB access? | Cross-scope access request; validated in Phase 1 |
| Why split ATF into two passes? | Validate scoring engine before building flows on top of it |
| What would you add next? | Multi-hop CMDB validation, sys_properties for thresholds, event-driven BRs |
