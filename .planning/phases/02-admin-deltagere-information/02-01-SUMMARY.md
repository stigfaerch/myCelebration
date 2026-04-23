---
plan: 02-01
status: Complete with Warnings
agent: frontend-developer
wave: 1
---

# Plan 02-01 Summary: /admin/deltagere — CRUD

## Status
Complete with Warnings

## Files Created/Modified
- `src/lib/actions/guests.ts` — Server actions: getGuests, getGuest, createGuestAction, updateGuestAction, deleteGuestAction, acceptInvitationAction, getSmsTemplate, getGuestUrl
- `src/app/(admin)/admin/deltagere/page.tsx` — Guest list table with type badges, invitation status, dropdown actions
- `src/app/(admin)/admin/deltagere/ny/page.tsx` — New guest form page
- `src/app/(admin)/admin/deltagere/[id]/rediger/page.tsx` — Edit guest page with delete option
- `src/components/admin/GuestForm.tsx` — Client Component with all fields, conditional screen-only fields
- `src/components/admin/GuestActions.tsx` — Client Component: clipboard copy, SMS link, accept invitation, delete with confirm
- `.env.local` — Added `NEXT_PUBLIC_APP_URL=http://localhost:3000` (not committed)

## Verification
| Command | Result | Pass? |
|---------|--------|-------|
| `npx tsc --noEmit` | 2 errors in pre-existing files (`choices.ts`, `valg/page.tsx`); 0 errors in plan files | Pass (plan files clean) |
| `git commit` | Committed as `56a5bcc` with 6 files, 544 insertions | Pass |

## Decisions Made
- **Replaced `asChild` pattern**: The project's `dropdown-menu.tsx` uses `@base-ui/react/menu` (Base UI) instead of Radix UI. Base UI's Trigger and Item do not support `asChild`. Replaced with `onClick` handlers using `useRouter().push()` for navigation and `window.location.href` for SMS links.
- **Guest interface typed explicitly**: Not relying on Supabase codegen — explicit TypeScript types in `guests.ts`.
- **`createGuestAction` / `updateGuestAction`**: Call `redirect('/admin/deltagere')` after success.
- **`deleteGuestAction`**: Uses `revalidatePath` (no redirect — called from dropdown).
- **`getGuestUrl`**: Reads `NEXT_PUBLIC_APP_URL` with localhost fallback.

## Issues / Risks
- **Pre-existing TypeScript errors**: `src/lib/actions/choices.ts` and `src/app/(admin)/admin/deltagere/valg/page.tsx` have pre-existing type errors not caused by this plan. The plan for those files must fix them.
- **Supabase credentials are placeholder values**: `.env.local` contains placeholder values. Live testing requires real Supabase credentials.
- **No optimistic UI**: Mutations re-render the page after server action completes — acceptable for admin panel.

## Handoff Notes
- The `Guest` type and all CRUD actions are exported from `src/lib/actions/guests.ts` — downstream plans should import from there.
- `getGuestUrl(uuid)` uses `NEXT_PUBLIC_APP_URL` env var — must be set correctly for production.
- `getSmsTemplate()` reads from `app_settings` table single row; falls back to a default Danish template if empty.
- The dropdown in `GuestActions` uses Base UI primitives — any future dropdown additions must avoid `asChild` and use `onClick` handlers instead.
- Pre-existing errors in `choices.ts` and `valg/page.tsx` need resolution by whichever plan owns those files (02-02 or similar).
