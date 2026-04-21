# myCelebration

## What This Is
En webapp til konfirmationsfester der understøtter struktur og informationsdeling for gæster, admin og skærme — før, under og efter festen. Bygget med Next.js og Supabase (realtime).

## Core Value
Giver vært fuld kontrol over festinfo, program, opgavedelegering og medier — og giver gæster nem, kontoløs adgang via unik UUID-URL med fælles kodeord.

## Who It's For
- **Vært/admin** — styrer alt indhold og konfiguration (desktop-first)
- **Gæster/deltagere** — tilgår info, tilmelder sig, opretter indslag/minder, bytter opgaver (mobile-first)
- **Screens** — dedikerede skærme til festlokalet der viser galleri, program og andet admin-defineret indhold (fullscreen, horisontal)

## Requirements

### Validated
(None yet — ship to validate)

### Active

**Auth & Gæstehåndtering**
- R01: UUID-baserede gæste-URLs + fælles kodeord gemmes i cookie (engangsfriktion)
- R02: Admin-login med ét kodeord fra env-fil
- R03: Supabase `guests`-tabel med Row Level Security

**Admin — Information & Indstillinger**
- R04: `/admin/information` — festinfo, PDF/billede-upload af invitation, begivenheder (stednavn, tid, adresse, Google Maps embed, lokationer), RTE-beskrivelse
- R05: `/admin/indstillinger` — SMS-skabelon med `{navn}` og `{url}` placeholders

**Admin — Deltagere**
- R06: `/admin/deltagere` — CRUD (navn, type, relation, alder, køn, email, tlf, invitation, opgave-præference), kopier UUID-URL, opret SMS, acceptér invitation
- R07: `/admin/deltagere/valg` — konfigurerbare deltager-valg: binær, multichoice, kort tekstsvar

**Admin — Program & Indslag**
- R08: `/admin/program` — programpunkter med tidspunkt, nesting, indslag-tilknytning, rækkefølgeflytning
- R09: `/admin/indslag` — oversigt af gæste-indslag; admin kan kun redigere varighed; admin lægger indslag i program

**Admin — Opgaver**
- R10: `/admin/opgaver` — CRUD + flyt plads/opgave mellem deltagere; "kontakt værten"-flag blokerer bytte-flow for den opgave

**Admin — Sider & Screens**
- R11: `/admin/sider` — statiske sider med RTE, aktivering, tidsbegrænsning; "Vis på primære"/"Vis på skærm" funktioner
- R12: `/admin/billeder` — oversigt, filter, deaktiver, slet, "Vis på skærm"
- R13: `/admin/minder` — oversigt over gæste-minder, rediger/slet, "Vis på skærm"
- R14: `/admin/galleri` — galleri-konfiguration (filter, skiftetid default 8s, visningstype: 1/4/3-rammer)

**Gæste-sider**
- R15: `/{uuid}` — forside: festinfo, invitation-accept, indslag-oprettelse, deltager-valg, opgaveindikator, bottom-menu
- R16: `/{uuid}/hvor` — Google Maps embed + kort-billede
- R17: `/{uuid}/opgaver` — opgave-oversigt + realtime bytte-flow (1-for-1, kræver ikke gensidigt ønske)
- R18: `/{uuid}/deltagere` — deltager-oversigt (ekskl. screen-type)
- R19: `/{uuid}/billeder/kamera` — kamera, ingen bottom-menu, ikke tilgængelig for screens
- R20: `/{uuid}/billeder` — egne billeder + slet; screen-visning: ét billede fullscreen valgt af admin
- R21: `/{uuid}/minder` — CRUD minder (titel, type, beskrivelse, hvornår, billede); screen-visning: ét minde fullscreen
- R22: `/{uuid}/galleri` — galleri-visning (horisontal primær designindsats, vertikal basic); standard deaktiveret for alm. deltagere

**Screen-funktionalitet**
- R23: Screen-deltager type med konfigurérbar default side + realtime admin-overskrivning der forbliver aktiv indtil admin aktivt vælger andet

### Out of Scope
- Gæstebidrag / digital gæstebog (v2)
- Realtime reaktioner (v2)
- Online-overblik over hvem der er til stede (v2)
- Indholdsmoderating (v2)
- Tidsbegrænset screen-overskrivning (v2)
- Screen-indhold-kø (v2)
- Programstyret screen-visning (v2)
- 2-for-1 opgave-bytter (v2)

## Constraints
- Kun dansk tekst i v1; i18n-infrastruktur (next-intl eller tilsvarende) fra dag 1 med engelsk som genereret startudgave
- Admin-kode og deltager-kodeord i env-filer (ikke i database)
- Engelske URL-slugs for alle prædefinerede sider (f.eks. `/pictures`, `/program`, `/tasks`)
- Viewports: mobile-first (gæster), desktop-first (admin), fullscreen horisontal (screens)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| UUID-URL + fælles kodeord | Reducerer skade ved URL-lækage | Cookie-lagret efter første indtastning |
| i18n-infrastruktur fra dag 1 | Let at tilføje sprog senere | Dansk default, engelsk skeleton genereret |
| Engelske URL-slugs | Konsistens og i18n-kompatibilitet | `/pictures` frem for `/billeder` |
| Admin kan ikke redigere gæste-indslag | Respekt for gæsternes ejerskab | Kun varighed kan justeres af admin |
| 1-for-1 bytte i v1 | Simplificerer logik | Udvidelse til 2-for-1 er v2-scope |
| Screen som deltager-type | Genbruger gæste-URL-mekanisme for screens | Screen-adfærd styres via `type=screen` og Supabase Realtime |
| Screen forbliver på `/{uuid}` | Ingen selvstændig `/galleri`-route | Screen renderer dynamisk indhold via Realtime — URL ændrer sig aldrig |

## Architecture Influences
- **Framework**: Next.js App Router
- **Database & Auth**: Supabase (Postgres + RLS + Realtime subscriptions)
- **Fil-upload**: Supabase Storage (billeder, invitation PDF/PNG)
- **Realtime**: Supabase Realtime — screen-styring og bytte-flow
- **Rich Text**: TipTap
- **i18n**: next-intl
- **Styling**: Tailwind CSS + shadcn/ui (New York style, neutral base, CSS variables)
- **Deployment**: Vercel

### Screen-routing
Screen-browsere forbliver altid på `/{uuid}`. Default-siden og admin-overskrivninger ændrer hvad der *renderes* på `/{uuid}`, ikke URL'en. Der er ingen selvstændig `/galleri`-route — `/{uuid}/galleri`-indholdet vises direkte i screen-konteksten.

---
*Last updated: 2026-04-21 after Phase 1 scaffold (Plan 01-01)*
