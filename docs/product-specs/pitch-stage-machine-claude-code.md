# Claude Code Instructions — Pitch Stage Machine & Stage-Aware Pitch Modal

**Project:** Ezana Finance — Organizational Platform
**Stack:** Next.js 14 App Router · Supabase (Postgres + RLS) · Vercel · FMP · Tailwind
**Design tokens:** Plus Jakarta Sans (text) · JetBrains Mono (numerics) · emerald `#10b981` primary · gold `#d4a853` premium · **theme tokens only, no hardcoded hex**

---

## What We Are Building

Three things, in order:

1. **A pitch stage machine** — a formal state machine with per-stage _gates_ that must all pass before a pitch can advance. Gates are computed server-side, never trusted from the client.
2. **A stage-aware pitch detail UI** — the four tabs (Thesis · Supporting Data · Deliverables · Discussion) render differently depending on the pitch's stage. Different sections, different editability, different primary action.
3. **Replace the `/pitch/[id]` route with a large modal** that opens in place on the Pitch Pipeline page.

---

## PART 0 — Read First

Before writing any code:

- Read the existing pitch pipeline page and the current `/pitch/[id]` route. Understand the current data model, the Supabase schema for pitches, and how the kanban board fetches and renders cards.
- Read the existing org chart schema — we need `role`, `desk`/`sector`, and `reports_to`.
- Read the existing compliance rule schema if it exists. If it does not exist yet, stub the compliance gate behind an interface (see Part 3, gate `compliance_clear`) so it can be wired later without refactoring.
- **Do not delete the `/pitch/[id]` route yet.** Keep it as a deep-link fallback (see Part 6).

Report back what you found before proceeding if the schema differs materially from what is assumed below.

---

## PART 1 — The Stage Machine

### 1.1 Stages

Replace the current stage enum with this. Note **`cross_desk_review` is new** — it was previously an invisible step between Deep Dive and Scheduled.

```ts
// lib/pitch/stages.ts

export const PITCH_STAGES = [
  'idea',
  'screening',
  'deep_dive',
  'cross_desk_review', // NEW
  'pitch_scheduled',
  'ic_vote',
  'approved',
  'in_portfolio',
  'exited',
  'rejected',
] as const;

export type PitchStage = (typeof PITCH_STAGES)[number];

/** Linear happy path. `rejected` is reachable from any active stage. */
export const STAGE_ORDER: PitchStage[] = [
  'idea',
  'screening',
  'deep_dive',
  'cross_desk_review',
  'pitch_scheduled',
  'ic_vote',
  'approved',
  'in_portfolio',
];

export const TERMINAL_STAGES: PitchStage[] = ['exited', 'rejected'];
```

### 1.2 Stage definitions

