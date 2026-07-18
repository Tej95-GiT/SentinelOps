# Security Policy

## Supported Versions

SentinelOps is a ServiceNow scoped application maintained for the following platform release:

| ServiceNow Release | Supported |
|---|---|
| Zurich | ✅ |
| Previous releases | ❌ |

---

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

If you discover a vulnerability in SentinelOps, please follow responsible disclosure:

1. **Email:** Send a detailed report to the repository maintainer via GitHub's private security advisory feature.
2. **Navigate to:** `Security` tab → `Report a vulnerability` in this repository.
3. **Include in your report:**
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Suggested remediation (if known)

### Response SLA

| Severity | Initial Response | Resolution Target |
|---|---|---|
| Critical | 24 hours | 7 days |
| High | 48 hours | 14 days |
| Medium | 5 business days | 30 days |
| Low | 10 business days | Next release cycle |

---

## Security Architecture

SentinelOps implements a **defense-in-depth** security model with three independent enforcement layers:

### Layer 1: Data — ACL Condition Scripts

26 table-level ACLs enforce access at the database layer. Conditional ACLs restrict assessors to records they own (`assigned_to == gs.getUserID()`). No GlideRecord query can bypass these restrictions — they execute before data is returned.

```javascript
// Pattern used across all conditional ACLs
if (gs.hasRole('x_1858206_sentin_0.admin')) return true;
if (gs.hasRole('x_1858206_sentin_0.assessor')) {
    return current.assigned_to == gs.getUserID();
}
return false;
```

### Layer 2: Logic — Business Rule State Guards

The `State Transition Guard` Business Rule uses `setAbortAction(true)` to atomically prevent invalid state transitions at the server layer. The record is **never committed** to the database — not even briefly. This is the only correct approach for hard governance enforcement.

### Layer 3: Presentation — UI Policies

The `Require Evidence For Pass` UI Policy enforces field-level behavior on the client side. Computed fields (`readiness_score`, `gate_result`, `risk_tier`, `criteria_passed`, `criteria_total`) are additionally locked via field-level ACLs — write restricted to `admin` role only.

---

## REST API Security

The `SentinelOps Ingestion` Scripted REST API enforces:

- `requires_authentication: true` — every request must present valid ServiceNow credentials
- `requires_acl_authorization: true` — the authenticated user must have ACL write permission on `release_gate`
- No anonymous or unauthenticated writes are permitted

**Recommended configuration for CI/CD integration:** Use a dedicated ServiceNow service account with only the minimum required roles. Do not use admin credentials in CI/CD pipelines.

---

## Scope Isolation

All artifacts are contained within the `x_1858206_sentin_0` application scope. Cross-scope privileges are explicitly granted and limited to:

- `GlideRecord.insert` / `GlideRecord.update` — required for Business Rule and Script Include operations
- `sys_choice` read — required for choice list access in condition scripts
- `Glide API: user roles and groups` — required for `gs.hasRole()` in ACL condition scripts

No global scope modifications are made by this application.

---

## Known Constraints

- The application does not implement encryption at the field level. Sensitive data should not be stored in text fields without additional platform-level encryption configuration.
- REST API credentials for CI/CD integration must be managed by the consuming team. Rotate service account credentials regularly per your organization's credential hygiene policy.
- ATF test accounts should use dedicated test users — never production credentials.
