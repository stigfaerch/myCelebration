# Phase 7: Polish & Launch — Context

## Goal
Final phase before production: i18n complete, responsiveness verified, critical error scenarios handled gracefully, smoke tests for critical flows, and deployment checklist ready.

## Requirements
Per ROADMAP.md: **All** (R01–R23).

## Success Criteria
- i18n: all user-facing strings extracted to Danish (complete) + English (skeleton / machine translation placeholders)
- Responsiveness audit: mobile (guest), desktop (admin), fullscreen horizontal (screen) — no visible breakage
- Critical error scenarios handled gracefully (network errors, invalid UUID, wrong password)
- Smoke tests for critical flows: auth, billede-upload, bytte-flow, screen-overskrivning
- Deployment to production verified (checklist + verification procedure)

## Prior Phase Handoffs

### From Phase 1 (Foundation)
- `next-intl` v4.9.1 installed
- `messages/da.json` and `messages/en.json` exist with common skeleton (loading, save, cancel, etc.)
- Danish is the default; English is deferred placeholder translations

### From Phases 2–6
- Many Danish strings are hardcoded in components across `src/components/admin/*`, `src/components/guest/*`, `src/components/screen/*`, and page files. Phase 7 must extract them.
- No `error.tsx` or `not-found.tsx` route segments exist anywhere — all errors currently bubble to the framework default
- No test infrastructure (Playwright, Vitest, Jest) installed — Phase 7 adds Playwright for smoke tests

## Deferred to Post-Launch (NOT in Phase 7 scope)

Per Phase 5 + Phase 6 review summaries, these items are acceptable v1 trade-offs for a single-party family event (where the shared password and UUID-URL model is the trust boundary). They should be documented in `LAUNCH.md` as a post-launch follow-up list:

1. Per-guest HMAC-signed session cookie (closes shared-password / `using (true)` exposure root-cause)
2. Rate limiting on mutating guest actions
3. Signed URLs + private `images` bucket
4. Audit log table + `logAudit()` helper
5. Zod schemas at server-action boundaries
6. Delete-flow TOCTOU (reorder storage delete before DB delete)
7. `middleware.ts` → `proxy.ts` rename (Next.js 16 canonical — 16.2.4 runtime supports both)
8. Generated typed Supabase client via `supabase gen types typescript`
9. Stale override cleanup on admin delete (UI degrades to gallery quietly today)
10. Partial unique index on `guests.is_primary_screen = true`

## Codebase Conventions (relevant to Phase 7)

- Next.js App Router with async Server Components
- next-intl v4 message format with ICU placeholders where needed
- shadcn/ui Base UI (not Radix) — error boundaries likely need simple custom UI rather than Sheet/Dialog
- Tailwind v4 / TypeScript strict / React 19
- `'use client'` required for error.tsx files (they must be client components in App Router)
- Danish default; English translations can be placeholder-grade for v1
- Zero tsc errors required after each plan

## Key Files to Consider

### For i18n extraction (Plan 07-01)
Components with hardcoded Danish strings (not exhaustive):
- All `src/components/admin/*` — form labels, buttons, empty states, errors
- All `src/components/guest/*` — forside, opgaver, media pages
- All `src/components/screen/*` — memory type labels
- `src/app/[uuid]/enter/page.tsx` — password entry prompts
- `src/app/admin/login/page.tsx` — admin login prompts
- Error messages thrown from server actions (`src/lib/actions/**/*.ts`) are user-facing when shown in UI — either translate or keep as Danish (they're already Danish-only)

### For error boundaries (Plan 07-01)
Next.js App Router looks for:
- `app/error.tsx` — catches errors in root segment (non-global)
- `app/global-error.tsx` — catches errors in root layout itself
- `app/not-found.tsx` — 404 handler at root
- `app/(admin)/admin/error.tsx` + `not-found.tsx` — admin route group
- `app/[uuid]/error.tsx` + `not-found.tsx` — guest route segment
- `app/[uuid]/billeder/kamera/error.tsx` — camera-specific fullscreen error

### For responsiveness audit (Plan 07-01)
- Guest layout: `max-w-[430px]` mobile-first — verify on narrow + tablet + desktop
- Admin layout: sidebar + main content — verify doesn't break below 1024px
- Screen: fullscreen viewport — verify on 1920x1080 + 1366x768 + unusual aspect ratios

### For smoke tests (Plan 07-02)
Critical flows per R-spec:
- R01/R02: `/enter` password flow → guest lands on `/{uuid}`
- R17: swap create → accept (atomic RPC)
- R20: photo upload via server action (FormData)
- R23: screen override visibility change

### For deployment checklist (Plan 07-02)
All manual actions from STATE.md plus verification steps:
1. Supabase project setup
2. `.env.local` / Vercel env vars
3. Migrations 001–005 in order
4. Storage bucket creation (`invitations`, `maps`, `images`)
5. Seed primary screen guest via admin
6. Vercel project link + deploy
7. Post-deploy smoke test run
8. Rollback procedure

## Plan Structure

| Plan | Wave | Agent | Focus |
|------|------|-------|-------|
| 07-01 | 1 | Frontend Developer | i18n extraction + error boundaries + responsiveness audit |
| 07-02 | 2 | QA Verification Specialist | Playwright smoke tests + `LAUNCH.md` deployment checklist + `QA-MATRIX.md` manual test plan |

Wave 2 depends on Wave 1 (tests assert i18n strings + error boundary behavior).

## File Disjointness

**Plan 07-01 files**:
- `messages/da.json` (MODIFY — complete)
- `messages/en.json` (MODIFY — skeleton fill-in)
- `src/i18n/*` (potentially NEW — next-intl provider wiring if not present)
- `src/app/layout.tsx` (MODIFY — wire next-intl provider at root)
- `src/app/error.tsx` (NEW)
- `src/app/global-error.tsx` (NEW)
- `src/app/not-found.tsx` (NEW)
- `src/app/(admin)/admin/error.tsx` (NEW)
- `src/app/(admin)/admin/not-found.tsx` (NEW)
- `src/app/[uuid]/error.tsx` (NEW)
- `src/app/[uuid]/not-found.tsx` (NEW)
- `src/app/[uuid]/billeder/kamera/error.tsx` (NEW)
- Many component files touched for string extraction — enumerated in plan

**Plan 07-02 files**:
- `playwright.config.ts` (NEW)
- `tests/smoke/*.spec.ts` (NEW)
- `package.json` (MODIFY — add playwright dev dep + test scripts)
- `.planning/LAUNCH.md` (NEW)
- `.planning/QA-MATRIX.md` (NEW)
- `.gitignore` (MODIFY — add playwright artifacts)

Plans do not touch the same files.

## Success Criteria (Phase-level)
- All user-facing Danish strings reachable through `messages/da.json` lookups
- English translations present (skeleton acceptable — machine-translated or placeholder)
- Error boundaries render graceful Danish fallback for: network failure, DB failure, invalid UUID, wrong password, stale override
- Playwright installed and smoke tests green against a local dev build (runtime verification pending actual Supabase project)
- `LAUNCH.md` contains step-by-step deployment procedure with verification steps
- `QA-MATRIX.md` documents pass/fail test matrix for R01–R23
- `npx tsc --noEmit` clean after each plan
