# Project State

## Current Position
- **Phase**: 8 of 8 (planned — ready to build)
- **Status**: Phase 8 (Static-item Visibility & Screen Rendering) decomposed into 5 plans across 2 waves. Run `/legion:build 8` to execute.
- **Last Activity**: Phase 8 plans generated (2026-04-25)

## Progress
```
[################  ] 81% — 17/22 plans complete (Phase 8: 0/5)
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
Run `/legion:build 8` to execute Phase 8: Static-item Visibility & Screen Rendering.

Phase 8 plans live in `.planning/phases/08-static-item-visibility-screen-rendering/`:
- **Wave 1** (parallel): 08-01 (Backend Architect — visibility schema/actions), 08-02 (Backend Architect — polymorphic screen-assignments)
- **Wave 2** (parallel, depends on Wave 1): 08-03 (Frontend Developer — admin UI), 08-04 (Senior Developer — guest filter + route guards), 08-05 (Senior Developer — screen renderers + cycler refactor)

After build completes, two manual user actions are required (each plan flags them in its SUMMARY): apply migration 010 (08-01) and migration 011 (08-02) in Supabase Dashboard SQL Editor before testing.

Phases 1–7 remain in production-ready state — see `.planning/LAUNCH.md` and `.planning/QA-MATRIX.md` for the existing launch flow.
