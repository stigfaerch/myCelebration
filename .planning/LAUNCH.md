# Launch Checklist

Ordered steps to take myCelebration from development to production. Follow
top-to-bottom. Do not skip. Every section is a gate for the next one.

The audience is the project owner on deploy day. Total estimated time if
everything goes smoothly: ~90 minutes (most of which is data entry via the
admin UI in section 6).

---

## 1. Supabase Project

- [ ] Sign in at https://supabase.com and create a new project
  - Free tier is sufficient for a single-party family event
  - Pick the region closest to your guests (EU-west for Denmark)
- [ ] From **Project Settings → API**, copy:
  - [ ] Project URL → will become `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `anon` public key → will become `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `service_role` secret key → will become `SUPABASE_SERVICE_ROLE_KEY`
    - **Treat this key like a password.** Never commit it. Never expose it to the browser.
- [ ] Take a backup of these values in a password manager

## 2. Database Migrations

Run in the Supabase SQL Editor in this exact order. Each migration must
succeed before running the next. Copy/paste the file contents, click **Run**,
wait for green.

- [ ] `supabase/migrations/001_initial_schema.sql` — creates tables
- [ ] `supabase/migrations/002_rls.sql` — enables Row Level Security
- [ ] `supabase/migrations/003_program_items_swap_rpc.sql` — swap RPC
- [ ] `supabase/migrations/004_swap_accept_rpc.sql` — atomic swap-accept RPC
- [ ] `supabase/migrations/005_realtime_rls.sql` — realtime publication + policies

**Backup before 004/005:** these migrations add RPC functions and modify the
realtime publication — downgrade requires manual SQL, so snapshot the DB via
**Database → Backups** before running them.

## 3. Storage Buckets

Supabase Dashboard → **Storage** → **New bucket** (three times):

- [ ] `invitations` — public: **true** (PDF invitation viewable by anyone with link)
- [ ] `maps` — public: **true** (event map images)
- [ ] `images` — public: **true** (guest-uploaded photos + memories)

**Post-launch hardening note:** `images` being public means any uploaded photo
URL is viewable by anyone who obtains the URL (note: Supabase storage keys are
cryptographically random, so URLs are unguessable but once forwarded they're
viewable indefinitely). This is an accepted v1 trade-off for a private
family-event URL. See section 9 for the hardening follow-up.

## 4. Environment Variables

Configure both locally (`.env.local`) **and** in Vercel (**Project Settings →
Environment Variables**, scope: all environments):

- [ ] `NEXT_PUBLIC_SUPABASE_URL` — from section 1
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from section 1
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — from section 1 (**secret**)
- [ ] `GUEST_PASSWORD` — pick a memorable shared password for all guests
- [ ] `ADMIN_PASSWORD` — pick a strong password for admin access (**secret**)
- [ ] `NEXT_PUBLIC_APP_URL` — set to your production URL (e.g. `https://mycelebration.example.com`)

Verify locally: `npm run dev`, visit http://localhost:3000/admin/login, enter
`ADMIN_PASSWORD`. If you reach `/admin`, env vars are wired correctly.

## 5. Vercel Deployment

- [ ] `npm install -g vercel` (one-time)
- [ ] `vercel login` (one-time; opens browser)
- [ ] From the repo root: `vercel link`
  - This repo is a single project; answer the prompts to create/select a Vercel project
- [ ] Preview deploy: `vercel deploy`
  - Wait for the preview URL to be printed
  - [ ] Visit the preview URL + `/admin/login`; verify it renders
  - [ ] Log in as admin; verify the dashboard loads without errors
- [ ] Production deploy: `vercel deploy --prod`
  - [ ] Verify production URL resolves
  - [ ] Verify `https://<prod>/admin/login` is reachable

## 6. Post-Deploy Data Setup

All data entry happens through the admin UI. Log in at `/admin` with
`ADMIN_PASSWORD` (from section 4).

- [ ] **/admin/information** — Set fest info (name, date, description), upload invitation PDF, add the event(s) with map image
- [ ] **/admin/indstillinger** — Configure SMS template using `{navn}` and `{url}` placeholders
- [ ] **/admin/deltagere** — Create each guest record (name, phone, type=person/couple/family/screen)
  - [ ] Create **the primary screen guest** with type=`screen` and `is_primary_screen=true`
- [ ] **/admin/deltagere/valg** — Create any valg/choices (binary/multichoice/text) you want guests to answer
- [ ] **/admin/program** — Enter the program items, including sub-nesting + reordering
- [ ] **/admin/indslag** — Edit durations on guest-submitted performances; add curated ones to the program
- [ ] **/admin/opgaver** — Create tasks and assign to guests; set `contact_host` flag on tasks that must not be swapped away
- [ ] **/admin/sider** — Create any page content that should be shown on the screen during the event
- [ ] **/admin/minder** — Add pre-created memories if any
- [ ] **/admin/galleri** — Configure gallery source (images/memories), interval, display_type, show_memory_text

## 7. Smoke Tests Against Production

Run `.planning/QA-MATRIX.md` end-to-end. Critical spot checks:

