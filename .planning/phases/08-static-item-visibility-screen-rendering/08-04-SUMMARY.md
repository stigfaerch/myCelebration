# Plan 08-04 — Guest integration: menu filter + route visibility guards

## Status
**Complete**

## Files modified
- `/home/stigf/projects/myCelebration/src/lib/actions/settings.ts`
- `/home/stigf/projects/myCelebration/src/app/[uuid]/galleri/page.tsx`
- `/home/stigf/projects/myCelebration/src/app/[uuid]/deltagere/page.tsx`
- `/home/stigf/projects/myCelebration/src/app/[uuid]/hvor/page.tsx`
- `/home/stigf/projects/myCelebration/src/app/[uuid]/opgaver/page.tsx`
- `/home/stigf/projects/myCelebration/src/app/[uuid]/minder/page.tsx`
- `/home/stigf/projects/myCelebration/src/app/[uuid]/billeder/page.tsx`
- `/home/stigf/projects/myCelebration/src/app/[uuid]/billeder/kamera/page.tsx`
- `/home/stigf/projects/myCelebration/src/app/[uuid]/program/page.tsx`

Files NOT modified (intentional):
- `getResolvedNavForAdmin` in `settings.ts` — admin must continue to see hidden items with badges
- Dynamic page route `[uuid]/p/[slug]/page.tsx` — already had visibility guard from Phase 6
- `[uuid]/page.tsx` (forside) — out of scope; home is always available

## Visibility-key mapping confirmed

| Route | static_key | Source of truth |
|---|---|---|
| `/{uuid}/galleri` | `galleri` | `STATIC_NAV_META.galleri` |
| `/{uuid}/deltagere` | `deltagere` | `STATIC_NAV_META.deltagere` |
| `/{uuid}/hvor` | `hvor` | `STATIC_NAV_META.hvor` |
| `/{uuid}/opgaver` | `tasks` | `STATIC_NAV_META.tasks` |
| `/{uuid}/minder` | `minder` | `STATIC_NAV_META.minder` |
| `/{uuid}/billeder` | `photos` | `STATIC_NAV_META.photos` |
| `/{uuid}/billeder/kamera` | `camera` | `STATIC_NAV_META.camera` |
| `/{uuid}/program` | `program` | `STATIC_NAV_META.program` |

All 8 keys match the closed set defined in `STATIC_NAV_KEYS` (`src/lib/guest/navItems.ts`). Forside (`/{uuid}`) is intentionally excluded — it has no `static_key` and is the always-available home.

## Implementation summary

