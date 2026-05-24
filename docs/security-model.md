# SentinelOps — Phase 2 Security Model & ACL Implementation Guide

> **Status:** Phase 2 — Active implementation target
> **Scope:** Table ACLs, Field ACLs, Assessor ownership restriction, Impersonation testing

---

## Roles

| Role | Internal Name | Purpose |
|---|---|---|
| Admin | `x_1858206_sentin_0.admin` | Full CRUD on all tables and configuration |
| Assessor | `x_1858206_sentin_0.assessor` | Create/read/update own assessment and checklist records |
| Viewer | `x_1858206_sentin_0.viewer` | Read-only access across all tables |

---

## 1 — Table ACL Matrix

> ✅ Allowed | ❌ Denied | 🔒 Conditional script (see Section 3)

### readiness_assessment

| Operation | admin | assessor | viewer |
|---|---|---|---|
| `read` | ✅ | 🔒 own records | ✅ |
| `create` | ✅ | ✅ | ❌ |
| `write` | ✅ | 🔒 own records | ❌ |
| `delete` | ✅ | ❌ | ❌ |

### readiness_policy

| Operation | admin | assessor | viewer |
|---|---|---|---|
| `read` | ✅ | ✅ | ✅ |
| `create` | ✅ | ❌ | ❌ |
| `write` | ✅ | ❌ | ❌ |
| `delete` | ✅ | ❌ | ❌ |

### policy_criteria

| Operation | admin | assessor | viewer |
|---|---|---|---|
| `read` | ✅ | ✅ | ✅ |
| `create` | ✅ | ❌ | ❌ |
| `write` | ✅ | ❌ | ❌ |
| `delete` | ✅ | ❌ | ❌ |

### checklist_result

| Operation | admin | assessor | viewer |
|---|---|---|---|
| `read` | ✅ | 🔒 own parent assessment | ✅ |
| `create` | ✅ | ✅ (system-generated via BR) | ❌ |
| `write` | ✅ | 🔒 own parent assessment | ❌ |
| `delete` | ✅ | ❌ | ❌ |

---

## 2 — ACL Creation Order & Navigation

**Navigation:** `System Security` → `Access Control (ACL)`
New ACL: click **New** → fill fields as specified below.

> **Build in this exact order.** Start with the admin ACLs to ensure you never lock yourself out.
> After creating each ACL, test with your admin account before adding role restrictions.

### ServiceNow ACL Field Reference

| ACL Field | Where to Set It |
|---|---|
| Type | `record` |
| Name | Table name (e.g. `x_1858206_sentin_0_readiness_assessment`) |
| Operation | `read` / `create` / `write` / `delete` |
| Roles tab | Add roles that are **allowed** |
| Script checkbox | Enable if a condition script is needed |
| Script field | Paste condition script body |
| Active | ✅ |

---

### BLOCK A — readiness_assessment (8 ACLs)

> Build all 4 operations × 2 ACLs (admin + scoped role) before moving to next table.

| # | Operation | Roles | Script | Notes |
|---|---|---|---|---|
| A1 | `read` | `admin` | None | Admin reads all |
| A2 | `read` | `assessor`, `viewer` | `assessorRead.js` | See Section 3 |
| A3 | `create` | `admin`, `assessor` | None | Both can create |
| A4 | `write` | `admin` | None | Admin writes all |
| A5 | `write` | `assessor` | `assessorWrite.js` | See Section 3 |
| A6 | `delete` | `admin` | None | Admin only |
| A7 | `delete` | *(no roles)* | Script returns false | Explicit deny for all non-admin |

> **Note on A7:** Create a `delete` ACL with no roles added and no script — ServiceNow default deny covers this. You only need an explicit ACL if you want to lock it more tightly.

---

### BLOCK B — readiness_policy (4 ACLs)

| # | Operation | Roles | Script |
|---|---|---|---|
| B1 | `read` | `admin`, `assessor`, `viewer` | None |
| B2 | `create` | `admin` | None |
| B3 | `write` | `admin` | None |
| B4 | `delete` | `admin` | None |

---

### BLOCK C — policy_criteria (4 ACLs)

| # | Operation | Roles | Script |
|---|---|---|---|
| C1 | `read` | `admin`, `assessor`, `viewer` | None |
| C2 | `create` | `admin` | None |
| C3 | `write` | `admin` | None |
| C4 | `delete` | `admin` | None |

---

### BLOCK D — checklist_result (6 ACLs)

