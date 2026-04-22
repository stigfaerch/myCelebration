---
plan: 02-02
status: Complete
agent: frontend-developer
wave: 1
---

# Plan 02-02 Summary: /admin/deltagere/valg + /admin/indstillinger

## Status
Complete

## Files Created
- `src/lib/actions/choices.ts` — Server actions: getChoiceDefinitions, createChoiceDefinition, updateChoiceDefinition, deleteChoiceDefinition
- `src/lib/actions/settings.ts` — Server actions: getAppSettings, updateSmsTemplate
- `src/app/(admin)/admin/deltagere/valg/page.tsx` — Choice definitions list with type badges and response counts
- `src/app/(admin)/admin/indstillinger/page.tsx` — SMS template settings page
- `src/components/admin/ChoiceManager.tsx` — Client Component: inline create/edit with type-conditional options textarea
- `src/components/admin/SmsTemplateEditor.tsx` — Client Component: live preview replacing {navn} and {url}

## Verification
- `npx tsc --noEmit` — passes clean

## Key Decisions
- `getChoiceDefinitions` returns `response_count` by joining `guest_choices(count)` and mapping the nested aggregate
- `deleteChoiceDefinition` checks response count server-side (count returned, client confirms separately via window.confirm)
- `createChoiceDefinition` / `updateChoiceDefinition` parse newline-separated textarea string into `string[]` for `multichoice` type; `null` for binary/text

## Success Criteria
- [x] Choice definitions list shows type and response count
- [x] Binary, multichoice, and text choices can be created
- [x] Multichoice shows dynamic options editor (newline-separated)
- [x] Delete warns when existing responses present
- [x] SMS template saved to database
- [x] Live preview replaces {navn} and {url} correctly
- [x] TypeScript compiles clean
