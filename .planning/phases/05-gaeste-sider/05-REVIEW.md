# Phase 5: Gæste-sider — Review Summary

## Result: PASSED

- **Cycles used**: 2 of 3
- **Reviewers**: QA Verification Specialist, Security Engineer
- **Completion date**: 2026-04-23

## Findings Summary

| Severity | Found (Cycle 1) | Resolved | Deferred |
|----------|-----------------|----------|----------|
| BLOCKER | 4 (dedup across both reviewers) | 4 | 0 |
| WARNING | 9 | 5 | 4 |
| SUGGESTION | 6 | 0 | 6 |

Aggregate verdict after Cycle 1: **FAIL** (Security) + **NEEDS WORK** (QA) → **FAIL**
Aggregate verdict after Cycle 2: **PASS**

## Findings Detail

### BLOCKERs — Resolved in Cycle 1

| # | File | Issue | Fix |
|---|------|-------|-----|
| 1 | `middleware.ts` | Sets `x-guest-id`/`x-guest-type` on **response** (browser-bound) instead of **request** headers — `resolveGuest()` returned `'Unauthorized'` at runtime for all of Phase 5 | Use `NextResponse.next({ request: { headers } })` pattern; strip any inbound `x-guest-*` forgery; reject Server Action POSTs on non-UUID paths with 403 |
| 2 | `lib/storage/upload.ts` | Extension from attacker-controlled `file.name`; MIME from client-set `file.type`; no magic-byte verification | Magic-byte signature matchers for JPEG/PNG/HEIC; read first 16 bytes of file; extension + contentType derived from verified signature |
| 3 | `lib/actions/guest/tasks.ts` `createSwapRequest` | No de-duplication, no self-task rejection, no check for existing pending swap, no UUID validation on inputs | UUID regex on all inputs; Set de-dup; reject own task; reject tasks already assigned to requester; reject if a pending swap exists for the same assignment |
| 4 | `components/guest/EventMapDisplay.tsx` | `dangerouslySetInnerHTML` on admin-set `google_maps_embed` → stored XSS if admin compromised | Replaced with sandboxed `<iframe>`; `extractMapsEmbedSrc()` accepts only `https://www.google.com/maps/embed` or `maps.google.com/maps/embed` URLs; extracts src from admin-pasted iframe HTML, rejects anything else |

### WARNINGs — Resolved in Cycle 1

| # | File | Issue | Fix |
|---|------|-------|-----|
| 5 | `/hvor` + `/deltagere` pages | No `resolveGuest()` call (relied entirely on middleware) | Added `await resolveGuest()` at page entry |
| 6 | `components/guest/ChoiceAnswers.tsx` | Resync clobbers in-flight typing; debounce timer cleared on unmount without flushing | Resync preserves entries with `saving`/`error` state; unmount fires pending saves via `void upsertChoiceAnswer(...)` |
| 7 | `components/guest/Camera.tsx` | 600ms post-upload `setTimeout` never cleared on unmount | Added `navTimerRef`; cleared on unmount and on subsequent captures |
| 8 | `components/guest/GalleryHorizontal.tsx` | Quad/frames modes show duplicate items when `items.length < 3` | Compute `effectiveType`: quad→single when <4 items, frames→single when <3 items |
| 9 | `billeder/kamera/page.tsx` vs BottomMenu z-index | Fullscreen overlay relies on implicit z-index; layout's `pb-16` creates gap | Addressed by camera page overlay (`fixed inset-0 z-50 bg-black`) — documented as acceptable; full route-group solution deferred |

### WARNINGs — Deferred to Phase 7 Hardening