| # | Operation | Roles | Script | Notes |
|---|---|---|---|---|
| D1 | `read` | `admin` | None | Admin reads all |
| D2 | `read` | `assessor`, `viewer` | `checklistRead.js` | See Section 3 |
| D3 | `create` | `admin`, `assessor` | None | BR creates these records |
| D4 | `write` | `admin` | None | Admin writes all |
| D5 | `write` | `assessor` | `checklistWrite.js` | See Section 3 |
| D6 | `delete` | `admin` | None | Admin only |

---

## 3 — ACL Condition Scripts

> Enable the **Script** checkbox on the ACL and paste the body below.
> Script mirrors also saved in `src/acl-scripts/`.
>
> In scoped apps: use `gs.getUserID()` not `gs.getUser().getID()`.
> Use `gs.info()` not `gs.log()` for debugging.

### assessorRead.js — readiness_assessment read (A2)

```javascript
// Allows assessors and viewers to read assessments.
// Assessors: own records only (assigned_to matches current user).
// Viewers: all records (read-only role).
(function() {
    if (gs.hasRole('x_1858206_sentin_0.admin')) {
        return true;
    }
    if (gs.hasRole('x_1858206_sentin_0.viewer')) {
        return true;
    }
    if (gs.hasRole('x_1858206_sentin_0.assessor')) {
        return current.assigned_to == gs.getUserID();
    }
    return false;
})();
```

### assessorWrite.js — readiness_assessment write (A5)

```javascript
// Allows assessors to update only their own assessment records.
// State guard is enforced separately by Business Rule (Phase 3).
(function() {
    if (gs.hasRole('x_1858206_sentin_0.admin')) {
        return true;
    }
    if (gs.hasRole('x_1858206_sentin_0.assessor')) {
        return current.assigned_to == gs.getUserID();
    }
    return false;
})();
```

### checklistRead.js — checklist_result read (D2)

```javascript
// Assessors can read checklist results linked to their own assessments.
// Viewers can read all checklist results.
(function() {
    if (gs.hasRole('x_1858206_sentin_0.admin')) {
        return true;
    }
    if (gs.hasRole('x_1858206_sentin_0.viewer')) {
        return true;
    }
    if (gs.hasRole('x_1858206_sentin_0.assessor')) {
        var assessment = current.assessment.getRefRecord();
        return assessment.assigned_to == gs.getUserID();
    }
    return false;
})();
```

### checklistWrite.js — checklist_result write (D5)

```javascript
// Assessors can update checklist results only for their own assessments.
(function() {
    if (gs.hasRole('x_1858206_sentin_0.admin')) {
        return true;
    }
    if (gs.hasRole('x_1858206_sentin_0.assessor')) {
        var assessment = current.assessment.getRefRecord();
        return assessment.assigned_to == gs.getUserID();
    }
    return false;
})();
```

> **Scoped app note:** `current.assessment.getRefRecord()` requires that the `assessment` reference field on `checklist_result` is accessible from your scoped app. If it returns an empty record, the ACL will deny. Test with `gs.info('Assessment SysID: ' + current.assessment);` in Scripts - Background first.

---

## 4 — Field-Level ACLs

> Computed fields must be read-only — enforced at the field ACL level.
> Navigation: `System Security` → `Access Control (ACL)` → New → Type: `record`, Name: `table.field_name`

### Fields to Lock (read-only for assessor + viewer)

| # | Field (ACL Name) | Table | Operation to Restrict | Roles Allowed to Write |
|---|---|---|---|---|
| F1 | `readiness_score` | readiness_assessment | `write` | `admin` only |
| F2 | `gate_result` | readiness_assessment | `write` | `admin` only |
| F3 | `pass_threshold` | readiness_assessment | `write` | `admin` only |
| F4 | `risk_tier` | readiness_assessment | `write` | `admin` only |
| F5 | `criteria_passed` | readiness_assessment | `write` | `admin` only |
| F6 | `criteria_total` | readiness_assessment | `write` | `admin` only |

### How to Create Each Field ACL

1. Navigate to: `System Security` → `Access Control (ACL)` → **New**
2. Set **Type** = `record`
3. Set **Name** = `x_1858206_sentin_0_readiness_assessment.readiness_score` (substitute field name)
4. Set **Operation** = `write`
5. In **Roles** tab: add only `x_1858206_sentin_0.admin`
6. **Active** = ✅
7. Save

> These 6 field ACLs mean: if a user doesn't have `admin`, the field renders read-only on the form and cannot be updated via API. The Business Rule and Script Include (Phase 3) will write to these fields using a `GlideRecord` elevated by the system — not the user's session.

---

## 5 — Step-by-Step Build Sequence

Follow this exact sequence to avoid locking yourself out:

