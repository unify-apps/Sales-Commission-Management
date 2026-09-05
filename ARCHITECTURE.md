# Architecture

How this app is built, what it runs on, and where its data comes from. The
domain design it implements — table by table, in plain language — is
`Sales_Comp_Design_Walkthrough.md`; this file is about the machinery around it
and how far along each part is.

---

## What this app is

A **code app**: React 19 + TypeScript + Vite, built with Bun, served as a static
`dist/` by the platform's `tensor` runner. It is not a no-code interface built
from blocks — that is the platform's other kind of app, served by `matrix`, and
the distinction matters more than it sounds because the two have completely
different data paths.

| | |
|---|---|
| Platform | tool prod — `https://tool.prod-aps1.unifyapps.com` |
| App id | `app-1621b11a65c8` (`VITE_APPLICATION_ID` in `app/.env`) |
| Name on the platform | **Ledger** |
| Interface record | `manifest: { type: "WEB", mode: "code" }` |
| Built by | the code-builder session, which owns the workspace and pushes to this repo |

`app/.env` is **engine-managed** — every line is stamped `# managed by
agent-platform — refreshed on build`. Don't hand-edit it; the builder rewrites
it. The same is true of `app/vite.config.ts`, `app/src/main.tsx`,
`app/src/@unifyapps/`, and the `APP_BASE`/basename block in `App.tsx`.

### The GitHub round trip

The engine commits the workspace and pushes here — that is the direction the
platform's Git panel is built around, and every commit on this repo so far was
authored by `UnifyApps <bot@unifyapps.com>`.

The **inbound** direction — commit in a clone, push, see it in the builder — is
the one to be careful about. The engine refreshes a branch's remote-tracking ref
whenever the branch panel is read, so pushed commits become *visible*; whether
they reach the working tree without a branch switch is worth confirming before
anyone builds a workflow on it. A branch switch definitely does: it replaces the
whole working tree.

Publishing is separate from pushing. `Publish` runs the engine's deploy build and
records the workspace HEAD as `sourceCommitHash` on the deployed version, so a
commit that reaches the workspace is still not live until someone publishes.

---

## Where the data comes from

### Today: seed files

Every screen renders from `app/src/data/*-seed.ts`. `app/src/data/bindings.ts`
is still the placeholder the builder ships — `ENTITY` is empty and all five
dataSource ids are `""` — so the app calls nothing. That is a deliberate first
cut, not a bug, and the seed files are a good specification of what each screen
needs.

### The two ways a code app can read real data

**Storage bindings** — the five object-agnostic dataSources in `bindings.ts`
(`FETCH`, `FETCH_ONE`, `CREATE`, `UPDATE`, `DELETE`). These execute
`storage_by_unifyapps_*` and hit **objects directly**, with the object passed per
call. `useData(id, 'storage', { object })` uses this path.

**Callables** — a dataSource pointing at a deployed automation, executed through
`useExecuteWorkflowNode` (reads) or `useExecuteWorkflowNodeMutation` (writes),
wrapped in `src/data/`.

**For anything pay-bearing, use the callable path.** Authorization lives in the
callable; a screen reading objects directly is a screen that can show somebody
else's pay. Storage bindings are fine for genuinely non-sensitive reference data
— currencies, titles, territories.

Two practical notes:

- `useData(id, 'callable', …)` is a **stub**. `app/src/lib/data.ts` implements
  `'seed'` and `'storage'` and returns `{ data: undefined }` for `'callable'`.
  Callable wiring goes through hand-written `src/data/` wrappers, which means
  those reads will not appear in the builder's Data panel — the panel is
  extracted from `useData()` calls.
- A dataSource id can only be minted **inside a builder session**
  (`create_datasource`), or from the ICM kit's `ua-datasource.mjs`. There is no
  way to produce one from a local clone, and a made-up id compiles, builds green
  and 500s on every request at runtime. So: UI and logic can be written here and
  pushed; anything needing a new binding starts in the builder.

