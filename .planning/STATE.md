# Project State

## Current Position
- **Phase**: 6 of 7 (executed, pending review)
- **Status**: Phase 6 executed — 2 plans complete, awaiting review
- **Last Activity**: Phase 6 execution (2026-04-23)

## Progress
```
[################# ] 88% — 15/17 plans complete
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
3. Kør migreringer: `001_initial_schema.sql`, `002_rls.sql`, `003_program_items_swap_rpc.sql`, `004_swap_accept_rpc.sql`, `005_realtime_rls.sql` i Supabase Dashboard SQL Editor
4. Enable Supabase Realtime publication for `swap_requests` + `task_assignments` (Database → Replication) hvis ikke auto-enabled
5. `npm i -g vercel && vercel link && vercel deploy` for preview-deployment

## Next Action
Run `/legion:review` to verify Phase 6: Screen & Realtime
