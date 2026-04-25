# Phase 8: Static-item Visibility & Screen Rendering — Context

## Goal
Bring the seven static menu items (Galleri, Deltagere, Hvor, Opgaver, Program — for full screen-render parity; plus Kamera and Billeder for visibility-only parity) up to the same control surface that admin-defined dynamic pages already enjoy:

1. **Visibility controls** (`is_active` + `visible_from`/`visible_until` time window) for ALL static menu items
2. **Screen activation** (toggle on/off per screen, with multi-screen cycling) for the subset that makes sense as a fullscreen view: Galleri, Deltagere, Hvor, Opgaver, Program

## Requirements
Per ROADMAP.md / PROJECT.md:
- **R24**: Synlighedskontrol (aktiv-flag + visible_from/visible_until) for alle statiske menu-elementer (Galleri, Deltagere, Hvor, Opgaver, Program) — parallel funktionalitet med dynamiske sider
- **R25**: Skærm-aktivering for statiske menu-elementer (Galleri, Deltagere, Hvor, Opgaver, Program) med dedikerede screen-renderere; cycleren skifter polymorft mellem dynamiske sider og statiske views

## Success Criteria
- Visibility controls (is_active toggle + visible_from/visible_until) work for all static items in `/admin/sider` with the same EyeOff/Clock indicators dynamic pages already show
- Static items respect their visibility in the guest bottom menu (filtered out when inactive or outside time window) AND on their own routes (`notFound()` when hidden)
- Screen-toggle works on Galleri, Deltagere, Hvor, Opgaver, Program in `/admin/sider` (Kamera and Billeder are intentionally out of scope for screen-toggle)
- Polymorphic screen render: cycler shows either dynamic page (TipTap) OR static view per cycle step
- New screen renderers exist for Deltagere, Hvor, Opgaver, Program (Galleri reuses existing `ScreenDefault`)
- Schema migrations cover both visibility (per static_key) and polymorphic screen assignments
- Existing dynamic-page features (Phase 6 + post-launch screen-cycling series — Tasks 1–3) continue working unchanged

## Prior Phase Handoffs

### Schema (relevant existing tables/columns)
- `pages` (since Phase 4): `id, slug, title, content, is_active, visible_from, visible_until, sort_order, created_at` — visibility model to mirror for static items
- `app_settings.nav_order jsonb` (migration 007): array of `{kind: 'static' | 'page', key | id}` items defining bottom-menu order
- `screen_page_assignments` (migration 008): M:N between screens and pages; `screen_guest_id, page_id, sort_order, created_at`. RLS + realtime publication enabled. REPLICA IDENTITY FULL (migration 009) so DELETE events propagate correctly.
- `guests.screen_cycle_seconds`, `guests.screen_transition` (migration 008): per-screen cycle settings

### Server actions (existing, reusable patterns)
- `src/lib/actions/settings.ts`: `getResolvedNavForGuest`, `getResolvedNavForAdmin`, `updateNavOrder`, `reconcileOrder`. The reconcile helper appends missing static keys; will need to integrate visibility metadata.
- `src/lib/actions/screenAssignments.ts`: `getScreenAssignmentsAll`, `getVisibleScreenAssignments`, `addPageToScreen`, `removePageFromScreen`, `getScreenCycleSettings`, `updateScreenCycleSettings`, `hasAnyScreenAssignments`, `getAssignmentsMapByPage`, `getRotationCountsForScreen`. These all assume `page_id` — Phase 8 plan 08-02 must extend or polymorph them.
- `src/lib/guest/navItems.ts`: `STATIC_NAV_KEYS`, `STATIC_NAV_META`, `iconKeyForStatic`, `isPageVisibleNow` (already used for dynamic pages — same predicate works for static visibility records).

### Admin UI (existing components to extend)
- `src/components/admin/MenuManager.tsx`: dnd-kit sortable list. Renders static and page rows differently; static rows currently have no visibility/screen controls — Plan 08-03 extends this.
- `src/components/admin/ScreenAssignmentToggle.tsx`: click toggles primary-screen assignment for a `pageId`; right-click/long-press opens screen picker. Plan 08-03 extends to accept either a `pageId` (existing) OR a `staticKey` (new) discriminator.
- `src/components/admin/ScreenCycleSettings.tsx`: per-screen delay + transition card. No changes needed for Phase 8.

