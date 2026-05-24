# ACL Scripts

This folder contains `.js` mirrors of ServiceNow ACL condition scripts from the `x_1858206_sentin_0` scoped application.

## Purpose

ServiceNow ACL condition scripts are embedded inside ACL records and exported as XML. These `.js` files expose the condition script body for human review, documentation, and version control.

After configuring each ACL in ServiceNow PDI, copy the exact script body into the corresponding file here.

---

## Files

| File | ACL Applied To | Operation | Condition |
|---|---|---|---|
| `assessorRead.js` | readiness_assessment | `read` | Viewer: all records. Assessor: own records (`assigned_to == user`) |
| `assessorWrite.js` | readiness_assessment | `write` | Assessor: own records (`assigned_to == user`) |
| `checklistRead.js` | checklist_result | `read` | Viewer: all records. Assessor: parent assessment owned by user |
| `checklistWrite.js` | checklist_result | `write` | Assessor: parent assessment owned by user |

---

## Notes

- These scripts contain **condition script bodies only** — not full ACL definitions
- Role requirements (which roles are allowed) are configured in the ACL record itself, not here
- Admin ACLs use no condition scripts — role check is sufficient
- See `docs/security-model.md` for the full ACL matrix, creation order, and impersonation testing checklist

---

## Scoped App Constraints

| Use This | Not This |
|---|---|
| `gs.getUserID()` | `gs.getUser().getID()` |
| `gs.info()` | `gs.log()` |
| `current.field.getRefRecord()` | Direct field value comparison for reference fields |
