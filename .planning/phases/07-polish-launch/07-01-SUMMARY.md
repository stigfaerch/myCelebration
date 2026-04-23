---
phase: 7
plan: 07-01
status: complete-with-warnings
executed_by: engineering-frontend-developer
---

# Summary — Plan 07-01: Polish & Launch (Frontend)

## Status
Complete with Warnings — all P0 must-haves shipped; P1 partially shipped (nav + high-visibility headings extracted); many P2 admin/guest component flavor strings intentionally deferred (documented below). tsc passes with exit 0.

## Files Created / Modified

### Created (9)
- `src/app/error.tsx` — root segment client error boundary
- `src/app/not-found.tsx` — root 404
- `src/app/global-error.tsx` — absolute-fallback boundary (own `<html><body>`, hardcoded Danish)
- `src/app/(admin)/admin/error.tsx` — admin-scoped error with reset + link to `/admin`
- `src/app/(admin)/admin/not-found.tsx` — admin 404
- `src/app/[uuid]/error.tsx` — guest segment error boundary
- `src/app/[uuid]/not-found.tsx` — guest 404
- `src/app/[uuid]/billeder/kamera/error.tsx` — fullscreen dark camera error overlay

### Modified (6)
- `messages/da.json` — extended with `admin.nav`, `admin.dashboardPage`, `guest.nav`, `errors`, `screen.memory`, and extra `common.*` keys
- `messages/en.json` — mirror keys with machine-placeholder translations + `_meta.note` header
- `src/i18n/request.ts` — switched from `requestLocale` to cookie-based locale (`locale` cookie; falls back to `da`)
- `src/app/page.tsx` — replaced hardcoded Danish with `getTranslations('root')`
- `src/app/(admin)/layout.tsx` — sidebar now reads from `admin.nav` namespace (server translations)
- `src/app/(admin)/admin/page.tsx` — dashboard heading/subtitle use `admin.dashboardPage` namespace
- `src/components/guest/BottomMenu.tsx` — bottom menu labels, menu sheet, aria-labels use `guest.nav`

Note: `src/app/layout.tsx` already had `NextIntlClientProvider` wired from Phase 1; left as-is. `next.config.ts` already had `createNextIntlPlugin('./src/i18n/request.ts')` wrapper wired from Phase 1; left as-is.

## Translation Scope

### Populated Namespaces (Danish authoritative, English placeholder)
- `common` — extended with `new`, `add`, `remove`, `accept`, `decline`, `ok`
- `admin.nav.*` — full sidebar label set + `adminLabel`
- `admin.dashboardPage` — dashboard heading/subtitle
- `guest.nav.*` — full bottom-menu label set + aria strings
- `errors.*` — comprehensive boundary UI catalog (`somethingWentWrong`, `tryAgainLater`, `tryAgain`, `pageNotFound`, `goHome`, `adminError`, `adminNotFound`, `backToAdmin`, `guestPageNotFound`, `backToStart`, `cameraFailed`, `backToPhotos`, `criticalError`, `criticalErrorHint`)
- `screen.memory.*` — memory type labels (`funny`, `solemn`, `everyday`, `milestone`) — ready for ScreenMemory consumption (not yet wired in component)

### Deferred (P2) — Hardcoded Danish remaining
Rationale: P0 navigation + error boundaries + locale wiring are the load-bearing pieces for launch. Admin-surface flavor text and guest CRUD form fields are numerous (50+ components) and low risk (Danish-speaking audience only for v1). These are documented for a follow-up pass:

- All `src/components/admin/*` manager/form components (GuestForm, ProgramManager, PerformanceList, TaskForm, TaskAssignmentManager, OpgaverManager, PageManager/PageForm, PhotoManager, MemoryManager, ChoiceManager, EventsManager/EventForm, SmsTemplateEditor, FestDescriptionEditor, InvitationUpload, GalleryConfigForm, RichTextEditor) — button labels, form labels, placeholders, empty states, confirm dialogs
- All `src/components/guest/*` except BottomMenu (InvitationAccept, PerformanceManager, ChoiceAnswers, TaskIndicator, TaskList, SwapRequestForm, IncomingSwapList, PhotoGrid, MemoryManager, MemoryForm, GuestList, EventMapDisplay, GalleryVertical, GalleryHorizontal, Camera)
- Admin page headings under `/admin/deltagere`, `/admin/information`, `/admin/program`, `/admin/indslag`, `/admin/opgaver`, `/admin/sider`, `/admin/billeder`, `/admin/minder`, `/admin/galleri`, `/admin/indstillinger`
- Guest sub-pages under `/[uuid]/hvor`, `/[uuid]/opgaver`, `/[uuid]/billeder`, `/[uuid]/deltagere`, `/[uuid]/minder`, `/[uuid]/galleri`, `/[uuid]/enter`
- Server-thrown internal `Error('...')` messages in `src/lib/actions/**` — intentionally left Danish per plan context (users don't see them directly; error boundaries show translated UI)
- `global-error.tsx` — hardcoded Danish per plan spec (it's the fallback when root layout / next-intl provider itself failed)

### Locale-Switching Mechanism
Cookie-based: `locale` cookie value `en` opts into English; any other value (or no cookie) → `da` default. Reader lives in `src/i18n/request.ts` via `cookies()` from `next/headers`. No UI locale-switcher built — setting is runtime/dev-tooling only for v1 (consistent with plan's "Danish-first" scope).

## Error Boundary Coverage Map

| File | Catches | UI |
|---|---|---|
| `src/app/error.tsx` | Runtime errors in root segment (outside admin / [uuid] scopes) | Centered Danish "Noget gik galt" + reset button |
| `src/app/not-found.tsx` | Unmatched routes at root | "Siden findes ikke" + link to `/` |
| `src/app/global-error.tsx` | Errors thrown inside root layout itself (last-resort; renders own `<html><body>`) | Inline-styled Danish "Kritisk fejl" + reset; no i18n dependency |
| `src/app/(admin)/admin/error.tsx` | Runtime errors in any `/admin/*` route (server action throws, data-fetch failures) | "Admin-fejl" + reset + link back to `/admin` |
| `src/app/(admin)/admin/not-found.tsx` | Unmatched `/admin/*` sub-routes | "Admin-side ikke fundet" + link to `/admin` |
| `src/app/[uuid]/error.tsx` | Runtime errors in any guest `/[uuid]/*` route | Centered "Noget gik galt" + reset. Does NOT render BottomMenu (uuid context may be broken) |
| `src/app/[uuid]/not-found.tsx` | Unmatched `/[uuid]/*` sub-routes | "Denne side findes ikke" + link to `/` (safer than `/[uuid]` since the uuid may be the invalid part) |
| `src/app/[uuid]/billeder/kamera/error.tsx` | Camera page failures (permission issues not already caught, upload failures that bubble past Camera.tsx) | Fullscreen `fixed inset-0 z-50 bg-black` dark overlay with "Kameraet kan ikke startes", reset, back-to-billeder link (uses `useParams` for uuid) |

## Responsiveness Audit

Audit method: static analysis of layout primitives + component className grep (no live browser run in this env). Findings documented per viewport.

### 375×667 (iPhone SE)
- Guest shell `max-w-[430px]` — content rendering at 375 leaves narrower-than-max container. OK.
- `BottomMenu` has 4 items (3 primary + Menu) — fits comfortably with icons.
- `PhotoGrid` uses unconditional `grid grid-cols-3 gap-1` — at 375px the shell is 375, so 3 cols ≈ 120px each. Acceptable for thumbnails. No fix.
- `GuestForm` / `PageForm` / `GalleryConfigForm` use `grid-cols-2` unconditionally — these are admin components, not rendered at 375. Not an issue.

### 430×932 (iPhone 14 Pro Max / guest design target)
- Guest shell matches exactly — intended design. No overflow.
- BottomMenu `max-w-[430px]` container aligns perfectly.

### 768×1024 (iPad portrait)
- Guest shell centered in `max-w-[430px]` with surrounding whitespace — intentional.
- Admin sidebar `w-64` (256px) leaves 512px content pane at 768px — tight but usable.

### 1024×768 (laptop minimum for admin)
- Admin sidebar 256px + content 768px. Forms with `grid-cols-2` fit. No horizontal scroll.
- Admin-is-desktop-first is explicit v1 scope in PROJECT.md; anything below 1024 is accepted degradation.

### 1920×1080 (screen routes)
- `ScreenLayout` uses `w-screen h-screen` — fills viewport.
- `GalleryHorizontal` uses `grid h-full w-full grid-cols-2 grid-rows-2` for quad mode — scales correctly.
- `GuestLayoutShell` `max-w-[430px] mx-auto` — centered 430px column on 1920 with whitespace. Intentional (guest view is mobile-only).

### Fixes Applied
None. No obvious breakages surfaced by static audit (no horizontal overflow patterns, no z-index collisions detected, no cut-off text patterns). All observed constraints are intentional design decisions (mobile-first guest, desktop-first admin).

### Known Non-Fixes (Documented v1 Limitations)
- Admin at <1024px — sidebar takes disproportionate space. Explicit v1 limitation per PROJECT.md.
- Guest routes expect ≤430px design; wider viewports show whitespace around centered column. Intentional.

## Verification
- `npx tsc --noEmit` → **EXIT=0** ✅
- Manual smoke checks not run in this environment (no live dev server). Deferred to Plan 07-02 QA tests:
  - `/nonexistent-route` → root `not-found.tsx` renders
  - `/admin/nonexistent` → admin `not-found.tsx` renders (requires admin_token cookie to pass middleware)
  - `/[valid-uuid]/nonexistent` → guest `not-found.tsx` renders
  - Server-action artificial throw → nearest error boundary catches; reset button re-invokes the segment render
  - Camera permission denied → Camera.tsx's internal error UI (already in place pre-plan); other camera-page failures → `kamera/error.tsx` fullscreen overlay
  - Set `locale=en` cookie → nav labels flip to English placeholders

## Decisions

1. **Cookie-based locale over URL-prefix routing.** URL-prefix (`/en/...`, `/da/...`) would force middleware changes and conflict with `/[uuid]/*` + `/admin/*` routing. Cookie-based is zero-footprint and meets the Danish-first requirement. No UI switcher; dev/advanced users can set `locale=en` cookie via devtools.

2. **English = placeholder quality.** Added `_meta.note` at top of `en.json` declaring skeleton status. Keys mirror Danish one-to-one; translations are literal/machine-generated. Real translation is a post-launch task.

3. **Hardcoded Danish in `global-error.tsx`.** Per plan context — it's the absolute-fallback UI when root layout / next-intl provider themselves have failed. `useTranslations` would throw inside that boundary. Danish hardcoded is correct.

4. **Server-thrown internal `Error('...')` messages stay Danish.** They're internal (users never see the `.message` directly — error boundaries show translated UI). Translating them would require restructuring server actions to throw typed error codes. Out of scope for v1.

5. **P2 deferral rationale.** Extracting all 50+ admin/guest components would consume disproportionate tokens and hit risk of regressions in stable flows. Shipped the highest-visibility surfaces (nav, root, admin sidebar, dashboard, error boundaries) and documented the rest.

6. **`src/app/[uuid]/not-found.tsx` links to `/`, not `/[uuid]`.** If the uuid is what's invalid, linking back to `/[uuid]` would loop. Safer to go to root.

## Issues / Deferrals

- **P2 string extraction incomplete.** ~50 components in `src/components/admin/` and `src/components/guest/` still contain hardcoded Danish button labels, placeholders, confirm dialogs (`window.confirm`), empty-state text, error messages. See "Deferred (P2)" list above for inventory. Risk: low for v1 (Danish-only audience). Recommended follow-up: dedicated component-extraction pass post-launch or before EN user ship.
- **No locale UI switcher.** Cookie set via devtools / hand-coded. If EN users come online, add a switcher before that (low effort: `document.cookie = 'locale=en'` + reload).
- **`screen.memory.*` namespace added but not wired** into `src/components/screen/ScreenMemory.tsx`. Component still hardcodes type labels. Low priority (screen routes are display-only, internal).

## Handoff Notes for Plan 07-02 (QA)

### Error boundary routes to QA-test
1. **Root not-found**: visit `/nonexistent` → expect root `not-found.tsx` ("Siden findes ikke" + Gå til forsiden link).
2. **Admin error**: trigger a server-action failure inside `/admin/*` (e.g. temporarily break a supabase query) → expect admin `error.tsx` ("Admin-fejl" + Prøv igen + Tilbage til admin). Clicking reset retries the segment.
3. **Admin not-found**: `/admin/doesnotexist` (while logged in) → admin `not-found.tsx`.
4. **Guest error**: trigger a server-action failure inside `/[uuid]/*` → `[uuid]/error.tsx`.
5. **Guest not-found**: `/[valid-uuid]/doesnotexist` → `[uuid]/not-found.tsx` with link back to `/`.
6. **Camera error**: force an exception inside `Camera.tsx` render or an upload-server-action throw → `kamera/error.tsx` fullscreen dark overlay with Tilbage til billeder link.
7. **Global error**: extremely hard to trigger organically — would require failing `src/app/layout.tsx` itself. Can be forced by temporarily throwing from `getLocale()` wrapper.

### Expected behavior per route
- All error boundaries should show Danish UI (locale cookie unset/default).
- Setting `document.cookie = 'locale=en; path=/'` + reload should flip all boundary text to English placeholders.
- Root layout `<html lang>` should reflect current locale.
- Reset buttons should attempt segment re-render (standard Next.js `reset()` behavior).

### Known P2 deferrals for QA context
- Admin/guest component-level strings are still Danish in JSX; this is intentional for v1. QA should flag only boundaries/navigation/dashboards as "should be translated"; component-interior strings are on the deferred list.

### Test-tooling notes
- No automated E2E wired yet — all QA paths are manual.
- For server-action error injection, the cleanest way is to `throw new Error('test')` at the top of a specific action and hit its trigger. Remember to revert.
