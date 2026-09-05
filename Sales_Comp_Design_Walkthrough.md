# Sales Compensation System — Design Walkthrough

A plain-language, table-by-table explanation of how the system is built. Written so that comp admins, finance, sales ops and engineers can all read it. Tables added after the first pass carry a letter suffix (`3b`, `7b` …) so the original numbering stays stable for anyone reading from an earlier copy.

---

## How the build is phased

| Phase | What it answers | What you can do after it |
|---|---|---|
| 1. Who gets paid | People, job types, seats, org chart | You have a clean org directory |
| 2. What they're paid for | Deals flowing in from Salesforce | You have a deal ledger |
| 3. The rules of the game | Plans, credit rules, rate tables, quotas | Plans exist as data, not spreadsheets |
| 4. The calculation | Credits → attainment → earnings → statements | You can actually pay someone |
| 5. Trust and controls | Audit log, disputes, access, notifications | Finance signs off on it |

Every phase is usable on its own. Nothing in a later phase requires changing what was built earlier.

---

## Phase 1 — Who gets paid

### Table 1: PAYEE

**In plain words:** the list of every person who can ever receive commission. Nothing else — not what they sell, not what plan they're on. Just "this person exists and here's how to identify them."

**Why it's a table of its own**

A person's *identity* changes far less often than their *job*. Priya was an SDR last year, an AE this year, and might be a manager next year. Her name, employee ID and email stay the same through all of it.

If we stored her role and quota in the same row, we'd have to overwrite it every time she moved — and we'd lose the ability to answer "what did Priya earn last year, when she was an SDR?" So the person is one table, and the job she holds is another (see `POSITION`, coming next).

**How it helps day to day**

- Salesforce sends a deal owned by `priya.s@company.com` — this table is how we find out who that actually is.
- Payroll needs a file with employee IDs, not names — this table has them.
- Priya leaves in October — we set one date here and the engine stops paying her after that, without deleting her history.

**The fields**

| Field | What it means | Example |
|---|---|---|
| `employee_id` | The one ID that never changes. Comes from HR (Workday), not from us. This is what payroll uses. | `EMP-00412` |
| `name` | Display name for statements and dashboards. | Priya Sharma |
| `email` | How we match a Salesforce user to a payee, and where notifications go. | priya.s@company.com |
| `currency` | What currency this person is paid in. Even if everyone is INR today, having the field means adding a US rep later is a data change, not a rebuild. | INR |
| `hire_date` | First day they're eligible to earn anything. The engine ignores deals before this. | 2024-03-01 |
| `termination_date` | Last day they're eligible. Blank means still active. The engine ignores deals after this, but old statements stay intact. | blank |

**What deliberately isn't here**

Role, manager, quota, plan, territory. All of those change over time, so they live in tables that carry start and end dates. Keeping `PAYEE` boring is the whole point.

**Rules to enforce from day one**

1. `employee_id` is unique and comes from the HR system. If people can type their own IDs, you'll have two Priyas within a month and the payroll file will be wrong.
2. `email` is unique. It's the join key to Salesforce.
3. Nobody is ever deleted. Set `termination_date` instead. Deleting a payee would orphan every credit and earning that points at them.

---

### Table 2: TITLE

**In plain words:** the short list of job types that exist in sales. AE, SDR, Regional Sales Manager, VP Sales. Usually 5 to 15 rows. That's it.

**Why it's a table of its own**

Because a comp plan is almost always written for a *job type*, not for a person. "All AEs get 8% on new bookings" is a statement about the AE title. If titles are free text, you'll end up with `AE`, `Account Executive`, `Acct Exec` and `ae ` — four spellings, four different plan assignments, and one confused engine. A small controlled list prevents that.

**How it helps day to day**

- Assign one plan to the title `AE` and every AE, current and future, is covered.
- Dashboards can compare "average attainment by title" without cleaning up spellings first.

**The fields**

| Field | What it means | Example |
|---|---|---|
| `title_id` | Stable internal ID. | `T-AE` |
| `name` | What people see. | Account Executive |

**What deliberately isn't here:** salary bands, target incentive, quota. Those vary by person and period and belong elsewhere.

---

### Table 2b: CREDIT_TYPE

**In plain words:** the controlled list of credit buckets. NEW_BOOKING, RENEWAL, MGR_ROLLUP. Usually 5 to 15 rows, exactly like `TITLE`.

**Why it's a table of its own**

For the same reason `TITLE` is. A credit rule writes a `credit_type`; a measure and a plan component read one. If the value is free text, `NEW_BOOKING` and `NEW_BOOKINGS` are two different buckets, and nothing complains. The rule fires, credits are written, and no measure sums them — so the rep's attainment is quietly low. Nobody notices until quarter end, when the accelerator that should have triggered didn't.

That failure is invisible in a way most others aren't: there is no error, no exception, no zero. There are credits in the database that simply nobody reads. A registry turns it into a save-time error instead.

**The fields**

| Field | What it means | Example |
|---|---|---|
| `credit_type_id` | Stable ID, and the value stored on rules, measures and credits. | `NEW_BOOKING` |
| `name` | Display label on statements and breakdowns. | New Bookings |
| `description` | What belongs in this bucket, for the comp admin writing rules. | New-business deal value, excluding renewals |
| `active` | Retired types stay for history but can't be used in new rules. | yes |

**Rules to enforce**

1. `CREDIT_RULE.credit_type`, `ATTAINMENT_MEASURE.credit_types` and `PLAN_COMPONENT.credit_types` accept only IDs from this table. Enforced on save, not at run time.
2. **Every credit type a plan's rules write must be read by at least one of that plan's measures or components.** This is the check that catches the real bug — a valid type used in a rule that no measure sums. The pre-check reports it as "rule X writes VP_ROLLUP, which no component in this plan reads."
3. A type in use by any rule can be deactivated but never deleted.

---

### Table 3: POSITION

**In plain words:** a *seat* in the sales org. "AE, West region, seat #3." The seat exists whether or not someone is sitting in it.

**Why it's a table of its own — the most important idea in phase 1**

Think of a bus. The bus has seats. People get on, sit down, move seats, get off. The seats don't change.

In a sales org, the *seat* is the thing that owns a territory, has a quota, reports to a manager seat, and is attached to a plan. The *person* is whoever is currently sitting there.

Why this matters in practice:

- **Priya leaves, Rahul replaces her.** Same seat. Same territory, same quota, same manager, same plan. Rahul's deals from his first day credit against the seat's quota. We change one row (who sits in the seat) and nothing else.
- **A seat is empty for two months.** Deals in that territory still arrive from Salesforce. They credit to the seat, and the report "unfilled seats with revenue" tells the manager money is being left on the table. Without seats, those deals would just be errors.
- **Priya moves from West to East mid-year.** She leaves one seat and joins another. Her West deals stay with the West seat's quota, her East deals count toward East. Her personal history is intact because the person didn't change — only her seat did.

Every serious comp tool (Xactly, Varicent, CaptivateIQ) is built on this separation. It is the single decision that makes mid-year changes survivable.

**The fields**

| Field | What it means | Example |
|---|---|---|
| `position_id` | Stable internal ID for the seat. | `POS-W-AE-03` |

That is the whole table. The seat is an identity and nothing else — what the seat *is* (its title) and what it *covers* (its territory) live in `POSITION_ATTRIBUTE`, next, because both change over time.

**What deliberately isn't here:** the person, the manager, the quota, the plan, the title, the territory. All of them change over time, and each gets its own dated table so we can always answer "what was true on 14 March?"

*Xactly equivalent: Position. Xactly keeps title and territory on dated position records for the same reason.*

---

### Table 3b: POSITION_ATTRIBUTE

**In plain words:** what a seat *is*, from when to when. "Seat West-AE-03 was an AE covering West – Mid-market from 1 Jan; from 1 Oct it is a Senior AE covering West – Enterprise."

**What this solves**

A seat's title is what decides which plan applies (`PLAN_ASSIGNMENT` assigns most plans by title). Titles and territories genuinely change — a seat gets promoted to Senior AE, a territory gets re-cut at the half-year.

If the title sat on `POSITION` as a single value, changing it in October would change what plan the engine thinks applied in March, and every past calculation for that seat would quietly produce a different answer on the next recalculation. Dating the attribute means October's re-title affects October onward and nothing before it — the same guarantee `PAYEE_POSITION_ASSIGNMENT` gives for people.

**How it helps day to day**

- Promote a seat mid-year: one new row. March still calculates on the AE plan, November on the Senior AE plan, automatically.
- Re-cut territories in July without touching a single historical number.
- "Which plan applied to this deal?" is always answered as of the deal's close date, never as of today.

**The fields**

| Field | What it means | Example |
|---|---|---|
| `id` | Row ID. | `PAT-00220` |
| `position_id` | The seat. | `POS-W-AE-03` |
| `title_id` | The job type this seat is, over this window. Links to `TITLE`. | `T-AE` |
| `territory` | What the seat covers — region, segment, named accounts. Free text for now; becomes its own table in a later phase. | West – Mid-market |
| `start_date` | From when this is true. | 2026-01-01 |
| `end_date` | Until when. Blank = current. | blank |

**Rules to enforce**

1. Exactly one row per seat per day — no gaps, no overlaps. A seat with no attribute row on a deal's close date cannot resolve a plan, and the pre-check must say so rather than let the engine guess.
2. Never edit a row to change a title. End-date it and add a new one, so both answers survive.

---

### Table 4: PAYEE_POSITION_ASSIGNMENT

**In plain words:** who sat in which seat, from when to when. This is the "bus ticket".

**Why it's a table of its own**

Because the answer changes over time and we must never lose the old answers. If we just stored `current_position` on the payee, then when Priya moves seats in July, every deal she closed in March would suddenly look like it belongs to her new seat. Old statements would change. Finance would never be able to reconcile.

Instead, each row says "Priya sat in seat West-AE-03 from 1 Jan to 30 Jun." A second row says "Priya sat in East-AE-01 from 1 Jul onward." A deal closed on 14 March is matched to whichever row covers 14 March. Nothing is ever overwritten.

This pattern — a row with a start date and an end date — is called **effective dating**. It appears in four tables in this system. Once you understand it here, you understand it everywhere.

**How it helps day to day**

- Recalculate any old month and get the same answer, because the history is still there.
- Priya's statement for March shows her West quota; her statement for July shows East.
- A rep's "I wasn't even in that territory then" dispute is answered by looking at one row.

**The fields**

| Field | What it means | Example |
|---|---|---|
| `id` | Row ID. | `PPA-00891` |
| `employee_id` | The person. Same ID as in `PAYEE` — we reuse the name so it's obvious it's the same thing. | `EMP-00412` |
| `position_id` | The seat. Links to `POSITION`. | `POS-W-AE-03` |
| `start_date` | First day this person is in this seat. | 2026-01-01 |
| `end_date` | Last day in this seat. Blank means "still there". | 2026-06-30 |
| `target_incentive` | What this person earns at exactly 100% attainment, for the full period — their annual variable pay, pro-rated by the engine. | 2400000 |

**Why `target_incentive` lives here.** Target variable pay is agreed with a *person* when they take a seat — it comes from their offer letter, it differs between two people in identical seats, and it is renegotiated at appraisal time. Keeping it on the assignment means it is dated automatically, one number governs every pay-curve component on the plan, and a mid-year raise is a new assignment row rather than an edit that changes what someone was already paid.

**Rules to enforce from day one**

