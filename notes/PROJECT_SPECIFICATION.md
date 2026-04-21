# Konfirmationsfest Webapp — Brainstorm

## Kernekoncept
- Webapp til fester, med forskellige muligheder før, under og efter festen.
- **Formål:** Struktur- og informationsværktøj der understøtter at det bliver en god fest — ikke en "wow-oplevelse" i sig selv. App'en hjælper med struktur samt indsamling og deling af information før, under og efter festen. Det tætteste på en stemningsbærer er galleri-visningen på screens.
- Next.js + Supabase (realtime)
- Adgang for gæster via unik UUID-URL kombineret med et fælles kodeord (engangsfriktion — kodeordet indtastes første gang og gemmes i cookie). Dette reducerer skaden hvis en UUID-URL lækker.
- Rodsiden er admin-siden, hvor man skal indtaste kode for at få adgang

---

## Gæstehåndtering
- Hver gæst får sin egen unikke URL (UUID-baseret)
- Fælles kodeord for alle deltagere oven på UUID (gemmes i cookie efter første indtastning)
- Supabase `guests`-tabel med metadata pr. gæst
- Row Level Security styrer hvad den enkelte UUID må se

---

## Tekniske beslutninger

- **Admin-kode:** Gemmes i env-fil
- **Fælles deltager-kodeord:** Gemmes i env-fil (samme mekanisme)
- **Sprog:** Kun dansk i v1.0, men app'en bygges med i18n-infrastruktur fra dag 1 (dansk som default, engelsk genereret som startudgave). Slugs i URL'er er engelske for dynamiske/prædefinerede sider (f.eks. `/{uuid}/pictures` frem for `/{uuid}/billeder`).
- **Viewport:**
  - Deltagere: mobile-first (vertikal)
  - Admin: desktop-first (horisontal)
  - Screens: fullscreen (horisontal)
  - Galleri: både horisontal (primær — hvor der gøres mest ud af designet) og vertikal (basic) skal fungere fint
- **Galleri default skift-tid:** 8 sekunder

---

# Sider / struktur

## Admin routes

### /
Rodsiden - for dem som ikke har fået adgang. Her vises en forklaring om at hvis man deltager i festen kan man bede om en URL.

### /admin
Siden hvor admin logger ind - ingen brugernavn - bare 1 kodeord
- oversigt af muligheder efter login

### /admin/information
Information om festen:
- Upload pdf/png/jpg-udgave af invitation
- Informationer
- Praktiske informationer
- Beskrivelse (Richtext editor)
- Begivenheder (flere kan oprettes, f.eks. gudstjeneste + fest med forskellige adresser)
	- Stednavn
	- Tekst
	- Starttid
	- Adresse
	- Link til google maps embed-kode
	- Upload af png/jpg kort
	- Beskrivelse til kort
	- Lokationer (steder på stedet, f.eks. parkering eller toilet hørende til den pågældende begivenheds adresse)
		- Titel
		- Beskrivelse

### /admin/indstillinger
Generelle indstillinger for admin.
- SMS-skabelon til uddeling af UUID-URL'er
	- Tekstfelt med placeholders `{navn}` og `{url}`
	- Bruges af "Opret SMS"-knappen på /admin/deltagere

### /admin/program
- Programpunkter for dagen
- Hvert programpunkt kan have et tidspunkt (klokkeslet)
- Et programpunkt kan være under et andet programpunkt
- Man skal kunne indsætte et indslag som programpunkt — vælges fra en liste af indslag oprettet af deltagerne
- Funktioner: opret, rediger, slet, flyt rækkefølge

