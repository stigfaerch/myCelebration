# Project State

## Current Position
- **Phase**: 2 of 7 (planned)
- **Status**: Phase 2 planned — 3 plans across 2 waves
- **Last Activity**: Phase 2 planning (2026-04-22)

## Progress
```
[##               ] 18% — 3/17 plans complete
```

## Recent Decisions
- Tailwind CSS + shadcn/ui (v4 — CSS-based config, ingen tailwind.config.ts)
- next-intl v4.9.1 som i18n library
- TipTap som RTE library (installeres Phase 2+)
- Vercel som deployment target (CLI mangler — `npm i -g vercel` + `vercel link` er pending manuel handling)
- Service role key + Next.js middleware som auth/DB-adgangsmønster

## Manual Actions Required Before Phase 2
1. Opret Supabase-projekt på supabase.com
2. Udfyld `.env.local` med rigtige værdier (URL, anon key, service role key, passwords)
3. Kør migreringer: `001_initial_schema.sql` og `002_rls.sql` i Supabase Dashboard SQL Editor
4. `npm i -g vercel && vercel link && vercel deploy` for preview-deployment

## Next Action
Run `/legion:build` to execute Phase 2: Admin — Deltagere & Information
