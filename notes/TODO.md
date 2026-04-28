# TODO — completed 2026-04-28

All items below shipped in a single batch via 8 sequential quick tasks (Groups A–H).
Three pending Supabase migrations (012, 013, 014) must be applied via Dashboard SQL Editor
before the new behavior is observable in production.

## Generelt

- [x] punkt og nummereret liste vises ikke i editor eller frontend
  - Root cause: `@tailwindcss/typography` not installed → `prose` classes resolved to nothing → Tailwind v4's list-style reset left `<ul>`/`<ol>` bulletless. Fixed by installing the plugin and registering via `@plugin "@tailwindcss/typography";` in globals.css.
- [x] Mulighed for at vælge h1, h2 og p tag i rich text editoren
  - Three new toolbar buttons (P / H1 / H2) in `RichTextEditor.tsx`, matching the existing micro-button style.
- [x] Felt til upload skal være en synlig knap — ikon + teksten "Upload billede"
  - Bare file inputs replaced with hidden inputs + visible Button (lucide Upload icon + Danish text) on `EventForm`, `InvitationUpload`, `MemoryForm`, `PhotoGrid`. Label flips to "Skift billede" when an image already exists.

## /admin/information

### Forsidebillede

- [x] Det skal være muligt at vælge et af de billeder som allerede er uploadet. det skal vises over Festbeskrivelsen på /{uuid} for almindelige deltagere.
  - Migration 012: `forsidebillede_photo_id` FK on `fest_info` with `on delete set null`.
  - New `ForsidebilledePicker` component with Sheet-based photo grid; shows current selection + Vælg/Skift/Ryd actions.
  - Renders flush hero image above festbeskrivelse on `/{uuid}` non-screen branch.

### Begivenheder

- [x] Sorteres kronologisk
  - `getEvents()` now orders by `start_time` (ascending, nullsFirst: false) then `sort_order` as tie-breaker. Events without a time sink to the bottom.

## /admin/billeder og /admin/minder

- [x] Visning af billed på screen virker ikke
  - Root cause: cycler shadowed photo/memory single overrides. Render priority flipped so photo/memory beats cycler.
- [x] Ved aktivering visning af billede på skærm, skal billedet vises med det samme, og skærm valget på /admin/sider sættes på pause
  - Photo/memory single override now wins over `screen_page_assignments` cycle. Realtime push via existing `screen_state` subscription triggers immediate re-render.
- [x] Der skal være en knap til gå tilbage til visning af de skærme som er valgt på /admin/sider
  - Banner ("Skærm X viser et billede/minde — skærm-rotationen er sat på pause") on `PhotoManager` and `MemoryManager` with "Tilbage til skærm-rotation" button. One row per screen if multiple are overridden.

## /admin/program

### Felt: type

- [x] Tilføj 'Begivenhed' (default; vises ikke som tag på /{uuid}/program)
  - Migration 013 adds `'event'` to `program_item_type` enum and sets it as the column default. Admin form defaults Type to Begivenhed for new items. Guest `/{uuid}/program` hides the type-tag pill for `event`-type items.

### Felt: Varighed

- [x] Skal kun gælde for Type: Indslag
  - Form input rendered only when `selectedType === 'performance'`. Type changes force `duration_minutes = null` in submit payload.

### Felt: Vis varighed

- [x] default false; hvis false, vises varighed ikke på /{uuid}/program
  - Migration 013 adds `show_duration boolean default false` column. Form has new "Vis varighed på programsiden" checkbox (only when type=Indslag). Guest page renders duration only when both `show_duration=true` AND `duration_minutes!=null`. Pre-migration items with durations stay hidden until admin opts in.

## /{uuid}

### Mine indslag — Feltet 'Type'

- [x] Musik skal hedder 'Sang & musik'
  - `TYPE_LABELS['music']` flipped to `'Sang & musik'` in both guest + admin maps. Enum key `music` unchanged.
- [x] I stedet for en drop down hvor man kun kan vælge en ting, så skal man kunne aktivere flere
  - Migration 014 converts `performances.type` from scalar enum to `performance_type[]` array. UI is now checkbox group with `<fieldset>`+`<legend>` semantics. Submit-time guard requires ≥1 type. Admin filter uses `array.includes`. Multiple badges per row.

## /{uuid}/billeder

- [x] Upload af billeder
  - PhotoGrid now has both empty-state and FAB upload affordances. Uses presigned-URL → R2 PUT → confirm action flow (mirrors Camera). Allowlist: jpeg, png, heic, heif, webp.

## /{uuid}/deltagere

- [x] Vises alfabetisk i to kolonner med sektioner Hovedperson / Familie / Venner
  - GuestList groups by type with three labeled sections, 2-column row-major grid, alphabetical within each. Format: `Name (relation)`. Empty sections hidden.

## /{uuid}/hvor

- [x] Begivenheder sorteres kronologisk
  - Same fix as /admin/information events sort (start_time + sort_order tie-breaker).

## /{uuid} (skærmvisning)

- [x] Visning af /{uuid}/hvor fejler
  - Root cause: `hydrateStaticItemData('hvor')` selected `event_locations` but `ScreenHvor` reads `event.locations` → undefined → TypeError. Fixed by aliasing the embed: `select '*, locations:event_locations(id, title, description)'`.
