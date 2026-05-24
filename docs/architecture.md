# SentinelOps — Architecture

## Identity
Operational readiness governance platform for ServiceNow.

## Core Purpose
Prevent services from entering production without validated operational readiness.

## MVP Scope
- Readiness assessments
- Policy-driven validation
- CMDB relationship checks
- Governance scoring
- Approval orchestration
- Dashboards
- ATF coverage

## Core Tables
| Table | Purpose |
|---|---|
| Readiness Assessment | Primary governance record |
| Readiness Policy | Governance rules |
| Policy Criteria | Individual readiness checks |
| Checklist Result | Validation outcomes |

## Technical Direction
- Scoped application
- Task-extended assessment model
- Rule-based scoring
- Flow Designer orchestration
- CMDB validation
- ACL-secured governance workflow

## Explicit Non-Goals
- External integrations
- Complex AI claims
- Full ITOM replacement
- Full CSDM enforcement
