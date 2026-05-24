# SentinelOps — CMDB Validation Subflow

> Human-readable spec for the CMDB validation subflow (SF-001).
> See `docs/flow-specifications.md` for complete technical specification.

---

## Summary

**Subflow ID:** SF-001
**Type:** Subflow
**Called By:** FL-001 (Assessment Orchestration)

---

## Purpose

Validates that the business service CI referenced on a readiness assessment exists in CMDB and has registered upstream CI relationships. Prevents assessments from progressing if the CMDB record is missing or incomplete.

---

## Inputs

| Input | Type | Required |
|---|---|---|
| `business_service_sysid` | String (sys_id) | Yes |

## Outputs

| Output | Type | Description |
|---|---|---|
| `cmdb_valid` | Boolean | `true` if validation passes |
| `cmdb_message` | String | Result detail or failure reason |

---

## Validation Logic

Delegates to `SentinelOpsValidator.validateCMDBRelationships(sysid)`:

- Checks that the CI exists in `cmdb_ci_service`
- Checks that at least one entry exists in `cmdb_rel_ci` for the CI
- Returns structured result with validation outcome and message

---

## Script Include Dependency

`SentinelOpsValidator` — `src/script-includes/SentinelOpsValidator.js`

---

## Failure Handling

If `cmdb_valid == false`, the calling flow (FL-001) will:
1. Set assessment state to `Cancelled`
2. Send notification to assessor with the failure message

---

## Pre-Build Notes

- Confirm cross-scope access to `cmdb_ci_service` and `cmdb_rel_ci` before building
- Test with a CI that has no relationships to verify the failure path works correctly
- See `decisions.md` and `docs/flow-specifications.md` for full technical context
