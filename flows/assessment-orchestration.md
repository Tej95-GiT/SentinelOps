# SentinelOps — Assessment Orchestration Flow

> Human-readable spec for the main Flow Designer orchestration flow.
> See `docs/flow-specifications.md` for complete technical specification including steps, inputs, outputs, and notification templates.

---

## Summary

**Flow ID:** FL-001
**Type:** Flow
**Trigger:** Assessment record state changes to `Submitted` (value: `10`)

---

## Purpose

Orchestrates the full readiness assessment lifecycle from submission to approval or rejection:

1. Notifies assessor of submission receipt
2. Invokes CMDB validation subflow (SF-001)
3. Invokes score calculation subflow (SF-002)
4. Updates the assessment with computed score, gate result, and risk tier
5. Routes to approval if gate passes; returns to assessor if gate fails

---

## Subflow Dependencies

| Subflow | Spec |
|---|---|
| SF-001 — CMDB Validation | `cmdb-validation-subflow.md` |
| SF-002 — Calculate Readiness Score | `score-calculation-subflow.md` |

---

## Script Include Dependencies

| Script Include | Purpose |
|---|---|
| `SentinelOpsValidator` | Called by SF-001 for CMDB relationship checks |
| `ReadinessScorer` | Called by SF-002 for weighted score calculation |

---

## State Transitions Triggered by This Flow

| From State | To State | Condition |
|---|---|---|
| Submitted | In Review | CMDB valid AND gate passes |
| Submitted | Cancelled | CMDB validation fails |
| In Review | Approved | Approval group approves |
| In Review | Rejected | Approval group rejects |

---

## Notes

> This file is a summary spec. The authoritative detail is in `docs/flow-specifications.md`.
> Build this flow ONLY after SF-001, SF-002, and both Script Includes are committed and tested.
