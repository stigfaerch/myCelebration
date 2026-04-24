# QA Matrix — Pre-Launch Manual Test Plan

Run this matrix against the **production-promoted preview URL** before
publishing the event URL to guests. Mark every row Pass / Fail in the
checkbox column. Every row must pass before go-live.

## How to use

- Test against the deployed preview (or production) with a real Supabase
  project. Automated smoke tests in `tests/smoke/` cover only surface-level
  render checks; this matrix is the real release gate.
- Two-session rows (R17, R23) require **two** browser windows / private
  windows / devices logged in as different guests.
- Treat any "Fail" as a launch blocker unless explicitly accepted by the
  project owner.

## Legend

| Symbol | Meaning |
|---|---|
| `[ ]` | Not yet verified |
| `[x]` | Verified pass |
| `[F]` | Verified fail — **launch blocker** |
| `[A]` | Verified fail, accepted v1 trade-off (annotate in Notes) |

## Core requirements (R01–R23)

| # | Requirement | How to test | Expected | Pass |
|---|-------------|-------------|----------|------|
| R01 | UUID-URL + shared password cookie | Clear cookies → visit `/{uuid}` → redirected to `/{uuid}/enter` → enter `GUEST_PASSWORD` → click Fortsæt → redirected to `/{uuid}` forside | Cookie `guest_password` set; subsequent same-uuid visits skip `/enter` | [ ] |
| R02 | Admin login with env-var password | Visit `/admin/login` → enter wrong password → "Forkert kodeord" surfaces, URL stays on `/admin/login` → enter right password → redirected to `/admin` | Wrong rejected; right redirects to `/admin` with `admin_token` cookie | [ ] |
| R03 | Supabase RLS | In a browser devtools console, call `supabase.from('guests').select()` using the anon key (outside middleware) | Returns empty array or 401; anon cannot SELECT closed tables | [ ] |
| R04 | /admin/information | Edit fest info, upload invitation PDF, add events with map image, save | All CRUD works; map iframe renders on guest `/hvor`; PDF link downloads | [ ] |
| R05 | /admin/indstillinger | Open SMS template editor; insert `{navn}` and `{url}` placeholders; preview | Placeholders substitute with live example data; save persists | [ ] |
| R06 | /admin/deltagere | CRUD guests, copy UUID URL, click SMS send button | All actions complete without error; SMS sends (or opens intent URL) | [ ] |
| R07 | /admin/deltagere/valg | Create a binary choice, a multichoice, a text choice; answer each as a guest | All three types save; guest can submit answers; answers visible in admin | [ ] |
| R08 | /admin/program | CRUD program items; nest a sub-item; reorder via drag; tilknyt an indslag | All operations persist across reload; order changes are atomic (no duplicate sort_order) | [ ] |
| R09 | /admin/indslag | View guest-submitted performance list; edit duration on one; add to program | Admin duration edit persists; `status` stays `admin-curated` after edit | [ ] |
| R10 | /admin/opgaver | Create a task; move between guests; set `contact_host` on one | Contact-host flag blocks that task from appearing as a swap target on guest side | [ ] |
| R11 | /admin/sider | Create a page; use RTE; toggle activation; set visibility range; click **Vis på skærm** | All fields persist; `display_overrides` row written; screen updates (see R23) | [ ] |
| R12 | /admin/billeder | Browse photo list; use timestamp filter; deactivate a photo; delete a photo; click **Vis på skærm** | Filter narrows results; deactivate hides from guest gallery; delete removes from storage + DB | [ ] |
| R13 | /admin/minder | List memories; edit title/description/when_date; delete one; click **Vis på skærm** | All edits persist; delete removes row + optional image; screen updates | [ ] |
| R14 | /admin/galleri | Change gallery config: source (images/memories), interval, display_type (horizontal/vertical), `show_memory_text` | Saved config drives `/[uuid]/galleri` behavior; interval change reflected in rotation speed | [ ] |
| R15 | /{uuid} forside | Visit as a guest; verify fest info, invitation accept button, indslag CRUD, choice forms, task indicator, bottom menu | All sections render; invitation accept persists; indslag CRUD writes `performances` rows | [ ] |
| R16 | /{uuid}/hvor | Visit `/hvor`; verify Google Maps embed, map image, per-event locations | Sandboxed iframe renders; fallback text shown when no embed URL configured | [ ] |
| R17 | /{uuid}/opgaver realtime — **two-session** | Guest A opens `/opgaver`; guest B creates a swap request targeting guest A | `IncomingSwapList` on guest A updates within ~1s without refresh | [ ] |
| R17 (2) | Concurrent accept — **two-session** | Two tabs as guest A; both click **Accept** on the same swap simultaneously | One wins (task transfers); other sees "Denne bytte-forespørgsel er allerede accepteret" | [ ] |
| R18 | /{uuid}/deltagere | Visit as a guest; verify guest list excludes type=screen | Only guests with type=person/couple/family are listed | [ ] |
| R19 | /{uuid}/billeder/kamera | On mobile, grant camera permission; capture a photo; upload; verify blocked for type=screen guests | JPEG saved to Supabase storage + DB row; no bottom-menu visible; type=screen UUID redirected or blocked | [ ] |
| R20 | /{uuid}/billeder own-photo list | After an upload from R19, visit `/billeder`; delete a photo | Photo appears in own-photos grid immediately after upload; delete removes it from grid and storage | [ ] |
| R21 | /{uuid}/minder | Create a memory with image; edit it; use **Fjern billede**; delete the memory | Create/edit/delete persist; image can be removed independently of row | [ ] |
| R22 | /{uuid}/galleri orientation | On a device, rotate to landscape then portrait | Landscape → `GalleryHorizontal`; portrait → `GalleryVertical`; variant switches live on rotation | [ ] |
| R23 | Screen override realtime — **two-session** | Tab A on screen guest URL; tab B in admin clicks **Vis på skærm** on a page/photo/memory | Tab A's `ScreenRouter` re-renders within ~1s with the pushed content | [ ] |
| R23 (2) | Screen default state | Clear the override (admin **Fjern fra skærm** or timeout) | Screen falls back to `ScreenDefault` rendering `GalleryHorizontal` | [ ] |

