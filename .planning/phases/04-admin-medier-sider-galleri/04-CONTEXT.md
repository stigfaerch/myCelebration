# Phase 4: Admin — Medier, Sider & Galleri — Context

## Goal
Admin kan styre statisk indhold, billeder, minder og galleri-konfiguration — inkl. screen-vis funktioner.

## Requirements
- R11: `/admin/sider` — statiske sider med RTE, aktivering, tidsbegrænsning; "Vis på primære"/"Vis på skærm" funktioner
- R12: `/admin/billeder` — oversigt, filter på timestamp, deaktiver, slet, "Vis på skærm"
- R13: `/admin/minder` — oversigt over gæste-minder, rediger/slet, "Vis på skærm"
- R14: `/admin/galleri` — galleri-konfiguration (filter, skiftetid default 8s, visningstype: 1/4/3-rammer, vis minde-tekst til/fra)

## Phase 3 Handoff (relevant for Phase 4)
- shadcn/ui bruger Base UI (ikke Radix) — `asChild` understøttes IKKE. Brug `onClick` handlers
- Supabase service role: `import { supabaseServer } from '@/lib/supabase/server'`
- Server Actions med `'use server'` + `revalidatePath`
- `assertAdmin()` fra `@/lib/auth/assertAdmin` — KRÆVET på alle muterende server actions
- `lucide-react` tilgængeligt
- Tailwind v4 (CSS-based config)
- TypeScript strict mode
- TipTap RTE allerede installeret — `RichTextEditor` og `RichTextDisplay` komponenter tilgængelige
- Pattern: Server Component page → Client Component manager med `revalidatePath`
- Fejlmeddelelser i server actions skal være generiske (ikke lække Supabase-detaljer)
- HMAC-signed admin token (`src/lib/auth/adminToken.ts`) — middleware verificerer `admin_token` cookie

## Database Tables Used
> Schema reference: `supabase/migrations/001_initial_schema.sql`

- `pages` — statiske admin-sider
  - Kolonner: id, slug (unique), title, content (jsonb — TipTap JSON), is_active (default false), visible_from (timestamptz), visible_until (timestamptz), sort_order, created_at

- `photos` — gæstebilleder
  - Kolonner: id, guest_id (FK → guests, cascade), storage_url, taken_at, is_active (default true), created_at
  - Indekser: guest_id, taken_at, is_active

- `memories` — gæste-minder
  - Kolonner: id, guest_id (FK → guests, cascade), title, type (memory_type enum: funny/solemn/everyday/milestone), description, when_date (text), image_url, created_at
  - Indekser: guest_id, created_at

- `gallery_config` — galleri-konfiguration (singleton)
  - Kolonner: id, filter_after (timestamptz), filter_before (timestamptz), source (gallery_source enum: photos/memories/both), interval_seconds (default 8), display_type (gallery_display_type enum: single/quad/frames), show_memory_text (default false)
  - Singleton: seed-row indsættes i migration 001

- `screen_state` — realtime override per screen-gæst
  - Kolonner: guest_id (PK, FK → guests, cascade), current_override (screen_override_type enum: page/photo/memory/gallery/program), override_ref_id (uuid), updated_at
  - `guests` tabel: `is_primary_screen boolean` identificerer primær skærm; `type = 'screen'` filtrerer skærm-gæster

## Image Handling Conventions
> Detailed spec: `.planning/IMAGE_HANDLING_AND_STORAGE.md`

Phase 4 admin-sider viser eksisterende billeder/minder (uploaded af gæster i Phase 5). Der er endnu ingen upload-funktionalitet eller billede-processing pipeline. Brug `storage_url`/`image_url` direkte. Schema-udvidelse med derivat-kolonner (`medium_path`, `thumbnail_path`) og processing pipeline bygges i Phase 5.

## Codebase Conventions
- Admin-sider i `src/app/(admin)/admin/` (sidebar layout arves automatisk)
- Sidebar nav-links allerede til stede for alle 4 routes (sider, billeder, minder, galleri)
- shadcn/ui: button, input, label, separator, sheet, dropdown-menu (Base UI — ingen asChild)
- `lucide-react` installeret
- Async page components med `params: Promise<{ ... }>`
- Server Actions: `'use server'` + `assertAdmin()` + `revalidatePath('/admin/{slug}')` + evt. `redirect`
- RTE: `RichTextEditor` (client) og `RichTextDisplay` (server-compatible) allerede i `src/components/admin/`

## Plan Structure

| Plan | Wave | Agent | Focus |
|------|------|-------|-------|
| 04-01 | 1 | Senior Developer | `/admin/sider` + `/admin/galleri` + screen override actions |
| 04-02 | 2 | Frontend Developer | `/admin/billeder` + `/admin/minder` |

## File Disjointness
Plan 04-01 files: `src/lib/actions/pages.ts`, `src/lib/actions/gallery.ts`, `src/lib/actions/screen.ts`, `src/app/(admin)/admin/sider/**`, `src/app/(admin)/admin/galleri/**`, `src/components/admin/PageManager.tsx`, `src/components/admin/PageForm.tsx`, `src/components/admin/GalleryConfigForm.tsx`

Plan 04-02 files: `src/lib/actions/photos.ts`, `src/lib/actions/memories.ts`, `src/app/(admin)/admin/billeder/**`, `src/app/(admin)/admin/minder/**`, `src/components/admin/PhotoManager.tsx`, `src/components/admin/MemoryManager.tsx`

Ingen overlap. Wave 2 afhænger af Wave 1 (importerer `screen.ts`).

## Success Criteria
- `/admin/sider`: opret/rediger/slet sider med RTE, aktivering, synlighedsperiode, "Vis på primære"/"Vis på skærm"
- `/admin/billeder`: liste med timestamp-filter, deaktiver/slet, "Vis på skærm"
- `/admin/minder`: liste med gæstenavn, rediger/slet, "Vis på skærm"
- `/admin/galleri`: konfigurationsform med source, interval, visningstype, vis minde-tekst
