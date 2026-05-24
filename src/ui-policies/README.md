# UI Policies

This folder documents ServiceNow UI Policy behavior by form state.

## Purpose

ServiceNow UI Policies control field visibility and read-only state on forms. They are configured in the ServiceNow UI (not scripted) and cannot be meaningfully exported as `.js` files.
This folder contains markdown documentation describing the intended UI Policy behavior per state.

## Planned Files

| File | Purpose | Phase |
|---|---|---|
| `field-behavior-by-state.md` | Documents which fields are read-only or hidden per assessment state | Phase 3.8 |

## UI Policy Rules (Summary)

> Complete this section when building UI Policies in Phase 3.8.

| State | Fields Read-Only | Fields Hidden |
|---|---|---|
| Draft | `readiness_score`, `gate_result`, `risk_tier`, `criteria_passed`, `criteria_total` | — |
| Submitted | All except admin-editable | — |
| In Review | All fields | — |
| Approved | All fields | — |
| Rejected | All fields | — |
| Cancelled | All fields | — |

## Notes

- UI Policies are a UI-layer enforcement only
- Security enforcement is handled by Field-Level ACLs (see `docs/security-model.md`)
- UI Policies improve UX; ACLs enforce the security boundary
