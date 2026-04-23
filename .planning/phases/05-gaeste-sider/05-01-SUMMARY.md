# Plan 05-01 — Summary

## Status
Complete.

## Files created / modified

Created:
- `src/lib/auth/resolveGuest.ts` — `resolveGuest`, `assertGuest`, `assertNotScreen` helpers reading middleware-set `x-guest-id` / `x-guest-type` headers.
- `src/components/guest/BottomMenu.tsx` — Client component bottom nav. Primary links: Hjem, Opgaver, Billeder. Menu sheet (shadcn `Sheet` / Base UI) with Hvor, Deltagere, Minder, Galleri.
- `src/components/guest/GuestLayoutShell.tsx` — Server component shell (header, main, conditional BottomMenu). `showBottomMenu` prop defaults to `true`.
- `src/components/guest/EventMapDisplay.tsx` — Server-compatible map/event display. Uses `dangerouslySetInnerHTML` for admin-trusted `google_maps_embed` and plain `<img>` with ESLint disable comment for `map_image_url`.
- `src/components/guest/GuestList.tsx` — Server-compatible list. Type badges only for `couple` ("Par") and `family` ("Familie").
- `src/app/[uuid]/hvor/page.tsx` — Lists events with locations, renders via `EventMapDisplay`.
- `src/app/[uuid]/deltagere/page.tsx` — Lists non-screen guests via `GuestList`.

Modified:
- `src/app/[uuid]/layout.tsx` — Removed inline `GuestLayout` placeholder; now delegates to `GuestLayoutShell` with `uuid`. Screen layout branch unchanged. Minor: typed the single-record supabase result via a small inline cast to keep strict mode happy (`data as { name?: string } | null`).

## Verification

`npx tsc --noEmit` → exit code `0`. No warnings.

## Decisions

1. **Camera-route bottom-menu opt-out strategy.** The layout is a Server Component; `usePathname()` cannot be called there, and splitting into route groups would require restructuring all existing `/[uuid]/*` routes. Recommendation for Plan 05-03: keep `showBottomMenu = true` at the layout level and have the camera page render a **fullscreen overlay** (e.g. `fixed inset-0 z-50 bg-black`) that covers the bottom nav while active. This keeps the layout simple, avoids prop-drilling pathname awareness, and gives Plan 05-03 full control of the camera chrome.
2. **Sheet side.** Chose `side="bottom"` for the overflow menu so it rises from the bottom bar — feels natural on mobile and keeps visual continuity with the nav.
3. **Sheet trigger.** Used Base UI `SheetTrigger` `render` prop (this codebase's shadcn wraps Base UI, not Radix — no `asChild`).
4. **Active-state detection.** Exact pathname match (`pathname === href`). Root `/{uuid}` only highlights on the home page itself; subroutes highlight their own entry. Good enough for the current route set.
5. **Supabase null-typing.** Supabase client is untyped, so `.single()` returns `any`. The layout casts the result minimally (`{ name?: string } | null`) to satisfy strict TS without introducing a generated-types dependency.
6. **Badge label logic.** `person` gets no badge (too noisy when most guests are individuals); `couple`/`family` get small muted badges, matching the plan spec.
7. **Icons.** `lucide-react` for both primary and secondary items (Home, CheckSquare, Image, MapPin, Users, BookHeart, LayoutGrid, Menu). `Image` is imported as `ImageIcon` to avoid shadowing the global.

## Issues
None.

## Handoff notes

### For Plan 05-02
- Auth helpers live at `@/lib/auth/resolveGuest`:
  - `resolveGuest(): Promise<ResolvedGuest>` — throws `'Unauthorized'` if headers missing.
  - `assertGuest(guestId: string): Promise<ResolvedGuest>` — throws `'Forbidden'` if IDs mismatch.
  - `assertNotScreen(): Promise<ResolvedGuest>` — throws `'Not available for screens'` for screen guests.
- `GuestType` union exported: `'person' | 'couple' | 'family' | 'screen'`.
- All helpers rely on middleware-injected `x-guest-id` / `x-guest-type` headers — safe inside any `/[uuid]/*` server component or server action.

### For Plan 05-03 (camera route)
- Do **not** try to hide the bottom menu by branching in `layout.tsx` (see Decision 1).
- Render the camera UI inside `src/app/[uuid]/billede/page.tsx` (or wherever) as a fullscreen overlay: `fixed inset-0 z-50 bg-black` (or similar), which will sit on top of both the header and `BottomMenu` (both use `z-auto` / default stacking). The existing layout will keep its `pb-16` padding on main, but the overlay covers it so it's invisible to the user.
- If a future plan needs true opt-out per-route, add an explicit `showBottomMenu` prop path — `GuestLayoutShell` already supports it.
