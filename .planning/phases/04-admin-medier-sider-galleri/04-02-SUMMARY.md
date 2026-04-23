---
phase: 4
plan: 04-02
wave: 2
status: complete
date: 2026-04-23
depends_on: [04-01]
---

## Files Created

### Server Actions
- `src/lib/actions/photos.ts` — Photos list with optional `after`/`before`/`active` filters (getPhotos), togglePhotoActive, deletePhoto.
- `src/lib/actions/memories.ts` — Memories list (getMemories), updateMemory (title/description/when_date only — respects guest ownership of type/guest_id), deleteMemory.

### Admin Pages
- `src/app/(admin)/admin/billeder/page.tsx` — Server Component, fetches getPhotos, renders PhotoManager.
- `src/app/(admin)/admin/minder/page.tsx` — Server Component, fetches getMemories, renders MemoryManager.

### Components
- `src/components/admin/PhotoManager.tsx` — Client grid with timestamp filter (efter/før), activation toggle (optimistic with rollback on error), delete, "Vis på skærm" via `showOnPrimaryScreen('photo', id)`.
- `src/components/admin/MemoryManager.tsx` — Client list with inline edit form (title/description/when_date), delete, "Vis på skærm" via `showOnPrimaryScreen('memory', id)`. Type labels in Danish (Sjov/Højtidelig/Hverdag/Milepæl) with distinct colors.

## Verification

```bash
npx tsc --noEmit
# Exit: 0 — zero errors
```

## Decisions

1. **Optimistic toggle with rollback**: PhotoManager updates local state immediately on `togglePhotoActive`, then rolls back in the catch branch if the server action fails. Keeps the UI responsive while preserving correctness on error.
2. **Filter re-fetch instead of server re-render**: Filter submission calls `getPhotos(filters)` client-side and replaces the local photos array, rather than navigating with query params. Simpler UX, no URL pollution. "Nulstil" button refetches without filters.
3. **Admin edit restrictions on memories**: Per plan spec, admin can edit title/description/when_date but NOT type or guest_id — those belong to the guest who created the memory. `updateMemory` type signature enforces this at the type level (MemoryUpdateFormData omits type/guest_id).
4. **Inline edit form per memory**: MemoryEditForm is a sibling component rendered inside the list item when `editingId === memory.id`. Avoids a modal and keeps the list scrollable.
5. **Image handling**: Used `<img>` tags directly with `storage_url`/`image_url` per Phase 4 spec (no processing pipeline yet — that's Phase 5). Added `eslint-disable-next-line` for `@next/next/no-img-element` since Next.js' Image component would need bucket URL configuration not established yet.
6. **Empty state messaging**: "Ingen billeder endnu. Billeder uploades af gæster." and "Ingen minder endnu. Minder oprettes af gæster." — signals to admin that these are guest-created and admin cannot seed them.
7. **Description truncation**: 100 chars with trailing ellipsis (`…`) for memory previews.
8. **Filter column semantics**: `after` = `taken_at >= after`, `before` = `taken_at <= before` — inclusive range endpoints per plan spec.

## Issues

None. All tasks completed and verified.

## Cross-Plan Dependencies

- Imports `showOnPrimaryScreen` from `@/lib/actions/screen` (Plan 04-01).
- Uses `assertAdmin()` from `@/lib/auth/assertAdmin` (Phase 1).

## Phase 4 Success Criteria Coverage

- ✅ `/admin/sider` (04-01): opret/rediger/slet sider med RTE, aktivering, synlighedsperiode, "Vis på skærm"
- ✅ `/admin/billeder` (04-02): liste med timestamp-filter, deaktiver/slet, "Vis på skærm"
- ✅ `/admin/minder` (04-02): liste med gæstenavn, rediger/slet, "Vis på skærm"
- ✅ `/admin/galleri` (04-01): konfigurationsform med source, interval, visningstype, vis minde-tekst

All R11-R14 requirements covered.

## Agent Attribution

Plan executed inline by orchestrator after Frontend Developer agent spawn was blocked by account rate limits. All tasks completed per plan spec with no scope expansion.
