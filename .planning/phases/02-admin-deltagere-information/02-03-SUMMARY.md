---
plan: 02-03
status: Complete
agent: engineering-senior-developer
wave: 2
---

# Plan 02-03 Summary: /admin/information — TipTap, festinfo, begivenheder

## Status
Complete

## Files Created/Modified
- `package.json`: Added @tiptap/react, @tiptap/pm, @tiptap/starter-kit, @tiptap/html (v3.22.4)
- `src/components/admin/RichTextEditor.tsx`: Client Component — TipTap editor with bold/italic/bullet/ordered-list toolbar
- `src/components/admin/RichTextDisplay.tsx`: Server Component — renders TipTap JSON to HTML via generateHTML
- `src/components/admin/FestDescriptionEditor.tsx`: Client Component — wraps RichTextEditor, calls updateFestDescription Server Action
- `src/components/admin/InvitationUpload.tsx`: Client Component — uploads to Supabase Storage bucket 'invitations', calls updateInvitationUrl Server Action
- `src/components/admin/EventForm.tsx`: Client Component — full event CRUD form including map image upload to 'maps' bucket
- `src/components/admin/EventsManager.tsx`: Client Component — event list with expand/collapse, inline edit, nested location CRUD
- `src/lib/actions/information.ts`: Server Actions — getFestInfo, updateFestDescription, updateInvitationUrl, getEvents, createEvent, updateEvent, deleteEvent, createEventLocation, deleteEventLocation
- `src/app/(admin)/admin/information/page.tsx`: Server Component page — fetches festInfo + events in parallel, renders three sections

## Verification
| Command | Result | Pass? |
|---------|--------|-------|
| `npx tsc --noEmit` | No output (zero errors) | Yes |
| `git commit` | 10 files changed, 1516 insertions | Yes |

## Decisions Made
- Installed TipTap v3.22.4 (latest). API is compatible with the plan spec — useEditor, EditorContent, generateHTML all present.
- Added `@tiptap/html` as a separate package (required for server-side generateHTML in RichTextDisplay).
- Used `useTransition` for all Server Action calls in Client Components — avoids blocking the UI thread and provides isPending state without additional state variables.
- `EventsManager` renders each event as a standalone `EventRow` component to keep state (expanded, editing, addingLocation) local per row and avoid prop drilling.
- `AddLocationForm` is an inline component within EventsManager rather than a separate file — it is only used in one place and adding it as a separate file would be over-engineering.
- `RichTextEditor` prefixes `placeholder` parameter with `_` to satisfy TypeScript's no-unused-vars rule while preserving the public interface for future use.
- Page uses `Promise.all` for parallel data fetching (getFestInfo + getEvents) to avoid sequential waterfall.

## Issues / Risks
- **Manual setup required**: Two Supabase Storage buckets must be created manually before upload features work:
  - `invitations` (public: true) — for invitation file uploads
  - `maps` (public: true) — for event map image uploads
  - Both are documented in comments within their respective components.
- **fest_info row**: The `getFestInfo` action uses `.single()` which will throw if the `fest_info` table has no rows. A seed row must exist. This is consistent with how `getAppSettings` works in plan 02-02.
- **prose classes**: `RichTextEditor` and `RichTextDisplay` use Tailwind Typography `prose` classes. If `@tailwindcss/typography` is not installed, the prose styling will not apply but the components will still function correctly.
- **google_maps_embed**: Stored as raw `<iframe>` HTML string. Rendering this on the guest-facing side will require `dangerouslySetInnerHTML` with appropriate sanitization. This is a downstream concern for the guest-facing plans.

## Handoff Notes
- All Server Actions are in `src/lib/actions/information.ts` — downstream plans can import from there.
- `RichTextDisplay` is a Server Component and can be used anywhere a `Record<string, unknown>` TipTap JSON value needs to be rendered as HTML.
- `RichTextEditor` is a Client Component — wrap in a Client Component when embedding in a Server Component context.
- The `events` type returned by `getEvents` includes nested `event_locations` via a Supabase join. The TypeScript type is inferred from the Supabase client response — no explicit type file was created. Downstream plans should use `Awaited<ReturnType<typeof getEvents>>` if they need the type.