```ts
// lib/pitch/stage-config.ts

import type { PitchStage } from './stages';

export type AdvanceRole =
  | 'auto' // system advances when gates pass
  | 'desk_senior_pm'
  | 'vp_ops'
  | 'vp_portfolio'
  | 'cio'
  | 'trading_desk';

export interface StageConfig {
  stage: PitchStage;
  label: string;
  /** Who owns the work in this stage (display only). */
  ownerRoles: string[];
  /** Gate IDs that must ALL pass to advance. */
  gates: string[];
  /** Who may press "Advance". `auto` = system does it. */
  advancedBy: AdvanceRole;
  /** Roles that can override gates and force-advance. Always audited. */
  overrideRoles: AdvanceRole[];
  next: PitchStage | null;
}

export const STAGE_CONFIG: Record<PitchStage, StageConfig> = {
  idea: {
    stage: 'idea',
    label: 'Idea',
    ownerRoles: ['junior_analyst'],
    gates: ['has_ticker_and_thesis', 'desk_assigned', 'screening_checklist_pass'],
    advancedBy: 'auto',
    overrideRoles: ['cio'],
    next: 'screening',
  },

  screening: {
    stage: 'screening',
    label: 'Screening',
    ownerRoles: ['junior_analyst', 'senior_analyst'],
    gates: [
      'thesis_completeness_80',
      'senior_analyst_signoffs', // N configurable per desk, default 3
      'no_unresolved_challenges',
      'compliance_no_hard_breach',
    ],
    advancedBy: 'desk_senior_pm',
    overrideRoles: ['vp_portfolio', 'cio'],
    next: 'deep_dive',
  },

  deep_dive: {
    stage: 'deep_dive',
    label: 'Deep Dive',
    ownerRoles: ['senior_analyst', 'junior_pm', 'senior_pm'],
    gates: [
      'desk_meeting_logged', // structured form, not a checkbox
      'required_models_complete', // PM-configurable per desk
      'thesis_completeness_100', // incl. variant perception + falsification
      'all_challenges_resolved',
      'compliance_no_hard_breach',
    ],
    advancedBy: 'desk_senior_pm',
    overrideRoles: ['vp_portfolio', 'cio'],
    next: 'cross_desk_review',
  },

  cross_desk_review: {
    stage: 'cross_desk_review',
    label: 'Cross-Desk Review',
    ownerRoles: ['senior_pm'],
    gates: ['cross_desk_majority'], // >= majority of OTHER desks' senior PMs
    advancedBy: 'auto',
    overrideRoles: ['cio'],
    next: 'pitch_scheduled',
  },

  pitch_scheduled: {
    stage: 'pitch_scheduled',
    label: 'Pitch Scheduled',
    ownerRoles: ['senior_analyst', 'junior_analyst'],
    gates: ['ic_meeting_assigned', 'deck_uploaded', 'pre_read_distributed_48h'],
    advancedBy: 'vp_ops',
    overrideRoles: ['cio'],
    next: 'ic_vote',
  },

  ic_vote: {
    stage: 'ic_vote',
    label: 'IC Vote',
    ownerRoles: ['president'],
    gates: ['quorum_met', 'vote_closed', 'conflicts_recused'],
    advancedBy: 'auto',
    overrideRoles: [], // NEVER overridable. The vote is the vote.
    next: 'approved',
  },

  approved: {
    stage: 'approved',
    label: 'Approved',
    ownerRoles: ['trading_desk'],
    gates: ['trade_executed'],
    advancedBy: 'trading_desk',
    overrideRoles: ['cio'],
    next: 'in_portfolio',
  },

  in_portfolio: {
    stage: 'in_portfolio',
    label: 'In Portfolio',
    ownerRoles: ['senior_analyst'],
    gates: [], // exits via a separate action, not "advance"
    advancedBy: 'desk_senior_pm',
    overrideRoles: ['cio'],
    next: null,
  },

  exited: {
    stage: 'exited',
    label: 'Exited',
    ownerRoles: [],
    gates: [],
    advancedBy: 'auto',
    overrideRoles: [],
    next: null,
  },
  rejected: {
    stage: 'rejected',
    label: 'Rejected',
    ownerRoles: [],
    gates: [],
    advancedBy: 'auto',
    overrideRoles: [],
    next: null,
  },
};
```

> **`ic_vote` has an empty `overrideRoles` array on purpose.** A vote result must never be overridable by an individual, including the CIO. If you find yourself wanting to add one, the answer is a re-vote, not an override.

---

## PART 2 — Database Schema

Create a migration. All new tables get RLS scoped to `org_id`.

