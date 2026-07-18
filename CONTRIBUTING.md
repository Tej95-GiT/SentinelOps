# Contributing to SentinelOps

Thank you for your interest in contributing to SentinelOps. This document outlines contribution standards for the repository's human-maintained layers (`src/`, `docs/`, `flows/`, `atf/`).

> **Important:** The `50e1684c3b8d8310982a9dc643e45a23/` directory is owned entirely by ServiceNow source control. **Never manually edit files in that directory.** All ServiceNow artifact changes must flow through a ServiceNow PDI → commit to GitHub.

---

## What Can Be Contributed

| Layer | Accepts Contributions | Notes |
|---|---|---|
| `docs/` | ✅ Yes | Documentation improvements, architecture notes, ADRs |
| `src/` | ✅ Yes | Script mirrors (must match live ServiceNow code) |
| `flows/` | ✅ Yes | Flow Designer human-readable specs |
| `atf/` | ✅ Yes | Test plan updates, test case definitions |
| `demo/` | ✅ Yes | Seed data improvements, screenshot updates |
| `assets/` | ✅ Yes | Updated screenshots, logo assets |
| `50e1684c.../` | ❌ Never | ServiceNow-managed, do not touch |

---

## Development Environment

### Prerequisites

- ServiceNow Personal Developer Instance (PDI) — request at [developer.servicenow.com](https://developer.servicenow.com)
- ServiceNow instance on **Zurich release**
- GitHub account with repository access

### Setup

1. Fork the repository.
2. In your ServiceNow PDI: **Studio** → **Import From Source Control**.
3. Enter your forked repository URL.
4. ServiceNow imports the application from `50e1684c3b8d8310982a9dc643e45a23/`.
5. Make your changes in ServiceNow Studio.

---

## Contribution Workflow

### For Documentation Changes (`docs/`, `flows/`, `atf/`)

```bash
git checkout -b docs/your-description
# Edit markdown files
git commit -m "docs: brief description of change"
git push origin docs/your-description
# Open a Pull Request
```

### For Script Changes (`src/`)

> The `src/` directory contains **human-readable mirrors** of ServiceNow server-side scripts. Changes must reflect what is actually live in the ServiceNow PDI.

1. Make the script change in ServiceNow Studio (not in `src/` directly).
2. Commit the change from Studio to GitHub (this updates `50e1684c.../update/`).
3. Copy the updated script body into the corresponding `src/` file.
4. Open a PR with both the `50e1684c.../` change and the `src/` mirror update.

```bash
git checkout -b fix/your-script-description
# After SN commit + src/ update:
git add 50e1684c3b8d8310982a9dc643e45a23/
git add src/script-includes/ReadinessScorer.js  # or relevant file
git commit -m "fix: brief description"
git push origin fix/your-script-description
```

---

## Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <short description>

Types:
  feat     — new feature or ServiceNow artifact
  fix      — bug fix in script or configuration
  docs     — documentation only
  refactor — code restructuring without behavior change
  test     — ATF test additions or updates
  chore    — build, config, or repo maintenance
```

**Examples:**

```
feat: add weighted scoring to ReadinessScorer
fix: prevent cascade loop in Calculate Readiness Score BR
docs: add CSDM traversal algorithm explanation to architecture.md
test: add ATF coverage for mandatory criterion fail override
```

---

## Pull Request Standards

Every PR must:

- [ ] Target the `main` branch
- [ ] Include a clear description of the change and why
- [ ] Reference any related issues (`Closes #123`)
- [ ] Not break the existing state machine transition rules
- [ ] Not introduce cross-scope privilege escalation beyond what is currently configured
- [ ] Include `src/` mirror updates for any script changes committed from ServiceNow

### PR Title Format

```
[type] Brief description of change
```

---

## Architectural Constraints

Before contributing logic changes, review the architectural constraints:

1. **No external dependencies.** SentinelOps is 100% ServiceNow-native. No npm packages, no external HTTP calls, no third-party integrations.

2. **No Global scope modifications.** All artifacts must remain within `x_1858206_sentin_0`. New cross-scope privileges require explicit justification and review.

3. **State machine is the source of truth.** The `State Transition Guard` Business Rule defines the allowed transition graph. Any changes to state values or allowed transitions must be reflected in both the Business Rule and `docs/architecture.md`.

4. **Denormalization on `checklist_result` is intentional.** Do not remove the `mandatory` and `weight` denormalization. This is an audit-safety decision — see ADR in `docs/decisions.md`.

5. **`setWorkflow(false)` must remain.** The score recalculation Business Rule calls `gr.setWorkflow(false)` to prevent cascade. Removing it causes infinite loops on large assessment workloads.

6. **ACL condition script pattern is fixed.** New conditional ACLs must follow the admin-first → viewer → assessor cascade pattern in `src/acl-scripts/`.

---

## Code Style

### JavaScript (ServiceNow Server-Side)

- Use `var` (ES5 — ServiceNow Rhino engine)
- Use `GlideRecord` pattern with explicit `.query()`, `.next()`, `.getValue()`
- Use `gs.hasRole('x_1858206_sentin_0.role_name')` — never `gs.hasRole('admin')` from scoped context
- Use `gs.getUserID()` — not `gs.getUser().getID()`
- Use `gs.info()` for debugging — not `gs.log()`
- Add a guard at the top of every Script Include method for required parameters

### Markdown

- ATX-style headers (`##`, not underline style)
- Tables for structured data
- Fenced code blocks with language identifier
- No trailing whitespace

---

## Questions

Open a [GitHub Discussion](https://github.com/Tej95-GiT/SentinelOps/discussions) for architecture questions, design proposals, or anything that doesn't fit a bug report or PR.

For security issues: see [SECURITY.md](./SECURITY.md).
