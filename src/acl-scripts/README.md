# ACL Scripts

This folder contains `.js` mirrors of ServiceNow ACL condition scripts from the `x_1858206_sentin_0` scoped application.

## Purpose

ServiceNow ACL condition scripts are embedded in ACL records and exported in XML. These `.js` files expose the condition script body for review and documentation purposes.

## Planned Files

| File | ACL Applied To | Condition | Phase |
|---|---|---|---|
| `assessorWriteCondition.js` | readiness_assessment (Write ACL) | `current.assigned_to == gs.getUserID()` | Phase 2.1 |

## Notes

- ACL scripts contain only the condition logic (the code inside the "Condition" field of the ACL record)
- These are NOT full ACL definitions — the role requirements are configured in the ACL record itself
- See `docs/security-model.md` for the full ACL matrix
