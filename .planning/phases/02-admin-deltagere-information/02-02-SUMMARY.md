---
plan: 02-02
status: Complete
agent: frontend-developer
wave: 1
---

# Plan 02-02 Summary

## Status
Complete

## Files Created/Modified
- `src/lib/actions/choices.ts` — Server actions: getChoiceDefinitions, createChoiceDefinition, updateChoiceDefinition, deleteChoiceDefinition. Exports ChoiceDefinition interface and ChoiceType.
- `src/lib/actions/settings.ts` — Server actions: getAppSettings, updateSmsTemplate.
- `src/app/(admin)/admin/deltagere/valg/page.tsx` — RSC page fetching choice definitions and rendering ChoiceManager.
- `src/app/(admin)/admin/indstillinger/page.tsx` — RSC page fetching app settings and rendering SmsTemplateEditor.
- `src/components/admin/ChoiceManager.tsx` — Client component for full CRUD on choice_definitions (inline edit/delete/create with confirm dialog for responses > 0).
- `src/components/admin/SmsTemplateEditor.tsx` — Client component for editing SMS template with live preview.

## Verification
| Command | Result | Pass? |
|---------|--------|-------|
| `npx tsc --noEmit` (initial) | TS2352 type conversion error in choices.ts | Fail |
| Fix: added `as unknown as ChoiceDefinition` intermediate cast | — | — |
| `npx tsc --noEmit` (after fix) | 0 errors, 0 warnings | Pass |
| `git commit` | dd12a43 — 6 files, 390 insertions | Pass |

## Decisions Made
- The spec's cast `row as ChoiceDefinition` failed strict TypeScript because `Record<string, unknown>` does not sufficiently overlap with the interface. Changed to `row as unknown as ChoiceDefinition` — standard double-cast pattern for untyped Supabase results.
- `deleteChoiceDefinition` keeps the server-side `confirmed = true` stub as specified; client confirmation is handled via `window.confirm` in ChoiceManager before calling the action, which is the correct boundary.
- `getSmsTemplate` already existed in `src/lib/actions/guests.ts` as a thin helper. The new `src/lib/actions/settings.ts` introduces a proper `getAppSettings` returning the full row (id + sms_template) and a dedicated `updateSmsTemplate` action. There is no conflict — the guests.ts version is a separate lightweight helper.

## Issues / Risks
- The `app_settings` table is expected to always have exactly one row. Both `getAppSettings` and `updateSmsTemplate` use `.single()` — if the row is missing the page will throw. A seed/migration inserting the default row is assumed to exist from an earlier phase or must be added before deploying.
- `choice_definitions` join `guest_choices(count)` relies on the FK relationship being recognised by PostgREST. If the FK is not defined in the database the count will always be 0 rather than erroring — safe but silently incorrect.
- Local state in ChoiceManager is updated optimistically on delete but not on create/update — after those actions Next.js `revalidatePath` triggers a full RSC re-render which re-hydrates `initialChoices`. This resets `editingId` and `showNew` on save, which is acceptable UX for this admin tool.

## Handoff Notes
- Downstream plans that render guest detail pages showing choices (e.g. /admin/deltagere/[id]) can import `getChoiceDefinitions` and `ChoiceDefinition` from `@/lib/actions/choices`.
- SMS sending logic (future plan) should import `getAppSettings` from `@/lib/actions/settings` for the template, and `getGuestUrl` from `@/lib/actions/guests` for the URL.
- The sidebar nav likely needs entries added for "Valg" under Deltagere and for "Indstillinger" — this was out of scope for 02-02 and should be handled by whichever plan owns the sidebar component.
