# Project State

## Current Position
- **Phase**: 2 of 7 (executed, pending review)
- **Status**: Phase 2 complete — all 3 plans executed successfully
- **Last Activity**: Phase 2 execution (2026-04-22)

## Progress
```
[####             ] 35% — 6/17 plans complete
```

## Recent Decisions
- Tailwind CSS + shadcn/ui (v4 — CSS-based config, ingen tailwind.config.ts)
- next-intl v4.9.1 som i18n library
- TipTap v3.22.4 installeret (RTE + server-side HTML generation)
- Vercel som deployment target (CLI mangler — `npm i -g vercel` + `vercel link` er pending manuel handling)
- Service role key + Next.js middleware som auth/DB-adgangsmønster
- Base UI i shadcn/ui — `asChild` pattern understøttes IKKE, brug `onClick` handlers

## Manual Actions Required (Supabase Storage)
1. Opret bucket `invitations` i Supabase Dashboard → Storage (public: true)
2. Opret bucket `maps` i Supabase Dashboard → Storage (public: true)

## Manual Actions Required (First-time setup — still pending)
1. Opret Supabase-projekt på supabase.com
2. Udfyld `.env.local` med rigtige værdier (URL, anon key, service role key, passwords)
3. Kør migreringer: `001_initial_schema.sql` og `002_rls.sql` i Supabase Dashboard SQL Editor
4. `npm i -g vercel && vercel link && vercel deploy` for preview-deployment

## Next Action
Run `/legion:review` to verify Phase 2: Admin — Deltagere & Information
Then run `/legion:plan 3` to plan Phase 3: Admin — Program, Indslag & Opgaver
