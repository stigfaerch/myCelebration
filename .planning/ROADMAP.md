# myCelebration — Roadmap

## Phases

- [ ] Phase 1: Foundation
- [ ] Phase 2: Admin — Deltagere & Information
- [ ] Phase 3: Admin — Program, Indslag & Opgaver
- [x] Phase 4: Admin — Medier, Sider & Galleri
- [x] Phase 5: Gæste-sider
- [x] Phase 6: Screen & Realtime
- [ ] Phase 7: Polish & Launch

## Phase Details

### Phase 1: Foundation
**Goal**: Opsæt Next.js-projekt med Supabase, komplet database-skema, auth-middleware og i18n-infrastruktur. Ingen egentlige feature-UI'er endnu — kun skelet.
**Requirements**: R01, R02, R03
**Recommended Agents**: Backend Architect, Senior Developer, Infrastructure & DevOps Engineer
**Success Criteria**:
- Next.js App Router projekt kører lokalt og på Vercel (preview)
- Supabase-projekt oprettet med komplet database-skema og RLS-policies
- UUID + fælles kodeord middleware fungerer for gæste-routes
- Admin-kodeord middleware fungerer for `/admin`-routes
- i18n-infrastruktur sat op (dansk komplet, engelsk skeleton)
- Base layouts eksisterer (admin desktop, guest mobile, screen fullscreen)
- Tech-valg truffet: RTE, i18n-library, CSS framework, deployment target
- Screen-routing spørgsmål afklaret
**Plans**: 3

### Phase 2: Admin — Deltagere & Information
**Goal**: Fuldt fungerende deltagerstyring og festinformation i admin.
**Requirements**: R04, R05, R06, R07
**Recommended Agents**: Senior Developer, Frontend Developer, UI Designer
**Success Criteria**:
- `/admin/deltagere`: fuld CRUD, UUID-URL kopiering, SMS-opret, invitation-accept
- `/admin/deltagere/valg`: opret/rediger/slet valg (binær, multichoice, tekst)
- `/admin/information`: festinfo, PDF/billede-upload, begivenheder med Google Maps embed, lokationer, RTE-beskrivelse
- `/admin/indstillinger`: SMS-skabelon med `{navn}` og `{url}` preview
**Plans**: 3

### Phase 3: Admin — Program, Indslag & Opgaver
**Goal**: Admin kan bygge programmet, styre indslag og delegere opgaver til deltagere.
**Requirements**: R08, R09, R10
**Recommended Agents**: Senior Developer, Frontend Developer, UI Designer
**Success Criteria**:
- `/admin/program`: opret/rediger/slet/flyt programpunkter, nesting, indslag-tilknytning
- `/admin/indslag`: liste med type-filter, admin kan justere varighed og tilknytte til program
- `/admin/opgaver`: fuld CRUD, flyt plads/opgave mellem deltagere, "kontakt værten"-flag
**Plans**: 2

### Phase 4: Admin — Medier, Sider & Galleri
**Goal**: Admin kan styre statisk indhold, billeder, minder og galleri-konfiguration — inkl. screen-vis funktioner.
**Requirements**: R11, R12, R13, R14
**Recommended Agents**: Senior Developer, Frontend Developer, UI Designer
**Success Criteria**:
- `/admin/sider`: statiske sider med RTE, aktivering, tidsbegrænsning, "Vis på primære"/"Vis på skærm"
- `/admin/billeder`: liste, filter på timestamp, deaktiver, slet, "Vis på skærm"
- `/admin/minder`: liste, rediger/slet, "Vis på skærm"
- `/admin/galleri`: konfiguration (filter, skiftetid, visningstype 1/4/3-rammer, vis minde-tekst til/fra)
**Plans**: 2

### Phase 5: Gæste-sider
**Goal**: Alle gæste-sider fungerer — indslag, minder, billeder, deltager-valg og bytte-flow (statisk del). Ingen realtime endnu.
**Requirements**: R15, R16, R17 (statisk), R18, R19, R20, R21, R22
**Recommended Agents**: Frontend Developer, UI Designer, Senior Developer
**Success Criteria**:
- `/{uuid}`: festinfo, invitation-accept, indslag CRUD, deltager-valg (binær/multichoice/tekst), opgaveindikator, bottom-menu
- `/{uuid}/hvor`: Google Maps embed + kort-billede
- `/{uuid}/deltagere`: oversigt ekskl. screens
- `/{uuid}/billeder/kamera`: kamera + gem billede, ingen bottom-menu
- `/{uuid}/billeder`: egne billeder + slet
- `/{uuid}/minder`: fuld CRUD inkl. billede-upload/slet
- `/{uuid}/galleri`: galleri-visning horisontal (primær) + vertikal (basic)
- `/{uuid}/opgaver`: opgave-liste + bytte-oprettelse (uden realtime-opdatering endnu)
**Plans**: 3

### Phase 6: Screen & Realtime
**Goal**: Screen-deltagere fungerer korrekt med realtime screen-styring; bytte-flow og galleri er live.
**Requirements**: R17 (realtime bytte-flow), R23
**Recommended Agents**: Backend Architect, Senior Developer, Frontend Developer
**Success Criteria**:
- Screen-deltager viser default side og modtager realtime admin-overskrivninger øjeblikkeligt
- "Vis på primære" og "Vis på skærm" ændrer screen-visning i realtid
- Bytte-forespørgsler opdateres realtime hos alle berørte deltagere
- Concurrent-accept scenario håndteres korrekt (den der accepterer først vinder)
- Galleri skifter billeder automatisk med konfigureret interval
- Screen-visning af enkelt billede og enkelt minde fungerer (fullscreen)
**Plans**: 2

### Phase 7: Polish & Launch
**Goal**: Applikationen er klar til produktion — i18n komplet, responsiveness godkendt, fejlhåndtering og røgtest.
**Requirements**: Alle
**Recommended Agents**: QA Verification Specialist, Frontend Developer, Technical Writer
**Success Criteria**:
- i18n: alle tekster ekstraheret til dansk (komplet) + engelsk (skeleton/maskinoversættelse)
- Responsiveness audit godkendt: mobile, desktop og fullscreen
- Kritiske fejlscenarier håndteres gracefully (netværksfejl, ugyldigt UUID, forkert kodeord)
- Smoke tests for kritiske flows: auth, billede-upload, bytte-flow, screen-overskrivning
- Deployment til produktion verificeret
**Plans**: 2

## Progress

| Phase | Plans | Completed | Status |
|-------|-------|-----------|--------|
| Phase 1: Foundation | 3 | 3 | Complete |
| Phase 2: Admin — Deltagere & Information | 3 | 3 | Complete |
| Phase 3: Admin — Program, Indslag & Opgaver | 2 | 2 | Complete (reviewed) |
| Phase 4: Admin — Medier, Sider & Galleri | 2 | 2 | Complete (reviewed) |
| Phase 5: Gæste-sider | 3 | 3 | Complete (reviewed) |
| Phase 6: Screen & Realtime | 2 | 2 | Complete (reviewed) |
| Phase 7: Polish & Launch | 2 | 2 | Executed (pending review) |