### Task 1 — `getResolvedNavForGuest` extended
- Added `getStaticItemVisibilityMap` import from `@/lib/actions/staticItemVisibility`.
- Extended the `Promise.all` block to fetch the static-visibility map alongside `app_settings.nav_order` and `pages` — single round-trip, no extra latency vs. the previous two-query baseline.
- In the `kind: 'static'` branch, looked up `staticVisibilityMap[item.key]`. If an entry exists AND `isPageVisibleNow(entry)` is false, the item is skipped from the guest nav. Default behavior preserved: a static key with NO entry is fully visible (the absence-of-record contract from 08-01).
- `getResolvedNavForAdmin` left untouched — admin still sees hidden static items in the menu editor with badges (08-03's responsibility).
- Reused `isPageVisibleNow` from `src/lib/guest/navItems.ts` directly because the `StaticItemVisibility` shape is column-compatible with `pages` (Decision A1 in 08-01 was made specifically to enable this).

### Task 2 — Per-route `notFound()` guards
Pattern applied consistently to all 8 routes:

```tsx
import { notFound } from 'next/navigation'
import { getStaticItemVisibilityMap, isStaticItemVisibleNow } from '@/lib/actions/staticItemVisibility'

// after auth (resolveGuest / assertNotScreen):
const visibilityMap = await getStaticItemVisibilityMap()
if (!(await isStaticItemVisibleNow('<KEY>', visibilityMap))) notFound()
```

Auth-first ordering preserved per route:
- **galleri**: original page had no explicit auth call (auth happens inside `getGalleryItems`). Added explicit `await resolveGuest()` before the visibility check to match the dynamic-page model and ensure 401s land before 404s. Net: one extra fast cookie lookup; same DB read profile because `getGalleryItems` already calls `resolveGuest` internally (the second call is request-scoped and cheap).
- **deltagere, hvor, program**: already called `resolveGuest()` first — visibility check inserted immediately after.
- **opgaver**: visibility check placed after `resolveGuest()` and before the 4-call `Promise.all`. Hidden routes 404 without paying the cost of the 4 task-related queries.
- **minder, billeder**: original pages had no explicit auth call (auth was internal to the data fetcher). Added explicit `await resolveGuest()` before the visibility check.
- **kamera**: kept existing `assertNotScreen()` (which resolves the guest and rejects screen types). Visibility check inserted immediately after; the camera page deliberately has no bottom menu, but URL guard still applies as the plan required.

`isStaticItemVisibleNow` is awaited even though logically synchronous when `map` is passed — this is a documented constraint of `'use server'` modules from 08-01.

## Performance note

**1 extra DB query per static guest page render.** Each of the 8 static routes now executes one additional `select` against `static_item_settings` (8 rows max). The query is a flat select with no joins. For a low-traffic admin app (single-event scope), this is negligible — the table is keyed by primary key and effectively returns from Postgres's shared buffer cache after the first read.

For `getResolvedNavForGuest` specifically, the visibility map fetch is bundled into the existing `Promise.all`, so guest layouts that already render the bottom menu pay zero added latency (parallel fetch).

If hot-path performance ever becomes an issue, follow-ups could:
- Cache the visibility map at the request level via `unstable_cache`/`revalidateTag`
- Push the bottom-menu render into a Cache Components `use cache` boundary (Next.js 16) — would invalidate via `revalidatePath('/[uuid]', 'layout')` (already wired in `updateStaticItemVisibility`)

Neither optimization is required for v1.

## Verification

### Type-check
```
$ npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "MenuManager.tsx" | grep -v "sider/page.tsx"
(no output)
```

**Result: 0 errors in this plan's surface.**

The two remaining tsc errors in the workspace are in files owned by parallel-running Plan 08-03 (`src/components/admin/MenuManager.tsx` and `src/app/(admin)/admin/sider/page.tsx`). Those are expected and will resolve when 08-03 completes; they do NOT block this plan's deliverables.

### Pattern audit
Confirmed via grep that all 8 routes call `notFound()` with the right key:

| Route | Key checked | Auth before visibility |
|---|---|---|
| galleri/page.tsx | `'galleri'` | `resolveGuest()` |
| deltagere/page.tsx | `'deltagere'` | `resolveGuest()` |
| hvor/page.tsx | `'hvor'` | `resolveGuest()` |
| opgaver/page.tsx | `'tasks'` | `resolveGuest()` |
| minder/page.tsx | `'minder'` | `resolveGuest()` |
| billeder/page.tsx | `'photos'` | `resolveGuest()` |
| billeder/kamera/page.tsx | `'camera'` | `assertNotScreen()` |
| program/page.tsx | `'program'` | `resolveGuest()` |

### Settings resolver audit
- `getResolvedNavForGuest`: visibility filter applied to `kind: 'static'` items via `staticVisibilityMap[item.key]` lookup + `isPageVisibleNow` evaluation. Confirmed.
- `getResolvedNavForAdmin`: unchanged. Confirmed via line-level diff of `src/lib/actions/settings.ts`.

## Manual test list for the user

After Plan 08-03 completes (admin UI for visibility) and the user has applied migration 010:

1. **Toggle `is_active=false` for Galleri in admin/sider**:
   - Galleri vanishes from the guest bottom menu on the next guest render
   - `GET /{uuid}/galleri` returns 404 (Next.js not-found page)
   - Re-toggling `is_active=true` restores both menu visibility and URL access

2. **Set `visible_from` to a future date for Deltagere**:
   - Deltagere disappears from the bottom menu
   - `GET /{uuid}/deltagere` returns 404
   - Setting `visible_from` back to null (or past date) restores access

3. **Set `visible_until` to a past date for Program**:
   - Program disappears from the bottom menu
   - `GET /{uuid}/program` returns 404
   - Clearing `visible_until` restores access

4. **Toggle each remaining key in turn (`tasks`, `photos`, `camera`, `minder`, `hvor`)**:
   - Verify menu hide + 404 behavior on all 8 routes
   - Camera page (kamera) has no bottom-menu entry but URL still 404s when hidden

5. **Forside `/{uuid}` regression check**:
   - Visit `/{uuid}` with EVERY static key set to `is_active=false`
   - Forside still loads (it's not a static menu item — its visibility is independent)

6. **Admin still sees hidden items**:
   - Open `/admin/sider` while Galleri's `is_active=false`
   - Galleri row is still present in the menu manager (with whatever hidden-badge UI 08-03 ships)

7. **Default behavior on first deploy**:
   - Without ever opening the admin visibility editor (no rows in `static_item_settings`), all 8 static items render normally and all 8 URLs serve 200. This is the absence-of-record default from 08-01.

## Risks / Follow-ups

- **No realtime invalidation**: per 08-01's note, `static_item_settings` is not in the `supabase_realtime` publication. A live screen rendering a static item that gets hidden mid-event will not update until the next normal trigger (route refetch). Acceptable for v1; documented in 08-CONTEXT "Out of Scope".
- **Per-page visibility map fetch**: each of the 8 static routes fetches the full map independently. Across a guest session navigating all 8 routes, that's 8 selects of ~8 rows each. The previous architecture review (08-01 risk note) accepted this trade-off rather than introduce request-level caching; the implementation here matches that decision.
- **Galleri auth tightening**: this plan added an explicit `await resolveGuest()` to `galleri/page.tsx` (previously absent at the page level — auth was indirect via `getGalleryItems`). This is a deliberate parity fix matching the dynamic-page model. No regression: if a non-guest reaches the page, `resolveGuest()` already throws `Unauthorized` and the existing error boundary handles it. Same true for `minder` and `billeder`.
- **Plan 08-03 dependencies**: this plan does NOT exercise the visibility filter end-to-end because the admin UI to flip flags lives in Plan 08-03. Manual tests above presume 08-03 has shipped. SQL-level verification (insert a row into `static_item_settings` with `is_active=false`, hit the route) is possible standalone today.
