# Business Rules

This folder contains `.js` mirrors of ServiceNow Business Rules from the `x_1858206_sentin_0` scoped application.

## Purpose

ServiceNow exports Business Rules as XML inside `update/`. These `.js` files expose the script body for human review on GitHub.
After each scripting commit, copy the script body into the corresponding `.js` file here.

## Planned Files

| File | Business Rule Name | Table | When | Phase |
|---|---|---|---|---|
| `stateTransitionGuard.js` | State Transition Guard | readiness_assessment | Before, Update | Phase 3.4 |
| `scoreRecalculation.js` | Score Recalculation Trigger | checklist_result | After, Insert/Update | Phase 3.5 |
| `populatePassThreshold.js` | Populate Pass Threshold | readiness_assessment | Before, Insert | Phase 3.6 |
| `autoGenerateChecklist.js` | Auto-Generate Checklist Results | readiness_assessment | After, Insert | Phase 3.7 |

## Execution Order

| Order Value | Rule | Why |
|---|---|---|
| 100 | stateTransitionGuard | Runs first — blocks invalid transitions before any other logic executes |
| 200 | autoGenerateChecklist | Creates checklist records after assessment is saved |
| 300 | scoreRecalculation | Recalculates after checklist records are updated |

See `decisions.md` for BR ordering rationale.