- [ ] Pick a guest UUID, open its URL in a private window → redirected to `/enter`
- [ ] Enter `GUEST_PASSWORD` → land on forside → verify fest info + invitation accept + indslag / choice forms render
- [ ] Admin: click **Vis på skærm** on a page → open the primary screen guest URL in another tab → verify the content updates in <~1s
- [ ] Two guest tabs: guest A creates a swap request on an owned task → guest B's `/opgaver` page shows the incoming swap live (no refresh)
- [ ] Guest B accepts; guest A sees transfer; verify both sides are consistent
- [ ] Camera: on a mobile device, `/[uuid]/billeder/kamera` → take a photo → verify it appears in `/[uuid]/billeder` grid
- [ ] Complete every `[ ]` checkbox in `.planning/QA-MATRIX.md`; resolve any failures before promoting the event URL to guests

### 7a. Optional: Automated smoke suite against a test Supabase

A deterministic Playwright harness is installed (`npm run test:smoke`). Un-gated
specs (2 tests) cover app-boot + admin login rejection and run without any env
vars. DB-touching specs (7 tests) stay skipped unless you provision a test guest
and set the env vars below:

```bash
export TEST_GUEST_UUID="<uuid of a person-type guest in your test project>"
export TEST_GUEST_PASSWORD="<value of GUEST_PASSWORD>"
export TEST_SCREEN_UUID="<uuid of a screen-type guest in your test project>"
npm run test:smoke
```

Expected output: `9 passed` (or `2 passed, 7 skipped` without env vars). Any
FAIL is a launch blocker. Matches QA-MATRIX rows P9/P10.

## 8. Rollback Procedure

If the production deploy has a showstopper and cannot be hot-fixed:

- [ ] `vercel rollback` from the repo root
  - Without args, this reverts to the previous production deployment
  - Or: Vercel dashboard → Deployments → click the last-good deploy → **Promote to Production**
- [ ] If the failure is in the application code, Vercel rollback is sufficient
- [ ] If the failure is due to a bad DB migration (004 or 005), rollback requires **manual SQL**:
  - No automated down-migrations exist for v1
  - Restore from the backup taken in section 2 via **Supabase Dashboard → Database → Backups → select snapshot → Restore** (note: restoring a backup wipes any admin-created data entered in section 6 — redo those steps after restore)
  - Surgical rollback (if backup missing or partial): run the appropriate down-SQL:
    ```sql
    -- Rollback migration 005 (realtime RLS + publication):
    drop policy if exists "swap_requests_realtime_select" on swap_requests;
    drop policy if exists "task_assignments_realtime_select" on task_assignments;
    alter publication supabase_realtime drop table swap_requests;
    alter publication supabase_realtime drop table task_assignments;
    alter publication supabase_realtime drop table screen_state;

    -- Rollback migration 004 (accept_swap_request RPC):
    drop function if exists accept_swap_request(uuid, uuid, uuid);
    ```
  - Re-run migrations 001–003 if needed to return to a known-good state
- [ ] **Communicate the rollback window to guests:**
  - If you have an SMS template, use `/admin/indstillinger` to broadcast an "app is temporarily unavailable" message
  - Otherwise fall back to whatever channel is live (group chat, email, signage at the venue)
- [ ] **Post-mortem checklist after recovery:**
  - [ ] Add a regression test to `tests/smoke/` covering the failure mode
  - [ ] Document the root cause in the project changelog
  - [ ] Decide whether to re-attempt the failed deploy after a fix, or defer to post-event

## 9. Post-Launch Hardening

These are accepted v1 trade-offs for a single-party family event. Address
them if the app is reused for another event, made multi-tenant, or exposed
publicly. Priority order (highest at top):

1. **Per-guest HMAC-signed session cookie** — replaces the shared `GUEST_PASSWORD` with a per-guest token so password rotation is possible and lost devices can be revoked
2. **Rate limiting on mutating guest actions** — swap create, photo upload, memory CRUD; prevents abuse from a compromised guest link
3. **Signed URLs + private `images` bucket** — move photos to a private bucket; generate short-lived signed URLs in server actions; fixes the "anyone with a photo URL can view it" gap
4. **Audit log table + `logAudit()` helper** — append-only log of admin actions and mutating guest actions for post-event forensics
5. **Zod schemas at server-action boundaries** — defensive input validation to reject malformed payloads before they reach Supabase
6. **Delete-flow TOCTOU fix** — reorder storage delete to happen **before** the DB row delete so a partial failure leaves storage orphaned rather than storage pointing to a missing row
7. **`middleware.ts` → `proxy.ts` rename** — Next.js 16 canonical filename; functionally identical but signals we're on the supported name
8. **Generated typed Supabase client** — run `supabase gen types typescript` and consume the generated types for compile-time query safety
9. **Stale override cleanup on admin delete** — when an admin deletes a page/photo/memory currently pinned to the screen, also clear the override so the screen doesn't try to render a dangling reference
10. **Partial unique index on `guests.is_primary_screen`** — enforce "at most one `is_primary_screen=true`" at the DB level instead of application-level
11. **i18n P2 string extraction** — ~50 admin/guest components still have hardcoded Danish strings (button labels, placeholders, confirm dialogs). v1 is Danish-only so this is fine; multilingual requires the pass
