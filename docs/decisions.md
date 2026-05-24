# SentinelOps — Architectural Decisions

## D-001
Assessment table extends Task.

Reason:
Native workflow, assignment, approvals, activity stream, and Flow Designer support.

---

## D-002
Checklist results do not extend Task.

Reason:
Checklist records are lightweight line-item validation data.

---

## D-003
Rule-based readiness scoring used instead of Predictive Intelligence.

Reason:
Avoid unstable dependency and preserve MVP realism.

---

## D-004
MVP excludes external integrations.

Reason:
Prevent architecture sprawl during foundational implementation.

---

## D-005
Repository acts as shared project memory layer.

Reason:
Maintain synchronization between GPT, Claude, IDE, and ServiceNow implementation.