```sql
-- ============================================================
-- 1. Extend the pitch table
-- ============================================================
alter table pitches
  add column if not exists desk_id            uuid references desks(id),
  add column if not exists stage_entered_at   timestamptz not null default now(),
  add column if not exists conviction         smallint check (conviction between 1 and 5),
  add column if not exists sizing_ask_pct     numeric(5,2),
  add column if not exists benchmark_ticker   text,          -- e.g. 'XLE'
  add column if not exists variant_perception text,
  add column if not exists falsification      text;

-- Rebuild the stage enum to include cross_desk_review.
-- (If stage is currently a text column, just add a CHECK constraint.)
alter table pitches drop constraint if exists pitches_stage_check;
alter table pitches add constraint pitches_stage_check check (
  stage in ('idea','screening','deep_dive','cross_desk_review',
            'pitch_scheduled','ic_vote','approved','in_portfolio',
            'exited','rejected')
);

-- ============================================================
-- 2. Per-desk configuration  (this is what makes gates survive
--    a real org chart — Energy has 1 senior analyst, not 3)
-- ============================================================
create table if not exists desk_config (
  desk_id                uuid primary key references desks(id) on delete cascade,
  org_id                 uuid not null references organizations(id),
  min_senior_signoffs    smallint not null default 3,
  required_models        text[]   not null default
                           array['dcf','three_statement','comps','earnings_analysis'],
  updated_by             uuid references members(id),
  updated_at             timestamptz not null default now()
);

-- ============================================================
-- 3. Sign-offs  (screening gate)
-- ============================================================
create table if not exists pitch_signoff (
  id           uuid primary key default gen_random_uuid(),
  pitch_id     uuid not null references pitches(id) on delete cascade,
  member_id    uuid not null references members(id),
  scope        text not null check (scope in ('model','qualitative')),
  decision     text not null check (decision in ('approve','request_changes')),
  comment      text,
  created_at   timestamptz not null default now(),
  unique (pitch_id, member_id, scope)
);

-- ============================================================
-- 4. Desk meeting  (deep_dive gate) — a structured record,
--    NOT a checkbox. This is the artifact.
-- ============================================================
create table if not exists desk_meeting (
  id                    uuid primary key default gen_random_uuid(),
  pitch_id              uuid not null references pitches(id) on delete cascade,
  held_at               timestamptz not null,
  attendee_ids          uuid[] not null,
  compliance_notes      text not null,
  sector_weight_notes   text not null,   -- current vs. target weight w/ this position
  headwinds             text not null,
  tailwinds             text not null,
  proposed_sizing_pct   numeric(5,2) not null,
  logged_by             uuid not null references members(id),
  created_at            timestamptz not null default now()
);

-- ============================================================
-- 5. Model deliverables  (deep_dive gate)
-- ============================================================
create table if not exists pitch_model (
  id            uuid primary key default gen_random_uuid(),
  pitch_id      uuid not null references pitches(id) on delete cascade,
  model_type    text not null,   -- matches desk_config.required_models
  file_url      text not null,
  version       int  not null default 1,
  uploaded_by   uuid not null references members(id),
  reviewed_by   uuid references members(id),
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- 6. Cross-desk approvals  (cross_desk_review gate)
-- ============================================================
create table if not exists cross_desk_approval (
  id           uuid primary key default gen_random_uuid(),
  pitch_id     uuid not null references pitches(id) on delete cascade,
  desk_id      uuid not null references desks(id),      -- the REVIEWING desk
  pm_id        uuid not null references members(id),    -- that desk's senior PM
  decision     text not null check (decision in ('approve','object')),
  reason       text,   -- REQUIRED when decision = 'object' (enforce in app + trigger)
  created_at   timestamptz not null default now(),
  unique (pitch_id, desk_id)
);

-- ============================================================
-- 7. Stage transition audit  — append-only, immutable
-- ============================================================
create table if not exists pitch_stage_transition (
  id              uuid primary key default gen_random_uuid(),
  pitch_id        uuid not null references pitches(id) on delete cascade,
  from_stage      text not null,
  to_stage        text not null,
  actor_id        uuid references members(id),   -- null when system/auto
  was_override    boolean not null default false,
  override_reason text,                          -- REQUIRED when was_override
  gate_snapshot   jsonb not null,                -- full gate state at transition
  created_at      timestamptz not null default now()
);

-- No updates, no deletes. Ever.
revoke update, delete on pitch_stage_transition from authenticated;

-- ============================================================
-- 8. Discussion challenges (needed by no_unresolved_challenges gate)
--    If a discussion table already exists, ADD these columns instead.
-- ============================================================
alter table pitch_discussion
  add column if not exists post_type text not null default 'note'
    check (post_type in ('question','challenge','evidence','concern','answer','note')),
  add column if not exists status text not null default 'open'
    check (status in ('open','rebutted','conceded','answered','na')),
  add column if not exists anchor_section text,     -- e.g. 'bear_case'
  add column if not exists parent_id uuid references pitch_discussion(id);

create index if not exists idx_discussion_open_challenges
  on pitch_discussion (pitch_id)
  where post_type = 'challenge' and status = 'open';
```

