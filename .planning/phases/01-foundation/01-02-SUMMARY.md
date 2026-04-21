# Plan 01-02 Summary

## Status
Complete with Warnings

## Files Created/Modified
- `.env.local` — created with placeholder values (NOT committed, correctly gitignored)
- `src/lib/supabase/server.ts` — service role client
- `src/lib/supabase/client.ts` — anon key client (Realtime only)
- `src/lib/supabase/README.md` — access pattern documentation
- `supabase/migrations/001_initial_schema.sql` — full schema: enums, 17 tables, indexes, singleton seeds
- `supabase/migrations/002_rls.sql` — RLS enabled on all tables; anon SELECT policy on screen_state only
- `package.json` — added `@supabase/supabase-js` dependency
- `package-lock.json` — updated lockfile

## Verification
| Command | Result | Pass? |
|---------|--------|-------|
| `npm install @supabase/supabase-js` | Added 10 packages, 0 vulnerabilities | Yes |
| `npx tsc --noEmit` | No errors | Yes |
| `git status --short` (pre-commit) | `.env.local` absent from tracked files | Yes |
| `git show --stat HEAD` | 7 files, 512 insertions committed | Yes |
| `ls supabase/migrations/` | 001_initial_schema.sql, 002_rls.sql present | Yes |
| `ls src/lib/supabase/` | README.md, client.ts, server.ts present | Yes |

## Decisions Made
- `src/lib/supabase/` directory already existed (empty) from a prior setup step — files were written into it without issue.
- `client.ts` top-level env checks (`throw new Error`) execute at module import time. In a client bundle this will throw if env vars are missing at build time. This matches the spec exactly and is intentional — it makes misconfiguration loud rather than silent.
- `README.md` was committed inside `src/lib/supabase/` alongside the TS files. It is not a root-level README and does not conflict with existing project docs.
- `package.json` and `package-lock.json` were included in the commit because installing `@supabase/supabase-js` modified them — committing them keeps the lockfile consistent.

## Issues / Risks
- **REQUIRES MANUAL ACTION (Task 1, Supabase credentials):** The user must create a Supabase project at supabase.com, retrieve the URL, anon key, and service role key, and populate `.env.local` before any server-side code or Realtime features will function.
- **Migrations not applied:** The SQL files exist locally only. The user must apply them via the Supabase Dashboard SQL Editor or `supabase db push`. Order matters: `001_initial_schema.sql` must run before `002_rls.sql`.
- **client.ts throws at import time on missing env vars:** If `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are absent during build, the client module will throw. This is intentional and consistent with `server.ts`, but be aware that any page importing `client.ts` will fail hard until `.env.local` is populated.
- **Singleton seed rows:** `fest_info`, `gallery_config`, and `app_settings` each receive one seed row via `INSERT` at the end of `001_initial_schema.sql`. Re-running the migration will attempt duplicate inserts and fail. These seeds are idempotent only if the migration runs exactly once.

## Handoff Notes
Plan 01-03 and downstream agents need to know:

1. **Service role client import path:** `import { supabaseServer } from '@/lib/supabase/server'` — use this in all Server Components, Server Actions, and Route Handlers.
2. **Anon client import path:** `import { supabaseClient } from '@/lib/supabase/client'` — use ONLY for `screen_state` Realtime subscriptions on screen-type guest pages.
3. **No Supabase Auth:** Do not install `@supabase/ssr` or use `createServerClient`/`createBrowserClient`. Auth is middleware-only.
4. **screen_state table:** This is the Realtime hub. Admin pushes overrides here; screens subscribe via anon key. The `guest_id` is the primary key (one row per screen guest). `current_override` and `override_ref_id` drive what the screen renders.
5. **Migrations must be applied before integration tests:** Any plan that runs queries against Supabase requires the user to have applied both migration files first.
6. **ENV vars not set yet:** `.env.local` contains placeholder values. The dev server will crash on startup until real credentials are provided.
