# SentinelOps — Operational Engineering Review

---

## 1. Missing Repository Artifacts

### Currently Have
| File | Status |
|---|---|
| `current-state.md` | ✅ |
| `architecture.md` | ✅ |
| `implementation-roadmap.md` | ✅ |
| `decisions.md` | ✅ |
| `README.md` | ✅ |

### Missing — Add Before Scripting Begins

| File | Purpose | Priority |
|---|---|---|
| `CHANGELOG.md` | Track what changed per commit/phase. Recruiters scan this. | **High** |
| `security-model.md` | ACL matrix, role hierarchy, field-level locks. Standalone reference during ACL implementation. | **High** |
| `testing-strategy.md` | ATF test plan — what gets tested, expected coverage, test data requirements. | **Medium** |
| `flow-specifications.md` | Flow Designer specs — triggers, steps, subflow interfaces. Write BEFORE building flows. | **Medium** |
| `demo-script.md` | Interview walkthrough script. The 3-minute demo narrative. | **Low (Phase 7)** |

### Missing — Governance Quality

| File | Purpose |
|---|---|
| `.gitignore` | Exclude SN local cache artifacts, `.DS_Store`, IDE files |
| `LICENSE` | MIT or Apache 2.0. Makes the repo look professional. |
| `CONTRIBUTING.md` | Not operationally needed, but signals engineering maturity to recruiters scanning the repo. Optional. |

---

## 2. Repository Folder Structure

> [!IMPORTANT]
> ServiceNow source control auto-generates the `update/` folder with XML artifacts. That's the platform source of truth. The structure below is the **human-readable engineering layer** alongside it.

```
sentinelops/
│
├── README.md
├── CHANGELOG.md
├── LICENSE
├── .gitignore
│
├── docs/
│   ├── architecture.md              # Table model, ERD, design decisions
│   ├── current-state.md             # Living doc: what's done, what's next
│   ├── implementation-roadmap.md    # Phase-by-phase execution plan
│   ├── decisions.md                 # ADR-style decision log
│   ├── security-model.md           # ACL matrix, role hierarchy
│   ├── flow-specifications.md      # Flow/subflow design specs
│   ├── testing-strategy.md         # ATF plan and coverage targets
│   └── demo-script.md              # Interview walkthrough narrative
│
├── src/
│   ├── script-includes/
│   │   ├── ReadinessScorer.js       # Scoring engine
│   │   └── SentinelOpsValidator.js  # CMDB validation functions
│   ├── business-rules/
│   │   ├── stateTransitionGuard.js  # State enforcement BR
│   │   └── scoreRecalculation.js    # Trigger rescoring on checklist change
│   ├── acl-scripts/
│   │   └── assessorWriteCondition.js # Condition: own records only
│   └── ui-policies/
│       └── (document form behavior per state)
│
├── flows/
│   ├── assessment-orchestration.md   # Main flow: human-readable spec
│   ├── cmdb-validation-subflow.md    # Subflow spec
│   └── score-calculation-subflow.md  # Subflow spec
│
├── atf/
│   ├── test-plan.md                  # Which tests, what they validate
│   └── test-data.md                  # Required seed data for test runs
│
├── demo/
│   ├── seed-data-setup.md            # How to load demo policies + criteria
│   └── screenshots/                  # Dashboard/form screenshots for README
│
└── update/                           # ← ServiceNow-managed. DO NOT manually edit.
    ├── sys_script_include_*.xml
    ├── sys_script_*.xml
    ├── sys_security_acl_*.xml
    └── ...
```

### Rules

| Rule | Why |
|---|---|
| `src/` contains `.js` files that mirror what's in ServiceNow | Recruiters read `.js` on GitHub. Nobody reads XML. |
| `src/` is manually maintained | Copy script body into `.js` file after each scripting commit. |
| `update/` is never manually edited | ServiceNow owns it. Source control sync populates it. |
| `flows/` contains markdown specs, not code | Flow Designer has no code export. Document the design. |
| `atf/` contains test plan, not test code | ATF tests live in SN. Document what and why here. |

---

## 3. Commit Strategy

One commit per completed implementation unit. Commit message format:

```
[Phase X.Y] Brief description of what was implemented
```

### Commit Plan