1. A seat holds at most one person on any given day. Two overlapping rows for the same seat is an error the pre-check must catch.
2. A person holds at most one seat on any given day, for now. (Some companies allow one person in two seats — a rep covering a vacancy. Skip that in v1; it's a flag, not a redesign.)
3. Rows are never deleted. To fix a mistake, end-date the wrong row and add a correct one. The audit log keeps both.

---

### Table 5: POSITION_HIERARCHY

**In plain words:** the org chart — but drawn between *seats*, not between people. "Seat West-AE-03 reports to seat West-RSM-01."

**Why it's a table of its own, and why it's seat-to-seat**

Manager commissions depend on it. When Priya closes a deal, her manager gets a rollup credit — but the manager's name is nowhere on the Salesforce deal. The engine has to *find* the manager. It does that by starting at Priya's seat and walking up this table.

Why seat-to-seat and not person-to-person: if the West RSM is replaced in April, every AE in West would need their manager updated if we linked people. With seats, the RSM seat still exists, still has the same AE seats reporting to it, and only the person in the RSM seat changed (one row in `PAYEE_POSITION_ASSIGNMENT`). Zero changes here.

It is also effective-dated, because re-orgs happen. "West-AE-03 reported to West-RSM-01 until 31 Mar, and to Central-RSM-02 from 1 Apr." A March deal rolls up to the old manager, an April deal to the new one — automatically.

**How it helps day to day**

- Manager rollup credit works without anyone maintaining a "manager" field on each rep.
- The manager dashboard ("show me my team") is just "all seats under mine, and who sits in them."
- Multi-level rollup (RSM → VP) is the same walk, one step further.

**The fields**

| Field | What it means | Example |
|---|---|---|
| `id` | Row ID. | `PH-00034` |
| `position_id` | The child seat. | `POS-W-AE-03` |
| `parent_position_id` | The seat it reports to. | `POS-W-RSM-01` |
| `start_date` | From when this reporting line is true. | 2026-01-01 |
| `end_date` | Until when. Blank means current. | blank |

**Rules to enforce from day one**

1. A seat has at most one parent on any given day.
2. No loops. A seat can't report to itself through any chain. The pre-check must walk the tree and refuse to save if it finds a cycle — otherwise the rollup engine runs forever.
3. The top seat (CRO, VP) simply has no row here. That's how the walk knows to stop.

---

### How org data gets here — the Workday sync

Deals get a whole section on how they arrive (phase 2), and org data deserves the same, because a wrong transfer date moves money exactly as surely as a wrong deal amount does.

1. **Trigger.** Nightly, plus on demand before a calculation run.
2. **Pull.** Workers, their employee IDs, hire and termination dates, and — if Workday holds them — job title and manager.
3. **Map.** Worker → `PAYEE`. Job change → a new `PAYEE_POSITION_ASSIGNMENT` row. Title change → a new `POSITION_ATTRIBUTE` row. Manager change → a new `POSITION_HIERARCHY` row.
4. **Pre-check.** Refuse to write anything that would break the rules above: overlapping assignments for one seat, a hierarchy loop, a termination date before a hire date, a seat with no title on a date that already has deals.
5. **Flag retro changes separately.** This is the part worth building on day one. A backdated transfer or a retro-dated termination changes what a *closed* period should have paid. The sync never applies such a change silently — it writes the row, then raises an exception that names the affected periods and whether they are locked. The comp admin decides: rerun (period open) or true-up (period locked).

Everything the sync writes carries `salesforce-sync`-style attribution in the audit log — here, `workday-sync` — so "who moved Priya to East in March, on 14 April" always has an answer.

---

### Phase 1 — what you have now

Six tables. Together they answer, for any date in the past or future:

- Who is this person? → `PAYEE`
- What kind of job is that? → `TITLE`
- Which seat were they in? → `PAYEE_POSITION_ASSIGNMENT` → `POSITION`
- What was that seat, at that moment? → `POSITION_ATTRIBUTE`
- Who was their manager? → `POSITION_HIERARCHY` → `PAYEE_POSITION_ASSIGNMENT`

That is enough to load your org from Workday, show a clean org chart, and catch bad data (empty seats, overlapping assignments, loops, untitled seats) before a single rupee is calculated.

`PERIOD` — the comp calendar — belongs here too rather than with the plans, because quotas and every calculation reference it. Small table, big consequences.

---

### Table 6: PERIOD

**In plain words:** the company's comp calendar. One row per month, one per quarter, one per fiscal year. Each row knows its dates and whether it is still open or has been locked.

**Why it's a table of its own**

Two reasons.

First, fiscal years don't always match calendar years. If your year starts in April, "Q1" means Apr–Jun, and the engine can't guess that. Storing the calendar as data means the engine just looks it up.

Second — and this is the important one — **locking**. Once a month has been paid, its numbers must never change. If a late deal from March shows up in May, we don't reopen March; the engine treats it as a May adjustment. The `status` field on this table is what enforces that. Every calculation run checks it before touching anything.

**How it helps day to day**

- "Which months can I still recalculate?" is one filter: `status = open`.
- QTD and YTD attainment need to know which months belong to which quarter and year. That's this table.
- Month-end close becomes a single action: flip the row to `locked`.

**The fields**

| Field | What it means | Example |
|---|---|---|
| `period_id` | Stable ID. | `2026-M04` |
| `name` | What people see. | April 2026 |
| `type` | `month`, `quarter`, or `year`. | month |
| `start_date` | First day. | 2026-04-01 |
| `end_date` | Last day. | 2026-04-30 |
| `status` | `open` or `locked`. | open |

**Rules to enforce from day one**

1. Months don't overlap and don't have gaps. Load a full fiscal year at once — never create periods on the fly.
2. Locking is one-way. Unlocking a period is an admin-only action that gets written to the audit log, because it means paid numbers might change.
3. A quarter can only be locked once all its months are locked. Same for the year.

---

## Phase 2 — What they're paid for

### Table 7: TRANSACTION

**In plain words:** the deal ledger. One row for every closed deal line that arrived from Salesforce, exactly as it arrived. This is the raw material everything else is made from.

*Xactly equivalent: Order Item. Xactly keeps an Order header plus Order Item lines; we keep only the line and copy the header fields (customer, close date) onto it, so one table does both jobs.*

**Why it's a table of its own**

You might ask: why copy the deal from Salesforce at all? Why not just read it from there when needed?

Because Salesforce changes. Someone edits an amount, moves a close date, reassigns an owner. If the engine read directly from Salesforce, running March's calculation in May could give a different answer than running it in April — and nobody could explain why. Finance cannot live with that.

So we take a **snapshot**. When a deal closes, we copy it here, and this copy never changes. The engine only ever reads this table. Same input, same output, every time.

**The one rule that makes this work: rows are never edited, only added**

What if the deal really did change? Say a ₹10 lakh deal was closed in March, then in May the customer cancelled and it dropped to ₹6 lakh.

We do **not** go back and change the March row to ₹6 lakh. We add a new row in May for **−₹4 lakh**, pointing back at the original. The engine sees both. March's numbers stay exactly as they were paid. May's calculation includes the reversal, so the rep's May statement shows a claw-back line that says "adjustment to deal OPP-4471 from March." Everyone can see what happened and why.

This is called a **reversal** and it is how every accounting system works. It feels strange for a week, then it feels like the only sane way.

**Two dates, because a deal has two answers**

`close_date` says *when the deal happened*. `incentive_date` says *when it pays*. For the large majority of deals they are the same day and nobody thinks about it. They separate in exactly the cases that used to require special handling:

| Situation | `close_date` | `incentive_date` | Effect |
|---|---|---|---|
| Normal deal, arrives on time | 14 Mar | 14 Mar | Counts in March, pays in March |
| Late deal — closed in March, arrives in May, March is locked | 14 Mar | 1 May | Counts toward the Q1 quota it was actually sold against; pays as a true-up in May |
| Reversal of a March deal, raised in May | 14 Mar | 1 May | Removes the credit from the quarter it was earned in; the claw-back lands in May's statement |

**What this solves.** With one date, a March deal arriving in May forces a choice between reopening a paid month and mis-stating the quarter it belonged to. With two, neither is necessary: attainment history stays true to when business was actually done, while payment always lands in a period that is still open. Late deals and reversals stop being exceptions someone handles by hand and become ordinary rows.

**About currency**

The company picks one **base currency** once (INR here). Every deal is stored in the currency it was written in *and* in base, using the rate for its close date's period — frozen onto the row at import.

Freezing the rate is the point. If the engine looked up today's rate at calculation time, recalculating March in May would produce different credits, different attainment and a different statement, purely because the rupee moved — and the promise that recalculation is repeatable would be gone. Because the conversion is done once at the door, everything downstream — credits, quotas, rate tables, statements — works in a single currency and needs no FX logic at all.

**How it helps day to day**

- "Why was I paid ₹X?" — every earning traces back to rows in this table, and those rows say exactly what Salesforce said at the time.
- Recalculating any month gives the same result, forever.
- Cancellations and downgrades are visible as their own lines, not silent edits.
- If Salesforce sends garbage (deal with no owner, negative amount with no original), it is caught here, before it touches anyone's pay.

**The fields**

| Field | What it means | Example |
|---|---|---|
| `transaction_id` | Our own ID for this row. | `TXN-000982` |
| `source_id` | The ID in the source system. For Salesforce, the Opportunity Line Item ID. This is how we detect duplicates. | `00k5g00000AbCdE` |
| `source_system` | Where it came from. Salesforce today; could be an ERP or a manual upload later. | salesforce |
| `position_id` | Which seat gets this deal. Found by matching the Salesforce owner's email → `PAYEE` → the seat they held on the close date. **This is the authoritative link.** | `POS-W-AE-03` |
| `close_date` | When the deal actually closed. Decides which quota window it counts toward, which plan version applies, and which seat assignment was in force. Never changes. | 2026-03-14 |
| `incentive_date` | Which period this deal *pays in*. Equals `close_date` for a normal deal; set forward when the deal arrives after its own period has been locked. | 2026-03-14 |
| `currency` | The currency the deal was written in, as Salesforce sends it. | INR |
| `amount` | The value in `currency`. Positive for a sale, negative for a reversal. | 1000000 |
| `fx_rate` | The rate used to convert to the company's base currency, taken from `FX_RATE` for the close date's period and frozen here. | 1.0 |
| `amount_base` | `amount × fx_rate`. Every credit, quota and attainment number in the system is in base currency, so nothing downstream has to know about FX at all. | 1000000 |
| `product` | What was sold. Used by rules like "Product X pays 12%." | Enterprise Suite |
| `customer` | Who bought. Used by rules like "new logo pays double." | Acme Ltd |
| `attrs` | A flexible bag of any other Salesforce fields — segment, region, deal type, contract length. Rules can look inside it. | `{segment: Enterprise, new_logo: true, term_months: 36}` |
| `reversal_of` | If this row cancels or adjusts an earlier one, the ID of that earlier row. Blank for normal deals. | `TXN-000541` |
| `batch_id` | Which import run brought this in. Lets you find and review everything that arrived together. | `BATCH-2026-03-15-01` |

**"But I can't see who the payee was" — how the person is found**

The deal points at a *seat*, not a person, on purpose (see `POSITION` in phase 1). To get the person: take `position_id` and `close_date`, look in `PAYEE_POSITION_ASSIGNMENT` for the row where that seat's `start_date ≤ close_date ≤ end_date`, and read `employee_id`.

Why not just store the person directly and be done? Because if the deal said "Priya" and Priya's March seat assignment later turns out to be wrong (HR entered the wrong transfer date), every March deal would have to be edited. If the deal says "seat West-AE-03", fixing the one assignment row fixes everything on the next recalc. It also means deals in a vacant seat still have a home.

Xactly works the same way underneath: its order screen shows the employee, but the credit is always attached to the position that person held on the incentive date.

**For humans: a readable view, not a second column.** The transaction *table* stays seat-only so there is exactly one source of truth. On top of it we build a read-only **Transaction View** that does the join above and shows the person's name alongside each deal. Every screen — rep dashboard, deal breakdown, admin list — reads from the view; the engine reads from the table. Nobody has to do the join by hand, and nothing can drift.

**About `attrs` — why a "flexible bag"**

Every company's Salesforce has different fields, and comp plans use them in different ways. One company pays extra on "new logo", another on "multi-year", another on "partner-sourced." We can't add a column for every possibility, and we shouldn't need a schema change every time a plan gets a new condition.

So `attrs` holds any extra fields as key-value pairs. The ingestion mapping decides which Salesforce fields get copied in. Credit rules (phase 3) can then say "if `attrs.new_logo` is true, pay 1.5×." New condition → change the mapping and the rule, not the database.

**What deliberately isn't here:** the payee, the commission rate, the credit amount, the plan. This table knows what was *sold*. Who gets paid what for it is the engine's job, not the ledger's.

---

### Table 7b: FX_RATE

**In plain words:** the exchange rate used for each currency, per period. "In March 2026, 1 USD = 83.4 INR."

**What this solves**

`PAYEE.currency` promises that adding a US rep later is a data change rather than a rebuild. This small table is what makes that true. It gives every import one agreed rate per currency per period — set by finance, not fetched live — so two deals closed in the same month convert identically, and so the number used is one finance can point at and defend.

**The fields**

| Field | What it means | Example |
|---|---|---|
| `id` | Row ID. | `FX-2026-03-USD` |
| `currency` | The source currency. | USD |
| `period_id` | Which period this rate applies to. | `2026-M03` |
| `rate_to_base` | Multiply by this to get base currency. | 83.4 |
| `source` | Where it came from — a bank rate, an internal policy rate, the ERP. | RBI reference, 1 Mar |

**Rules to enforce**

1. One row per currency per period. Loaded ahead of the period, like `PERIOD` itself.
2. A missing rate blocks import of deals in that currency rather than defaulting to 1. A silent 1.0 is an 83× error that nobody notices until payroll.
3. If your company is single-currency today, this table has one row per period at 1.0 and costs nothing. It exists so that the day a US rep is hired, nothing else has to change.

---

### How deals actually get here — the ingestion flow

A short walk-through so the table makes sense in motion:

1. **Trigger.** An Opportunity in Salesforce moves to *Closed Won*. (Or a nightly schedule picks up everything closed since last run — both work; nightly is simpler to start with.)
2. **Pull.** The automation fetches the Opportunity and its Line Items.
3. **Map.** For each line item: owner email → `PAYEE` → seat on the close date → `position_id`. Chosen fields → `attrs`.
4. **Pre-check.** Before writing anything, validate:
   - `source_id` not already present (duplicate)
   - owner email matches a payee
   - that payee held a seat on the close date, and that seat had a title on the close date
   - an `FX_RATE` exists for the deal's currency and the close date's period
   - amount is a number; reversals point at a real original
   Rows that fail go to an **exceptions list** for a human, not into the ledger.
5. **Date the payment.** If the close date's period is still `open`, `incentive_date = close_date`. If it is `locked`, `incentive_date` is set to the first day of the earliest open period. A late deal is therefore never an exception — it is imported, counted against the quarter it was sold in, and paid in the next period that can still be calculated.
6. **Write.** Rows that pass are inserted with a shared `batch_id`, converted to base currency.
7. **Notify.** Comp admin gets "Batch X: 47 loaded, 3 exceptions."

The pre-check is your P1 "Data Integrity" feature. It lives here, at the door, because bad data is cheap to fix before it's in and expensive after.

---

### Phase 2 — what you have now

Eight tables. You can load the org from Workday, load deals from Salesforce, catch bad data at the door, and answer "what was sold, by which seat, on which date" for any point in history — with a guarantee that the answer never changes after the fact.

Nothing is calculated yet. That's deliberate. Phase 3 is where the rules live, and phase 4 is where they run.

---

## Phase 3 — The rules of the game

Phase 3 is where a comp plan stops being a PDF and becomes data the engine can read. It comes in two halves:

- **Part A — the structure:** what a plan is, who it applies to, what it's made of, and how deals get credited.
- **Part B — the numbers:** quotas, how attainment is measured, and the rate tables that turn attainment into money.

### Before the tables: what is a plan, really?

A typical AE plan document says something like:

> *"Account Executives earn 8% on new bookings. Once you pass 100% of quarterly quota, the rate goes to 12%. Renewals pay a flat 3%. Enterprise deals count 1.5× toward quota."*

Break that into pieces and you get:

1. **Who it's for** — Account Executives (a title)
2. **Which deals count and how much** — new bookings count fully, Enterprise counts 1.5×, renewals are a separate bucket → these are **credit rules**
3. **What is measured** — bookings against quarterly quota → an **attainment measure**
4. **How measurement becomes money** — 8% below quota, 12% above → a **rate table**
5. **Separate pieces that pay separately** — new bookings vs renewals → **plan components**

Every plan you'll ever meet is some combination of those five things. Phase 3's tables are just those five things, stored.

---

### Table 8: PLAN

**In plain words:** the container. "FY26 AE Plan, version 2, valid 1 Apr 2026 to 31 Mar 2027." The plan itself holds almost nothing — its job is to group the components and rules that belong together and say when they're in force.

**Why it's a table of its own**

Plans change every year, and sometimes mid-year. When FY27 starts, the FY26 plan doesn't get edited — a new plan row is created. Old deals keep pointing at the old plan and calculate exactly as they did. That's the same "never overwrite history" idea from phase 1, applied to rules instead of people.

**How it helps day to day**

- "Which plan was Priya on in March?" — one lookup.
- Build next year's plan as `draft`, test it in the simulator against this year's deals, then flip it to `active`.
- Mid-year plan change → new version, dated from the change. Both versions coexist; the close date picks the right one.

**The fields**

| Field | What it means | Example |
|---|---|---|
| `plan_id` | Stable ID. | `PLAN-FY26-AE-v2` |
| `name` | Display name. | FY26 AE Plan |
| `version` | Increments on each change. Lets you see the history of one plan. | 2 |
| `start_date` | First close date this plan applies to. | 2026-04-01 |
| `end_date` | Last close date. | 2027-03-31 |
| `status` | `draft` (being built, engine ignores it), `active` (in force), `retired` (kept for history). | active |

---

### Table 9: PLAN_ASSIGNMENT

**In plain words:** who is on which plan. Either "everyone with title AE" or "specifically seat West-AE-03", from when to when.

**Why it's a table of its own**

Most people are on the plan for their title. But there are always exceptions — a strategic account seat with its own plan, a rep on a ramp plan for their first 90 days, a pilot territory trying a new structure. Assigning by title covers the 90%; assigning by seat covers the exceptions without touching the title rule.

When both exist, **seat beats title**. That one rule handles every exception you'll meet in v1.

**How it helps day to day**

- Add a new AE seat → they're automatically on the AE plan. Nothing to configure.
- Give one seat a special plan → one row, dated. Everyone else unaffected.
- Ramp plans: assign the ramp plan to the seat for 90 days, end-date it, and the title plan takes over automatically.

**The fields**

| Field | What it means | Example |
|---|---|---|
| `id` | Row ID. | `PA-00112` |
| `plan_id` | Which plan. | `PLAN-FY26-AE-v2` |
| `target_type` | `title` or `position`. | title |
| `target_id` | The title ID or the seat ID. | `T-AE` |
| `start_date` | From when. | 2026-04-01 |
| `end_date` | Until when. Blank = ongoing. | blank |

**How a title assignment is resolved.** Always as of the deal's close date, never as of today: take the seat, read its title from `POSITION_ATTRIBUTE` for that date, then find the plan assigned to that title for that date. This is what lets a seat be promoted mid-year without changing what its earlier deals paid.

**Rules to enforce**

1. A seat can resolve to only one plan on any given day. If a seat has its own assignment *and* its title has one, the seat's wins.
2. If two seat-level assignments overlap, that's an error the pre-check must catch.
3. A seat that resolves to no plan on a date that has deals is an exception, not a zero.

---

### Table 10: PLAN_COMPONENT

**In plain words:** the separately-paid pieces inside a plan. "New bookings commission", "Renewal commission", "Quarterly accelerator". Each has its own way of calculating and shows up as its own line on the rep's statement.

**Why it's a table of its own**

Because one plan almost always pays for more than one thing, and those things are calculated differently. New bookings might be percent-to-goal with an accelerator; renewals might be a flat 3% with no quota at all. If the plan were one big formula, you couldn't have both. Components let each piece be simple.

It also makes the statement readable. A rep sees "New bookings: ₹84,000. Renewals: ₹12,000." instead of one mystery total.

**How it helps day to day**

- Add a SPIFF for one quarter → add a component with a date range, remove it later. The rest of the plan is untouched.
- Rep disputes one line → you know exactly which component and which rule to look at.
- Manager rollup is just another component, reading a different credit type.

**The fields**

| Field | What it means | Example |
|---|---|---|
| `component_id` | Stable ID for this component *in this plan version*. | `PC-AE-NEWBOOK-v2` |
| `component_key` | Stable ID for this component *across* plan versions. Two versions of "New Bookings Commission" share one key. | `AE-NEWBOOK` |
| `plan_id` | Which plan it belongs to. | `PLAN-FY26-AE-v2` |
| `name` | Statement line label. | New Bookings Commission |
| `calc_type` | How it turns credit into money: `flat` (a rate × each credit), `pct_to_goal` (rate depends on attainment vs quota), `pay_curve` (attainment → % of target incentive), `draw` (a guaranteed minimum — see `DRAW_BALANCE`). | pct_to_goal |
| `credit_types` | Which buckets of credit this component reads. | `[NEW_BOOKING]` |
| `measure_id` | For `pct_to_goal` and `pay_curve`: which attainment measure decides the rate. Blank for `flat`. | `M-QTR-BOOKINGS` |
| `rate_table_id` | The rate table or pay curve to use. For `flat`, a one-row table. | `RT-AE-STD` |
| `cap_pct` | Optional ceiling, expressed as attainment: earnings are computed as if attainment stopped here. Blank = uncapped. | 250 |
| `cap_amount` | Optional ceiling in money, per measure window. Blank = uncapped. | 5000000 |
| `pay_trigger` | When an earning becomes payable: `close` (on the deal), `invoice`, or `collection`. | close |
| `draw_amount` | For `calc_type = draw`: the guaranteed minimum per period. | 200000 |
| `draw_recoverable` | For `calc_type = draw`: whether the guarantee is recovered from later commission (`yes`) or is a gift (`no`). | yes |
| `sort_order` | Order on the statement. | 1 |

**Why `component_key` exists — the piece that keeps true-up honest**

QTD and YTD components pay by true-up: earned-to-date minus already-paid (see `EARNING`). "Already paid" is found by looking up this component's earlier earnings in the same window.

Plans get re-versioned mid-year — that's the whole point of `PLAN` versioning — and a new version means new component rows. Matching prior payments on `component_id` alone would find nothing after a version change, and the rep would be paid the full quarter-to-date amount a second time. Matching on `component_key` means the January and February payments are still found in March even though the plan changed on 1 March. One extra column removes an entire category of duplicate payment.

**Caps**

`cap_pct` and `cap_amount` exist because most plans have a ceiling somewhere — often "pay up to 250% of quota, anything beyond needs CRO approval." Modelling it here means the cap is visible in the plan, applied by the engine, and shown on the statement as a capped line, instead of living in someone's head and being applied by hand at quarter end. The uncapped figure is kept on the earning too, so "what would this have paid" is answerable when approval is sought.

**`pay_trigger` — earned is not always payable**

Some companies pay commission when a deal closes; others when it is invoiced, or when cash is collected. This flag says which, per component.

What it solves: without it, the only way to hold commission until collection is to delay importing the deal — which corrupts attainment, quota progress and the rep's dashboard for months. With it, the deal is credited and the attainment is correct immediately, while the *money* sits on the earning as `held` until the trigger fires and it is released into a statement. The rep sees the truth on both counts: "you have earned this; it becomes payable when Acme pays."

**Where holding is allowed, and why it isn't everywhere**

`pay_trigger` is supported on **`flat` components only.** On `pct_to_goal` and `pay_curve` components it must be `close`.

The reason is that a trigger is a property of one *deal*, while a quota-based earning is one number for a whole *window*. If three of a rep's ten March deals are uncollected, there is no honest way to mark the single quarter-to-date earning `held` or `payable` — it is 70% one and 30% the other, and any split you invent stops matching the rate table the moment attainment crosses a band.

Worse, it breaks true-up in exactly the way that is hardest to see. `previously_paid` is a sum of earlier earnings for the same component key. If some of those were held and never paid, including them means subtracting money the rep never received; excluding them means the money is paid now *and* again when the hold releases. Both are wrong, and both produce a statement that looks entirely plausible.

**For quota-based components, hold at the credit level instead.** The measure sums only credits whose trigger has fired — an uncollected deal produces a credit that is written, visible and traceable, but not yet counted toward attainment. When collection lands, the credit becomes countable, attainment rises, and the next run's true-up pays the difference through the normal mechanism. Nothing special happens at earning time.

The trade-off is honest and worth stating in the plan document: the rep's attainment reflects *collected* business, not closed business, so their dashboard will trail their pipeline. That is a real cost, but it is one number that is consistently defined, rather than two numbers that disagree.

**So the definition of `previously_paid` is unambiguous:** it is the sum of all earlier earnings for the same `component_key` in the window, and because holds cannot exist on the components that use true-up, every one of those earnings was genuinely paid. The `hold_status` field on `EARNING` is only ever `held` on `flat` lines, which do not true up.

---

### Table 11: CREDIT_RULE

**In plain words:** the rules that look at each incoming deal and decide "who gets recognised for this, in which bucket, and how much." This is the bridge between *what was sold* (phase 2) and *what gets paid* (phase 4).

**Why crediting is a separate step from paying — the second most important idea in this system**

It's tempting to skip straight from "deal closed" to "pay 8%." But real plans need a step in between, for three reasons:

1. **Not every deal counts the same.** Enterprise counts 1.5×. Renewals go in a different bucket. Some products don't count at all. Crediting is where that sorting happens.
2. **One deal can credit several people.** The rep gets it. Her manager gets a rollup. A partner manager might get a slice. One deal → several credits.
3. **Paying needs totals, not single deals.** "Are you above quota?" depends on the sum of all your credits this quarter. So we first turn deals into credits, then add them up, *then* decide the rate.

So: a credit is "₹10 lakh of NEW_BOOKING credit to seat West-AE-03." It is not money yet. It's recognition. Money comes in phase 4.

**How a credit rule works**

Each rule has a **condition** (a question about the deal) and an **outcome** (what to do if the answer is yes). The engine runs *every* rule in the plan against *every* deal. All rules whose condition is true fire — it's not "first match wins."

Example plan with three rules:

| Rule | Condition | Outcome |
|---|---|---|
| Standard booking | `deal_type = "New"` | credit type NEW_BOOKING, 100%, mode `add` |
| Enterprise uplift | `deal_type = "New" AND segment = "Enterprise"` | credit type NEW_BOOKING, +50%, mode `add` |
| Renewal | `deal_type = "Renewal"` | credit type RENEWAL, 100%, mode `add` |
| Manager rollup | `deal_type = "New"` | credit type MGR_ROLLUP, 100%, **rollup = yes**, levels 1 |
| VP rollup | `deal_type = "New"` | credit type VP_ROLLUP, 50%, **rollup = yes**, levels 2 |

An Enterprise new deal fires rules 1, 2, 4 and 5: the rep gets 150% NEW_BOOKING credit, the RSM one step up gets 100% MGR_ROLLUP, and the VP two steps up gets 50% VP_ROLLUP — each found by walking `POSITION_HIERARCHY` the stated number of steps.

**Add versus override**

Rules for the same credit type are **additive** by default, which is why "100% standard + 50% uplift" comes to 150%. Some plans are written the other way: "Enterprise pays 50%, full stop" rather than "50% on top." `mode = override` expresses that — the rule replaces every `add` rule's contribution for that credit type on that deal, instead of stacking on it.

Without the flag, the only way to write an override is to add a negative counter-rule, which is unreadable in the plan explainer and impossible for a comp admin to maintain. One field keeps both plan styles expressible and readable.

**Why rollup is a depth, not a yes/no**

Manager rollup and VP rollup are the same mechanism at different distances. Storing the number of steps means multi-level plans need no new concept and no new code — the same walk runs one step further. `levels = all` covers "every manager in the chain up to the CRO", which is how override structures are usually written.

**The condition is stored as structured data, not as code**

The condition is stored in a standard format called JsonLogic — a small, well-known way of writing "if this and that" as data:

```json
{ "and": [
    { "==": [ { "var": "txn.attrs.deal_type" }, "New" ] },
    { "==": [ { "var": "txn.attrs.segment" }, "Enterprise" ] }
] }
```

Why not just let someone write the condition in Groovy? Because then every plan change is a developer ticket, and no one but the developer can read what the plan does. Structured data can be shown in a form (field / operator / value), edited by a comp admin, explained by the AI plan explainer, and checked by the pre-check. The engine has one small evaluator that reads this format; it never changes when plans change.

What a condition can look at: any field on the transaction (`txn.amount`, `txn.amount_base`, `txn.product`, `txn.attrs.*`), the seat as it was on the close date (`position.title`, `position.territory`, read from `POSITION_ATTRIBUTE`), and the person (`payee.hire_date`). That fixed vocabulary is what the rule-builder form will offer as dropdowns later.

**The fields**

| Field | What it means | Example |
|---|---|---|
| `rule_id` | Stable ID. | `CR-AE-ENT-UPLIFT` |
| `plan_id` | Which plan this rule belongs to. | `PLAN-FY26-AE-v2` |
| `name` | Human label, shows in the deal breakdown. | Enterprise uplift |
| `condition` | The JsonLogic question. | *(as above)* |
| `credit_type` | Which bucket the credit goes into. Must be an ID from `CREDIT_TYPE` — see the registry for why this can't be free text. | NEW_BOOKING |
| `split_pct` | How much of the deal amount becomes credit. 100 = full, 50 = half, 150 = 1.5×. | 50 |
| `mode` | `add` (stacks with other rules on the same credit type) or `override` (replaces them). | add |
| `rollup` | If yes, the credit goes to a seat *above* this one in the hierarchy rather than to the seat itself. | no |
| `rollup_levels` | How many steps up to walk when `rollup = yes`: `1` (direct manager), `2` (their manager), `all` (every seat in the chain). Blank when `rollup = no`. | 1 |

**Splits between two reps**

"Priya and Rahul share this deal 60/40" is the same mechanism: Salesforce sends the split as two line items (or we split on ingestion), each with its own owner and amount. Each becomes its own transaction and credits normally. No special rule needed — the split happens at the door, in phase 2.

**Rules to enforce**

1. Every plan must have at least one rule, or nothing would ever be credited.
2. `credit_type` must exist in `CREDIT_TYPE`, and every type a plan's rules write must be read by at least one of that plan's measures or components. A rule writing into a bucket nobody sums is the quietest bug in the system.
3. Rules are versioned with the plan. Changing a rule = new plan version. Old deals keep the old rule.
4. `rollup_levels = all` is bounded at credit time — see below.

**Bounding the rollup walk**

`rollup_levels = all` walks up the hierarchy until it finds a seat with no parent. `POSITION_HIERARCHY` is validated for loops on save, so in theory the walk always ends.

In practice, "validated on save" and "walked at run time" are separated by months. A rerun of a historical period reads the hierarchy *as it was on the close date*, and that historical shape was validated by whatever rules existed then — possibly none, if the data was migrated in. A cycle in a period you no longer look at is a run that never returns.

So the walk carries its own guard, independent of the save-time check:

- **Hard depth cap of 10 steps.** No real sales org has ten management layers above a rep; anything approaching it is bad data, not a tall company.
- **Visited-seat set.** If the walk reaches a seat it has already credited on this transaction, it stops. This catches a cycle even within the depth cap.
- Either guard tripping writes an exception naming the transaction, the seat and the chain walked, and **fails the run** rather than paying a partial chain. A manager silently missing their override is worse than a run that stops.

The cap is a constant in the engine, not a configurable field — making it configurable invites someone to raise it to work around bad data.

---

### Phase 3, Part A — what you have now

Thirteen tables. A plan now exists as data: who it's for, when, what pieces it has, and how deals get sorted into credit buckets. You could run the credit step of the engine right now and see "Priya has ₹1.2 crore of NEW_BOOKING credit this quarter."

What's missing is the money. That needs Part B: how much was she *supposed* to bring in (quota), how do we measure her against it (attainment measure), and what rate does that earn (rate table).

---

### Phase 3, Part B — the numbers

Part A sorted deals into credit buckets. Part B answers: how much *should* the rep have brought in, how far along are they, and what does that earn them?

---

### Table 12: ATTAINMENT_MEASURE

**In plain words:** the definition of a scoreboard. "Quarterly bookings attainment = sum of NEW_BOOKING credits this quarter, divided by quarterly quota." The measure says *what* to add up and *over which window*. It does not hold the numbers — those are computed by the engine in phase 4.

**Why it's a table of its own**

Because "how are you doing against quota" is asked in different ways on the same plan. The accelerator might look at quarter-to-date, the annual bonus at year-to-date, a monthly SPIFF at this month only. Each is a different window over the same credits. And which credits count differs too: the bookings measure ignores renewals; a "total revenue" measure might include them.

If the measure were hard-wired into the rate table, you'd need a new rate table every time someone asked a slightly different question. Separating "what we measure" from "what it pays" lets one measure feed several components and one rate table serve several measures.

**How it helps day to day**

- The rep dashboard's attainment gauge is just "show me this measure."
- Add a YTD view to a plan → one new measure row, no change to rules or rate tables.
- Finance can define a measure that *nobody is paid on* — say, pipeline coverage — purely for reporting. Same table.

**The fields**

| Field | What it means | Example |
|---|---|---|
| `measure_id` | Stable ID. | `M-QTR-BOOKINGS` |
| `name` | Display label on dashboards and statements. | Quarterly Bookings Attainment |
| `credit_types` | Which buckets to add up. | `[NEW_BOOKING]` |
| `period_type` | The window: `month` (this month only), `QTD` (quarter start to now), `YTD` (year start to now). | QTD |

**About QTD and YTD — a consequence to know in advance**

You chose QTD and YTD at launch. That's normal and useful, but it means the engine must do **true-up**. Say Priya is at 90% QTD after month 1 (below the accelerator) and at 110% after month 2. Month 2's calculation recomputes everything she has earned *for the whole quarter so far* at the new rate, subtracts what she was already paid in month 1, and pays the difference. Her month 2 statement will look bigger than her month 2 deals alone justify — because part of it is month 1 deals now earning the higher rate.

This is the single most common thing reps dispute. The statement (phase 4) is designed to show "earned to date / already paid / this period" explicitly so it's not a mystery.

**Two things true-up depends on, both enforced by the engine**

1. **Every earlier period in the window must already have been calculated.** "Already paid" is read from those periods' current runs. If February has never been run when March is calculated, the engine finds nothing to subtract and pays February's earnings a second time inside March's true-up. Pass 1 refuses to run a period until every earlier period in the same quarter and year has a successful run — which costs an admin one extra click and removes the possibility entirely.
2. **Prior payments are matched on `component_key`, not `component_id`**, so a mid-quarter plan version doesn't hide them. See `PLAN_COMPONENT`.

---

### Table 13: QUOTA

**In plain words:** the target. "Seat West-AE-03 has a ₹3 crore quarterly bookings quota for Q1 FY26." One row per seat, per measure, per period.

**Why it's a table of its own — and why it's on the seat, not the person**

Same bus logic as phase 1. The quota belongs to the territory, so it belongs to the seat. When Priya leaves and Rahul takes over, the seat's quota doesn't change — Rahul inherits it, and Priya's attainment history against it stays intact.

Why per measure: a seat can have a bookings quota and a separate renewals quota. Why per period: quotas are usually set per quarter, and often uneven (Q4 bigger). Storing them per period, rather than one annual number divided by four, means the plan reflects what was actually agreed.

**How it helps day to day**

- Quota changes mid-year (territory re-cut) → edit next quarter's row; past quarters untouched.
- Missing quota is caught by the pre-check before calculation: "seat West-AE-03 has no Q2 bookings quota" is an exception, not a silent zero that makes attainment infinite.
- QTD/YTD attainment is just sum of credits ÷ sum of quota rows over the window.

**The fields**

| Field | What it means | Example |
|---|---|---|
| `quota_id` | Row ID. | `Q-00219` |
| `position_id` | The seat. | `POS-W-AE-03` |
| `measure_id` | Which scoreboard this target is for. | `M-QTR-BOOKINGS` |
| `period_id` | Which period. Usually a quarter; can be a month. | `2026-Q1` |
| `amount` | The full-period target, in base currency. | 30000000 |

**Proration — what happens when someone isn't in the seat all quarter**

A quota row is written for a whole period. People are not always in a seat for a whole period. Priya joins on 15 February, or moves from West to East mid-quarter, or leaves in May.

The rule the engine applies: **quota is prorated by the days a person actually held the seat inside the measure's window.**

Priya sits in West-AE-03 for 45 of Q1's 90 days, then East-AE-01 for the other 45. Her Q1 bookings quota is 50% of West's ₹3 crore plus 50% of East's ₹2 crore = ₹2.5 crore, and her attainment is her credits from both seats over that figure.

What this solves: without a stated rule, the two obvious readings are both wrong. Summing both seats' full quotas gives her a ₹5 crore target for a quarter in which she could only ever sell half of each — her attainment halves and her accelerator disappears. Taking only one seat's quota under-targets her and overpays. Proration is the only reading that survives turnover, and turnover is guaranteed. The day count and both source quotas are written into `MEASURE_RESULT` so the number is explainable rather than asserted.

Two corollaries worth stating in the plan document, because reps will ask:

- A **vacant seat** contributes no quota to any person (nobody held it), but its deals still credit to the seat, so "unfilled seats with revenue" still reports correctly.
- A **new hire** is prorated from their start date automatically. Ramped quotas — a deliberately reduced target for the first months, over and above proration — remain a per-seat, per-period override that fits this table without changes; it just needs a UI later.

**Manager seats need quota rows too**

This follows from two rules stated elsewhere and is easy to miss when setting up.

Rollup credits land on the *manager's* seat (`CREDIT.position_id` is the manager's seat, not the rep's). And a seat with credits but no quota row for the measure is an exception that stops the run. Put together: **every manager seat needs a quota row for every rollup measure their component uses.** Set up an RSM plan with a `pct_to_goal` override component and forget the RSM's quota, and the first calculation run fails — which is the correct outcome, but only if you know why.

How the manager's quota is usually set: the sum of the quotas of the seats reporting to them in that period, sometimes with an uplift. The engine does not derive this automatically, and shouldn't — a manager's target is a commercial decision, not arithmetic, and companies routinely set it above or below the sum. But the quota-loading screen should *offer* the rolled-up sum as a default, because typing it by hand is how it ends up stale after a re-org.

The alternative, and a legitimate one for v1: make the manager override component `flat` — a straight percentage of rollup credit with no quota and no attainment. Many companies pay managers this way. If you do that, no manager quota is needed at all. The choice is per plan; what must not happen is a `pct_to_goal` manager component with no quota behind it.

**Rules to enforce**

1. One row per seat + measure + period. Duplicates make attainment wrong in a way no one notices.
2. Quota amount must be greater than zero. A zero quota isn't "no quota", it's a divide-by-zero.
3. A measure window with no quota row for a seat that has credits is an exception, never a silent zero. This applies to manager seats and rollup measures exactly as it does to rep seats.
4. Quota rows are audit-logged, with a reason. "Who lowered this quota and when" is a question that will be asked.

---

### Table 14: RATE_TABLE

**In plain words:** the header for a lookup grid that turns attainment into money. It says what *kind* of grid it is; the actual rows are in `RATE_TABLE_BAND`.

**Two kinds of grid — rate table vs pay curve**

Both are "attainment in, something out." They differ in what comes out:

- **Rate table** (`mode = rate`): attainment band → a **percentage applied to the credit amount**. "Between 0–100% attainment, pay 8% of bookings. Above 100%, pay 12%." Output is a rate; the engine multiplies it by the credits.
- **Pay curve** (`mode = pct_of_target`): attainment → a **percentage of the rep's target incentive**. "At 100% attainment you get 100% of your variable pay. At 120% you get 150% of it." Output is a share of target; the engine multiplies it by the person's `target_incentive` from `PAYEE_POSITION_ASSIGNMENT`, prorated over the window the same way quota is. No rate, no per-deal amount.

Same table structure, one flag. Most plans use rate tables for deal-based commission and pay curves for quota-based bonuses.

**Two ways to apply the bands — marginal vs cliff**

When a rep crosses from one band into the next, which rate applies to what?

Example: quota ₹1 crore, rep books ₹1.2 crore, bands are 0–100% → 8%, 100%+ → 12%.

- **Marginal** (`tiering = marginal`): first ₹1 crore at 8% = ₹8 lakh; the ₹20 lakh above quota at 12% = ₹2.4 lakh. Total ₹10.4 lakh. Like income tax slabs.
- **Cliff** (`tiering = cliff`): the rep is in the 100%+ band, so *all* ₹1.2 crore pays 12% = ₹14.4 lakh.

Cliff is simpler to explain and gives a big push to cross the line. Marginal is smoother and cheaper for the company. Both are common, often in the same company on different plans. The flag on this table decides, per rate table.

**How it helps day to day**

- Change the accelerator rate for next year → new rate table, point next year's plan at it. This year's untouched.
- Simulator: "what would I earn under the proposed FY27 table?" is just running the engine with a different `rate_table_id`.
- Because bands are data, the AI plan explainer can turn them into plain sentences without anyone writing them.

**The fields**

| Field | What it means | Example |
|---|---|---|
| `rate_table_id` | Stable ID. | `RT-AE-STD-FY26` |
| `name` | Display label. | AE Standard Rates FY26 |
| `mode` | `rate` (output is a % of credit) or `pct_of_target` (output is a % of target incentive). | rate |
| `tiering` | `marginal` or `cliff`. Ignored for flat single-band tables. | marginal |

**A flat rate is just a one-band table.** "Renewals pay 3%" is a rate table with one band, 0% to infinity, value 3. No special case in the engine.

---

### Table 15: RATE_TABLE_BAND

**In plain words:** the rows of the grid. "From 0% to 100% attainment, the value is 8."

**Why it's a table of its own**

Because grids have a variable number of rows. One plan has two bands, another has five. Rows in a child table handle that; columns in the parent would not.

**The fields**

| Field | What it means | Example |
|---|---|---|
| `band_id` | Row ID. | `RTB-00071` |
| `rate_table_id` | Which grid this row belongs to. | `RT-AE-STD-FY26` |
| `from_pct` | Lower edge of the band, inclusive. | 100 |
| `to_pct` | Upper edge, exclusive. Blank means "and above". | blank |
| `value` | The output. A rate (8 = 8%) if the table's mode is `rate`; a share of target (150 = 150%) if `pct_of_target`. | 12 |

**A complete example — the AE standard table**

| from_pct | to_pct | value |
|---|---|---|
| 0 | 100 | 8 |
| 100 | 150 | 12 |
| 150 | blank | 15 |

Read as: 8% up to quota, 12% from quota to 1.5× quota, 15% beyond that. With `tiering = marginal`, a rep at 160% pays 8% on the first slab, 12% on the second, 15% on the top slab.

**Rules to enforce**

1. Bands don't overlap and don't have gaps. `to_pct` of one row equals `from_pct` of the next. Pre-check refuses to save otherwise.
2. First band starts at 0. Last band has a blank `to_pct`.
3. Bands are edited only on `draft` rate tables. Once a table is used by an active plan, changes mean a new table — same rule as plans, for the same reason.

---

### Phase 3 — what you have now

Seventeen tables. A comp plan is now fully expressed as data:

- **who** it applies to → `PLAN_ASSIGNMENT`
- **when** → `PLAN` dates and version
- **which deals count, how much, and to whom** → `CREDIT_RULE`
- **what is measured and over what window** → `ATTAINMENT_MEASURE`
- **against what target** → `QUOTA`
- **what that earns** → `RATE_TABLE` + `RATE_TABLE_BAND`
- **as separate lines on a statement** → `PLAN_COMPONENT`

Not a single rupee has been calculated. Everything so far is setup. Phase 4 is the engine that reads all seventeen tables and produces the output tables — credits, measure results, earnings, statements — that people actually get paid from.

---

## Phase 4 — The calculation

Everything so far is setup. Phase 4 is the engine: one process that reads the seventeen setup tables and produces the tables people get paid from.

### The big picture first

The engine is a pipeline. Each step reads the previous step's table and writes the next one:

```
TRANSACTION  →  CREDIT  →  MEASURE_RESULT  →  EARNING  →  STATEMENT
 (what sold)   (who gets    (how far along    (what that    (the payslip
                recognised)  vs quota)         earns)        line items)
```

Four rules govern the whole thing:

1. **It runs as a batch, not live.** An admin presses "Calculate March" (or a schedule does). It runs for a few seconds or minutes, then shows results. Nobody's pay changes the moment a deal closes.
2. **Every run is recorded.** Each run gets a `run_id`, and every row it produces carries that ID. You can always ask "what did run 47 say?"
3. **Recalculating means starting over for that period.** The engine does not try to patch the last run. It marks the old run's rows as superseded and produces a fresh set. Same inputs → same outputs, every time. This is why late deals, corrected quotas and fixed seat assignments all "just work" — you rerun.
4. **Locked periods are read-only.** Once March is locked, March's credits and earnings are never regenerated. They become inputs to April (for QTD/YTD and true-up).

*Xactly equivalent: the "Calculate" job, with Credits, Measures (called "Results" in some screens), Earnings and Payments as the output objects. Same shape.*

---

### Table 16: CALCULATION_RUN

**In plain words:** the log of every time the engine ran. One row per run: which period, who started it, when, how it went.

**Why it's a table of its own**

Because "which numbers are current?" needs an answer. If March was calculated four times as late deals came in, there are four sets of March credits in the database. This table says which one is live and which three are history. It's also where you go when someone asks "why did my March number change on the 18th?" — there's a run on the 18th, and its scope tells you what changed.

**The fields**

| Field | What it means | Example |
|---|---|---|
| `run_id` | Stable ID. | `RUN-000047` |
| `period_id` | Which period was calculated. | `2026-M03` |
| `scope` | What was included. Usually "everything in the period"; can be narrowed to one plan or a list of seats for a quick check. | `{all: true}` |
| `status` | `running`, `succeeded`, `failed`, `superseded`. | succeeded |
| `started_by` | Who pressed the button (or "schedule"). | EMP-00009 |
| `started_at` | Timestamp. | 2026-04-02 09:14 |
| `superseded_by` | If a later run replaced this one, its ID. Blank = this run is current. | blank |
| `stats` | Counts for the summary screen: transactions read, credits made, earnings made, exceptions. | `{txns: 412, credits: 587, earnings: 231, exceptions: 3}` |
| `dry_run` | If yes, no output rows were written — this was the simulator, and only this run row survives. | no |

---

### The six passes

Here is what happens between pressing "Calculate March" and seeing statements. Priya (seat West-AE-03, AE plan, ₹3 crore Q1 quota, marginal rate table 8% / 12% / 15%) is the running example.

**Pass 1 — Validate.** Before touching anything, check that the run *can* succeed:
- every March transaction has a seat, that seat had a title on the close date, and it had a person on the close date
- every seat resolves to exactly one active plan for the close date
- every `pct_to_goal` component has a quota row for its measure and period — **including manager seats receiving rollup credit**
- every credit type written by a rule is read by some measure or component in the same plan
- no `pct_to_goal` or `pay_curve` component has a `pay_trigger` other than `close`
- every rate table's bands are gap-free
- the period is `open`
- **every earlier period inside the same measure windows has a current successful run** — without this, true-up has nothing to subtract and pays those periods twice
- every transaction has an `amount_base` (i.e. an FX rate was found at import)

Anything wrong goes to an exceptions list and the run stops. Better to fix three things and rerun than to pay 200 people on a broken setup.

**Pass 2 — Resolve.** For each transaction whose `incentive_date` falls in March, work out: which person was in the seat on the **close date**, what that seat's title was on the close date, and which plan version applied then. This is where the effective dates from phases 1 and 3 do their job. Priya's 14 March deal → Priya, seat West-AE-03, title AE, FY26 AE Plan v2.

Note the split: the run is *selected* by `incentive_date` (what pays this month) and *interpreted* by `close_date` (the rules and people in force when the deal happened). That is what lets a late March deal pay in May under March's plan.

**Pass 3 — Credit.** Run every credit rule in that plan against the transaction. All matching rules fire; `add` rules stack, an `override` rule replaces them for its credit type. Priya's ₹10 lakh Enterprise deal fires "Standard booking" (100% NEW_BOOKING), "Enterprise uplift" (+50% NEW_BOOKING) and "Manager rollup" (100% MGR_ROLLUP, rollup = yes, levels 1). Result: ₹15 lakh of NEW_BOOKING credit to Priya, and — after walking `POSITION_HIERARCHY` up one step as of 14 March — ₹10 lakh of MGR_ROLLUP credit to whoever sat in the West RSM seat that day. A rule with `rollup_levels = 2` walks two steps instead; `all` writes one credit per seat in the chain, bounded by the depth cap and visited-seat guard described under `CREDIT_RULE`. → writes `CREDIT`

**Pass 4 — Measure.** For each person and each measure they're on, add up the relevant credits over the measure's window, work out the prorated quota for that window, and divide. Where the component holds on invoice or collection, only credits whose trigger has fired are summed — this is where holding happens for quota-based pay, rather than at earning time.

Priya's `M-QTR-BOOKINGS` is QTD, so it sums her NEW_BOOKING credits from January (locked, read from run history), February (locked) and March (just created): say ₹3.3 crore.

Quota is built from the seats she actually held inside the window. If she was in West-AE-03 for all 90 days, that's West's full ₹3 crore. If she moved to East-AE-01 on 15 February, it's 45/90 of West's ₹3 crore plus 45/90 of East's ₹2 crore = ₹2.5 crore. Attainment is credits ÷ prorated quota — 110% in the first case, 132% in the second, and in both cases the day counts are written to the result so the number can be explained without re-deriving it. → writes `MEASURE_RESULT`

**Pass 5 — Earn.** For each person and each plan component:
- `flat`: rate × each credit, one earning per credit.
- `pct_to_goal`: find the band for the attainment, apply marginal or cliff to compute **earned-to-date** for the whole window, subtract **previously paid** — the sum of earnings for the same `component_key` in every earlier period of that window — and pay the difference.
- `pay_curve`: curve value at attainment × prorated target incentive, same true-up.
- `draw`: compare commission earned this period against the component's guarantee; if commission falls short, top it up and record the shortfall in `DRAW_BALANCE`.

Then apply the component's cap, if it has one, and the pay trigger. On `flat` components, an earning whose trigger hasn't fired is written with `hold_status = held` and stays out of the statement until it does. Quota-based components never hold at this stage — their trigger was already applied in pass 4, by excluding uncollected credits from the measure.

Finally, check the true-up direction. If `earned_to_date` came out below `previously_paid`, establish whether a transaction in the window changed since the prior run. If it did, the negative stands as a claw-back. If nothing in the data moved, the shortfall came from a configuration change: clamp `amount` to zero, record `clamped_amount` and `clamp_reason`, and raise an exception for a human.

Priya at 110%, marginal: first ₹3 crore at 8% = ₹24 lakh, next ₹30 lakh at 12% = ₹3.6 lakh, earned-to-date ₹27.6 lakh. Already paid Jan + Feb under the same component key: ₹19.2 lakh. **March earning: ₹8.4 lakh.** → writes `EARNING`, with a `trace` recording every number above.

**Pass 6 — Statement.** Group each person's **payable** earnings into one statement per period, status `draft`. Held earnings are shown on the rep's dashboard as earned-but-not-yet-payable and join a statement in the period their trigger fires. Admin reviews, releases; reps see it; the payroll file exports from it. → writes `STATEMENT`

**Simulator = the same six passes with `dry_run = yes`** and a made-up transaction added in. It returns the earning and the trace and writes nothing. Because it's the same code, it can never disagree with the real calculation — which is a known weakness of Xactly's separate Illustrator tool.

---

### Table 17: CREDIT

**In plain words:** recognition. "₹15 lakh of NEW_BOOKING credit to Priya, from deal TXN-000982, because of rule 'Enterprise uplift'." Not money yet.

**Why it's a table of its own**

It's the bridge between one deal and the totals that decide the rate. Storing credits (rather than computing them on the fly) means the deal breakdown screen, the manager rollup view and the attainment gauge all read the same numbers, and a dispute can point at one credit row and ask "why does this exist?"

**The fields**

| Field | What it means | Example |
|---|---|---|
| `credit_id` | Row ID. | `CRD-004410` |
| `run_id` | Which run made it. | `RUN-000047` |
| `transaction_id` | The deal it came from. | `TXN-000982` |
| `employee_id` | Who gets it. Resolved in pass 2 from seat + date. | `EMP-00412` |
| `position_id` | The seat it belongs to (the rep's seat, or the manager's seat for rollups). | `POS-W-AE-03` |
| `credit_rule_id` | Which rule fired. | `CR-AE-ENT-UPLIFT` |
| `credit_type` | The bucket. | NEW_BOOKING |
| `amount` | Deal amount in base currency × split %. Everything from here on is single-currency. | 500000 |
| `source_credit_id` | For rollup credits: the rep's credit this was rolled up from. Blank for direct credits. | blank |
| `rollup_level` | For rollup credits: how many steps up the hierarchy this one came from. Lets a VP and an RSM credit on the same deal be told apart. | blank |

One transaction usually produces several credit rows (one per rule that fired, plus rollups). That's expected.

---

### Table 18: MEASURE_RESULT

**In plain words:** the scoreboard reading. "Priya, quarterly bookings, as of March: ₹3.3 crore against ₹3 crore, 110%."

**Why it's a table of its own**

It's the number the rate lookup depends on, and the number reps look at most. Storing it per run means the dashboard is a simple read, the earning trace can reference it, and you can chart how attainment moved run over run.

**The fields**

| Field | What it means | Example |
|---|---|---|
| `result_id` | Row ID. | `MR-001203` |
| `run_id` | Which run. | `RUN-000047` |
| `employee_id` | Whose. | `EMP-00412` |
| `position_id` | Which seat's quota was used. | `POS-W-AE-03` |
| `measure_id` | Which scoreboard. | `M-QTR-BOOKINGS` |
| `period_id` | As of which period. | `2026-M03` |
| `credit_total` | Sum of credits in the window. | 33000000 |
| `quota_raw` | The full-period quota rows the window drew on, before proration. | 30000000 |
| `quota` | The prorated quota actually used — each seat's quota weighted by days held in the window. | 25000000 |
| `proration_basis` | The working: seats, day counts, window length. Makes the prorated number explainable on the dashboard without re-deriving it. | `{POS-W-AE-03: 45/90, POS-E-AE-01: 45/90}` |
| `attainment_pct` | credit_total ÷ quota × 100, using the prorated quota. | 132 |

Both quota figures are stored, not just the one used. When a rep asks why their target looks smaller than the number in their plan document, the answer is on the row: here is the full quota, here are the days you held each seat, here is what that comes to.

---

### Table 19: EARNING

**In plain words:** money. "Priya, New Bookings Commission, March: ₹8.4 lakh." The line items that add up to a statement.

**Why it's a table of its own, and why it carries so much**

This is the row a rep disputes and the row finance audits. So it stores not just the amount but *how* it was arrived at: earned-to-date, already paid, band hit, rate applied, and a full `trace`. Six months later, with a different rate table live and Priya in a different seat, anyone can open this row and see exactly why it says ₹8.4 lakh.

**The fields**

| Field | What it means | Example |
|---|---|---|
| `earning_id` | Row ID. | `ERN-002917` |
| `run_id` | Which run. | `RUN-000047` |
| `employee_id` | Who. | `EMP-00412` |
| `component_id` | Which plan component (= which statement line). | `PC-AE-NEWBOOK` |
| `period_id` | Which period it's paid in. | `2026-M03` |
| `component_key` | The version-independent component ID, copied here because it is what true-up matches on. | `AE-NEWBOOK` |
| `credit_id` | For `flat` components: the single credit this pays. Blank for `pct_to_goal` and `pay_curve`, which pay on a total, not a deal. | blank |
| `result_id` | For `pct_to_goal` / `pay_curve`: the measure result that set the rate. | `MR-001203` |
| `earned_to_date` | Total earned over the measure's window at today's attainment, after any cap. | 2760000 |
| `uncapped_earned_to_date` | What it would have been with no cap. Equal to `earned_to_date` when uncapped. | 2760000 |
| `cap_applied` | Which cap bit, if any: `pct`, `amount`, or blank. Shown on the statement so a capped line is never a silent one. | blank |
| `previously_paid` | Sum of earnings with the same `component_key`, for this person, in **every earlier period of the window** — not only locked ones, and not only under the same plan version. | 1920000 |
| `amount` | What is paid this period: earned_to_date − previously_paid. Can be negative when a data change causes a genuine claw-back. | 840000 |
| `clamped_amount` | Set only when a negative was suppressed because it came from a configuration change rather than a data change: the true figure, held for a human decision. Blank normally. | blank |
| `clamp_reason` | Which configuration change caused it, linked to the audit log entry. Blank normally. | blank |
| `rate_applied` | The effective rate (for the statement's "rate" column). | 9.2 |
| `band_hit` | Which band the attainment landed in. | 100–150 |
| `hold_status` | `payable` (goes on this period's statement) or `held` (earned, waiting on the component's `pay_trigger`). | payable |
| `payable_period_id` | The period this will be paid in. Same as `period_id` unless it is held. | `2026-M03` |
| `trace` | The full working: credits included, slabs, rates, cap, prior payments and the runs they came from. Powers the deal-level breakdown. | `{...}` |

**Why `previously_paid` is defined the way it is.** Two words in that definition are doing real work. *Every earlier period*, rather than every locked period, because a month that has been calculated but not yet locked has still produced earnings — skipping it would pay the same money twice inside the next month's true-up. *Same `component_key`*, rather than same component, because a plan re-version mid-quarter creates new component rows and prior payments would otherwise become invisible, with the same result. Both are cheap to enforce and impossible to spot afterwards on a statement that looks perfectly plausible.

**About negative amounts.** If a reversal drops Priya below the accelerator in April, `earned_to_date` falls, `previously_paid` doesn't, and `amount` goes negative. That's a claw-back, and it's correct. Whether it's actually deducted from pay or carried forward is a payroll policy; the engine just reports the true number.

**But not every negative is legitimate — the data-versus-config rule**

There are two ways `earned_to_date` can fall below `previously_paid`, and only one of them is a claw-back.

- **Data changed.** A deal was reversed, an amount corrected, a mis-credited deal removed. The rep was paid on business that turned out not to exist. Recovering it is right, and the rep can be shown exactly which deal caused it.
- **Configuration changed.** Someone lowered `cap_pct` from 250 to 200, cut a quota, or edited a rate table, mid-window. The deals are all still real and still closed. The rep earned that money under the terms in force at the time, and the company has now changed the terms retroactively and taken it back.

The second is not a claw-back; it is a retroactive pay cut, and if the engine produces it silently the first anyone hears of it is a rep looking at a negative statement line.

**The rule the engine applies:** when `earned_to_date < previously_paid`, the engine checks whether any transaction in the window changed since the run that produced those prior earnings.

- If transactions changed → the negative stands. Normal claw-back, traced to the deals.
- If no transaction changed → the shortfall is config-driven. The engine clamps `amount` to zero, writes `clamped_amount` with the true negative figure and `clamp_reason` naming the configuration change, and raises an exception on the run. It does not pay the negative and it does not silently swallow it either. A human decides whether to apply it, and that decision is audit-logged with a reason.
- If both changed → treat as config-driven and escalate. The safe default when the cause is mixed is to stop rather than guess.

Two fields carry this: `clamped_amount` (what the true-up would have been) and `clamp_reason` (which config change, from `AUDIT_LOG`). Both blank in the normal case.

**The cheaper prevention, which should also be enforced:** caps, quotas and rate tables on an *active* plan are not editable at all — changing one means a new plan version, effective from a date. A version dated from the start of an open window can still produce this situation, so the rule above is still needed; but versioning makes the common case impossible rather than merely detected.

---

### Table 19b: DRAW_BALANCE

**In plain words:** the running record of guaranteed money paid out and how much of it has been earned back. "Priya was guaranteed ₹2 lakh a month for her first quarter; she has been topped up ₹3.1 lakh in total and has recovered ₹1.4 lakh of it so far."

**What this solves**

Almost every company that hires sales people offers some form of guarantee — a draw for a new rep's ramp, a floor during a territory transition, a minimum while a plan is being redesigned. Without somewhere to record it, guarantees get paid outside the system as one-off payroll instructions, which means the statement doesn't tie to what the person was actually paid, and a recoverable draw is recovered from memory or not at all.

Modelling it as a component plus this balance keeps the guarantee inside the same engine: it shows on the statement, it is traceable, and recovery happens automatically the moment commission exceeds the floor.

**How it works**

The plan has a component with `calc_type = draw`, a `draw_amount`, and `draw_recoverable`. Each period, the engine compares commission earned against the guarantee:

- Commission ₹1.2 lakh, guarantee ₹2 lakh → pay a ₹80,000 top-up, and if recoverable, add ₹80,000 to the outstanding balance.
- Commission ₹3 lakh, guarantee ₹2 lakh, outstanding balance ₹80,000 → pay ₹3 lakh minus the recovery. How much is recovered per period is a policy choice (all of it, or a capped share); store the choice on the component and the effect here.
- Non-recoverable guarantees write the top-up and never a balance.

**The fields**

| Field | What it means | Example |
|---|---|---|
| `draw_id` | Row ID. | `DRW-000318` |
| `employee_id` | Whose. | `EMP-00412` |
| `component_key` | Which guarantee — a person can have more than one over time. | `AE-RAMP-DRAW` |
| `period_id` | Which period this row covers. | `2026-M03` |
| `guarantee` | The floor for the period. | 200000 |
| `commission_earned` | What the plan actually earned before the guarantee. | 120000 |
| `topped_up` | What the guarantee added. | 80000 |
| `recovered` | What was recovered from this period's commission. | 0 |
| `balance_outstanding` | Running recoverable balance after this period. | 310000 |

**Rules to enforce**

1. An outstanding balance never survives termination silently — write-off is a deliberate, logged decision, because it is real money the company is choosing not to reclaim.
2. Recovery never takes a statement negative unless policy says it can. Carry the balance instead.
3. The top-up appears as its own statement line, labelled as a guarantee. A rep should always be able to see which part of their pay was commission and which part was the floor.

---

### Table 20: STATEMENT

**In plain words:** the comp payslip. One per person per period, listing their earnings, with a total and a status that tracks it from draft to paid.

**Why it's a table of its own**

Earnings are the engine's output; the statement is the *human* artefact — reviewed by admin, released to the rep, acknowledged by the rep, exported to payroll. Those are workflow states, and they live here, not on the individual earnings.

**The fields**

| Field | What it means | Example |
|---|---|---|
| `statement_id` | Row ID. | `STM-000871` |
| `run_id` | Which run produced it. | `RUN-000047` |
| `employee_id` | Whose. | `EMP-00412` |
| `period_id` | Which period. | `2026-M03` |
| `total` | Sum of its **payable** earnings. | 852000 |
| `held_total` | Sum of earnings earned this period but not yet payable, shown for information. | 0 |
| `status` | `draft` → `released` → `acknowledged` → `paid`. | released |
| `released_at` | When the rep could see it. | 2026-04-03 |
| `export_batch_id` | Which payroll export carried it. Blank until exported. | `PEX-000012` |

The rep dashboard is this table plus its earnings plus the measure results. The payroll export is all `released` statements for a period, employee ID and total, one line each.

---

### Table 20b: PAYROLL_EXPORT

**In plain words:** the record of each payroll file that left the system. "Batch PEX-000012, March 2026, 214 statements, ₹1.84 crore, generated by the comp admin on 5 April, approved by finance on 6 April."

**What this solves**

`STATEMENT.status` can reach `paid`, but on its own it doesn't say *which* payroll run paid it, when, or who approved the file. That is the first reconciliation finance performs every month — payroll file total against comp system total — and it is the last artefact an auditor asks for. Recording the batch turns it from an email attachment somebody has to find into a row you can open.

It also makes double-payment visible: a statement that already carries an `export_batch_id` cannot quietly appear in a second file.

**The fields**

| Field | What it means | Example |
|---|---|---|
| `export_batch_id` | Row ID. | `PEX-000012` |
| `period_id` | Which period was paid. | `2026-M03` |
| `statement_count` | How many statements are in it. | 214 |
| `total` | The file total, in base currency. | 18400000 |
| `generated_by`, `generated_at` | Who produced the file and when. | EMP-00009 / 2026-04-05 |
| `approved_by`, `approved_at` | Finance sign-off. Blank until approved. | EMP-00021 / 2026-04-06 |
| `file_ref` | Where the exact file that was sent is stored. | `s3://…/PEX-000012.csv` |

**Rules to enforce**

1. A statement can belong to exactly one export batch. Re-exporting a corrected period creates a new batch that carries only the statements not already in one, plus explicit adjustments.
2. No file is sent before `approved_by` is set. This is the separation-of-duties control from phase 5, made concrete.
3. The file that was actually sent is stored, unchanged. Regenerating it later from live data proves nothing.

---

### Phase 4 — what you have now

Twenty-four tables and an engine. You can load an org, load deals, define a plan, press Calculate, and hand payroll a file that finance can reconcile. Every number on every statement can be traced back through earning → measure result → credits → transaction → the Salesforce line it came from, and the rules, people, titles and rates that were in force that day.

What's not yet here is the layer that makes finance comfortable signing off: who changed what, how disputes are handled, who can see whose numbers, and how people get told. That's phase 5.

---

## Phase 5 — Trust and controls

Phases 1–4 produce correct numbers. Phase 5 is what lets finance, reps and auditors *believe* them.

Almost nothing here is new calculation. It is the layer that answers four questions a correct engine can't answer on its own:

| Question | Answered by |
|---|---|
| Who changed what, and when? | `AUDIT_LOG` |
| What happens when a rep disagrees? | `DISPUTE` |
| Who is allowed to see what? | RBAC rules + hierarchy filter |
| How does anyone find out? | Notification events + `NOTIFICATION_LOG` |

And one more that ties them together: **once a period is closed, how do we prove it stayed closed?** That's the control loop at the end of this phase.

A useful test for everything below: if a rep, a CFO and an external auditor each asked "prove it", could you, without opening a database console? Phase 5 is what turns "yes" into a screen.

---

### Table 21: AUDIT_LOG

**In plain words:** a diary of every change to every setup table. "On 12 March at 14:02, EMP-00009 changed the Q2 quota on seat West-AE-03 from ₹3 crore to ₹2.5 crore, reason: territory re-cut per CRO email."

**Why it's a table of its own**

Because the setup tables hold the *current* truth, and they hold it by design — `QUOTA` tells you Priya's quota is ₹2.5 crore, not that it used to be ₹3 crore. Effective dating covers changes that are meant to happen (a plan version, a new seat assignment). It does not cover changes that were mistakes, or changes someone made quietly.

When a rep's April number drops and the reason is a quota edit, this is the only place that shows who made the edit, when, and what it was before. Auditors ask for exactly this. So does the rep.

It also protects the team. "Nobody touched the rate table" is a claim. An empty audit log for that table over the period in question is proof.

**How it helps day to day**

- Priya's attainment falls from 104% to 92% between two runs. Nothing about her deals changed. One query on `object_type = QUOTA, record_id = Q-00219` shows the edit and the person — a 30-second answer instead of a two-day investigation.
- Finance asks in the year-end review: "who has been changing rate tables?" One filter, one list.
- A dispute is resolved by "correcting" a transaction's segment. Six months later someone asks whether that correction was legitimate. The log has the before value, the actor and the stated reason.
- An admin swears they released March statements on the 3rd. The log says the 7th. The log wins.

**What gets logged**

Everything a human (or an integration acting on a human's behalf) can change:

- every insert, update and end-date on the phase 1 and phase 3 setup tables — `PAYEE`, `TITLE`, `POSITION`, `POSITION_ATTRIBUTE`, `PAYEE_POSITION_ASSIGNMENT`, `POSITION_HIERARCHY`, `PERIOD`, `FX_RATE`, `PLAN`, `PLAN_ASSIGNMENT`, `PLAN_COMPONENT`, `CREDIT_RULE`, `ATTAINMENT_MEASURE`, `QUOTA`, `RATE_TABLE`, `RATE_TABLE_BAND`
- every manual edit to a `TRANSACTION` (segment corrections, seat reassignment, exclusions) — these are rare and they move money, so they matter most
- every period `lock` and `unlock`
- every statement status change: `release`, `acknowledge`, `mark_paid`
- every payroll export generated and approved, and every draw write-off
- every dispute action: raise, assign, resolve, reject, reopen
- every RBAC change: role granted, role revoked

**What is deliberately not logged**

The engine's output tables — `CREDIT`, `MEASURE_RESULT`, `EARNING`, `STATEMENT` rows themselves. They are never hand-edited; they are regenerated wholesale, and `CALCULATION_RUN` already records every run with its scope, actor, timestamp and stats. Row-by-row logging of engine output would triple storage to record something already recorded once. The two tables together are the full history: `AUDIT_LOG` for *inputs*, `CALCULATION_RUN` for *outputs*.

**The fields**

| Field | What it means | Example |
|---|---|---|
| `log_id` | Row ID. | `LOG-019340` |
| `object_type` | Which table. | QUOTA |
| `record_id` | Which row in it. | `Q-00219` |
| `action` | `create`, `update`, `end_date`, `lock`, `unlock`, `release`, `acknowledge`, `mark_paid`, `grant_role`, `revoke_role` | update |
| `before` | The row as it was, as JSON. Blank on create. | `{amount: 30000000}` |
| `after` | The row as it is now. Blank on a hard delete, which shouldn't happen. | `{amount: 25000000}` |
| `actor` | Who did it. An `employee_id`, or a system actor: `salesforce-sync`, `workday-sync`, `schedule`. | EMP-00009 |
| `actor_role` | The role they were acting under at the time. Roles change; this freezes it. | Comp Admin |
| `timestamp` | When, to the second, in one timezone (store UTC, display IST). | 2026-03-12 14:02 |
| `reason` | Free text. Optional in general, **mandatory** on the sensitive actions listed below. | Territory re-cut per CRO email |
| `period_id` | Which period the change affects, where it can be worked out. Makes "show me everything that touched March" a single filter. | `2026-M03` |

**Sensitive actions that force a reason**

Editing a `QUOTA` on an active period, editing any `RATE_TABLE_BAND` or `FX_RATE`, unlocking a period, editing a `TRANSACTION` amount or segment, writing off a draw balance, and revoking a role. Everything else takes an optional note.

This is a small piece of friction placed exactly where friction is useful. It costs an admin eight seconds and it turns an unexplained change into an explained one.

**Rules to enforce**

1. **Append-only.** Rows here are never edited or deleted, by anyone, including admins, including the person who built the system. An audit log you can change is not an audit log — it's a table.
2. **Written by the platform, not by the developer.** The log write happens on the save path itself, not as a step someone remembers to add. If any save route exists that skips the log, the log is worthless for every route, because you can no longer say "if it isn't here, it didn't happen."
3. **Retention outlives the plan year.** Seven years is the usual finance answer in India; confirm with your finance lead and set it once. Archive, never purge.
4. **`before` and `after` store values, not diffs.** Diffs are computed at read time for display. Storing the whole row means the log still reads correctly after a schema change.
5. **System actors are named, not blank.** "salesforce-sync" is an answer. An empty actor field is a bug that looks like a cover-up.

*Xactly equivalent: the audit trail on setup objects, plus "Change History" on quotas and rate tables. Same idea, one table instead of several.*

---

### Table 22: DISPUTE

**In plain words:** the ticket a rep raises when they think a number is wrong. "My March statement shows ₹8.52 lakh but the Acme deal should have been credited at the Enterprise rate." Tracked from raised to resolved, with the outcome visible to the rep.

**Why it's a table of its own**

Because today this happens over email and Slack. It gets lost, the admin can't remember whether it was answered, and the rep asks again next month with more irritation. Three of these a month is noise; thirty is a comp team that has lost the room.

A dispute record does four things a thread can't: it points at the exact `earning_id` or `credit_id` in question, it has an owner and a status, it records the outcome in language the rep can read, and — when it's resolved by fixing data — it links to the rerun that fixed it. The comp admin's queue becomes a list with a length, not an inbox.

**How it helps day to day**

- The admin opens a queue sorted by age, not a mailbox sorted by whoever shouted last.
- Most disputes die in a minute, because the earning's `trace` already answers them: here is the deal, here is the credit rule that fired, here is the band you were in. The admin pastes the explanation and closes it.
- At quarter end you can answer "how many disputes, on what, resolved in how long" — which is the fastest way to find a badly written plan clause. Twelve disputes on the same component is not a rep problem.

**How a dispute flows**

1. **Raised.** Priya opens her March statement, clicks the Acme line, clicks "Dispute". The record is created pointing at that `earning_id`. If her complaint is "this deal isn't on my statement at all", she raises it from the deal search instead and it points at a `transaction_id` with no earning. Status `open`.
2. **Triaged.** It lands with the comp admin. (Optionally with her manager first, if you want a filter — configuration, not a schema change.) Assignee set, status `in_review`.
3. **Investigated.** The admin uses `EARNING.trace` → `CREDIT` → `TRANSACTION`. Two outcomes:
   - **Rejected** — the number is right. The admin writes the explanation in `resolution`; Priya sees it on the statement line. Status `rejected`.
   - **Accepted** — the data was wrong: mis-tagged segment, wrong seat on the close date, missing quota row, a deal that never imported. The admin fixes the *input*, reruns the period, and links the run. Status `resolved`.
4. **Closed.** Priya is notified either way, with the explanation. She may reopen once, with a comment (status `reopened`); after that it escalates to her manager and the comp lead rather than ping-ponging.

**The one design choice that matters here**

**A dispute never changes a number directly.** There is no "adjust this earning by ₹40,000" button. Accepting a dispute means correcting the input and recalculating.

Three reasons, in order of importance:

- The fix is auditable — the correction shows up in `AUDIT_LOG` and the new number in a run, rather than appearing from nowhere.
- The fix applies consistently — if Acme was mis-segmented, it was mis-segmented for everyone credited on it, including Priya's manager's rollup. Fixing the source fixes all of them; a manual override fixes one and leaves the ledger inconsistent.
- It keeps the engine's promise intact: same inputs → same outputs. The moment manual overrides exist, that stops being true, and every reconciliation afterwards has to account for a list of exceptions someone maintains by hand. This is the specific door through which comp tools become untrusted, and it is worth being unpopular about in month one.

If a genuinely un-modellable payment is needed — a one-off spiff, a guarantee, a goodwill payment — it belongs as a plan component or a manual `EARNING` of its own type, created deliberately and logged, not as a silent edit to a calculated line.

**The fields**

| Field | What it means | Example |
|---|---|---|
| `dispute_id` | Row ID. | `DSP-000112` |
| `employee_id` | Who raised it. | `EMP-00412` |
| `period_id` | Which period it concerns. Drives SLA reporting and "can this still be fixed?" | `2026-M03` |
| `earning_id` | The line being disputed. Blank if the complaint is a missing credit. | `ERN-002917` |
| `credit_id` | The credit being disputed, if it's about crediting rather than money. | blank |
| `transaction_id` | The deal in question, if the rep is saying "this deal wasn't counted at all". | `TXN-000982` |
| `category` | Picked from a short list: `missing_deal`, `wrong_credit`, `wrong_rate`, `wrong_quota`, `wrong_amount`, `other`. This is what makes the quarterly pattern visible. | wrong_credit |
| `reason` | The rep's explanation, in their words. | Acme should be Enterprise segment |
| `status` | `open` → `in_review` → `resolved` / `rejected` → `reopened`. | resolved |
| `assignee` | Who is handling it. | EMP-00009 |
| `resolution` | The admin's explanation, shown to the rep verbatim. Mandatory on both resolve and reject. | Segment corrected in SF and re-imported; fixed in run 48 |
| `resolved_by_run_id` | The run that produced the corrected number, if any. | `RUN-000048` |
| `created_at`, `resolved_at` | Timestamps. Their difference is the only SLA metric you need at first. | … |

**What deliberately isn't here**

An `adjustment_amount` field. Its absence is the policy above, made structural. If the field doesn't exist, nobody can be pressured into using it at 9pm on payroll day.

**Rules to enforce**

1. A rep can only raise a dispute against their own `employee_id`. Managers comment; they don't raise on someone's behalf.
2. Disputes can be raised against a `locked` period — the complaint is valid even when the fix must land as a true-up in the next open period. Locking stops recalculation, not conversation.
3. `resolution` is mandatory on close. "Rejected" with no text is how a comp team loses trust in one message.
4. Every status change writes to `AUDIT_LOG`.

*Xactly equivalent: Inquiries / Dispute Management. The rule about no direct adjustments is stricter than most implementations, and deliberately so.*

---

### Table 23: NOTIFICATION_LOG

**In plain words:** a record of every message the system sent — what it was, to whom, when, and whether it actually left. So that "I never got the email" is checkable rather than arguable.

**Why it's a table of its own**

Because half of the trust problem in comp is timing, not arithmetic. The rep who finds out on the 9th that their statement was released on the 3rd assumes something was hidden from them. And because notifications are also a *control*: finance being told, automatically, that a rate table changed on an active plan is the cheapest fraud control in the system.

The sending itself is platform automation. The log is the part worth designing.

**Events and who hears about them**

| Event | Who is told | What it says |
|---|---|---|
| Import batch complete | Comp Admin | "47 loaded, 3 exceptions", with a link to the exceptions |
| Calculation run finished | Comp Admin | Summary stats from `CALCULATION_RUN.stats` |
| Calculation run failed | Comp Admin | The failing pass and the exception list |
| Statement released | Rep | "Your March statement is ready", the total, a link |
| Statement not acknowledged after 7 days | Rep, then manager | Reminder |
| Dispute raised | Assignee, rep's manager | Rep, line, category, reason |
| Dispute resolved / rejected | Rep | Outcome and the `resolution` text |
| Dispute open > SLA (say 5 working days) | Comp lead | Age and assignee |
| Period locked | Finance, Comp Admin | Confirmation, with totals |
| Period unlocked | Finance, Comp Admin, Auditor | Who unlocked it and the stated reason — a control, not a courtesy |
| Quota or rate table changed on an active plan | Finance | What changed, by whom, before and after |

The last two are the ones to keep even if you cut this list in half. They're the events where a notification is doing security work.

**The fields**

| Field | What it means | Example |
|---|---|---|
| `notification_id` | Row ID. | `NTF-004411` |
| `event` | Which of the events above. | statement_released |
| `employee_id` | Recipient. | `EMP-00412` |
| `channel` | `email` in v1 (SMTP or Gmail); `slack` later. | email |
| `sent_at` | Timestamp. | 2026-04-03 18:40 |
| `status` | `sent`, `failed`, `bounced`, `suppressed`. | sent |
| `payload` | The rendered message, stored as sent. | … |
| `related_id` | The statement, dispute or run it was about. Lets you jump from the record to the thing. | `STM-000871` |

**Rules to enforce**

1. Notifications are sent from events, never from inside the engine's loop. A run that emails 200 people mid-calculation and then fails has told 200 people something untrue.
2. A statement is released once. Re-releasing after a rerun sends a *revised* notification that says so explicitly, and says why — silently changing a number a rep has already seen is worse than the original error.
3. Failed sends are retried and stay `failed` in the log if they never succeed. A quiet failure defeats the whole point of having the table.
4. No amounts in the subject line. Comp figures land on phone lock screens.

---

### Access control (RBAC) — who sees what

Mostly platform configuration rather than a table, since UnifyApps has role-based access built in. But the *rules* need to be written down and agreed before anyone builds a screen, because comp data is among the most sensitive a company holds — a leaked earnings table does more damage internally than most customer-data incidents.

**Roles for v1**

| Role | Can see | Can do |
|---|---|---|
| **Rep** | Own statements, credits, attainment, disputes. Own plan document. | Raise and reopen disputes. Acknowledge statements. Run the simulator on own plan. |
| **Manager** | Everything a rep sees, for every seat under theirs in `POSITION_HIERARCHY`. Team rollup views. | Comment on their team's disputes. Nothing else. |
| **Comp Admin** | Everything. | Edit all setup tables. Run calculations. Release statements. Resolve disputes. |
| **Finance** | Everything, read-only. Export. | Lock and unlock periods. Approve payroll export. |
| **Auditor** | Everything, read-only, including `AUDIT_LOG`. | Nothing. |

**How manager visibility works**

The manager role doesn't get a list of people — a list would need maintaining, and it would be wrong within a month. It gets a rule: *seats below mine, as of the period being viewed*.

The filter is: find my seat from `PAYEE_POSITION_ASSIGNMENT`, walk down `POSITION_HIERARCHY`, show data for those seats. When the org changes, visibility changes with it, and nobody maintains anything.

The "as of the period being viewed" part matters and is easy to get wrong. If Rahul managed the West team through March and moved to East in April, he should still see March's West numbers when he opens March — the hierarchy is effective-dated, so the walk is done against the period's dates, not today's. Same table, one join condition, and it's the difference between a manager being able to explain their own team's quarter and not.

**Rules to enforce**

1. Rep visibility is by `employee_id` match, full stop. No rep sees another rep's numbers, including teammates, including on a shared leaderboard, unless someone senior explicitly signs off on a leaderboard as a separate feature with its own consent.
2. **Separation of duties.** The person who edits a rate table (Comp Admin) is not the person who locks the period and approves the payroll export (Finance). At a small company there will be pressure to merge these into one heroic person. Resist it — it is the first thing an auditor tests, and it is also the control that protects that person from suspicion.
3. Every role except Rep has its actions written to `AUDIT_LOG`, including reads of another person's statement where the platform supports read logging.
4. Roles are granted to seats where possible, not to people. Priya's replacement inherits the seat and the access; nobody has to remember to revoke.
5. The Auditor role has no write capability anywhere, including disputes. Read-only means read-only, or the role means nothing.

---

### The control loop — how a period actually closes

The tables above are the pieces. This is the sequence they run in each month, and it's worth writing down because it's what finance will actually ask you to walk them through.

1. **Deals land** all month via the Salesforce sync, with pre-checks catching exceptions as they arrive (phase 2).
2. **Admin calculates** — usually several times through the month as a check, at least once seriously after month end. Each is a `CALCULATION_RUN`; each supersedes the last.
3. **Admin reviews** the exception list and the biggest movers, fixes inputs, reruns. Nothing is visible to reps yet — statements are `draft`.
4. **Admin releases** statements. Status → `released`, reps are notified, the clock on disputes starts.
5. **Reps acknowledge or dispute.** A window — five working days is typical — during which the period is still `open` and a rerun can still fix things cleanly.
6. **Finance locks the period.** From here, no rerun, no recalculation, no setup edit that affects it. `PERIOD.status` → `locked`, `AUDIT_LOG` records who and when, finance and admin are notified.
7. **Payroll export** from `released` statements: employee ID, total, currency, one line each. The file is recorded as a `PAYROLL_EXPORT` batch, finance approves it, and every statement in it is stamped with the batch ID so it cannot be paid twice.
8. **Anything found later** — a late deal, an accepted dispute on a locked month — becomes a true-up in the *next* open period, carrying a reference to what it corrects. The closed month stays closed.

Unlocking exists, because sometimes a period genuinely must be reopened before payroll runs. It is Finance-only, requires a reason, notifies the Auditor role, and should be rare enough that the third one in a quarter starts a conversation about why. That's the whole control: not that it can't happen, but that it can't happen quietly.

---

### Phase 5 — what you have now

Twenty-seven tables and an engine, plus the answer to every question finance is going to ask before they sign:

- **Who changed what** — `AUDIT_LOG`, append-only, written by the platform, with reasons forced on the changes that move money.
- **What happens when someone disagrees** — `DISPUTE`, with a queue, an owner, a written outcome, and no path to a manual override.
- **Who sees what** — five roles, hierarchy-driven visibility that maintains itself, and separation of duties between the people who set rates and the people who close periods.
- **How people find out** — event notifications with a log, including two that exist purely as controls.
- **How a month closes and stays closed** — the lock, the true-up, and a loud, logged exception path when it has to be undone.

None of it changes a single number the engine produces. All of it changes whether anyone acts on those numbers without checking a spreadsheet first — which is the actual point of the project.

---

## Where this leaves you

Twenty-eight tables, one engine, five phases. Here is how the P1 feature list from the tracker maps onto them — so you can see nothing is missing and nothing is extra.

| P1 feature | Built from |
|---|---|
| Payee & Hierarchy Management | `PAYEE`, `TITLE`, `POSITION`, `POSITION_ATTRIBUTE`, `PAYEE_POSITION_ASSIGNMENT`, `POSITION_HIERARCHY` |
| CRM / ERP Ingestion (Salesforce, Workday) | `TRANSACTION` + ingestion automation; Workday sync → phase 1 tables |
| Multi-currency | `FX_RATE` + `TRANSACTION.amount_base` |
| Draws and guarantees | `PLAN_COMPONENT` (`calc_type = draw`) + `DRAW_BALANCE` |
| Payment timing (close / invoice / collection) | `PLAN_COMPONENT.pay_trigger` + `EARNING.hold_status` |
| Payroll Export & Reconciliation | `PAYROLL_EXPORT` + `STATEMENT.export_batch_id` |
| Data Integrity Pre-checks | Ingestion pre-check + engine pass 1 |
| Plans | `PLAN`, `PLAN_ASSIGNMENT`, `PLAN_COMPONENT` |
| Credit Assignment | `CREDIT_TYPE`, `CREDIT_RULE` → `CREDIT` (pass 3) |
| Rate Tables / Pay Curves | `RATE_TABLE`, `RATE_TABLE_BAND` |
| Quotas & Attainment | `QUOTA`, `ATTAINMENT_MEASURE` → `MEASURE_RESULT` (pass 4) |
| Rep Dashboard | `STATEMENT` + `EARNING` + `MEASURE_RESULT`, filtered by `employee_id` |
| Deal-level Breakdown | `EARNING.trace` → `CREDIT` → `TRANSACTION` |
| Manager / Team Rollup Views | Same tables, filtered by `POSITION_HIERARCHY` walk |
| Attainment / Quota Effectiveness Analysis | `MEASURE_RESULT` across periods and runs |
| Simulator / Illustrator | Engine with `dry_run = yes` |
| AI Plan Explainer | Reads `PLAN_COMPONENT`, `CREDIT_RULE`, `RATE_TABLE_BAND` and turns them into sentences |
| Dispute Management | `DISPUTE` |
| Audit Trail | `AUDIT_LOG` + `CALCULATION_RUN` |
| RBAC | Platform roles + hierarchy filter |
| Ad-hoc Analysis & Export | Views over `EARNING` / `CREDIT` / `MEASURE_RESULT`; payroll export from `STATEMENT` |
| Notification Engine | Event automations + `NOTIFICATION_LOG` |

**Suggested build order** follows the phases exactly. Phase 1 and 2 first (org and deals — no logic, just data and pre-checks). Then phase 3 tables with one real plan loaded by hand. Then the engine, one pass at a time, checking each pass's output table against a spreadsheet for five reps and thirty deals before writing the next pass. Then phase 5. Dashboards can be built alongside phase 4, since they're just reads.

Two things worth putting in the first test set deliberately, because they are where comp systems usually break and both are now modelled: a rep who changes seat mid-quarter, and a deal that arrives after its own period has been locked. If those two produce numbers you can explain to a rep, the rest will hold.

The engine is the only genuinely hard piece. Everything else is tables, forms and filters.

---

## What v1 deliberately does not do

Written down so that nobody has to guess whether something was forgotten or decided.

| Not in v1 | Why it's safe to leave out | What it would take later |
|---|---|---|
| A territory table | Territory is a label on `POSITION_ATTRIBUTE` today, used for reporting, not for crediting. Nothing depends on its structure. | Its own table plus territory-based credit rules. Additive. |
| One person in two seats at once | Rare, usually a temporary vacancy cover. | Relax rule 2 on `PAYEE_POSITION_ASSIGNMENT` and prorate quota across both seats — the proration logic already handles it. |
| Ramped quotas for new hires | Proration already reduces a new hire's target by their start date. A *further* reduction is a policy layer on top. | A per-seat, per-period override on `QUOTA`. No schema change. |
| Deal splits configured in the tool | Splits arrive from Salesforce as separate line items and credit normally. | A split table and a splitting step at ingestion. |
| Slack notifications | Email covers v1 and the log records both identically. | A second channel on the existing events. |
| Windowed recovery rules for draws | v1 recovers against the outstanding balance under one policy per component. | Extra fields on the component; `DRAW_BALANCE` already carries the history. |
| Approval workflow on plan changes | Plan edits are audit-logged and notify finance, which is a detective control rather than a preventive one. | A `draft` → `pending_approval` → `active` transition on `PLAN`. |

Everything on this list fits the tables as designed. None of it requires revisiting a decision made in phases 1 to 5 — which was the point of dating everything and keeping the ledger immutable.