```
Step 1 — Build BLOCK A (readiness_assessment) ACLs
   A1: admin read          → no script, add admin role
   A3: admin+assessor create → no script, add both roles
   A4: admin write         → no script, add admin role
   Test: confirm you (admin) can still read/write assessments ✅

Step 2 — Add assessor-scoped ACLs
   A2: assessor+viewer read  → paste assessorRead.js
   A5: assessor write        → paste assessorWrite.js
   Test: impersonate assessor — confirm own record only ✅

Step 3 — Build BLOCK B (readiness_policy) ACLs
   B1–B4: as per matrix above
   Test: impersonate assessor — confirm policy is read-only ✅

Step 4 — Build BLOCK C (policy_criteria) ACLs
   C1–C4: as per matrix above
   Test: impersonate assessor — confirm criteria is read-only ✅

Step 5 — Build BLOCK D (checklist_result) ACLs
   D1–D6: as per matrix above
   Test: impersonate assessor — own checklist only ✅

Step 6 — Build Field ACLs F1–F6
   Computed fields: write restricted to admin only
   Test: impersonate assessor — confirm score/gate/tier fields are read-only ✅
```

---

## 6 — Impersonation Testing Checklist

> Navigate: **User menu (top right)** → **Impersonate User** → select test account.
> Confirm each scenario before committing Phase 2.

### Admin Account Tests

- [ ] Can open all four tables in list view
- [ ] Can create a new readiness_assessment record
- [ ] Can edit any assessment (not just own)
- [ ] Can edit readiness_policy and policy_criteria records
- [ ] Can edit computed fields (score, gate_result, risk_tier) directly

### Assessor Account Tests (own records)

- [ ] Can open readiness_assessment list — sees only own records
- [ ] Can create a new assessment
- [ ] Can edit own assessment (name, state, notes)
- [ ] Can view linked checklist_results for own assessment
- [ ] Can update a checklist_result linked to own assessment
- [ ] Cannot edit computed fields (readiness_score, gate_result, risk_tier appear read-only)
- [ ] Can read readiness_policy list (all policies visible)
- [ ] Can read policy_criteria list (all criteria visible)

### Assessor Account Tests (other user's records)

> Create two assessor accounts: `assessor_1` and `assessor_2`. Create one assessment owned by `assessor_1`.

- [ ] Impersonate `assessor_2` — assessment owned by `assessor_1` does not appear in list
- [ ] If navigated directly by URL → access denied or empty form
- [ ] Cannot edit `assessor_1`'s checklist results
- [ ] Cannot create a policy or policy_criteria record (Save button fails / forbidden)
- [ ] Cannot delete any assessment

### Viewer Account Tests

- [ ] Can open readiness_assessment list — sees all records (read-only)
- [ ] Cannot edit any assessment field (all fields disabled on form)
- [ ] Can read readiness_policy and policy_criteria lists
- [ ] Cannot create, edit, or delete any record
- [ ] Cannot see **New** button on any SentinelOps table list

---

## 7 — Common Scoped App ACL Pitfalls

| Pitfall | Symptom | Fix |
|---|---|---|
| ACL not firing | All users have full access | Confirm ACL is **Active** = true and **Type** = `record` |
| Script returns false for everyone | Even admin is denied | Check you haven't toggled the wrong ACL — admin should have a separate no-script ACL |
| `current.assessment.getRefRecord()` returns empty | Checklist ACL denies everything | Cross-scope access issue — test `cmdb_rel_ci` access from Scripts - Background |
| Field ACL not making field read-only on form | Field is still editable | UI Policy may override; ensure UI Policy is also set (belt and suspenders) |
| Assessor can't read any assessment | Own records returning empty | Check `assigned_to` field stores a `sys_user` reference, not a display value |
| Impersonation button missing | Cannot test | Enable via: `System Properties` → `glide.impersonate.enable` = `true` |

---

## 8 — ACL Script File References

Condition script bodies are mirrored in `src/acl-scripts/`:

| File | ACL |
|---|---|
| `assessorRead.js` | readiness_assessment — read (A2) |
| `assessorWrite.js` | readiness_assessment — write (A5) |
| `checklistRead.js` | checklist_result — read (D2) |
| `checklistWrite.js` | checklist_result — write (D5) |

---

## Decision References

- **D-001** (`decisions.md`): Assessment extends Task — ACLs inherit Task's `assigned_to` field
- **D-005** (`decisions.md`): Repo acts as project memory — this doc is the security reference layer

## Next Phase

Phase 3 — Business Logic (Script Includes, Business Rules, UI Policies)
See `docs/implementation-roadmap.md` and `docs/flow-specifications.md`.
