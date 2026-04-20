# Konfirmationsfest Webapp — Brainstorm

## Kernekoncept
- Webapp til fester, med forskellige muligheder før, under og efter festen.
- Next.js + Supabase (realtime)
- Adgang for gæster via unik UUID-URL (dvs. ingen bruger+kodeord)
- Rod siden er admin siden, hvor man skal indtaste kode for at få adgang

---

## Gæstehåndtering
- Hver gæst får sin egen unikke URL (UUID-baseret)
- Supabase `guests`-tabel med metadata pr. gæst
- Row Level Security styrer hvad den enkelte UUID må se

---

# Sider / struktur

## Admin routes

### /
Rodside - for dem som ikke har fået adgang. Her vises en forklaring om at hvis man deltager i festen kan man bede om en URL.

### /admin
Siden hvor admin logger ind - ingen brugernavn - bare 1 kodeord
- oversigt af muligheder efter login

### /admin/information
Information om festen:
- Upload pdf/png/jpg-udgave af invitation
- Informationer
- Praktiske informationer
- Begivenheder
	- Sted
	- Tidspunkter
- Beskrivelse (Richtext editor)
- Lokation
	- Adresse
	- Link til google maps embed-kode
	- Upload af png/jpg kort
	- Beskrivelse til kort
	- Lokationer
		- Titel
		- Beskrivelse

### /admin/program
- Programpunkter for dagen
- Hvert programpunkt kan have et tidspunkt (klokkeslet)
- Et programpunkt kan være under et andet programpunkt
- Man skal kunne indsætte et indslag som programpunkt


### /admin/deltagere
- Felter:
	- uuid (bliver automatisk tildelt ved oprettelse)
	- navn
	- type  (hovedperson|familie|ven|screen - 'screen' er ikke en person som deltager, men bruges til at vise indhold på bestemte skærme)
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
		- Slet deltager
		- Acceptér invitation for deltager
### /admin/deltagere/valg
Administration af konfigurerbare valg og ønsker som deltagere kan gøre.
F.eks. `glutenallergi` eller `ønsker ikke Sushi`
- Opret valg
- Liste over oprettede valg med optælning og mulighed for at slette
### /admin/sider
Administration af statisk indhold
- Oprettelse af sider med statisk indhold (f.eks. /{uuid}/program hvor man kan finde program for festen eller /{uuid}/menu hvor deltagerne kan se hvad der skal spises)
- Redigering af indhold på siderne inkl. statisk indhold på forsiden (Rich Text Editor)
Indstillinger - for statiske sider og alle undersider under User routes 
- Angive om en side er aktiveret / deaktiveret
- Tidsbegrænsning - synlighed fra tidspunkt - synlighed til tidspunkt



- Knap "Vis på skærm nu", hvor at indholdet med det samme vil blive vist på alle /{uuid}/screen sider (uanset deaktiveret/aktiveret og tidsbegræning)  
### /admin/opgaver
Oversigt over opgaver uddelegeret til gæster
- Felter
	- Navn på opgave
	- Tidspunkt
	- Beskrivelse (RTE)
	- Antal personer til udførelse af opgaven
	- Tildelte deltagere

### /admin/minder
Oversigt over minder som deltagere har oprettet
- Til hvert minde kan der været tilknyttet et billede
### /admin/billeder
Oversigt over uploadede billeder
- Liste med filter:
	- Billeder taget efter {timestamp}
	- Billeder taget før {timestamp}
- Slette billeder
- Deaktivere billeder
### /admin/galleri
Funktioner omkring visningen af siden /galleri
- Filter:
	- Billeder taget efter {timestamp}
	- Billeder taget før {timestamp}
	- Billeder fra /billeder eller /minder eller begge
- Tid imellem skift af billeder
- Visnings type:
	- 1 billed
	- 4 billeder
	- 3 billeder i billedrammer placeret lidt vilkårlig og for skellige størrelser roteret en anelse
## User routes
### /{ uuid}
##### For deltager af type screen
- Hvis der ikke er valgt hvad den pågældende screen skal vise, viser den blot /galleri
##### For alle andre typer deltagere
Rodside for almindelige deltagere
- Generel information om festen (invitation, sted, tidspunkt)
- Knap til at acceptere invitation
- Indslag
	- Standard valg nej (nej|muligvis|ja)
		- Indikere typen af indslag (multichoice: tale, sang, underholdning)
		- Optional felt til at angive varighed i minutter
- Valgmuligheder defineret af admin på /admin/deltagere/valg
- Oversigt over de forskellige muligheder i app'en
- Direkte knap til at tage billeder (skal altid være fixed i en bottom menu)

### /{uuid}/hvor
Google maps og/eller billed som viser området

### /{uuid}/opgaver
Viser opgaver som er tildelt pågældende deltager

### /{uuid}/deltagere
- Oversigt over deltagere (skal dog ikke vise deltagere af typen 'screen')
### /{uuid}/billeder/kamera
- Man kan tage billede med kameraet
- Når man har taget billed, gemmes det kun hvis man klikker på "Gem billedet"
### /{uuid}/billeder
- Oversigt over billeder som pågældende deltager har taget.
	- Slet
- Link til  /{uuid}/billeder/kamera
### /{uuid}/minder
- Oversigt over minder som pågældende deltager har oprettet.
	- Felter:
		- Titel
		- Type (sjov)
		- Beskrivelse
		- Hvornår
		- Billede (optional)
	- Funktioner
		- Rediger
		- Slet
		- Upload billed
		- Slet billed


### Individuel gæsteside
- Hver gæst har sin egen personlige side
- Mulige indhold (uafklaret):
  - Hilsner fra andre gæster
  - Gæsten bidrager selv (foto, tekst, quiz-svar)
  - Indhold der vises på storskærm

---

## Features / ideer

### Gæstebidrag
- Gæster uploader billede + hilsen inden festen
- Vises live som digital gæstebog under festen
### Realtime reaktioner
- Gæster kan reagere på ting der sker (stille version af at klappe/reagere)

### Admin-side
- Administrer gæster (opret, rediger, slet)
- Overblik over hvem der er "online" til festen
- Moderer indhold som gæster bidrager med

---

## Uafklarede spørgsmål
- Hvad er den centrale "wow-oplevelse" for gæsterne?
- Er det ét fælles univers eller to separate (én pr. tvilling)?
- Hvad sker specifikt på den individuelle gæsteside?
- Storskærm-integration?

---

*Oprettet: 2026-04-12*