**Trigger: an objection requires a reason.**

```sql
create or replace function require_objection_reason()
returns trigger language plpgsql as $$
begin
  if new.decision = 'object'
     and (new.reason is null or length(trim(new.reason)) < 10) then
    raise exception 'An objection requires a written reason (min 10 chars).';
  end if;
  return new;
end $$;

create trigger trg_require_objection_reason
  before insert or update on cross_desk_approval
  for each row execute function require_objection_reason();
```

Add the equivalent trigger on `pitch_stage_transition` for `was_override = true` → `override_reason` required.

---

## PART 3 — The Gate Engine

**Gates are computed server-side. The client never asserts a gate has passed.** The client renders gate state and disables buttons; the server re-evaluates on every advance attempt.

```ts
// lib/pitch/gates.ts

export type GateStatus = 'pass' | 'fail' | 'pending' | 'warn';

export interface GateResult {
  id: string;
  label: string;
  status: GateStatus;
  /** Human-readable current state, e.g. "2 of 3 sign-offs" */
  detail: string;
  /** Structured progress for rendering a bar. */
  progress?: { current: number; required: number };
  /** What the user should do next. Shown when status !== 'pass'. */
  action?: { label: string; href?: string; tab?: PitchTab };
  /** `soft` gates warn but do not block. `hard` gates block. */
  severity: 'hard' | 'soft';
}

export interface GateEvaluation {
  stage: PitchStage;
  gates: GateResult[];
  canAdvance: boolean; // all HARD gates pass
  hasWarnings: boolean; // any SOFT gate fails
  nextStage: PitchStage | null;
  blockedBy: string[]; // gate labels
}
```

### 3.1 Implement each gate

Create `lib/pitch/gates/` with one file per gate. Every gate is a pure async function:
`(pitchId, supabase) => GateResult`

| Gate ID                     | Logic                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `has_ticker_and_thesis`     | `pitches.ticker` non-null AND `short_thesis` length ≥ 20                                                                                                                                                                                                                                                                                                                                                    |
| `desk_assigned`             | `pitches.desk_id` non-null                                                                                                                                                                                                                                                                                                                                                                                  |
| `screening_checklist_pass`  | Market cap ≥ org min, ADV ≥ org min, ticker not on restricted list. Pull live from FMP; **cache 15min**.                                                                                                                                                                                                                                                                                                    |
| `thesis_completeness_80`    | See §3.2                                                                                                                                                                                                                                                                                                                                                                                                    |
| `thesis_completeness_100`   | See §3.2 — must include `variant_perception` and `falsification`                                                                                                                                                                                                                                                                                                                                            |
| `senior_analyst_signoffs`   | Count distinct `pitch_signoff` where `decision='approve'` AND member's role ∈ {`senior_analyst`,`junior_pm`,`senior_pm`} AND member's desk = pitch's desk. Required = `desk_config.min_senior_signoffs`. **At least 1 must be from the desk** — if the desk cannot supply the count, allow Senior Analysts from other desks to fill the remainder, but require ≥1 in-desk. Progress: `{current, required}`. |
| `no_unresolved_challenges`  | Zero rows in `pitch_discussion` where `post_type='challenge'` AND `status='open'`                                                                                                                                                                                                                                                                                                                           |
| `all_challenges_resolved`   | Same, but also requires ≥1 challenge to exist (a pitch nobody challenged has not been reviewed). **Severity: `soft`** — warn, don't block.                                                                                                                                                                                                                                                                  |
| `compliance_no_hard_breach` | Call the compliance engine. Zero `HARD` breaches. Soft breaches → separate `soft` gate `compliance_soft_clear`. **If the compliance module is not built yet, stub this to return `pass` with `detail: 'Compliance engine not configured'` — behind a feature flag.**                                                                                                                                        |
| `desk_meeting_logged`       | ≥1 row in `desk_meeting` for this pitch, with all text fields non-empty and ≥3 attendees                                                                                                                                                                                                                                                                                                                    |
| `required_models_complete`  | For each `model_type` in `desk_config.required_models`, a `pitch_model` row exists with `reviewed_at` non-null. Progress = `{uploaded_and_reviewed, required}`                                                                                                                                                                                                                                              |
| `cross_desk_majority`       | Count `cross_desk_approval` where `decision='approve'`, from desks ≠ the pitch's desk. Required = `ceil(other_desk_count / 2) + ...` → **with 7 desks, pitching desk excluded = 6 reviewers, majority = 4.** Compute dynamically: `Math.floor(otherDeskCount / 2) + 1`.                                                                                                                                     |
| `ic_meeting_assigned`       | `pitches.ic_meeting_id` non-null and meeting date is in the future                                                                                                                                                                                                                                                                                                                                          |
| `deck_uploaded`             | A `pitch_deliverable` of type `deck` exists                                                                                                                                                                                                                                                                                                                                                                 |
| `pre_read_distributed_48h`  | Pre-read pack generated AND `distributed_at` ≤ (meeting date − 48h). **Severity: `soft`** before the deadline passes, `hard` after.                                                                                                                                                                                                                                                                         |
| `quorum_met`                | IC voters present ≥ org quorum threshold, excluding recused                                                                                                                                                                                                                                                                                                                                                 |
| `vote_closed`               | Vote window closed                                                                                                                                                                                                                                                                                                                                                                                          |
| `conflicts_recused`         | Every member with a disclosed personal holding in this ticker is on the recusal list                                                                                                                                                                                                                                                                                                                        |
| `trade_executed`            | A position record exists linked to this pitch                                                                                                                                                                                                                                                                                                                                                               |