| Commit | Contents | Commit Message |
|---|---|---|
| **C1** | Roles + table schemas + demo data | `[Phase 1] Foundation: roles, tables, fields, demo data` |
| **C2** | Docs cleanup + repo structure | `[Phase 1.5] Repository structure and documentation` |
| **C3** | ACLs (table + field level) | `[Phase 2] Security: ACLs for all tables and computed fields` |
| **C4** | Script Includes | `[Phase 3.1] Script Includes: ReadinessScorer, SentinelOpsValidator` |
| **C5** | ATF for scoring logic | `[Phase 3.2] ATF: scoring engine validation tests` |
| **C6** | Business Rules + UI Policies | `[Phase 3.3] Business Rules: state enforcement, score triggers` |
| **C7** | Flow Designer (main + subflows) | `[Phase 4] Flows: assessment orchestration, CMDB validation` |
| **C8** | Dashboards + Reports | `[Phase 5] Dashboards: 4 core reports + dashboard assembly` |
| **C9** | ATF full suite | `[Phase 6] ATF: complete test suite (scoring, gates, ACLs)` |
| **C10** | Demo data + walkthrough + screenshots | `[Phase 7] Polish: demo script, screenshots, final docs` |

> [!TIP]
> After every commit, update `current-state.md` and `CHANGELOG.md`. This discipline is what makes the repo look professionally maintained.

---

## 4. Implementation Sequencing — Validated With One Adjustment

### Proposed (yours):
```
Security → Script Includes → Business Rules → Flows → Dashboards → ATF
```

### Adjusted (recommended):
```
Security → Script Includes → ATF (scoring only) → Business Rules → Flows → Dashboards → ATF (full suite)
```

**Why split ATF into two passes:**

| Pass | What It Tests | Why Now |
|---|---|---|
| **ATF Pass 1** (after Script Includes) | `ReadinessScorer` calculation logic — weighted scoring, mandatory fail override, threshold comparison | Your scoring engine is the core intellectual property. Validate it BEFORE Business Rules and Flows build on top of it. If scoring is wrong, everything downstream is wrong. |
| **ATF Pass 2** (after Dashboards) | Gate enforcement, state transitions, ACL behavior, end-to-end flow | Full integration testing after all components exist. |

This also gives you a better interview story: *"I tested the scoring engine in isolation before wiring it into flows."* That's engineering discipline, not just test coverage.

### Detailed Phase Order

```
Phase 2 — Security
  2.1  Table ACLs (CRUD × 4 tables × 3 roles)
  2.2  Field ACLs (computed fields: readiness_score, gate_result, 
       pass_threshold, risk_tier, criteria_passed, criteria_total)
  2.3  Impersonation testing (admin/assessor/viewer)
  COMMIT C3

Phase 3 — Business Logic
  3.1  Script Include: ReadinessScorer
  3.2  Script Include: SentinelOpsValidator
  COMMIT C4
  3.3  ATF Pass 1: scoring logic tests
  COMMIT C5
  3.4  Business Rule: state transition enforcement (before, server)
  3.5  Business Rule: score recalculation trigger (after, server)
  3.6  Business Rule: populate pass_threshold from policy (before, insert)
  3.7  Business Rule: auto-generate checklist results from policy criteria (after, insert)
  3.8  UI Policy: field read-only by state
  COMMIT C6

Phase 4 — Flow Designer
  4.1  Subflow: CMDB Validation
  4.2  Subflow: Calculate Readiness Score (calls Script Include)
  4.3  Main Flow: Assessment Orchestration (trigger: state → Submitted)
  4.4  Flow actions: notifications
  COMMIT C7

Phase 5 — Dashboards
  5.1  Report: Gate pass/fail rate (pie + bar)
  5.2  Report: Top failing checklist items
  5.3  Report: Readiness by business service
  5.4  Report: Mean time to readiness
  5.5  Dashboard assembly
  COMMIT C8

Phase 6 — ATF Pass 2
  6.1  Test: gate blocks when score < threshold
  6.2  Test: gate blocks when mandatory criterion fails
  6.3  Test: state transitions enforce valid paths only
  6.4  Test: assessor cannot edit another user's assessment
  6.5  Test suite assembly
  COMMIT C9
```

---

## 5. Workflow Split

| Tool | Use For | Do NOT Use For |
|---|---|---|
| **Claude Chat** (this) | Architecture decisions, pressure testing, sequencing guidance, interview prep, reviewing approach before building | Writing final scripts (no PDI validation loop) |
| **Claude IDE** | Writing Script Include / Business Rule code, debugging Glide scripts, generating ATF test scripts, reviewing XML diffs | Architecture decisions (lacks project context) |
| **GPT Orchestration** | Documentation drafting, CHANGELOG entries, demo script writing, decision log maintenance | Script writing (inferior Glide API knowledge vs Claude) |
| **ServiceNow PDI** | ALL actual implementation — tables, fields, ACLs, flows, dashboards, ATF execution, impersonation testing | Script drafting (use IDE, paste into SN) |
| **GitHub** | Commits after each phase, `src/` mirror updates, docs updates, portfolio presentation | Storing SN config outside `update/` (SN manages that) |

