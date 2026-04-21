# Plan 01-03 Summary

## Status
Complete

## Files Created/Modified
- `src/middleware.ts` — created: UUID-based guest routing + admin routing, cookie auth, Supabase UUID validation, x-guest-id/x-guest-type header forwarding
- `src/app/page.tsx` — modified: replaced Next.js default with Danish invitation prompt
- `src/app/layout.tsx` — modified: added NextIntlClientProvider, getLocale/getMessages, updated metadata title
- `src/app/[uuid]/enter/page.tsx` — created: guest password entry page with server action
- `src/app/[uuid]/layout.tsx` — created: branching layout (ScreenLayout vs GuestLayout) driven by x-guest-type header; fetches guest name from Supabase
- `src/app/[uuid]/page.tsx` — created: guest home placeholder, screen variant renders "Skærm klar"
- `src/app/admin/login/page.tsx` — created: admin password entry page with server action
- `src/app/(admin)/layout.tsx` — created: desktop sidebar layout with 11 nav links
- `src/app/(admin)/admin/page.tsx` — created: admin dashboard placeholder
- `src/i18n/routing.ts` — created: next-intl routing config, locales [da, en], defaultLocale da
- `src/i18n/request.ts` — created: next-intl request config with dynamic message import
- `messages/da.json` — created: complete Danish translations (common, auth, root, admin, guest namespaces)
- `messages/en.json` — created: complete English skeleton translations
- `next.config.ts` — modified: wrapped with createNextIntlPlugin pointing to src/i18n/request.ts
- `package.json` — modified: next-intl 4.9.1 added as dependency
- `package-lock.json` — modified: lockfile updated

## Verification
| Command | Result | Pass? |
|---------|--------|-------|
| `npx tsc --noEmit` | 0 errors, 0 warnings | Yes |
| `npx tsc --noEmit --strict` | 0 errors, 0 warnings | Yes |
| `git commit` | bba63f7 — 16 files changed, 1195 insertions | Yes |
| `npm run dev` | Requires manual verification (headless env) | N/A |

## Decisions Made

1. **middleware.ts filename retained**: The Vercel plugin validator flagged that Next.js 16 renames `middleware.ts` to `proxy.ts`. Verified against the actual installed Next.js 16.2.4 source (`node_modules/next/dist/lib/constants.js`): `MIDDLEWARE_FILENAME = 'middleware'`. The rename has not landed in this version. `src/middleware.ts` is correct.

2. **supabaseServer in middleware**: The `supabase/server.ts` client throws at module-load time if env vars are missing. This is acceptable — middleware runs server-side where env vars are always present (Vercel sets them in prod, `.env.local` in dev). No wrapping needed.

3. **next-intl without locale URL prefix**: The app uses Danish as default with no `/da/` URL prefix. `defineRouting` with `defaultLocale: 'da'` handles this. No `[locale]` route segment was added — messages are loaded from the root layout via `getLocale()`/`getMessages()` using the request config.

4. **`uuid` param unused in layout.tsx**: The `uuid` extracted from `params` in `UuidLayout` is not used directly (the middleware forwards `x-guest-id` instead). TypeScript is satisfied because the param destructuring is valid. No lint error.

5. **Admin route file conflict**: The plan calls for `src/app/(admin)/admin/page.tsx` (inside the route group) alongside `src/app/admin/login/page.tsx` (outside the group). Next.js resolves these correctly — the route group `(admin)` does not affect the URL path, so `/admin` maps to `(admin)/admin/page.tsx` and `/admin/login` maps to `admin/login/page.tsx`. Middleware protects `/admin/*` and passes `/admin/login` through.

## Issues / Risks

1. **Supabase UUID lookup on every request**: The middleware queries Supabase on every UUID-prefixed request (after cookie check). For high-traffic scenarios this adds latency. A short-lived cache (e.g., Redis or Next.js `unstable_cache`) should be considered in a later phase if performance becomes a concern. The current implementation is correct for this scale.

2. **x-guest-type/x-guest-id headers only set by middleware**: If `[uuid]/layout.tsx` is rendered in a context where middleware did not run (e.g., during static generation or direct server-side calls in test), `guestId` will be null and `guestName` will be empty string. This is safe — the layout gracefully falls back to GuestLayout with no name shown.

3. **Bottom nav uses emoji glyphs**: The guest layout bottom nav uses emoji characters (🏠 📋 📷 ☰) as icon placeholders. These will be replaced with proper icon components (lucide-react) in Phase 2 feature work. No risk to current functionality.

4. **Admin layout uses plain `<a>` tags**: The sidebar links use `<a href>` not `next/link`. This means full page navigation on each click rather than client-side routing. Acceptable for the admin placeholder; should be updated to `Link` from `next/link` in Phase 2.

## Handoff Notes

**Auth cookie flow**: Guest auth uses two sequential checks in middleware — (1) `guest_password` cookie matches `GUEST_PASSWORD` env var, then (2) UUID exists in `guests` table. Only after both pass do downstream layouts receive `x-guest-id` and `x-guest-type` headers. If either fails, middleware redirects before the layout renders.

**Guest type branching**: The `x-guest-type` header value drives layout selection in `[uuid]/layout.tsx`. Current valid values from the guests table are expected to be `'screen'` (fullscreen, no nav) and anything else (mobile guest layout). Phase 2 feature work should not introduce new type values without updating this branch.

**Admin route structure**: Admin pages should be placed inside `src/app/(admin)/admin/` to inherit the sidebar layout. The `(admin)` route group does not appear in the URL — a page at `src/app/(admin)/admin/deltagere/page.tsx` maps to `/admin/deltagere`.

**i18n usage**: Translations are available via `useTranslations()` (client components) and `getTranslations()` (server components) from `next-intl`. English translations are complete skeletons with correct keys — all keys present in `da.json` are mirrored in `en.json`. No missing-key errors should occur.

**Supabase `guests` table schema assumed**: Middleware selects `id` and `type` columns. The UUID layout selects `name`. Phase 2 must ensure the `guests` table has at minimum: `id` (uuid PK), `type` (text), `name` (text).
