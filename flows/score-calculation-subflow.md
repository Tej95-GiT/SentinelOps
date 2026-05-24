# SentinelOps — Score Calculation Subflow

> Human-readable spec for the score calculation subflow (SF-002).
> See `docs/flow-specifications.md` for complete technical specification.

---

## Summary

**Subflow ID:** SF-002
**Type:** Subflow
**Called By:** FL-001 (Assessment Orchestration)

---

## Purpose

Aggregates checklist results for a submitted readiness assessment and computes the readiness score, gate result (Pass/Fail), and risk tier. Delegates all calculation logic to the `ReadinessScorer` Script Include.

---

## Inputs

| Input | Type | Required |
|---|---|---|
| `assessment_sysid` | String (sys_id) | Yes |

## Outputs

| Output | Type | Description |
|---|---|---|
| `score` | Integer | Weighted readiness score (0–100) |
| `gate_result` | String | `Pass` or `Fail` |
| `risk_tier` | String | `Low`, `Medium`, or `High` |

---

## Scoring Logic

Delegates to `ReadinessScorer.calculateScore(assessment_sysid)`:

- Queries all `checklist_result` records linked to the assessment
- Applies per-criterion weighting
- If any mandatory criterion fails: `gate_result = Fail` (regardless of total score)
- Compares weighted total against `pass_threshold` from the assessment record
- Derives `risk_tier` from final score:
  - 80–100 → Low
  - 50–79 → Medium
  - 0–49 → High

---

## Script Include Dependency

`ReadinessScorer` — `src/script-includes/ReadinessScorer.js`

---

## Pre-Build Notes

- ATF Pass 1 (scoring logic tests) must be complete before this subflow is built
- Confirm `ReadinessScorer` is callable from Flow Designer script step context
- See `docs/flow-specifications.md` and `docs/testing-strategy.md` for full context
