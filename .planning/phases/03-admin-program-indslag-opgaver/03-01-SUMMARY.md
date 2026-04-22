---
plan: 03-01
status: Complete
agent: engineering-frontend-developer
wave: 1
---

# Plan 03-01 Summary: /admin/indslag + /admin/opgaver

## Status
Complete

## Files Created/Modified
- `src/lib/actions/performances.ts`: Server actions for performances — getPerformances, updatePerformanceDuration, updatePerformanceStatus
- `src/lib/actions/tasks.ts`: Server actions for tasks — getTasks, createTask, updateTask, deleteTask, toggleContactHost, assignGuestToTask, removeGuestFromTask, moveGuestToTask
- `src/app/(admin)/admin/indslag/page.tsx`: Server Component page fetching performances and rendering PerformanceList
- `src/app/(admin)/admin/opgaver/page.tsx`: Server Component page fetching tasks + guests in parallel and rendering OpgaverManager
- `src/components/admin/PerformanceList.tsx`: Client Component with type-filter buttons, per-row inline duration input (onBlur/Enter), and status select with useTransition
- `src/components/admin/TaskForm.tsx`: Client Component for create/edit task with all fields and useTransition
- `src/components/admin/OpgaverManager.tsx`: Client Component with collapsible task rows, inline edit/delete, and TaskAssignmentManager integration
- `src/components/admin/TaskAssignmentManager.tsx`: Client Component for assignment CRUD — add/remove/move guests, contact_host toggle with "Bytte-flow blokeret" warning

## Verification
| Command | Result | Pass? |
|---------|--------|-------|
| `npx tsc --noEmit` | No output (clean) | Yes |

## Decisions Made
- Used inline expand/collapse pattern (same as EventsManager) rather than a Sheet/drawer, keeping the UI consistent with existing admin components and avoiding `asChild` dependency
- `PerformanceList` receives typed data as `PerformanceWithGuest` (locally defined) rather than importing the inferred return type of `getPerformances`, which avoids Supabase generic inference complexity while keeping strict typing
- `getPerformances` and `getTasks` return values are nullish-coalesced (`?? []`) in page components to handle potential null from Supabase when no rows exist
- `TaskAssignmentManager` uses `defaultChecked` for the contact_host checkbox to avoid controlled/uncontrolled conflict since Supabase data refreshes via revalidatePath
- "Flyt til" select uses `defaultValue=""` and `onChange` (not controlled) to avoid stale value UI after server revalidation

## Issues / Risks
- None. TypeScript strict mode passes clean.

## Handoff Notes
- `/admin/program` (plan 03-02) can import `getPerformances` and filter by `status === 'scheduled'` to build the program view
- `updatePerformanceDuration` already calls `revalidatePath('/admin/program')` to keep the program page fresh when duration is edited from indslag
- The `task_assignments` join in `getTasks` uses `guests(id, name, type)` — if Supabase RLS restricts the join, the guest field will be null; the UI handles this gracefully with fallback text "Ukendt gæst"
