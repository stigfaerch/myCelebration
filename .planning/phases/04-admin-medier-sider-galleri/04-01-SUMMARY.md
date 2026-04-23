---
phase: 4
plan: 04-01
wave: 1
status: complete
date: 2026-04-23
---

## Files Created

### Server Actions
- `src/lib/actions/pages.ts` — Pages CRUD (getPages, getPage, createPage, updatePage, deletePage). List query excludes `content` field.
- `src/lib/actions/gallery.ts` — Gallery config singleton (getGalleryConfig, updateGalleryConfig).
- `src/lib/actions/screen.ts` — Shared screen override actions (getScreenGuests, showOnPrimaryScreen, setScreenOverride, clearScreenOverride). Exports `ScreenOverrideType`.

### Admin Pages
- `src/app/(admin)/admin/sider/page.tsx` — Server Component fetches pages and renders PageManager.
- `src/app/(admin)/admin/galleri/page.tsx` — Server Component fetches gallery_config singleton and renders GalleryConfigForm.

### Components
- `src/components/admin/PageManager.tsx` — Client list with edit/delete/"Vis på skærm" (via `showOnPrimaryScreen('page', id)`).
- `src/components/admin/PageForm.tsx` — Create/edit form with title, auto-slug (Danish chars → ae/oe/aa), RichTextEditor content, is_active, visible_from/until.
- `src/components/admin/GalleryConfigForm.tsx` — Single form for gallery_config singleton with source, interval, display_type, show_memory_text, filter_after/before.

## Verification

```bash
npx tsc --noEmit
# Exit: 0 — zero errors
```

## Decisions

1. **Slug generation**: Danish-aware slugify replaces `æ→ae`, `ø→oe`, `å→aa` before the standard lowercase-and-hyphenate pass. `slugTouched` tracks whether the user has edited the slug manually so auto-generation stops once overridden.
2. **Page list excludes content**: `getPages()` selects only metadata columns; `getPage(id)` fetches full content lazily when the user opens an edit form. Prevents large JSON payloads when listing.
3. **Sort order assignment**: `createPage` uses `count(*)` across all pages (pages have no parent hierarchy), so new pages land at the end.
4. **Screen override revalidation**: `screen.ts` revalidates all admin pages that host a "Vis på skærm" button (sider, billeder, minder, galleri) so state-dependent UI updates consistently.
5. **Primary screen resolution**: `showOnPrimaryScreen` filters guests by `type = 'screen' AND is_primary_screen = true`, uses `.maybeSingle()` so absence returns null rather than erroring. Throws `'No primary screen configured'` when none exists — surfaced via try/catch in UI.
6. **Upsert conflict target**: `screen_state.guest_id` is PK, so upsert uses `{ onConflict: 'guest_id' }`.
7. **Select element styling**: Used native `<select>` with shadcn-matching classes (`h-9 border-input bg-background`) rather than installing a new shadcn Select component. Keeps dependencies minimal.
8. **GalleryConfig interval validation**: Client-side `Number.isFinite` + `>= 1` check before submit; server trusts the integer.

## Issues

None. All tasks completed and verified.

## Handoff Notes for Plan 04-02

- Import path for screen actions: `import { showOnPrimaryScreen } from '@/lib/actions/screen'`.
- `ScreenOverrideType` is exported from the same module — use `'photo'` for PhotoManager and `'memory'` for MemoryManager.
- `assertAdmin()` from `@/lib/auth/assertAdmin` — required on ALL mutating actions.
- Pattern established: Server Component page fetches data → passes to Client Component manager → manager calls server actions in `useTransition`.
- Danish date formatting helper: `new Date(iso).toLocaleString('da-DK', { dateStyle: 'short', timeStyle: 'short' })`.
- `datetime-local` serialization: See `toDatetimeLocal` / `fromDatetimeLocal` in PageForm/GalleryConfigForm.
- Generic error messages pattern: `throw new Error('Failed to <action>')`; never surface Supabase error.message.

## Agent Attribution

Plan executed inline by orchestrator after Senior Developer agent spawn hit a rate limit. All tasks completed per plan spec with no scope expansion.