### Recommended Session Workflow

```
1. Claude Chat → get exact specs for next implementation unit
2. Claude IDE → draft scripts (if scripting phase)
3. ServiceNow PDI → implement/paste/configure/test
4. PDI → Source Control → commit to GitHub
5. Local repo → update src/ mirrors, docs, CHANGELOG
6. Git push
7. Update current-state.md
8. Return to step 1
```

---

## 6. Hidden Technical Debt & Scoped App Gotchas

### Critical — Fix Before Scripting

| Issue | Risk | Action |
|---|---|---|
| **Cross-scope access to `cmdb_ci_service`** | Your Script Include needs to query `cmdb_ci_service` and `cmdb_rel_ci`. Scoped apps can't access all tables by default. | **Test now:** In your scoped app, open Scripts - Background, run `gs.info(new GlideRecord('cmdb_ci_service').isValid());`. If `false`, you need to set table's "Accessible from" = "All application scopes" or use the cross-scope access request. |
| **Cross-scope access to `cmdb_rel_ci`** | Same issue. Relationship table is critical for CMDB validation. | Same test. `new GlideRecord('cmdb_rel_ci').isValid()` |
| **GlideRecord in scoped apps uses `sn_` prefix API differences** | Some Global-scope Glide methods don't exist in scoped apps. e.g., `gs.log()` → use `gs.info()`. `current.operation()` works differently. | When drafting scripts in IDE, always specify "scoped app context." |

### Moderate — Be Aware During Implementation

| Issue | Risk | Mitigation |
|---|---|---|
| **Task state field choice inheritance** | You resolved choice conflicts already, but adding custom states (1, 10, 20, 30, 40, 50, 100) on a Task-extended table can resurface on upgrade. | Document your custom state values in `decisions.md`. If SN upgrade adds new Task states that collide with yours, you'll know what's yours. |
| **Flow Designer trigger on state change** | Flow triggers on `x_snops_assessment` state change work, but the trigger condition syntax for custom states on extended Task tables can be quirky. | Test the trigger with a simple flow (log a message) BEFORE building the full orchestration flow. 10 minutes of testing saves hours of debugging. |
| **ATF in scoped apps** | Some ATF step types (especially impersonation + server-side steps) behave differently in scoped apps. `Record Validation` steps work. `Server-side Script` steps may have scope context issues. | Use `Record Validation` and `Record Query` steps as primary assertion methods. Avoid complex server-side script steps unless necessary. |
| **Business Rule ordering** | Multiple BRs on the same table (state enforcement + score recalculation + auto-generate checklist) can create execution order dependencies. | Set explicit Order values: state enforcement = 100 (runs first), auto-generate checklist = 200, score recalculation = 300. Document in `decisions.md`. |
| **Computed field updates in before vs after BRs** | If `readiness_score` is updated in an `after` BR, the form won't show the new value without a refresh. If in a `before` BR, the record saves with the computed value. | Score recalculation should happen in a `before` BR on `x_snops_checklist_result` update, so the parent assessment saves with the new score atomically. But this requires querying up to the parent — test the GlideRecord scope access. |

### Low — Phase 2+ Awareness

| Issue | Future Impact |
|---|---|
| No `sys_properties` for configurable thresholds | Currently hardcoded in policy records (fine for MVP). If you later want instance-wide defaults, you'll need system properties. Not now. |
| No event-driven architecture | BRs directly call Script Includes. Fine for MVP. At scale, you'd use events + script actions for decoupling. Not now. |
| Single-level CMDB relationship check | Validator checks direct `cmdb_rel_ci` relationships. Multi-hop dependency analysis (A → B → C) is Phase 2. Don't build it now, but design the validator function signature to accept a `depth` parameter for future extensibility. |

---

## Immediate Next Actions

```
1. Run the cross-scope access tests for cmdb_ci_service and cmdb_rel_ci
2. Create the repo folder structure (docs/, src/, flows/, atf/, demo/)
3. Move existing docs into docs/
4. Add CHANGELOG.md, .gitignore, LICENSE
5. Commit: "[Phase 1.5] Repository structure and documentation"
6. Begin Phase 2: ACL implementation
```

> [!WARNING]
> Do NOT start writing Script Includes until the cross-scope access test passes. If `cmdb_ci_service` and `cmdb_rel_ci` aren't accessible from your scoped app, your entire validation engine is blocked. Test this first.