### 3.2 Thesis completeness

```ts
// lib/pitch/thesis-completeness.ts

export const THESIS_SECTIONS_80 = [
  'short_thesis',
  'full_thesis',
  'why_now',
  'target_base',
  'catalysts',
  'risks',
] as const;

export const THESIS_SECTIONS_100 = [
  ...THESIS_SECTIONS_80,
  'variant_perception', // "what does the market believe that we think is wrong?"
  'falsification', // "what would prove us wrong?"
  'target_bull',
  'target_bear',
  'sizing_ask_pct',
] as const;

// Minimum meaningful length per field — kills one-word placeholders.
export const MIN_LENGTHS: Record<string, number> = {
  short_thesis: 20,
  full_thesis: 200,
  why_now: 60,
  variant_perception: 80,
  falsification: 40,
};
```

`falsification` must be **specific and checkable**. Add a soft validator that warns on vague submissions (e.g. flags text matching `/^(the )?(stock|price|it) (goes|drops|falls)/i` — "the stock goes down" is not a falsification condition).

### 3.3 The advance endpoint

```ts
// app/api/pitches/[id]/advance/route.ts
//
// POST { override?: boolean, overrideReason?: string }
//
// 1. Load pitch + current user's member record (role, desk).
// 2. Re-evaluate ALL gates server-side. Never trust client state.
// 3. Authorize: user's role must match STAGE_CONFIG[stage].advancedBy,
//    OR be in overrideRoles when override === true.
// 4. If !canAdvance and !override  -> 409 with the failing gates.
// 5. If override -> require overrideReason (min 20 chars). Never allow
//    override on stage 'ic_vote'.
// 6. Transaction:
//      - update pitches.stage, stage_entered_at = now()
//      - insert pitch_stage_transition with full gate_snapshot
//      - fire side effects (below)
// 7. Return the new GateEvaluation for the NEW stage.
```

**Side effects on transition** (implement as a dispatcher, not inline):

| Transition            | Side effect                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `→ screening`         | Notify desk Senior Analysts: sign-off requested                                                                                       |
| `→ deep_dive`         | Create Assignments for each required model, assigned to the lead analyst. Schedule the desk meeting.                                  |
| `→ cross_desk_review` | Notify the 6 other desks' Senior PMs. Create a review task each.                                                                      |
| `→ pitch_scheduled`   | Add to the next IC meeting agenda. Generate pre-read pack.                                                                            |
| `→ ic_vote`           | Open the vote. Compute recusals from compliance disclosures.                                                                          |
| `→ approved`          | Create a position record. Post to the social feed.                                                                                    |
| `→ in_portfolio`      | Auto-publish the memo to the Research Library, tagged to ticker + sector. Start the thesis-review clock (90d).                        |
| `→ rejected`          | Require a rejection reason. Archive with reason. Do **not** delete — the rejected pile is the fund's most valuable teaching artifact. |

