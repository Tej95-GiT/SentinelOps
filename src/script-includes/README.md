# Script Includes

This folder contains `.js` mirrors of ServiceNow Script Includes from the `x_1858206_sentin_0` scoped application.

## Purpose

ServiceNow exports Script Includes as XML inside `update/`. Recruiters read `.js` on GitHub — nobody reads XML.
After each scripting commit, copy the script body (not the XML wrapper) into the corresponding `.js` file here.

## Planned Files

| File | Script Include Name | Phase |
|---|---|---|
| `ReadinessScorer.js` | ReadinessScorer | Phase 3.1 |
| `SentinelOpsValidator.js` | SentinelOpsValidator | Phase 3.1 |

## Maintenance Rule

Keep these files in sync with ServiceNow after every commit. They are manually maintained mirrors — not auto-generated.
