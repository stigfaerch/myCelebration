# Project State

## Current Position
- **Phase**: 8 of 8 (complete — review passed with documented follow-up)
- **Status**: Phase 8 review passed in 1 cycle. 4 of 5 warnings resolved; Test #1 (Playwright coverage for Phase 8 features) deferred by user direction as a follow-up.
- **Last Activity**: Phase 8 review passed (2026-04-25)

## Progress
```
[##################] 100% — 22/22 plans complete
```

## Recent Decisions
- Tailwind CSS + shadcn/ui (v4 — CSS-based config, ingen tailwind.config.ts)
- next-intl v4.9.1 som i18n library
- TipTap v3.22.4 installeret (RTE + server-side HTML generation)
- Vercel som deployment target (CLI mangler — `npm i -g vercel` + `vercel link` er pending manuel handling)
- Service role key + Next.js middleware som auth/DB-adgangsmønster
- Base UI i shadcn/ui — `asChild` pattern understøttes IKKE, brug `onClick` handlers
- HMAC-signed admin token (erstatter plaintext cookie) — `src/lib/auth/adminToken.ts`
- `assertAdmin()` på alle muterende server actions
- PL/pgSQL `swap_program_items` RPC for atomisk sort_order swap
- Image handling conventions: original/medium/thumb storage, async processing, fallback chain
- `normalizeGuest()` pattern for PostgREST join-shape drift (untyped Supabase client)
- `clearScreenOverridesFor(type, id)` before deleting any page/photo/memory to avoid dangling screen_state refs
- Guest auth: `resolveGuest()` / `assertGuest(id)` / `assertNotScreen()` via middleware-injected x-guest-* headers

## Manual Actions Required (Supabase Storage)
1. Opret bucket `invitations` i Supabase Dashboard → Storage (public: true)
2. Opret bucket `maps` i Supabase Dashboard → Storage (public: true)
3. Opret bucket `images` i Supabase Dashboard → Storage (public: true) — Phase 5 photos + memories

## Manual Actions Required (First-time setup — still pending)
1. Opret Supabase-projekt på supabase.com
2. Udfyld `.env.local` med rigtige værdier (URL, anon key, service role key, passwords)
3. Kør migreringer: `001_initial_schema.sql`, `002_rls.sql`, `003_program_items_swap_rpc.sql`, `004_swap_accept_rpc.sql`, `005_realtime_rls.sql` i Supabase Dashboard SQL Editor (migration 005 declaratively adds swap_requests + task_assignments + screen_state to the supabase_realtime publication)
4. `npm i -g vercel && vercel link && vercel deploy` for preview-deployment

## Next Action
Phase 8 complete and reviewed. All phases (1–8) complete. See `.planning/phases/08-static-item-visibility-screen-rendering/08-REVIEW.md` for the review findings + deferred-follow-up details.

**Two manual actions required before testing Phase 8 features in production**:
1. Apply migration 010 (`010_static_item_visibility.sql`) in Supabase Dashboard SQL Editor
2. Apply migration 011 (`011_polymorphic_screen_assignments.sql`) in Supabase Dashboard SQL Editor

**Documented follow-up** (deferred by user direction during Phase 8 review):
- Add Playwright smoke specs for Phase 8 features: (a) static-item visibility 404 guards, (b) polymorphic cycler with mixed page+static items, (c) realtime DELETE propagation for static rows. Track as a follow-up phase or quick task before any multi-screen production event.

Phases 1–7 remain in production-ready state — see `.planning/LAUNCH.md` and `.planning/QA-MATRIX.md` for the existing launch flow.
