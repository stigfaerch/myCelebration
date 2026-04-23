# Plan 05-03 — SUMMARY

## Status
COMPLETE. All 3 tasks executed. `npx tsc --noEmit` exits 0.

## Files Created

### Server actions / lib
- `src/lib/storage/upload.ts` — `uploadImage()` (10 MB / jpeg|png|heic) + `deleteStorageObjectByUrl()` (best-effort)
- `src/lib/actions/guest/photos.ts` — `getMyPhotos`, `createPhotoFromFile(FormData)`, `deleteMyPhoto(id)`
- `src/lib/actions/guest/memories.ts` — `getMyMemories`, `createMemory(FormData)`, `updateMemory(id, FormData)`, `deleteMyMemory(id)`
- `src/lib/actions/guest/gallery.ts` — `getGalleryItems()` returning `{ config, items }`

### Routes
- `src/app/[uuid]/billeder/page.tsx` — guest photo grid
- `src/app/[uuid]/billeder/kamera/page.tsx` — fullscreen camera overlay (z-50 covers BottomMenu)
- `src/app/[uuid]/minder/page.tsx` — memory CRUD
- `src/app/[uuid]/galleri/page.tsx` — landscape horizontal / portrait vertical via Tailwind `landscape:` variant

### Components
- `src/components/guest/PhotoGrid.tsx` — 3-col grid + lightbox (delete) + camera FAB; empty state with link
- `src/components/guest/Camera.tsx` — `getUserMedia({facingMode:'environment'})`, canvas→blob→jpeg 0.85, toast, permission/unavailable/upload error branches
- `src/components/guest/MemoryForm.tsx` — title/type/when/description/file with removeImage checkbox; new-file preview via `URL.createObjectURL`
- `src/components/guest/MemoryManager.tsx` — guest version: local state + prop sync + create/edit inline + delete with confirm + optimistic filter
- `src/components/guest/GalleryHorizontal.tsx` — single (crossfade), quad (2x2 rolling window), frames (1 large + 2 small) display types; pause on hover; cleanup interval on unmount
- `src/components/guest/GalleryVertical.tsx` — simple scroll, aspect-square, memory overlay

## Verification
| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | EXIT=0 |

All 14 new source files compile clean under strict TypeScript. No existing files modified; scope held to plan.

## Decisions

1. **Storage bucket**: the Supabase `images` bucket (public) must exist. The plan's spec is followed as-is; if the bucket is not provisioned in dev, `uploadImage` throws `Upload fejlede`. Manual reminder: create bucket `images` (public read) in Supabase Studio before first photo upload.
2. **Camera bottom-menu cover**: implemented as specified — `/{uuid}/billeder/kamera` renders inside the normal `GuestLayoutShell` but the page root is `<div className="fixed inset-0 z-50 bg-black">` so it visually covers the BottomMenu (which is `fixed bottom-0` at default z-index). No layout changes required.
3. **HEIC limitation**: HEIC is accepted by the upload validator (`image/heic`), but HEIC preview/browser rendering depends on the client. `<img>` tags will not render HEIC in most browsers. Guests on iOS capturing via the web Camera component always produce `image/jpeg` (via `canvas.toBlob('image/jpeg', 0.85)`), so the HEIC path is only hit for file-picker uploads in the memory form. Future: consider server-side HEIC→JPEG conversion or reject HEIC at the form level if render parity matters.
4. **Gallery source reuse**: Phase 4's `getGalleryConfig` was reused directly — inspection confirms it does NOT call `assertAdmin` (only `updateGalleryConfig` does). Safe for guest read. `ensureGalleryConfig` insert path also has no admin guard.
5. **Screen override orphan cleanup in guest delete**: the admin-guarded `clearScreenOverridesFor` is NOT called from guest paths. Logic duplicated inline in `deleteMyPhoto` and `deleteMyMemory` with best-effort `try/catch`. Matches plan guidance.
6. **Memory form image preview**: new-file preview uses `URL.createObjectURL` with cleanup via `useEffect` return. Existing image + "Fjern billede" checkbox adds `removeImage=true` to FormData. Choosing a new file auto-clears `removeImage`.
7. **Gallery displays**: all 3 display types implemented (single/quad/frames) with auto-rotation via `setInterval`, cleared on unmount. Pause on hover (desktop). Empty state centered.

## Issues / TS workarounds

- **Supabase untyped**: `.from()` returns `any` rows. Cast explicitly at read sites:
  - `(data ?? []) as Photo[]`
  - `(memory as { image_url: string | null }).image_url` after `.maybeSingle()` to access single-row fields
  - Typed iteration in `gallery.ts`: `for (const row of (data ?? []) as Array<{...}>)`
- **Thenable catch pattern**: The plan noted Supabase queries are thenable-but-not-always-catchable. Resolved by wrapping screen_state cleanup updates in `try { await ... } catch {}` inside an async context. No `.then().catch()` chain used.
- **`crypto.randomUUID()`**: used in `uploadImage` — available in Node 19+ / Next.js runtime. No polyfill needed.
- **`File` in FormData**: `instanceof File` narrows the type correctly. Server action parameters accept `FormData` directly per Next.js 15 server-action calling convention.
- **Base UI Button `render` prop**: used in empty state (`<Button render={<Link .../>}>`) — supported via `BaseUIComponentProps`. The project already uses this pattern in `BottomMenu` (SheetTrigger).
- **No new dependencies**: all deliverables use existing `lucide-react`, `@base-ui/react`, `next`, `@supabase/supabase-js`.

## Pre-existing notes observed (not fixed — out of scope)

- Admin `MemoryManager` uses `window.confirm`; we match that pattern in guest `MemoryManager` and `PhotoGrid` for consistency. Replacing with a custom dialog is a future UX task.
- `getGalleryConfig` creates a default config row on first call; this could race under high concurrency on a fresh install. Pre-existing issue — not introduced here.

## Handoff for Phase 6 (realtime)

The gallery is currently server-rendered with static data at request time. To live-update when new photos/memories arrive:

1. **Supabase Realtime subscription** on `photos` (INSERT, UPDATE — for `is_active` toggles) and `memories` (INSERT where `image_url IS NOT NULL`, UPDATE, DELETE).
2. Convert `GalleryHorizontal` to accept a `channelKey` (e.g., gallery config id) and subscribe via `supabase.channel(...)` from the browser-side client. Use `@supabase/supabase-js` with `NEXT_PUBLIC_SUPABASE_ANON_KEY` (server-only service role must never reach the client).
3. On INSERT, prepend to `items`. On DELETE, filter. Re-sort by timestamp.
4. The `gallery_config` table should also be subscribed to so config changes (source / display_type / interval_seconds / show_memory_text / filters) hot-apply without reload. For filter changes (time windows), the simplest approach is `router.refresh()` on config-update event — the server query will re-run.
5. `GalleryVertical` does not need auto-rotation but should still live-update for new arrivals.
6. Consider a small `GalleryLive` wrapper client component that owns the subscription and passes `items` down to both `GalleryHorizontal`/`GalleryVertical`. Current page already separates them via Tailwind `landscape:` variant — the wrapper could sit above both.
7. Screen overrides for `photo` / `memory` / `gallery` are already cleaned up on guest delete — realtime subscribers on screen routes (Phase 6) can rely on these without further changes.

## Scope discipline

- Did NOT modify any files outside the list.
- Did NOT touch Plan 05-02 files (forside, opgaver, performances, choices, invitations, tasks components/actions).
- Did NOT modify layout, BottomMenu, middleware, or any existing action.
- No new npm dependencies installed.
