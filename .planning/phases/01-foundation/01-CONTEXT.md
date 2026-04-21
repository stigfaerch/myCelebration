# Phase 1: Foundation — Context

## Goal
Opsæt Next.js-projekt med Supabase, komplet database-skema, auth-middleware og i18n-infrastruktur. Ingen egentlige feature-UI'er endnu — kun skelet.

## Requirements
- R01: UUID-baserede gæste-URLs + fælles kodeord gemmes i cookie (engangsfriktion)
- R02: Admin-login med ét kodeord fra env-fil
- R03: Supabase `guests`-tabel med Row Level Security (og alle øvrige tabeller)

## Tech Decisions (confirmed)
- **Framework**: Next.js App Router
- **CSS**: Tailwind CSS + shadcn/ui
- **RTE**: TipTap
- **i18n**: next-intl (dansk komplet + engelsk skeleton)
- **Database**: Supabase (Postgres + RLS + Realtime)
- **Storage**: Supabase Storage (billeder, PDF)
- **DB access pattern**: Service role key i server-side kode; al adgangskontrol via Next.js middleware
- **Deployment**: Vercel
- **URL slugs**: Engelske (`/pictures`, `/program`, `/tasks`, `/where`, `/guests`, `/memories`, `/gallery`)

## Architecture Decisions
- **Auth**: Next.js middleware håndterer al auth — ingen Supabase Auth. Middleware verificerer UUID eksisterer i `guests`-tabel + password-cookie matcher env var.
- **Screen routing**: Screens forbliver altid på `/{uuid}`. Indhold styres via Supabase Realtime + `screen_state`-tabel.
- **Admin**: Separat password-cookie fra env var. Ingen brugernavn.

## Plan Structure

| Plan | Wave | Agent | Focus |
|------|------|-------|-------|
| 01-01 | 1 | Senior Developer | Project scaffold, Tailwind, shadcn/ui, Vercel |
| 01-02 | 2 | Backend Architect | Supabase setup, komplet DB-skema, RLS |
| 01-03 | 3 | Senior Developer | Auth middleware, next-intl, base layouts |

## Success Criteria
- Next.js App Router projekt kører lokalt og på Vercel (preview)
- Supabase-projekt oprettet med komplet database-skema og RLS-policies
- UUID + fælles kodeord middleware fungerer for gæste-routes
- Admin-kodeord middleware fungerer for `/admin`-routes
- i18n-infrastruktur sat op (dansk komplet, engelsk skeleton)
- Base layouts eksisterer (admin desktop, guest mobile, screen fullscreen)

## Database Tables Overview
`guests`, `performances`, `program_items`, `tasks`, `task_assignments`, `swap_requests`,
`memories`, `photos`, `pages`, `events`, `event_locations`, `choice_definitions`,
`guest_choices`, `gallery_config`, `screen_state`, `fest_info`, `app_settings`

## Existing Assets
- `notes/PROJECT_SPECIFICATION.md` — komplet feature-spec (dansk)
- `.planning/PROJECT.md` — destilleret krav og beslutninger
- `.planning/ROADMAP.md` — faseoversigt