### The backend, and which repo owns it

The objects and automations live on the platform and are built from a separate
repo, **`ua-icm`** — a toolbox driven from Claude Code, with the object specs,
the automation contracts, the regression suites and the deploy gates. Its layer
rules are the ones this app has to respect:

- Pages never touch objects directly; a page calls a callable, the callable
  reads and writes.
- Shared logic is a callable, not a copy.
- Automations are the only writers.
- Nothing is reachable until it is **deployed** — callers only ever hit the
  deployed copy.

---

## The domain, in phases

From `Sales_Comp_Design_Walkthrough.md`. Each phase is usable on its own, and
nothing in a later phase requires changing what came before.

| Phase | What it answers | Backend state |
|---|---|---|
| **1. Who gets paid** | People, job types, seats, org chart, the comp calendar | **Built on tool prod, with records** |
| 2. What they're paid for | Deals flowing in from the CRM | `FxRate` object only |
| 3. The rules of the game | Plans, credit rules, rate tables, quotas | Not built |
| 4. The calculation | Credits → attainment → earnings → statements | Not built |
| 5. Trust and controls | Audit log, disputes, access, notifications | Not built |

So the app's Organization module has a real backend to move onto; Plan, Orders,
Results, Disputes and the rep statements do not yet.

### Phase 1 as built

Eleven objects on tool prod, all tagged `icm`:

```
Currency ── FxRate ── Period ─┐
                              ├─ (calendar and money)
Title ─┐                      │
Territory ─┼─ PositionAttribute ─┐
Position ──┴─ PositionHierarchy  ├─ (the org, all effective-dated)
Payee ────── PayeePositionAssignment
CreditType                        ── (the credit-bucket registry)
```

The shape to understand is that **identity, seat, and what-the-seat-is are three
different tables, and the last two are dated**:

- `Payee` is a person and nothing else — name, employee id, currency, hire and
  termination dates. Boring on purpose, because identity changes far less often
  than job.
- `Position` is a *seat* — an identity and nothing else. The seat owns the
  territory, the quota, the reporting line and the plan; the person is whoever
  is sitting in it.
- `PositionAttribute` says what a seat **was, from when to when** — its title and
  territory. Promoting a seat in October is a new row, so March still resolves
  to the plan that actually applied in March.
- `PayeePositionAssignment` says who sat in which seat, from when to when.
- `PositionHierarchy` is the org chart drawn **seat to seat**, effective-dated,
  so replacing a manager is one row in the assignment table and zero rows here.

`Period.status` is the state machine everything else leans on: `OPEN` is the only
writable state, and `CLOSED` / `PAID` / `CALCULATING` are not. Every automation
carrying a `periodId` calls `ICM | Check Period Writable` first.

### Three callables exist

On tool prod, currently **drafts** — nothing can call them until they are
deployed.

| callable | what it answers |
|---|---|
| `ICM \| Check Period Writable` | does this period accept writes right now |
| `ICM \| List Positions` | a paged, searchable list of seats, with occupancy as of a date, resolved in bulk |
| `ICM \| Resolve Position Occupant` | who held this seat on this date — or exactly why there is no single answer |

`List Positions` maps almost one-to-one onto `/organization/positions`. It is
also the shape every future callable should copy: the app's screens are flat
rows (`Profile` merges payee, seat, title, plan and quota into one object), the
model underneath is normalised and dated, and **the callable is what does the
flattening**. `Profile` cannot be an object; it has to be produced.

---

## Seeded data and the edge cases in it

Phase 1 carries 102 records on tool prod, seeded from
`ua-icm/records/phase-1-org.json`. The people and seats are the same ChargePoint
personas this app already renders from `app/src/data/org-seed.ts`, so the
backend and the screens describe one organisation rather than two.

The edge cases are deliberate — each is a rule from the walkthrough made real:

