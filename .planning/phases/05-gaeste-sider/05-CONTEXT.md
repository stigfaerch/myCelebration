# Phase 5: Gæste-sider — Context

## Goal
Alle gæste-sider fungerer — indslag, minder, billeder, deltager-valg og bytte-flow (statisk del). Ingen realtime endnu. Mobile-first responsive design for ægte mobile brugere og basic vertikal visning for screens (primær design: horisontal screen-galleri).

## Requirements
- **R15** — `/{uuid}` forside: festinfo, invitation-accept, indslag-oprettelse (guest's own performances), deltager-valg (binær/multichoice/tekst), opgaveindikator (how many tasks assigned), bottom-menu
- **R16** — `/{uuid}/hvor`: Google Maps embed + kort-billede (fra fest_info/events)
- **R17 (statisk)** — `/{uuid}/opgaver`: opgave-oversigt + bytte-oprettelse (static — realtime deferred to Phase 6)
- **R18** — `/{uuid}/deltagere`: deltager-oversigt (eksklusiv screen-type)
- **R19** — `/{uuid}/billeder/kamera`: kamera + gem billede (ingen bottom-menu; ikke tilgængelig for screens)
- **R20** — `/{uuid}/billeder`: egne billeder + slet (screen-visning deferred — primær/sekundær screen logic comes in Phase 6)
- **R21** — `/{uuid}/minder`: fuld CRUD minder (titel, type, beskrivelse, hvornår, billede-upload/slet)
- **R22** — `/{uuid}/galleri`: horizontal visning (primær design) + vertikal (basic). Standard deaktiveret for alm. deltagere (admin-controlled visibility via page `is_active`).

## Prior Phase Handoffs (relevant for Phase 5)

### From Phase 1 (Foundation)
- `src/app/[uuid]/layout.tsx` — already exists. Differentiates `guest` vs `screen` layout based on `x-guest-type` header.
- Guest layout currently has a **placeholder** bottom-nav with static `#` hrefs. Phase 5 must replace it with real navigation.
- `src/app/[uuid]/enter/page.tsx` and `src/app/[uuid]/page.tsx` already exist (minimal skeletons).
- `src/middleware.ts` validates UUID + `GUEST_PASSWORD` cookie, fetches guest row, sets `x-guest-id` + `x-guest-type` headers. Server Components read these via `headers()`.

### From Phase 2 (Admin Deltagere & Information)
- `fest_info` table has description (TipTap JSON), invitation_url, plus basic fields.
- `events` table + `event_locations` — used by `/hvor` for map + locations.
- `invitations` table with `accepted` flag — used for invitation-accept on forside.
- `choice_definitions` + `guest_choices` — admin creates choices, guests answer.
- `/admin/deltagere` is complete — no admin-side changes needed in Phase 5.

### From Phase 3 (Admin Program, Indslag & Opgaver)
- `performances` table: guest_id, title, type, description, duration_minutes, status (pending/approved/rejected). Guest creates; admin curates status + duration.
- `tasks` + `task_assignments` + `swap_requests`: admin creates tasks and assigns. Guest sees own assignments + creates swap requests.
- `program_items`: admin-built. Guest-side program is read-only (Phase 5 may surface it on forside as "Program"-link via bottom menu, but no dedicated program page is required per R15).

### From Phase 4 (Admin Medier, Sider & Galleri)
- `pages` (admin-created static pages): guests may view active pages in their visibility window. Reads via bottom-menu link? NOT in R15 scope — deferred to admin-screen interaction in Phase 6.
- `photos`, `memories`, `gallery_config`, `screen_state`: tables exist. Phase 5 creates guest-side CRUD for photos + memories.
- `normalizeGuest` helper pattern (photos.ts, memories.ts) established for PostgREST join shapes.
- `clearScreenOverridesFor` helper in `screen.ts` — guest delete operations should ALSO call this if screen_state references a deleted guest-owned photo/memory.

## Database Tables Used (Phase 5)
> Schema reference: `supabase/migrations/001_initial_schema.sql`

- `guests` — UUID → guest row (name, type, relation, accepted, etc.)
- `invitations` — `accepted` flag set by guest via invitation-accept flow
- `fest_info` — festinfo display (description, invitation_url, date)
- `events` + `event_locations` — /hvor map display
- `choice_definitions` + `guest_choices` — deltager-valg answering (unique on guest_id + choice_definition_id)
- `performances` — guest CRUD on own (filter by guest_id), status managed by admin
- `tasks` + `task_assignments` — guest sees own assignments (filter via task_assignments.guest_id)
- `swap_requests` — guest creates with `requester_assignment_id` + `desired_task_ids[]`
- `photos` — guest sees own (filter by guest_id), uploads new, deletes own
- `memories` — guest CRUD on own
- `gallery_config` — read-only config consumed by `/{uuid}/galleri`

## Image Handling
Per `.planning/IMAGE_HANDLING_AND_STORAGE.md`:
- Originals stored in Supabase Storage under `/images/original/{image_id}.jpg`
- Derivatives (medium, thumb) generated asynchronously (Phase 5 stores originals; derivative pipeline can be a Phase 5 task or deferred — simplest v1 is "original only, serve original as img src with CSS sizing")
- Phase 5 must: upload original, insert DB row (photos or memories with image_url), serve via img src
- Derivative pipeline (medium/thumb generation) is STRETCH — deferred to polish if not needed for v1 performance.

## Codebase Conventions (relevant to Phase 5)
- Admin-sider i `src/app/(admin)/admin/` — route group excluded from URL
- Guest-sider i `src/app/[uuid]/` — UUID is URL segment
- Screen-gæster bor også på `/{uuid}` — layout.tsx differentierer via `x-guest-type` header
- Server Components med async `params: Promise<{ uuid: string }>`
- `headers()` er async: `const h = await headers(); const guestId = h.get('x-guest-id')`
- Server Actions: `'use server'` + revalidatePath. Guest actions need per-guest auth — build `assertGuest(guestId)` helper to verify that a mutation's guest_id matches the header.
- shadcn/ui Base UI (no asChild); `lucide-react` icons; Tailwind v4
- TipTap `RichTextDisplay` for rendering festinfo JSON on forside
- TypeScript strict; zero tsc errors required for each plan

## Auth Model for Guest Actions
Guest Server Actions must verify the caller's guest_id from the cookie/header matches the resource being mutated.

**Recommended pattern**:
```ts
// src/lib/auth/resolveGuest.ts
export async function resolveGuest(): Promise<{ id: string; type: string }> {
  const h = await headers()
  const id = h.get('x-guest-id')
  const type = h.get('x-guest-type')
  if (!id || !type) throw new Error('Unauthorized')
  return { id, type }
}

export async function assertGuest(guestId: string): Promise<void> {
  const { id } = await resolveGuest()
  if (id !== guestId) throw new Error('Forbidden')
}
```

**Screen-type restriction**: `/{uuid}/billeder/kamera` + photo upload must reject `type === 'screen'`. Use `if (type === 'screen') throw new Error('Not available for screens')`.

## Plan Structure

| Plan | Wave | Agent | Focus |
|------|------|-------|-------|
| 05-01 | 1 | Frontend Developer | Bottom-menu + `resolveGuest` auth helper + `/{uuid}/hvor` + `/{uuid}/deltagere` |
| 05-02 | 2 | Senior Developer | Forside (festinfo/invite/indslag/valg/opgaveindikator) + `/{uuid}/opgaver` (static swap) |
| 05-03 | 2 | Senior Developer | Media pipeline + `/{uuid}/billeder/kamera` + `/{uuid}/billeder` + `/{uuid}/minder` + `/{uuid}/galleri` |

Waves 2a and 2b (plans 05-02 and 05-03) both depend on 05-01 only (shared layout + resolveGuest helper). They can run in parallel.

## File Disjointness

**Plan 05-01 files** (foundation):
- `src/components/guest/BottomMenu.tsx` (NEW)
- `src/components/guest/GuestLayoutShell.tsx` (NEW — extracted from layout.tsx, so layout.tsx can render it or suppress bottom-menu for camera route)
- `src/app/[uuid]/layout.tsx` (MODIFY — replace placeholder bottom-nav, accept children-only shell)
- `src/app/[uuid]/hvor/page.tsx` (NEW)
- `src/app/[uuid]/deltagere/page.tsx` (NEW)
- `src/lib/auth/resolveGuest.ts` (NEW)
- `src/components/guest/GuestList.tsx` (NEW)
- `src/components/guest/EventMapDisplay.tsx` (NEW)

**Plan 05-02 files** (forside + opgaver):
- `src/app/[uuid]/page.tsx` (MODIFY — replace skeleton with real forside)
- `src/app/[uuid]/opgaver/page.tsx` (NEW)
- `src/lib/actions/guest/performances.ts` (NEW)
- `src/lib/actions/guest/choices.ts` (NEW)
- `src/lib/actions/guest/invitations.ts` (NEW — accept invitation)
- `src/lib/actions/guest/tasks.ts` (NEW — read assignments; swap requests)
- `src/components/guest/InvitationAccept.tsx` (NEW)
- `src/components/guest/PerformanceManager.tsx` (NEW)
- `src/components/guest/ChoiceAnswers.tsx` (NEW)
- `src/components/guest/TaskIndicator.tsx` (NEW)
- `src/components/guest/TaskList.tsx` (NEW)
- `src/components/guest/SwapRequestForm.tsx` (NEW)

**Plan 05-03 files** (media):
- `src/lib/storage/upload.ts` (NEW — upload helper, returns storage_url)
- `src/app/[uuid]/billeder/page.tsx` (NEW)
- `src/app/[uuid]/billeder/kamera/page.tsx` (NEW)
- `src/app/[uuid]/minder/page.tsx` (NEW)
- `src/app/[uuid]/galleri/page.tsx` (NEW)
- `src/lib/actions/guest/photos.ts` (NEW)
- `src/lib/actions/guest/memories.ts` (NEW)
- `src/components/guest/Camera.tsx` (NEW)
- `src/components/guest/PhotoGrid.tsx` (NEW)
- `src/components/guest/MemoryManager.tsx` (NEW)
- `src/components/guest/MemoryForm.tsx` (NEW)
- `src/components/guest/GalleryHorizontal.tsx` (NEW)
- `src/components/guest/GalleryVertical.tsx` (NEW)

No overlap between 05-01 / 05-02 / 05-03. Wave 2 depends on Wave 1's `resolveGuest.ts` + `GuestLayoutShell`.

## Success Criteria
- `/{uuid}` forside: all R15 sub-features work (festinfo display, invitation-accept toggles, indslag CRUD, deltager-valg answering, opgaveindikator shows assignment count, bottom-menu navigates)
- `/{uuid}/hvor`: Google Maps iframe + kort-billede rendered from admin-set event
- `/{uuid}/opgaver`: lists own assignments, can create swap request (no realtime yet — page refresh shows state change)
- `/{uuid}/deltagere`: lists all guests where type != 'screen'
- `/{uuid}/billeder/kamera`: camera capture + upload, no bottom-menu, blocks screen-type
- `/{uuid}/billeder`: own photos grid + delete
- `/{uuid}/minder`: CRUD memories including optional image upload + delete
- `/{uuid}/galleri`: horizontal (mobile-landscape / large screen) + vertical (mobile-portrait) gallery showing filtered photos/memories per `gallery_config`
- All Server Actions enforce `resolveGuest()`/`assertGuest(id)` — guest cannot mutate another guest's resources
- Screen-type guest blocked from camera + photo upload
- `npx tsc --noEmit` clean after each plan