## Polish rows (launch blockers if failing)

| # | Area | How to test | Expected | Pass |
|---|------|-------------|----------|------|
| P1 | i18n — locale flip | In devtools, set cookie `locale=en; path=/` → hard-reload (Ctrl+Shift+R) any page | Nav labels, error boundaries, dashboard headings flip to English placeholder keys (quality may be literal; correctness is the check) | [ ] |
| P2 | i18n — Danish default | With no `locale` cookie, all UI renders in Danish | No English leaks; all nav + error + dashboard copy is Danish | [ ] |
| P3 | Error boundary — root | Visit `/__definitely__/nonexistent/path` | Root `not-found.tsx` renders Danish "Siden findes ikke" + Gå til forsiden link | [ ] |
| P4 | Error boundary — admin | While logged in, visit `/admin/nonexistent` | Admin `not-found.tsx` renders "Admin-side ikke fundet" + link back to `/admin` | [ ] |
| P5 | Error boundary — guest | Visit `/{valid-uuid}/nonexistent` | Guest `not-found.tsx` renders Danish not-found + link to `/` (intentionally not `/{uuid}`) | [ ] |
| P6 | Error boundary — server action throw | Temporarily throw in an admin server action; trigger it from the UI | Admin `error.tsx` catches; Prøv igen button resets segment; revert the throw after | [ ] |
| P7 | Error boundary — camera | Trigger an upload failure on `/[uuid]/billeder/kamera` | Fullscreen dark `kamera/error.tsx` overlay with "Kameraet kan ikke startes" + Tilbage til billeder | [ ] |
| P8 | Responsiveness | Visit forside + /admin on viewports: 375×667, 430×932, 768×1024, 1024×768, 1920×1080 | No horizontal scroll, no cut-off text, no overlap; guest shell stays ≤430px centered on wide viewports | [ ] |
| P9 | Smoke suite passes | On a provisioned test Supabase + `TEST_GUEST_UUID` + `TEST_GUEST_PASSWORD` + `TEST_SCREEN_UUID` env, run `npm run test:smoke` | All tests pass (no `skipped` rows, no failures) | [ ] |
| P10 | Smoke suite passes (un-gated) | In sandboxed CI with no env vars set, run `npm run test:smoke` | Gated tests skip; harness tests (`_smoke`, admin-login-reject) pass; zero failures | [ ] |
| P11 | P2 translation backlog — **accepted v1** | Spot-check admin forms: buttons, placeholders, confirm dialogs still Danish | Accepted: ~50 admin/guest components have hardcoded Danish strings. Not a launch blocker for Danish-only audience. Log as `[A]` with reference to `07-01-SUMMARY.md` §Deferred. | [A] |

## Post-launch verification (on-day)

Run this compressed checklist on event day, against production, **before**
guests start arriving:

- [ ] `/admin` reachable; log in succeeds
- [ ] One representative guest UUID opens, enters password, reaches forside
- [ ] Screen URL opens on the venue display and shows GalleryHorizontal
- [ ] Admin pushes a test page to screen; verify it appears in <5s
- [ ] Admin clears the override; screen returns to gallery
- [ ] Upload a test photo from a mobile device; verify it shows up in /billeder
- [ ] Delete the test photo so it doesn't appear during the event
- [ ] Check Vercel **Project → Deployments → Runtime Logs** — no recurring errors in the last 15 minutes

## Notes

Record fails, accepted trade-offs, and any out-of-band observations here:

- _(empty — fill during QA run)_
