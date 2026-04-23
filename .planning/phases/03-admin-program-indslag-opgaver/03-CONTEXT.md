# Phase 3: Admin — Program, Indslag & Opgaver — Context

## Goal
Admin kan bygge programmet, styre indslag og delegere opgaver til deltagere. Inkluderer programpunkt-CRUD med nesting og rækkefølgeflytning, indslag-oversigt med varighed-redigering, og fuld opgave-CRUD med tildelinger og bytte-spærring.

## Requirements
- R08: `/admin/program` — programpunkter med tidspunkt, nesting, indslag-tilknytning, rækkefølgeflytning
- R09: `/admin/indslag` — oversigt af gæste-indslag; admin kan kun redigere varighed og status; admin lægger indslag i program
- R10: `/admin/opgaver` — CRUD + flyt plads/opgave mellem deltagere; "kontakt værten"-flag blokerer bytte-flow for den opgave

## Phase 2 Handoff (relevant for Phase 3)
- shadcn/ui bruger Base UI (ikke Radix) — `asChild` understøttes IKKE. Brug `onClick` handlers
- Supabase service role: `import { supabaseServer } from '@/lib/supabase/server'`
- Server Actions med `'use server'` + `revalidatePath`
- `lucide-react` tilgængeligt
- Tailwind v4 (CSS-based config)
- TypeScript strict mode
- Guest-typer og -data tilgængeligt via `getGuests()` fra `src/lib/actions/guests.ts`
- Pattern: Server Component page → Client Component manager med optimistisk UI eller `revalidatePath`

## Database Tables Used
> Schema references: `supabase/migrations/001_initial_schema.sql` (amended 2026-04-22 during Phase 3 review cycle 1 — see 03-REVIEW.md). `program_items.parent_id` uses `on delete cascade` so `deleteProgramItem` is a single DELETE.
- `performances` — indslag (oprettet af gæster, admin redigerer kun varighed + status)
  - Kolonner: id, guest_id, type (performance_type enum: speech/toast/music/dance/poem/other), title, description (text), duration_minutes, sort_order, status (performance_status enum: pending/approved/rejected/scheduled), created_at
- `program_items` — programpunkter (1-niveau nesting via parent_id ON DELETE CASCADE)
  - Kolonner: id, parent_id (nullable self-FK, cascade delete), performance_id (nullable FK til performances, set null on delete), type (program_item_type enum: break/performance/info/ceremony), title, start_time (timestamptz), duration_minutes, notes, sort_order, created_at
- `tasks` — opgaver
  - Kolonner: id, title, description (text), location, due_time (timestamptz), max_persons, contact_host (boolean), sort_order, created_at
- `task_assignments` — gæste-tildelinger til opgaver
  - Kolonner: id, task_id, guest_id, is_owner (boolean), unique(task_id, guest_id)

## Codebase Conventions
- Admin-sider i `src/app/(admin)/admin/` (sidebar layout arves automatisk)
- shadcn/ui: button, input, label, separator, sheet, dropdown-menu (Base UI — ingen asChild)
- `lucide-react` installeret
- Async page components med `params: Promise<{ ... }>`
- Server Actions: `'use server'` + `revalidatePath('/admin/{slug}')` + evt. `redirect`

## Plan Structure

| Plan | Wave | Agent | Focus |
|------|------|-------|-------|
| 03-01 | 1 | Frontend Developer | `/admin/indslag` + `/admin/opgaver` |
| 03-02 | 2 | Senior Developer | `/admin/program` — nesting, ordering, indslag-link |

## File Disjointness (Wave 1 er single plan — ingen parallel-risiko)
Plan 03-01 files: `src/lib/actions/performances.ts`, `src/lib/actions/tasks.ts`, `src/app/(admin)/admin/indslag/**`, `src/app/(admin)/admin/opgaver/**`, `src/components/admin/TaskForm.tsx`, `src/components/admin/TaskAssignmentManager.tsx`

Plan 03-02 files: `src/lib/actions/program.ts`, `src/app/(admin)/admin/program/**`, `src/components/admin/ProgramManager.tsx`, `src/components/admin/ProgramItemForm.tsx`

→ Ingen overlap. Wave 2 afhænger af Wave 1 (importerer `performances.ts`).

## Success Criteria
- `/admin/indslag`: liste viser alle gæste-indslag med type-filter og status; admin kan redigere varighed
- `/admin/opgaver`: fuld CRUD, flyt plads/opgave mellem deltagere, "kontakt værten"-flag kan sættes
- `/admin/program`: opret/rediger/slet programpunkter, nesting med parent_id, flyt op/ned, tilknyt indslag
