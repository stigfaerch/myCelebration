# Project State

## Current Position
- **Phase**: 8 of 8 (executed, pending review)
- **Status**: Phase 8 complete — all 5 plans executed successfully across 2 waves. Run `/legion:review` to verify.
- **Last Activity**: Phase 8 execution (2026-04-25)

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
Run `/legion:review` to verify Phase 8: Static-item Visibility & Screen Rendering.

**Two manual actions required before testing the new feature**:
1. Apply migration 010 (`010_static_item_visibility.sql`) in Supabase Dashboard SQL Editor
2. Apply migration 011 (`011_polymorphic_screen_assignments.sql`) in Supabase Dashboard SQL Editor

Phases 1–7 remain in production-ready state — see `.planning/LAUNCH.md` and `.planning/QA-MATRIX.md` for the existing launch flow.