---

## PART 4 — Replace the Route With a Modal

### 4.1 Delete the page navigation

On the Pitch Pipeline kanban, clicking a card **must not navigate.** It opens `<PitchModal />` in place.

- Use a **shallow route** so the URL still reflects the open pitch and is shareable/back-button-safe:
  `router.push(\`/pipeline?pitch=\${id}\`, { scroll: false })`
- Read `searchParams.pitch` on the pipeline page; if present, render the modal.
- `Esc` and backdrop click close → `router.push('/pipeline')`.
- Preserve the kanban's scroll position — do not remount the board.

### 4.2 Modal shell

```tsx
// components/pitch/PitchModal.tsx
//
// Large modal. Target: 90vw × 88vh, max-width 1400px.
// Dark surface, elevated. Does NOT scroll the page behind it.
//
// ┌────────────────────────────────────────────────────────────────┐
// │ HEADER (fixed)                                            ✕    │
// │   FSLR · First Solar                     ● DEEP DIVE           │
// │   Energy & Utilities · Long · 12m                              │
// │   $192.40 ▲1.2%   Target $265   +37.8%   Conviction ●●●●○      │
// │   Theo Lindqvist (Sr Analyst) · Desk: Ava Doucet (Sr PM)       │
// │   Entered Deep Dive 6d ago                                     │
// ├────────────────────────────────────────────────────────────────┤
// │ STAGE RAIL (fixed)                                             │
// │   Idea ─ Screening ─ ●Deep Dive ─ Cross-Desk ─ Sched ─ IC      │
// ├────────────────────────────────────────────────────────────────┤
// │ GATE PANEL (fixed, collapsible)          3 of 5 gates passed   │
// │   ✓ Desk meeting logged        Feb 9 · 6 attendees             │
// │   ✓ Thesis 100% complete                                       │
// │   ✓ Compliance — no hard breaches          ⚠ 1 soft warning    │
// │   ◐ Required models             3 of 4 · missing: 3-statement  │
// │   ✗ All challenges resolved     1 open (S. Marchetti)          │
// │   ────────────────────────────────────────────────────────────  │
// │   [ Advance to Cross-Desk Review ]  ← DISABLED, 2 gates failing│
// ├────────────────────────────────────────────────────────────────┤
// │ TABS                                                           │
// │   Thesis │ Supporting Data │ Deliverables (4) │ Discussion (12)│
// ├────────────────────────────────────────────────────────────────┤
// │ TAB CONTENT (scrolls independently)                            │
// │                                                                │
// └────────────────────────────────────────────────────────────────┘
```

**Critical:** the gate panel is the heart of this. It is not decoration — it tells the user _exactly what is blocking them and where to go fix it._ Each failing gate's `action` deep-links to the relevant tab.

Responsive: below `lg`, the modal becomes full-screen; the gate panel collapses to a single summary row that expands on tap.

### 4.3 Keep `/pitch/[id]` as a deep-link fallback

Do not delete the route. Make it a thin server component that redirects:
`/pitch/[id]` → `/pipeline?pitch=[id]`

This keeps existing links, notifications, and emails working.

---

## PART 5 — Stage-Aware Rendering

**This is the core requirement.** The same four tabs must look and behave differently by stage.

### 5.1 The visibility matrix

Build this as data, not as `if` statements scattered through JSX.

```ts
// lib/pitch/stage-views.ts

export type PitchTab = 'thesis' | 'data' | 'deliverables' | 'discussion' | 'performance';

export type SectionMode = 'hidden' | 'readonly' | 'editable' | 'required';

export interface StageView {
  tabs: PitchTab[];
  defaultTab: PitchTab;
  /** Section-level rendering rules, keyed by section id. */
  sections: Record<string, SectionMode>;
  /** Stage-specific panels that appear in a tab. */
  panels: string[];
  primaryAction: { label: string; intent: 'advance' | 'vote' | 'update' | 'none' };
  secondaryActions: string[];
}
```