### Screen render (existing components to refactor)
- `src/app/[uuid]/page.tsx` lines 38–131: screen branch. Renders `ScreenPageCycle` if `hasAnyScreenAssignments`; else falls through to single-override (`screen_state.current_override`); else gallery default. Plan 08-05 must teach this branch about static-item assignments.
- `src/components/screen/ScreenPageCycle.tsx`: cycler. `initialPages: ScreenPageForCycle[]` is `{id, title, content}`. Plan 08-05 generalises this to support either dynamic page or static view per item.
- `src/components/screen/ScreenDefault.tsx` (gallery default): already a fullscreen renderer; can be reused as-is for the Galleri static-item screen view.
- No existing screen renderers for Deltagere, Hvor, Opgaver, Program — Plan 08-05 creates them.

## Architectural Decisions (Reserved for Plan Agents)

The plan files defer two storage-layout decisions to the executing agents because they involve trade-offs best made with full file context:

**Decision A (Plan 08-01) — Where to store static-item visibility?**
- Option A1: Dedicated `static_item_settings` table (`static_key text primary key, is_active boolean, visible_from timestamptz, visible_until timestamptz, updated_at timestamptz`). Structured, indexable, easy to extend.
- Option A2: jsonb column on `app_settings` (e.g. `static_visibility jsonb` keyed by static_key). Cheaper to add, but harder to query/filter and harder to add columns later.

Recommended bias: **Option A1** for clarity and parity with how dynamic pages store the same fields, but plan agent decides.

**Decision B (Plan 08-02) — Polymorphic screen assignments: extend or fork?**
- Option B1: Extend `screen_page_assignments` with a discriminator (`kind text default 'page' check (kind in ('page','static'))`, plus nullable `static_key text` — and make `page_id` nullable with a check enforcing exactly one of `page_id` / `static_key` is non-null).
- Option B2: Separate `screen_static_assignments` table (`screen_guest_id, static_key, sort_order, created_at`).

Recommended bias: **Option B1** so the cycler refactor (Plan 08-05) can fetch one ordered list of mixed items via a single query; but plan agent decides.

Each plan's SUMMARY.md must document which option was selected and why.

## Codebase Conventions (relevant)

- Migrations are applied **manually** via Supabase Dashboard SQL Editor. Plans MUST instruct the user to apply the migration before testing. Use `add column if not exists` and `create table if not exists` so re-applies are idempotent.
- Realtime publication: when adding new tables that screens subscribe to, add to `supabase_realtime` publication AND set `replica identity full` (per migration 009 fix) so DELETE events carry the row data needed for client filters.
- RLS: anon SELECT policy `using (true)` only on tables that screens read via realtime. Service-role server queries bypass RLS. Defense-in-depth pattern from migration 002.
- Plan files modifying `src/lib/actions/screenAssignments.ts` MUST keep the existing exports intact (other features depend on them) — extend with new exports rather than rewriting.
- All admin texts Danish; English mirror in `messages/en.json` if new keys are added.
- `assertAdmin()` on every mutating server action; pattern: read at top, throw if not admin.
- Strict-blank screen behavior (Plan 08-05): if a screen has assignments but zero are currently visible (window violations), render blank-black — do NOT fall through to gallery default. This matches the existing `ScreenPageCycle` invariant.

## Plan Structure

| Plan | Wave | Title | Agent | Depends on |
|---|---|---|---|---|
| 08-01 | 1 | Static-item visibility — schema + server actions | Backend Architect | (none) |
| 08-02 | 1 | Polymorphic screen assignments — schema + server actions | Backend Architect | (none) |
| 08-03 | 2 | Admin UI — visibility + screen-toggle on static items | Frontend Developer | 08-01, 08-02 |
| 08-04 | 2 | Guest integration — menu filter + route visibility guards | Senior Developer | 08-01 |
| 08-05 | 2 | Screen rendering for static items + cycler refactor | Senior Developer | 08-02 |

Wave 1 plans are file-disjoint (different actions files, different migrations) — parallel-safe.
Wave 2 plans modify different file sets — parallel-safe.

## Out of Scope (deferred to v2 or future phases)

- Kamera and Billeder screen-toggle (Kamera is camera-access-bound, Billeder is per-guest content)
- Per-screen authoring of static-item content (e.g., custom Galleri config per screen) — current model: static item is on a screen or off, configuration stays global
- Realtime updates for static-item visibility changes (admin toggling `is_active` won't push to live screens until they refetch on the next normal trigger — acceptable v1)