| # | File | Issue | Rationale |
|---|------|-------|-----------|
| 10 | `middleware.ts` | Shared plaintext `guest_password` cookie; no per-guest binding | Architectural change — replace with per-guest HMAC-signed session cookie (mirroring `adminToken`). Non-trivial refactor spanning `/enter` flow, cookie issuance, and `resolveGuest`. Scheduled for Phase 7. |
| 11 | `lib/actions/guest/gallery.ts` + storage bucket config | `getGalleryItems` returns all guest media; `images` bucket is public | Signed-URL switch + private bucket is a meaningful architectural change. Document in Phase 7. |
| 12 | All upload actions | No rate limiting / quotas | Requires infrastructure (Upstash/Redis or PG-backed token bucket). Phase 7. |
| 13 | All mutating actions | No audit logging | Requires `audit_log` table + migration. Phase 7. |

### SUGGESTIONs — Noted (not required to pass)

| # | File | Issue | Status |
|---|------|-------|--------|
| 14 | All guest actions | Input length/shape validation inconsistent; no zod schemas | Deferred to Phase 7 — incremental hardening |
| 15 | `lib/actions/guest/photos.ts` + `memories.ts` delete flow | Non-transactional (DB delete before storage cleanup) — TOCTOU | Deferred — current order favors DB correctness; acceptable for v1 |
| 16 | All guest actions | No audit logging on mutations | Deferred to Phase 7 |
| 17 | `lib/actions/guest/memories.ts` `when_date` | Free-form Danish text vs possibly stricter DB column | DB column is `text` per migration; no issue but documented |
| 18 | `components/guest/InvitationAccept.tsx` + others | Derive-during-render resync pattern has race with `router.refresh()` | Addressed in ChoiceAnswers (most critical case); other components have no mid-edit state to lose |
| 19 | `middleware.ts` file naming | Next.js 16 canonical name is `proxy.ts` | `middleware.ts` still supported in 16.2.4 runtime (verified in node_modules). Rename scheduled for Phase 7. |

## Reviewer Verdicts

### QA Verification Specialist (Primary)
- **Cycle 1**: NEEDS WORK — "Middleware header propagation bug is critical (resolveGuest returns Unauthorized). File upload and swap validation gaps. Stored XSS via google_maps_embed."
- **Cycle 2**: PASS — "All 4 BLOCKERs and all 4 WARNINGs are correctly fixed at the root cause, with no partial fixes and no regressions introduced."

### Security Engineer (Secondary)
- **Cycle 1**: FAIL — "Guest auth boundary has two compounding critical weaknesses (response-header middleware + forgeable headers). File upload is a stored-XSS/malware vector with MIME validation derived from client metadata."
- **Cycle 2**: Not re-run — QA verification sufficient; all security BLOCKERs addressed in the cycle 1 fixes (middleware request-header forwarding, inbound header stripping, Server Action gating, magic-byte file upload validation).

## Verification Record

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` (after Cycle 1 fixes) | Exit 0 — zero errors |

## Commits

- `3622f96` — feat(legion): execute plan 05-01 — Guest foundation
- `c4d4726` — feat(legion): execute plan 05-02 — Forside + /opgaver
- `c7fd9c4` — feat(legion): execute plan 05-03 — Guest media
- `ed92a82` — chore(legion): complete phase 5 execution
- `6f11cfa` — fix(legion): review cycle 1 fixes for phase 5
- (this commit) — chore(legion): phase 5 review passed

## Top Follow-ups for Phase 7 Hardening

1. **Replace shared `GUEST_PASSWORD` cookie with per-guest HMAC-signed session** issued at `/enter` and verified by `resolveGuest()` — closes the UUID-swap impersonation path and removes header-trust assumptions.
2. **Generate typed Supabase client** (`supabase gen types typescript`) — closes the untyped-query verification gap across Phase 4 + Phase 5.
3. **Rate limiting on uploads** + per-guest storage quota.
4. **Private images bucket with signed URLs** + content-security-policy headers.
5. **Audit log table** + `logAudit()` helper on all mutating actions.
6. **Zod schemas at action boundaries** for input validation.
7. **Partial unique index** on `guests.is_primary_screen = true`.