|                                | **Idea**     | **Screening** | **Deep Dive**          | **Cross-Desk** | **Scheduled** | **IC Vote** | **In Portfolio** |
| ------------------------------ | ------------ | ------------- | ---------------------- | -------------- | ------------- | ----------- | ---------------- |
| **Default tab**                | Thesis       | Thesis        | Deliverables           | Discussion     | Deliverables  | Thesis      | Performance      |
| **Tabs shown**                 | Thesis, Data | +Discussion   | +Deliverables          | all 4          | all 4         | all 4       | all 5            |
| **Thesis: core fields**        | editable     | editable      | editable               | readonly       | readonly      | readonly    | readonly         |
| **Thesis: variant perception** | hidden       | editable      | **required**           | readonly       | readonly      | readonly    | readonly         |
| **Thesis: falsification**      | hidden       | editable      | **required**           | readonly       | readonly      | readonly    | **checked**      |
| **Thesis: bull/base/bear**     | hidden       | base only     | **all required**       | readonly       | readonly      | readonly    | readonly         |
| **Thesis: sizing ask**         | hidden       | hidden        | **required**           | readonly       | readonly      | readonly    | actual           |
| **Data: comps**                | hidden       | readonly      | editable               | readonly       | readonly      | readonly    | readonly         |
| **Data: full financials**      | hidden       | visible       | visible                | visible        | visible       | visible     | visible          |
| **Deliverables: models**       | hidden       | optional      | **required checklist** | readonly       | readonly      | readonly    | readonly         |
| **Deliverables: deck**         | hidden       | hidden        | optional               | optional       | **required**  | readonly    | readonly         |
| **Discussion: challenges**     | hidden       | open          | open                   | open           | open          | **locked**  | reopened         |
| **Discussion: straw poll**     | hidden       | hidden        | hidden                 | hidden         | **active**    | closed      | —                |

**Thesis becomes read-only at `cross_desk_review`.** This is deliberate and important: cross-desk PMs and the IC must be voting on a _frozen_ thesis. If an analyst can edit the thesis after PMs have approved it, the approval means nothing. Edits after this point require a **`Request Changes`** action that kicks the pitch back to `deep_dive` — recorded in the transition log.

### 5.2 Stage-specific panels

Panels that only exist at certain stages:

| Panel                 | Stage               | What it does                                                                                                                                               |
| --------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SignoffPanel`        | `screening`         | Shows each desk Senior Analyst+ and their sign-off state. Sign-off buttons for eligible viewers (model / qualitative, separately). Progress `2 of 3`.      |
| `DeskMeetingPanel`    | `deep_dive`         | The structured meeting form: attendees, compliance notes, sector weight, headwinds, tailwinds, proposed sizing. If unlogged, shows `[ Log Desk Meeting ]`. |
| `ModelChecklistPanel` | `deep_dive`         | The PM-configured required models, upload state, review state. Lives in the Deliverables tab.                                                              |
| `CrossDeskPanel`      | `cross_desk_review` | 6 other desks, each PM's decision, objection reasons. `4 of 6 needed · 2 approved · 1 objection`. Approve/Object buttons for eligible PMs.                 |
| `PreReadPanel`        | `pitch_scheduled`   | Meeting date, pre-read pack status, distribution countdown.                                                                                                |
| `VotePanel`           | `ic_vote`           | Buy/Pass/Abstain. Quorum. Recusal list. Written rationale field.                                                                                           |
| `PerformancePanel`    | `in_portfolio`      | Entry vs. current vs. benchmark, catalyst tracker, risk register, **falsification check**, thesis review clock, flags.                                     |

### 5.3 The falsification check (in Portfolio)

Surface the analyst's own falsification condition, and force them to answer it at every thesis review:

```
FALSIFICATION CONDITION (set at pitch, Feb 3)
  "2026 bookings guide below 18 GW, or domestic premium below 12%"

  ● Bookings guide: 21.4 GW        → intact
  ● Domestic premium: 22%          → intact

  Thesis intact. Next review due in 27 days.
