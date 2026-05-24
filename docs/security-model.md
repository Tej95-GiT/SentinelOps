# SentinelOps — Security Model

> Reference document for the ACL matrix, role hierarchy, and field-level security rules.
> Complete this document before beginning Phase 2 (ACL implementation).

---

## Roles

| Role | Scope | Description |
|---|---|---|
| `x_1858206_sentin_0.admin` | Application admin | Full read/write access to all SentinelOps tables and configuration |
| `x_1858206_sentin_0.assessor` | Operational user | Can create and manage their own readiness assessments |
| `x_1858206_sentin_0.viewer` | Read-only consumer | Can view assessments and reports; no write access |

---

## Table ACL Matrix

> Format: ✅ = Allowed | ❌ = Denied | 🔒 = Conditional (see notes)

### x_1858206_sentin_0_readiness_assessment

| Operation | admin | assessor | viewer |
|---|---|---|---|
| Read | ✅ | 🔒 Own records | ✅ |
| Create | ✅ | ✅ | ❌ |
| Write | ✅ | 🔒 Own records | ❌ |
| Delete | ✅ | ❌ | ❌ |

### x_1858206_sentin_0_readiness_policy

| Operation | admin | assessor | viewer |
|---|---|---|---|
| Read | ✅ | ✅ | ✅ |
| Create | ✅ | ❌ | ❌ |
| Write | ✅ | ❌ | ❌ |
| Delete | ✅ | ❌ | ❌ |

### x_1858206_sentin_0_policy_criteria

| Operation | admin | assessor | viewer |
|---|---|---|---|
| Read | ✅ | ✅ | ✅ |
| Create | ✅ | ❌ | ❌ |
| Write | ✅ | ❌ | ❌ |
| Delete | ✅ | ❌ | ❌ |

### x_1858206_sentin_0_checklist_result

| Operation | admin | assessor | viewer |
|---|---|---|---|
| Read | ✅ | 🔒 Own parent assessment | ✅ |
| Create | ✅ | ✅ (system-generated) | ❌ |
| Write | ✅ | 🔒 Own parent assessment | ❌ |
| Delete | ✅ | ❌ | ❌ |

---

## Field-Level ACL Rules

> Computed fields must be read-only for all non-admin roles.

| Field | Table | Roles with Write | Notes |
|---|---|---|---|
| `readiness_score` | readiness_assessment | admin only | Set by `ReadinessScorer` Script Include |
| `gate_result` | readiness_assessment | admin only | Pass/Fail computed from score vs threshold |
| `pass_threshold` | readiness_assessment | admin only | Copied from policy on assessment creation |
| `risk_tier` | readiness_assessment | admin only | Derived from score |
| `criteria_passed` | readiness_assessment | admin only | Aggregated count from checklist results |
| `criteria_total` | readiness_assessment | admin only | Set on checklist auto-generation |

---

## ACL Script Reference

> ACL condition scripts live in `src/acl-scripts/`.

| Script | Applied To | Purpose |
|---|---|---|
| `assessorWriteCondition.js` | readiness_assessment (write) | Returns `true` only if `current.assigned_to == gs.getUserID()` |

---

## Impersonation Test Checklist

> Validate each scenario in PDI using impersonation before committing Phase 2.

- [ ] Admin can read/write all four tables
- [ ] Assessor can create a new assessment
- [ ] Assessor cannot write another user's assessment
- [ ] Assessor cannot create/modify policies or criteria
- [ ] Viewer can read assessments but not write
- [ ] Viewer cannot read computed field write ACLs (fields appear read-only)
- [ ] Unauthenticated access is denied for all tables

---

## Decision References

See `decisions.md` for role and ACL design rationale.
