# Phase 2: Admin — Deltagere & Information — Context

## Goal
Fuldt fungerende deltagerstyring og festinformation i admin. Inkluderer deltagere CRUD, konfigurerbare valg, SMS-skabelon og festinformation med begivenheder.

## Requirements
- R04: `/admin/information` — festinfo, PDF/billede-upload af invitation, begivenheder (stednavn, tid, adresse, Google Maps embed, lokationer), RTE-beskrivelse
- R05: `/admin/indstillinger` — SMS-skabelon med `{navn}` og `{url}` placeholders
- R06: `/admin/deltagere` — CRUD (navn, type, relation, alder, køn, email, tlf, invitation, opgave-præference), kopier UUID-URL, opret SMS, acceptér invitation
- R07: `/admin/deltagere/valg` — konfigurerbare deltager-valg: binær, multichoice, kort tekstsvar

## Phase 1 Handoff (from 01-03-SUMMARY.md)
- Admin-sider placeres i `src/app/(admin)/admin/` — route group giver sidebar layout automatisk
- Supabase service role client: `import { supabaseServer } from '@/lib/supabase/server'`
- Server Actions bruges til alle mutations (se login-sider som mønster)
- Brug `next/link` ikke `<a>` i admin-layouts
- `x-guest-type` og `x-guest-id` headers sættes af middleware — kun relevant i guest routes
- `messages/da.json` og `messages/en.json` eksisterer med namespaces: common, auth, admin, guest

## Codebase Conventions (from Phase 1)
- TypeScript strict mode
- Tailwind v4 — CSS-baseret config i `src/app/globals.css`, ingen `tailwind.config.ts`
- shadcn/ui komponenter i `src/components/ui/` (button, input, label, separator, sheet, dropdown-menu, sonner installeret)
- Server Actions med `'use server'` directive + `revalidatePath` efter mutations
- Async page components med `params: Promise<{ ... }>`

## Plan Structure

| Plan | Wave | Agent | Focus |
|------|------|-------|-------|
| 02-01 | 1 | Frontend Developer | `/admin/deltagere` — CRUD, liste, formular, SMS, UUID-URL |
| 02-02 | 1 | Frontend Developer | `/admin/deltagere/valg` + `/admin/indstillinger` |
| 02-03 | 2 | Senior Developer | TipTap, lucide-react, `/admin/information` + begivenheder |

## File Disjointness (Wave 1 parallel safety)
Plan 02-01 files: `src/app/(admin)/admin/deltagere/**`, `src/lib/actions/guests.ts`
Plan 02-02 files: `src/app/(admin)/admin/deltagere/valg/**`, `src/app/(admin)/admin/indstillinger/**`, `src/lib/actions/choices.ts`, `src/lib/actions/settings.ts`
→ No overlap — Wave 1 plans can execute in parallel.

## Database Tables Used
- `guests` — R06 (CRUD)
- `choice_definitions`, `guest_choices` — R07 (valg)
- `fest_info`, `events`, `event_locations` — R04 (information)
- `app_settings` — R05 (indstillinger)

## Success Criteria
- `/admin/deltagere`: fuld CRUD, UUID-URL kopiering, SMS-opret, invitation-accept
- `/admin/deltagere/valg`: opret/rediger/slet valg (binær, multichoice, tekst)
- `/admin/information`: festinfo, PDF/billede-upload, begivenheder med Google Maps embed, lokationer, RTE-beskrivelse
- `/admin/indstillinger`: SMS-skabelon med `{navn}` og `{url}` preview