```

If a falsification condition **trips**, auto-create a Red Flag and notify the desk PM. The analyst wrote the condition themselves; they don't get to ignore it.

---

## PART 6 — Build Order

Do these as separate commits. Do not do it all at once.

1. **Schema migration** (Part 2). Run it, verify RLS, seed `desk_config` for all 7 desks.
2. **Stage config + gate engine** (Parts 1, 3). Pure functions, unit-tested, no UI.
3. **Advance endpoint** (§3.3) with the transition audit. Test with curl before touching the UI.
4. **Modal shell + shallow routing** (Part 4). Move the existing four tabs into it unchanged. Verify nothing regressed.
5. **Gate panel** in the modal header. This is the highest-value single component — ship it early.
6. **Stage-view matrix** (§5.1) driving section modes.
7. **Stage-specific panels** (§5.2), one at a time, in this order: `SignoffPanel` → `CrossDeskPanel` → `DeskMeetingPanel` → `ModelChecklistPanel` → `VotePanel` → `PerformancePanel`.
8. **Side effects** on transition (§3.3 table).

---

## PART 7 — Testing Requirements

Write tests for these. They are the ones that will actually bite.

- A pitch cannot advance when any hard gate fails, **even if the client sends `stage: 'deep_dive'` directly to the API.** Server-side re-evaluation is the whole security model.
- A member with the wrong role cannot advance, even when all gates pass.
- `ic_vote` cannot be overridden by anyone, including CIO.
- An override without a reason (or with < 20 chars) is rejected.
- A cross-desk objection without a reason is rejected at the DB level.
- The pitching desk's own PM **cannot** count toward `cross_desk_majority`.
- A desk with fewer than `min_senior_signoffs` eligible members can still satisfy the gate via out-of-desk Senior Analysts, but **requires ≥1 in-desk sign-off**.
- Editing the thesis at `cross_desk_review` or later is rejected.
- `pitch_stage_transition` rows cannot be updated or deleted.
- Gate snapshots are captured at transition time and are immutable.

---

## PART 8 — Seed Data

Seed the 7 desks with `desk_config`. Note the roster is thin on some desks — this is exactly why `min_senior_signoffs` is configurable:

| Desk                    | Senior PM      | Sr Analysts on desk                      | `min_senior_signoffs` |
| ----------------------- | -------------- | ---------------------------------------- | --------------------- |
| Technology              | Priya Raman    | Julian Park, Simone Tremblay (+2 Jr PMs) | 3                     |
| Healthcare              | Marcus Chen    | Omar Farouk (+1 Jr PM)                   | 3                     |
| Financials              | Lazar Vukoje   | Grace Nakamura (+1 Jr PM)                | 3                     |
| **Energy & Utilities**  | Ava Doucet     | Theo Lindqvist                           | **2** ← thin desk     |
| Consumer                | Tobi Adeyemi   | Bianca Rossi (+1 Jr PM)                  | 3                     |
| Industrials & Materials | Chloe Bergeron | Kwame Boateng                            | **2** ← thin desk     |
| Real Estate & Comms     | Zein Bawab     | Ines Delacroix                           | **2** ← thin desk     |

Seed the FSLR pitch at `deep_dive` with:

- 2 of 2 sign-offs complete (Theo, Ava)
- Desk meeting logged Feb 9, 6 attendees
- Models: DCF ✓, comps ✓, earnings ✓, **3-statement missing**
- 1 open challenge from Sofia Marchetti (module ASP compression)
- Compliance: 1 soft warning (Energy desk would reach 18.4% vs. 15% soft limit)

This gives a pitch that is **visibly, informatively blocked** — the perfect state to demo the gate panel against.

---

## The Two Things Not To Get Wrong

**1. Gates are evaluated server-side, always.** The client renders gate state and disables buttons, but the `/advance` endpoint re-computes every gate from the database before permitting a transition. A disabled button is UX; the server check is the actual rule.

**2. The thesis freezes at `cross_desk_review`.** Cross-desk PMs and the IC must vote on a thesis that cannot change underneath them. Post-freeze edits go through `Request Changes` → back to `deep_dive`, and the transition is logged. Without this, an approval means nothing — and the entire audit trail becomes decorative.
