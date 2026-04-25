# Plan 08-05 — Screen rendering for static items + cycler refactor

## Status
Complete

## Files modified/created

### Created
- `/home/stigf/projects/myCelebration/src/components/screen/ScreenDeltagere.tsx`
- `/home/stigf/projects/myCelebration/src/components/screen/ScreenHvor.tsx`
- `/home/stigf/projects/myCelebration/src/components/screen/ScreenOpgaver.tsx`
- `/home/stigf/projects/myCelebration/src/components/screen/ScreenProgram.tsx`

### Modified
- `/home/stigf/projects/myCelebration/src/components/screen/ScreenPageCycle.tsx` — refactored from page-only to polymorphic, accepting `MixedScreenItem[]` instead of `ScreenPageForCycle[]`. Cycle interval / transition mechanics / strict-blank invariant / `animateIn` initial-`true` fix all preserved.
- `/home/stigf/projects/myCelebration/src/app/[uuid]/page.tsx` — screen branch (lines 38–66 of new file) now calls `getHydratedMixedScreenItems` instead of `getVisibleScreenAssignments`, passing `initialItems` to the polymorphic cycler.
- `/home/stigf/projects/myCelebration/src/lib/actions/screenAssignments.ts` — added `MixedScreenItem` (discriminated union, the cycler's prop shape), an internal `hydrateStaticItemData` helper (per-static-key data fetcher), and the public `getHydratedMixedScreenItems` server action (combines `getVisibleScreenAssignmentsMixed` + per-row hydration in parallel). All previously-existing exports are untouched.

## Polymorphic prop shape

The final `MixedScreenItem` discriminated union, posted verbatim from `src/lib/actions/screenAssignments.ts`:

```ts
export type MixedScreenItem =
  | {
      kind: 'page'
      id: string
      title: string
      content: Record<string, unknown> | null
    }
  | {
      kind: 'static'
      id: string
      staticKey: string
      data: unknown
    }
```

The cycler narrows `data` per `staticKey` at render time (in `CycleItemView`):
- `staticKey === 'galleri'` → `{ config: GalleryConfig; items: GalleryItem[] }`
- `staticKey === 'deltagere'` → `{ guests: Array<{ id, name, type, relation }> }`
- `staticKey === 'hvor'` → `{ events: ScreenHvorEvent[] }`
- `staticKey === 'tasks'` → `{ tasks: ScreenOpgaverTask[] }`
- `staticKey === 'program'` → `{ items: ScreenProgramRow[] }`
- any other → defensive `<div className="absolute inset-0 bg-black" />`

`unknown` was chosen over a fully-narrowed union for `data` because the static-key universe is open-ended (Phase 8 ships 5 keys, future phases may add more); narrowing is centralised in one switch instead of leaking into the type definition. The cast at each branch is type-safe at the call boundary because the same module that produces the data (`hydrateStaticItemData`) feeds the cycler one round trip later.

## Hydration approach

All static-item data is fetched **server-side** before the polymorphic cycler ever mounts on the client. Two paths:

1. **Initial render** (`src/app/[uuid]/page.tsx` screen branch): calls `getHydratedMixedScreenItems(guest.id)` once. Inside that helper, `getVisibleScreenAssignmentsMixed` returns the visible-and-ordered assignment rows; then `Promise.all` over the rows runs `hydrateStaticItemData(staticKey)` for every `kind: 'static'` row in parallel. Page rows pass through unchanged. Result is a serialisable `MixedScreenItem[]` that flows to the client as a prop.

2. **Realtime refetch** (inside the client `ScreenPageCycle` effect): subscription fires → `getHydratedMixedScreenItems(screenGuestId)` is called again as a server action → same parallel hydration → state updated. The client never reaches into per-static-key data sources directly.

**Per-render cost notes:**
- One screen with N static + M page assignments incurs `N + 2` round trips on every realtime tick: 1 for the assignment list, 1 for the visibility map (parallel inside `getVisibleScreenAssignmentsMixed`), and N for static-item data (parallelised). Page rows do not add round trips because the join already pulls page content.
- Static-item data is never cached across calls — refetched on every tick. Acceptable for Phase 8 because (a) the full payload is small (low-cardinality lists like guests / events / tasks / program items, plus a gallery config), and (b) realtime ticks are rare (driven by admin assignment changes, not by user activity).
- If future use exposes a hot path (e.g. >50 ticks/min on a heavily-edited screen), the candidate optimisation is a per-screen revalidate-tag cache around `hydrateStaticItemData` keyed by `(staticKey, last_realtime_event_id)`. Out of scope for v1.

## Realtime notes

**Existing channel covers both kinds — no new subscription added.** Per Plan 08-02 Decision B1 (polymorphic single table), static-row INSERT / UPDATE / DELETE events flow through the same `screen_page_assignments` realtime publication as page rows do, with the same `screen_guest_id=eq.<id>` filter. Migration 009's REPLICA IDENTITY FULL covers both kinds because it is a table-level setting.

The cycler subscribes to topic `screen_page_assignments:<screenGuestId>:<instanceId>` exactly as before; the only behavioural change is in the refetch handler:

```diff
- const [nextPages, nextSettings] = await Promise.all([
-   getVisibleScreenAssignments(screenGuestId),
-   getScreenCycleSettings(screenGuestId),
- ])
- setPages(nextPages.map((a) => ({ id: a.page.id, title: a.page.title, content: a.page.content })))
+ const [nextItems, nextSettings] = await Promise.all([
+   getHydratedMixedScreenItems(screenGuestId),
+   getScreenCycleSettings(screenGuestId),
+ ])
+ setItems(nextItems)
```

Confirmed v1 limitation (per 08-CONTEXT.md "Out of Scope"): toggling a static item's `is_active` in `static_item_settings` does NOT push to live screens. Live screens only refetch on assignment-table changes. A user wanting instant propagation must touch any assignment row (e.g. cycle settings save, which already bumps the lowest-sort_order row to trigger realtime per `updateScreenCycleSettings`).

## Verification

- `npx tsc --noEmit` — clean for all files in this plan's scope (`ScreenPageCycle`, `ScreenDeltagere`, `ScreenHvor`, `ScreenOpgaver`, `ScreenProgram`, `screenAssignments`, `[uuid]/page.tsx`). Two errors remain in `src/components/admin/MenuManager.tsx` and `src/app/(admin)/admin/sider/page.tsx`, but those files belong to Plan 08-03 (admin UI, Wave 2 parallel sibling); they are out of this plan's scope. Filtered grep confirms zero errors in the 08-05 file set.
- All 4 new screen renderers are pure presentational React function components. None contain `'use client'`, none import from `'@supabase/...'`, none invoke server actions. Each receives its data as a typed prop.
- `ScreenPageCycle` strict-blank invariant preserved: `if (items.length === 0) return <div className="h-screen w-screen bg-black" />` — see line ~210 of the new file.
- `ScreenPageCycle` `animateIn` initial-`true` fix preserved: `const [animateIn, setAnimateIn] = React.useState(true)` — see line ~143 of the new file. Cycle step still resets to `false` before bumping `currentIndex` so transitions still animate from start to end.
- `[uuid]/page.tsx` screen branch passes a single `Promise.all` over the assignment-list fetch and the cycle-settings fetch; static-item hydration lives inside the assignment-list fetch (parallelised internally).

## Mental walk-through — 5 success-criteria scenarios

1. **Admin assigns Galleri only.**
   `hasAnyScreenAssignments` returns true (one static row). `getHydratedMixedScreenItems` returns `[{ kind: 'static', staticKey: 'galleri', data: { config, items } }]`. Cycler mounts with `items.length === 1` so no interval is created (cycle effect early-returns at `if (items.length <= 1)`). `CycleItemView` dispatches the `galleri` branch and renders `<ScreenDefault config={...} items={...} />` — same component the bare-screen path uses. Result: gallery renders continuously.

2. **Admin assigns Program only.**
   Same flow as scenario 1 but `staticKey === 'program'`. `CycleItemView` resolves to `<ScreenProgram items={data.items} />` — fullscreen typography (text-7xl heading, text-3xl row titles), parent-child nesting preserved. Continuous render.

3. **Admin assigns Deltagere only.**
   `data.guests` is the non-screen guest rows (`.neq('type', 'screen')` in `hydrateStaticItemData`). `CycleItemView` dispatches `<ScreenDeltagere guests={data.guests} />` — name + relation + type-label badge laid out in a 1/2/3-column grid. Continuous render.

4. **Admin assigns Hvor only.**
   `data.events` is the events list joined with `event_locations`. `<ScreenHvor events={data.events} />` renders each event as a card with name, time, address, embedded Google Maps iframe (via the same `extractMapsEmbedSrc` security filter `EventMapDisplay` uses), and per-location detail block. The mobile-only `MapOverlay` bottom-sheet wrapper is intentionally NOT used — the map is inline and full-width. Continuous render.

5. **Mixed cycle: Galleri + dynamic Welcome page.**
   `getHydratedMixedScreenItems` returns `[{ kind: 'static', staticKey: 'galleri', data: ... }, { kind: 'page', id, title: 'Welcome', content: ... }]` ordered by `sort_order` (single space across kinds per 08-02 Decision B1). Cycler `items.length === 2` so the interval kicks in at `cycle_seconds * 1000 ms`. Each tick: `setPreviousIndex(currentIndex)` → `setAnimateIn(false)` → `setCurrentIndex((i) => (i + 1) % 2)`. The double-render absolute-layer pattern in the JSX renders both `previous` and `current` simultaneously during the 400ms transition. Fade transition applies the same `opacity` style to both layers (incoming 0→1, outgoing 1→0) regardless of `kind`. Slide transition applies `transform: translateX` the same way. Result: a screen rotating between gallery and welcome page every `cycle_seconds`, with the same fade/slide/none mechanics that page-only cycles already use.

Bonus walk-through (Opgaver + strict-blank):
6. **Admin assigns Opgaver, but the static-item visibility map says it's outside its window.**
   `getVisibleScreenAssignmentsMixed` filters the row out at the visibility step. `getHydratedMixedScreenItems` returns `[]`. `hasAnyScreenAssignments` returns true (the row exists), so the screen branch enters cycle mode anyway. Cycler receives `initialItems = []` and renders `<div className="h-screen w-screen bg-black" />` per the strict-blank invariant — does NOT fall through to gallery default. Once the schedule rolls back into the visible window, the next realtime tick (or any other assignment-row change) refetches and the screen lights back up automatically.
