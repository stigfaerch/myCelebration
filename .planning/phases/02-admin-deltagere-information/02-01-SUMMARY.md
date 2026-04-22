---
plan: 02-01
status: Complete
agent: frontend-developer
wave: 1
---

# Plan 02-01 Summary: /admin/deltagere — CRUD

## Status
Complete

## Files Created
- `src/lib/actions/guests.ts` — Server actions: getGuests, getGuest, createGuestAction, updateGuestAction, deleteGuestAction, acceptInvitationAction, getSmsTemplate, getGuestUrl
- `src/app/(admin)/admin/deltagere/page.tsx` — Guest list table with type badges, invitation status, dropdown actions
- `src/app/(admin)/admin/deltagere/ny/page.tsx` — New guest form page
- `src/app/(admin)/admin/deltagere/[id]/rediger/page.tsx` — Edit guest page with delete option
- `src/components/admin/GuestForm.tsx` — Client Component with all fields, conditional screen-only fields
- `src/components/admin/GuestActions.tsx` — Client Component: clipboard copy, SMS link, accept invitation, delete with confirm

## Verification
- `npx tsc --noEmit` — passes clean

## Key Decisions
- Guest interface typed explicitly in `guests.ts` (not relying on Supabase codegen)
- `createGuestAction` / `updateGuestAction` parse FormData and call `redirect('/admin/deltagere')` after success
- `deleteGuestAction` uses `revalidatePath` (no redirect — called from dropdown)
- `getGuestUrl` reads `NEXT_PUBLIC_APP_URL` with localhost fallback

## Success Criteria
- [x] Guest list renders with type badges and invitation status
- [x] New guest can be created with all fields
- [x] Existing guest can be edited
- [x] Guest can be deleted with confirmation
- [x] UUID-URL copied to clipboard with toast feedback
- [x] SMS link opens with filled template
- [x] Invitation accepted by admin
- [x] TypeScript compiles clean