### /admin/deltagere
- Felter:
	- uuid (bliver automatisk tildelt ved oprettelse)
	- navn
	- type  (hovedperson|familie|ven|screen - 'screen' er ikke en person som deltager, men bruges til at vise indhold på bestemte skærme)
	- default side (kun for type=screen - hvilken side screen'en viser som udgangspunkt, f.eks. /galleri, /program, /menu). Vælges via dropdown samtidigt med at type=screen sættes. Dropdown'en viser /galleri samt alle aktiverede statiske sider fra /admin/sider.
	- primær skærm (bool, kun for type=screen - angiver om denne screen er en primær skærm, f.eks. i salen. Der kan være flere primære skærme. Bruges af "Vis på primære"-funktionen på /admin/sider m.fl.)
	- relation (tekst felt hvor relation til hovedperson kan beskrives)
	- alder
	- køn
	- e-mail
	- tlf
	- invitation accepteret
	- invitation accepteret af (deltager|admin, sættes automatisk)
	- deltager i opgaver (nej|lette|alle - for at angive om personen skal kunne tildeles opgave)
- Funktioner:
	- Tilføj deltager
	- Liste
		- Rediger deltager (alle felter)
		- Slet deltager
		- Acceptér invitation for deltager
		- Kopier UUID-URL
		- Opret SMS — åbner en SMS på admin's enhed med tekst fra skabelonen på /admin/indstillinger, hvor `{navn}` og `{url}` er udfyldt automatisk

### /admin/deltagere/valg
Administration af konfigurerbare valg og ønsker som deltagere kan gøre.
F.eks. `glutenallergi` eller `ønsker ikke Sushi`
- Opret valg — tre typer understøttes:
	- Binær (ja/nej)
	- Multichoice (flere foruddefinerede svarmuligheder)
	- Kort tekstsvar
- Liste over oprettede valg med optælning og mulighed for at redigere og slette

### /admin/indslag
Oversigt over indslag oprettet af deltagere (tale, sang, underholdning).
- Liste med:
	- Navn / titel
	- Deltager (ejer)
	- Elementer (et indslag kan have flere elementer, f.eks. sang + tale)
	- Varighed (optional)
	- Status (nej|muligvis|ja)
- Filter på type
- Funktioner:
	- Admin kan **ikke** redigere eller slette indslag — kun deltageren selv kan ændre indholdet. Admin må mundtligt bede deltageren om ændringer hvis nødvendigt.
	- Admin kan dog justere **varigheden** af et indslag (til planlægning af programmet)
	- Admin afgør om et indslag bliver en del af programmet — indsættes som programpunkt via /admin/program

### /admin/sider
Administration af statisk indhold
- Oprettelse af **statiske** sider med fritekst-indhold (f.eks. /{uuid}/menu hvor deltagerne kan se hvad der skal spises, eller andet admin-defineret indhold). Bemærk: dynamiske sider (program, deltagere, opgaver, billeder, minder) redigeres ikke her — de har deres egen admin-side.
- Redigering af indhold på siderne inkl. statisk indhold på forsiden (Rich Text Editor)
- Liste af alle statiske sider og alle undersider under User routes
- Angive om en side er aktiveret / deaktiveret
- Tidsbegrænsning - synlighed fra tidspunkt - synlighed til tidspunkt
- **Vis på screen-funktioner** (for hver side):
	- `Vis på primære` — viser indholdet på alle screens markeret som primær skærm
	- `Vis på skærm` — dropdown hvor admin vælger en specifik screen-deltager
	- Når der klikkes, vil indholdet med det samme blive vist på de valgte screens rodside (uanset deaktiveret/aktiveret og tidsbegrænsning)
	- I v1.0 er dette en **manuel overskrivning** som forbliver indtil admin aktivt vælger andet indhold eller klikker tilbage til screen'ens default side

### /admin/opgaver
Oversigt over opgaver uddelegeret til gæster
- Felter:
	- Navn på opgave
	- Tidspunkt
	- Beskrivelse (RTE)
	- Antal personer til udførelse af opgaven
	- Tildelte deltagere
	- Kontakt værten ved byttebehov (bool) — hvis sat, kan opgaven ikke indgå i deltagernes bytte-flow; deltageren får i stedet besked om at kontakte værten
- Funktioner:
	- Opret, rediger, slet
	- Flyt opgave (eller plads på opgaven) fra en deltager til en anden

### /admin/minder
Oversigt over minder som deltagere har oprettet
- Til hvert minde kan der være tilknyttet et billede
- Funktioner: rediger, slet
- `Vis på skærm` — vælg en screen-deltager fra dropdown; det valgte minde (billede + titel + beskrivelse) vises i fuld skærm på den valgte screen

### /admin/billeder
Oversigt over uploadede billeder
- Liste med filter:
	- Billeder taget efter {timestamp}
	- Billeder taget før {timestamp}
- Slet billede (fjernes permanent)
- Deaktiver billede (skjules i galleri og offentlige oversigter, men beholdes)
- `Vis på skærm` — vælg en screen-deltager fra dropdown; det valgte billede vises i fuld skærm på den valgte screen

### /admin/galleri
Funktioner omkring visningen af siden /galleri
- Filter:
	- Billeder taget efter {timestamp}
	- Billeder taget før {timestamp}
	- Billeder fra /billeder eller /minder eller begge
- Tid imellem skift af billeder (sekunder, default 8)
- Visnings type:
	- 1 billed
	- 4 billeder
	- 3 billeder i billedrammer placeret lidt vilkårlig og forskellige størrelser roteret en anelse
- Vis titel og beskrivelse fra minder (til/fra) — når slået til, vises mindets titel og beskrivelse sammen med billedet når et minde ruller forbi i galleriet

## User routes

### /{uuid}

##### For deltager af type screen
- Viser som udgangspunkt den `default side` som er konfigureret på deltageren (f.eks. /galleri, /program, /menu)
- Admin kan fra /admin/sider (samt /admin/minder og /admin/billeder) aktivt overskrive visningen via "Vis på primære" eller "Vis på skærm" — overskrivningen forbliver indtil admin vælger andet eller går tilbage til default

##### For alle andre typer deltagere
Rodside for almindelige deltagere
- Generel information om festen (invitation, sted, tidspunkt)
- Knap til at acceptere invitation
- Indslag
	- En deltager kan oprette flere indslag
	- Hvert indslag kan bestå af flere elementer (f.eks. sang + tale — multichoice af: tale, sang, underholdning)
	- Standard status nej (nej|muligvis|ja)
	- Optional felt til at angive varighed i minutter
	- Hvis et indslag er lagt ind i programmet af admin, vises det tydeligt på deltagerens forside med tidspunkt (f.eks. "Dit indslag 'Sang til mor' er planlagt kl. 19:30")
- Valgmuligheder defineret af admin på /admin/deltagere/valg (binær, multichoice eller kort tekstsvar)
- Oversigt over de forskellige muligheder i app'en
- **Opgave-indikator** — hvis deltageren har opgaver, vises en liste over dem lige over bottom-menuen (dvs. altid synlig, fast placering over bottom-menu, ikke som almindeligt sideindhold). Vises kun når der er opgaver.
- **Bottom menu** (fixed i bunden, altid synlig — undtagen på /{uuid}/billeder/kamera):
	- Hjem-knap
	- Program-knap
	- Tag billede-knap (linker til /{uuid}/billeder/kamera)
	- Burger menu-knap — åbner navigation til øvrige sider

### /{uuid}/hvor
Google maps og/eller billed som viser området

### /{uuid}/opgaver
Viser opgaver som er tildelt pågældende deltager.

**Bytte-flow:**
- "Byt opgave"-knap pr. opgave (ikke tilgængelig for opgaver markeret "kontakt værten ved byttebehov" — for disse vises i stedet en tekst: "Hvis du ønsker at bytte denne opgave, kontakt værten")
- Når deltageren klikker "Byt opgave": multichoice over andre eksisterende opgavetyper deltageren kunne tænke sig at bytte til
- Deltageren kan trække eget bytte-ønske tilbage (så længe det ikke allerede er accepteret)
- **Bytte-forespørgsler fra andre** vises på forsiden /{uuid}:
	- Kun forespørgsler der matcher én af deltagerens egne opgaver vises
	- Format: "A ønsker at bytte oprydning for opvask — Accepter?"
	- Deltageren kan lukke/afvise forespørgslen (kryds) uden at acceptere
- **Bytte-logik:**
	- 1-for-1: kun A's plads i opgave X byttes med B's plads i opgave Y. Andre personer på samme opgaver berøres ikke
	- Kræver ikke gensidigt ønske — B kan acceptere selvom B ikke selv har et bytte-ønske
	- Når bytte accepteres: A's øvrige bytte-ønsker (hvis multichoice) slettes også, da bytte-ønsket ikke længere er relevant
	- Realtime: hvis en anden deltager når at acceptere først, opdateres UI'et hos alle interesserede med det samme

### /{uuid}/deltagere
- Oversigt over deltagere (skal dog ikke vise deltagere af typen 'screen')

### /{uuid}/billeder/kamera
- Man kan tage billede med kameraet
- Når man har taget billed, gemmes det kun hvis man klikker på "Gem billedet"
- **Bottom-menu vises IKKE på denne side** — i stedet en simpel "Tilbage til forsiden"-knap
- Ikke tilgængelig for type=screen

### /{uuid}/billeder
- Oversigt over billeder som pågældende deltager har taget
	- Slet
- Link til /{uuid}/billeder/kamera
- **Screen-visning:** når en screen-deltager vises denne side (via admin's "Vis på skærm"), vises ét billede i fuld skærm — billedet vælges af admin på /admin/billeder

### /{uuid}/minder
- Oversigt over minder som pågældende deltager har oprettet
	- Felter:
		- Titel
		- Type (multichoice: sjov, højtidelig, hverdag, milepæl)
		- Beskrivelse
		- Hvornår
		- Billede (optional)
	- Funktioner
		- Rediger
		- Slet
		- Upload billed
		- Slet billed
- **Screen-visning:** når en screen-deltager vises denne side (via admin's "Vis på skærm"), vises ét minde i fuld skærm — mindet vælges af admin på /admin/minder

### /{uuid}/galleri
- Viser galleriet som på /galleri men for den enkelte deltager
- **Standard deaktiveret for almindelige deltagere** — aktiveres på /admin/sider hvis ønsket
- Skal fungere både på horisontal skærm (primær designindsats) og vertikal mobilskærm (må gerne være mere basic)

---

## Features / ideer

### Gæstebidrag
- Vises live som digital gæstebog under festen
### Realtime reaktioner
- Gæster kan reagere på ting der sker (stille version af at klappe/reagere)

### Admin-side
- Overblik over hvem der er "online" til festen
- Moderer indhold som gæster bidrager med

### Ideer til v2 — styring af screens
I v1.0 styres screens kun manuelt (default side + manuel overskrivning fra /admin/sider, /admin/billeder, /admin/minder). Mulige udvidelser:
- **Tidsbegrænset overskrivning** — "vis menuen på entré-screen i 10 minutter og gå så tilbage til default"
- **Kø af indhold** — admin kan lægge flere sider i rækkefølge der afspilles efter hinanden på en screen
- **Programstyret visning** — automatisk skift af indhold på screens baseret på programpunkter (når "middag" starter, vises menu automatisk)

### Ideer til v2 — bytte af opgaver
I v1.0 er bytter kun 1-for-1. Mulige udvidelser:
- **2-for-1-bytter** — byt flere små opgaver mod én større (f.eks. samle tallerkner + lave kaffe byttes mod opvask), eller omvendt

---

## Uafklarede spørgsmål
*(ingen pt.)*

---

*Oprettet: 2026-04-12*