| case | what it proves |
|---|---|
| `POS-W-AE-09` never assigned | a vacant seat still exists, still has a title, and still collects credit — "unfilled seats with revenue" |
| that seat omits `active` | a boolean never set is **missing**, not false |
| `POS-E-AE-07` after 2026-05-30 | a seat goes vacant mid-year when its holder is terminated; March still answers "David" |
| Sofia Almeida's two assignments | a person moves seats mid-year — two rows, never an edit, and neither statement changed the other |
| `POS-W-AE-04` from 2026-07-01 | a seat is promoted mid-year without rewriting what applied in March |
| `POS-EU-AE-05` from 2026-07-01 | a territory is re-cut while the title stays put |
| `POS-GBL-VP-01` | a global seat with no territory, and **no hierarchy row** — which is how the rollup walk knows to stop |
| `POS-EU-AE-08` | a seat that did not exist before 2026-07-01, so it has no attribute row before then |
| `POS-AP-SDR-01`'s two hierarchy rows | a re-org: a March deal rolls up to one manager, an April one to another |
| Liam Patel `ON_LEAVE` | leave is a payee status, not a vacancy — the seat is not open |
| `JAN` paid, `FEB` closed, `MAR` open | all three writability states, and a quarter that stays open because a month in it is |
| `SPIF` inactive | a retired credit type, kept for history, unusable in new rules |

Deliberately **not** seeded: overlapping assignments for one seat, one person in
two seats, or a hierarchy cycle. Those are the states the pre-checks must refuse,
and seeding them would put invalid data in production to make a point. They
belong in regression suites against `KITFIX-` fixtures on UAT.

---

## Open decisions

These change what gets built next, and none of them has an obvious default.

**The hierarchy is modelled two different ways.** This app's `HierarchyRow` is
**versioned** — a `versionName` like `FY27-ChargePoint FEB-2026` plus an
`effectiveStart`, with a version picker in the UI. The backend's
`PositionHierarchy` is **per-row effective-dated**, following the walkthrough.
Both are defensible; they are not the same thing, and the app already has a UI
built around versions.

**`target_incentive` has nowhere to live.** The walkthrough puts it on
`PayeePositionAssignment` — what a person earns at 100% attainment, dated because
it is agreed per person per seat and renegotiated at appraisal time. The schema
has no such field yet, so no assignment carries one.

**Two vocabularies.** This app says Profiles, Measures, Formulas, Reference
Tables, Rules; the backend model says Payee, Position, Credit, Earning, Payout.
Something has to reconcile them — most likely the callables, presenting the
app's vocabulary over the model's objects. Cheaper to decide once now than per
screen later.

**Territory is unused by this app.** The backend has a `Territory` object with
foreign keys from `PositionAttribute`; the app segments by `region`,
`businessGroup` and `team` as free text, and `Measure` carries `geographies[]`.
Worth confirming before anything depends on it.

**`NamedRelationship` exists only here.** Typed, versioned position-to-position
links, with a screen. Neither the backend model nor the walkthrough has them.

**The app is `security: PUBLIC`.** It requires no sign-in today. That wants
changing before real pay data reaches it — see the `authentication` skill.

---

## Related files

| | |
|---|---|
| `Sales_Comp_Design_Walkthrough.md` | the domain design, table by table, in plain language |
| `README.md` | the stack, scripts, env vars, deployment |
| `PRODUCT.md` | design context for the build agent |
| `.agents/rules/project-guidelines.md` | the coding conventions the agent works to |
| `.agents/skills/` | what the build agent knows how to do — `backend-integration`, `object-data`, `automation-integration`, `authentication` are the ones that matter here |

`PRODUCT.md` and `README.md` both point at a **`PLAN.md`** as "the source of
truth for what to build". That file does not exist in this repo. The `app-plan`
skill defines its format; until it is written, the build agent is working without
the one document its own conventions call authoritative.
