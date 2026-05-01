'use server'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { supabaseServer } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/auth/assertAdmin'
import { isStaticNavKey } from '@/lib/guest/navItems'
import { coercePageMaxWidth } from '@/lib/admin/pageMaxWidth'
import type { PageSummary } from '@/lib/actions/pages'

export type ScreenTransition = 'fade' | 'slide' | 'none'

export interface ScreenCycleSettings {
  cycle_seconds: number
  transition: ScreenTransition
}

export interface ScreenAssignment {
  id: string
  page_id: string
  sort_order: number
  page: PageSummary & {
        content: Record<string, unknown> | null
        max_width?: string | null
      }
}

/**
 * Discriminated-union representation of a screen-assignment row in the
 * polymorphic world (migration 011). A row is either a `'page'` referencing
 * a dynamic admin-defined page, or a `'static'` referencing a built-in
 * menu key (e.g. `'galleri'`, `'deltagere'`, `'hvor'`, `'tasks'`,
 * `'program'`).
 *
 * Consumers:
 *   - Wave 2 plan 08-05 (cycler refactor) — fetches mixed lists and renders
 *     either a TipTap page or a dedicated static-view component per cycle
 *     step.
 *   - Wave 2 plan 08-03 (admin UI) — renders the assignment list with
 *     per-kind row treatment.
 */
export type MixedAssignment =
  | {
      kind: 'page'
      id: string
      sort_order: number
      page: PageSummary & {
        content: Record<string, unknown> | null
        max_width?: string | null
      }
    }
  | {
      kind: 'static'
      id: string
      sort_order: number
      static_key: string
    }

interface RawAssignmentRow {
  id: string
  page_id: string | null
  sort_order: number
  pages:
    | {
        id: string
        slug: string
        title: string
        content: Record<string, unknown> | null
        is_active: boolean
        visible_from: string | null
        visible_until: string | null
        sort_order: number
        created_at: string
      }
    | null
}

interface RawMixedAssignmentRow {
  id: string
  kind: 'page' | 'static'
  page_id: string | null
  static_key: string | null
  sort_order: number
  pages:
    | {
        id: string
        slug: string
        title: string
        content: Record<string, unknown> | null
        is_active: boolean
        visible_from: string | null
        visible_until: string | null
        sort_order: number
        created_at: string
        max_width?: string | null
      }
    | null
}

const ASSIGNMENT_SELECT =
  'id, page_id, sort_order, pages (id, slug, title, content, is_active, visible_from, visible_until, sort_order, created_at)'

const MIXED_ASSIGNMENT_SELECT =
  'id, kind, page_id, static_key, sort_order, pages (id, slug, title, content, is_active, visible_from, visible_until, sort_order, created_at, max_width)'

function rowToMixed(row: RawMixedAssignmentRow): MixedAssignment | null {
  if (row.kind === 'page') {
    if (!row.pages || !row.page_id) return null
    return {
      kind: 'page',
      id: row.id,
      sort_order: row.sort_order,
      page: {
        id: row.pages.id,
        slug: row.pages.slug,
        title: row.pages.title,
        content: row.pages.content,
        is_active: row.pages.is_active,
        visible_from: row.pages.visible_from,
        visible_until: row.pages.visible_until,
        sort_order: row.pages.sort_order,
        created_at: row.pages.created_at,
        max_width: row.pages.max_width ?? null,
      },
    }
  }
  if (row.kind === 'static') {
    if (!row.static_key) return null
    return {
      kind: 'static',
      id: row.id,
      sort_order: row.sort_order,
      static_key: row.static_key,
    }
  }
  return null
}

function rowToAssignment(row: RawAssignmentRow): ScreenAssignment | null {
  if (!row.pages) return null
  if (!row.page_id) return null
  return {
    id: row.id,
    page_id: row.page_id,
    sort_order: row.sort_order,
    page: {
      id: row.pages.id,
      slug: row.pages.slug,
      title: row.pages.title,
      content: row.pages.content,
      is_active: row.pages.is_active,
      visible_from: row.pages.visible_from,
      visible_until: row.pages.visible_until,
      sort_order: row.pages.sort_order,
      created_at: row.pages.created_at,
    },
  }
}

/**
 * All assignments for a screen, including pages that are inactive or
 * outside their visibility window. Used by admin UI (Task 3) to render
 * the assignment list with status badges.
 *
 * Caller must hold admin cookie. The screen render path uses
 * `getVisibleScreenAssignments` instead.
 */
export async function getScreenAssignmentsAll(
  screenGuestId: string
): Promise<ScreenAssignment[]> {
  await assertAdmin()
  // Audit (migration 011 / Plan 08-02): page-only — must filter `kind='page'`
  // so static-key rows on the same table do not pollute the page list.
  const { data, error } = await supabaseServer
    .from('screen_page_assignments')
    .select(ASSIGNMENT_SELECT)
    .eq('screen_guest_id', screenGuestId)
    .eq('kind', 'page')
    .order('sort_order')
  if (error) throw new Error('Failed to load screen assignments')
  const rows = (data ?? []) as unknown as RawAssignmentRow[]
  return rows
    .map(rowToAssignment)
    .filter((a): a is ScreenAssignment => a !== null)
}

/**
 * Read a flat (page_id → screen_guest_ids[]) map for all pages. Used by the
 * admin /sider screen to render the per-page screen-toggle state without
 * issuing one query per row. Admin-only.
 */
export async function getAssignmentsMapByPage(): Promise<
  Record<string, string[]>
> {
  await assertAdmin()
  // Audit (migration 011 / Plan 08-02): page-only map — explicit
  // `kind='page'` filter required so static rows (page_id IS NULL) cannot
  // reach the loop and inject null-keyed bucket entries.
  const { data, error } = await supabaseServer
    .from('screen_page_assignments')
    .select('page_id, screen_guest_id')
    .eq('kind', 'page')
  if (error) throw new Error('Failed to load assignments map')

  const out: Record<string, string[]> = {}
  for (const row of (data ?? []) as { page_id: string; screen_guest_id: string }[]) {
    const list = out[row.page_id] ?? []
    list.push(row.screen_guest_id)
    out[row.page_id] = list
  }
  return out
}

/**
 * Per-screen rotation count: how many pages are assigned to this screen.
 * Screens bypass guest-facing visibility (see
 * `getVisibleScreenAssignmentsMixed`), so every assigned page rotates.
 * The shape `{ visible, hidden }` is preserved for backwards compat with
 * the cycle-settings UI; `hidden` is always 0.
 */
export async function getRotationCountsForScreen(
  screenGuestId: string
): Promise<{ visible: number; hidden: number }> {
  // Audit (migration 011 / Plan 08-02): existing UI shows page-rotation
  // counts only — preserve that semantics with a `kind='page'` filter.
  const { count, error } = await supabaseServer
    .from('screen_page_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('screen_guest_id', screenGuestId)
    .eq('kind', 'page')
  if (error) throw new Error('Failed to load assignments for rotation count')

  return { visible: count ?? 0, hidden: 0 }
}

/**
 * Lightweight existence check — does the screen have ANY assignments,
 * regardless of visibility OR kind? Used by the screen render path to
 * decide "cycle mode" vs "fall through to override/gallery". Cheaper than
 * fetching the full join.
 *
 * Audit (migration 011 / Plan 08-02): intentionally NO `kind` filter — the
 * plan documents "existing callers expect 'any cycle items'", so static
 * assignments must count too. Otherwise a screen with only static
 * assignments would fall through to the gallery default.
 */
export async function hasAnyScreenAssignments(
  screenGuestId: string
): Promise<boolean> {
  const { count, error } = await supabaseServer
    .from('screen_page_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('screen_guest_id', screenGuestId)
  if (error) throw new Error('Failed to count screen assignments')
  return (count ?? 0) > 0
}

/**
 * Assignments for a screen, ordered by sort_order.
 *
 * Screens intentionally bypass page visibility (`is_active`,
 * `visible_from`, `visible_until`). Those flags gate guest-facing surfaces
 * (bottom-nav, /p/[slug]); for screens the assignment itself IS the gate
 * — admin assigns explicitly per screen. Double-gating made it impossible
 * to activate a still-hidden page on a screen.
 */
export async function getVisibleScreenAssignments(
  screenGuestId: string
): Promise<ScreenAssignment[]> {
  // Audit (migration 011 / Plan 08-02): page-only — existing callers
  // (ScreenPageCycle realtime refetch, single-page render path) expect
  // page rows. Static rows are surfaced via `getVisibleScreenAssignmentsMixed`
  // which is consumed by the new cycler refactor in Wave 2 plan 08-05.
  const { data, error } = await supabaseServer
    .from('screen_page_assignments')
    .select(ASSIGNMENT_SELECT)
    .eq('screen_guest_id', screenGuestId)
    .eq('kind', 'page')
    .order('sort_order')
  if (error) throw new Error('Failed to load screen assignments')
  const rows = (data ?? []) as unknown as RawAssignmentRow[]
  return rows
    .map(rowToAssignment)
    .filter((a): a is ScreenAssignment => a !== null)
}

/**
 * Append a page to a screen's cycle. New assignments take the next
 * sort_order slot. Idempotent against unique(screen_guest_id, page_id).
 */
export async function addPageToScreen(
  screenGuestId: string,
  pageId: string
): Promise<void> {
  await assertAdmin()

  const { data: maxRow, error: maxErr } = await supabaseServer
    .from('screen_page_assignments')
    .select('sort_order')
    .eq('screen_guest_id', screenGuestId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (maxErr) throw new Error('Failed to determine next sort_order')
  const nextSort =
    maxRow && typeof (maxRow as { sort_order: number }).sort_order === 'number'
      ? (maxRow as { sort_order: number }).sort_order + 1
      : 0

  // Audit (migration 011 / Plan 08-02): explicit `kind: 'page'` on insert.
  // The column has a default of `'page'` from the migration, so this is
  // defensive — but it makes intent explicit and survives a future change
  // to the default.
  const { error } = await supabaseServer
    .from('screen_page_assignments')
    .insert({
      screen_guest_id: screenGuestId,
      page_id: pageId,
      kind: 'page',
      sort_order: nextSort,
    })
  if (error) {
    // Unique violation = page already assigned; treat as idempotent.
    if (!/duplicate key|unique/i.test(error.message)) {
      throw new Error('Failed to add page to screen')
    }
  }

  revalidatePath('/admin/sider')
}

/** Remove a page from a screen's cycle. Idempotent. */
export async function removePageFromScreen(
  screenGuestId: string,
  pageId: string
): Promise<void> {
  await assertAdmin()

  // Audit (migration 011 / Plan 08-02): scope delete to `kind='page'`.
  // page_id is now nullable; without this filter the query would still
  // match correctly because we also `.eq('page_id', pageId)` and static
  // rows have NULL page_id (NULL never equals a non-null string). The
  // explicit filter is defensive and makes intent clear.
  const { error } = await supabaseServer
    .from('screen_page_assignments')
    .delete()
    .eq('screen_guest_id', screenGuestId)
    .eq('kind', 'page')
    .eq('page_id', pageId)
  if (error) throw new Error('Failed to remove page from screen')

  revalidatePath('/admin/sider')
}

/**
 * Replace the sort order for a screen's assignments. The supplied list
 * MUST be the complete set of currently-assigned page ids; any extras or
 * missing ids are rejected to keep the operation atomic from the
 * caller's perspective.
 */
export async function reorderScreenAssignments(
  screenGuestId: string,
  orderedPageIds: string[]
): Promise<void> {
  await assertAdmin()

  // Audit (migration 011 / Plan 08-02): page-only — `orderedPageIds` is
  // a list of page UUIDs, so filter to `kind='page'` rows. Static rows
  // get their own reorder helper if/when a Wave 2 plan adds one; today
  // they are appended in insertion order via `addStaticItemToScreen`.
  const { data: existing, error: existErr } = await supabaseServer
    .from('screen_page_assignments')
    .select('page_id')
    .eq('screen_guest_id', screenGuestId)
    .eq('kind', 'page')
  if (existErr) throw new Error('Failed to load current assignments')

  const existingIds = new Set(
    ((existing ?? []) as { page_id: string }[]).map((r) => r.page_id)
  )
  const incoming = new Set(orderedPageIds)
  if (
    existingIds.size !== incoming.size ||
    [...existingIds].some((id) => !incoming.has(id))
  ) {
    throw new Error('Reorder list does not match current assignments')
  }

  // Sequential updates: small N (a screen rarely has more than a handful of
  // pages), and Supabase's PostgREST has no batch-update primitive. Each
  // update touches a single row by composite key.
  for (let i = 0; i < orderedPageIds.length; i++) {
    const pageId = orderedPageIds[i]
    const { error } = await supabaseServer
      .from('screen_page_assignments')
      .update({ sort_order: i })
      .eq('screen_guest_id', screenGuestId)
      .eq('kind', 'page')
      .eq('page_id', pageId)
    if (error) throw new Error('Failed to reorder assignments')
  }

  revalidatePath('/admin/sider')
}

/** Read the current cycle settings for a screen guest. */
export async function getScreenCycleSettings(
  screenGuestId: string
): Promise<ScreenCycleSettings> {
  const { data, error } = await supabaseServer
    .from('guests')
    .select('screen_cycle_seconds, screen_transition')
    .eq('id', screenGuestId)
    .maybeSingle()
  if (error) throw new Error('Failed to load cycle settings')

  const row = data as
    | { screen_cycle_seconds: number | null; screen_transition: string | null }
    | null

  const cycle_seconds = row?.screen_cycle_seconds ?? 8
  const rawTransition = row?.screen_transition ?? 'fade'
  const transition: ScreenTransition =
    rawTransition === 'slide' || rawTransition === 'none' ? rawTransition : 'fade'

  return { cycle_seconds, transition }
}

/**
 * Update cycle settings on the guests row, and bump an assignment row so
 * the change propagates over realtime via the `screen_page_assignments`
 * publication. We deliberately do NOT add `guests` to the realtime
 * publication because it contains PII; see migration 008 header.
 *
 * If the screen has no assignments yet, the bump is a no-op — but cycle
 * settings only matter when there are assignments anyway, so the screen
 * has nothing to react to in that state.
 */
export async function updateScreenCycleSettings(
  screenGuestId: string,
  settings: ScreenCycleSettings
): Promise<void> {
  await assertAdmin()

  const cycle = Math.round(settings.cycle_seconds)
  if (!Number.isFinite(cycle) || cycle < 2 || cycle > 600) {
    throw new Error('cycle_seconds must be between 2 and 600')
  }
  if (
    settings.transition !== 'fade' &&
    settings.transition !== 'slide' &&
    settings.transition !== 'none'
  ) {
    throw new Error('transition must be fade, slide, or none')
  }

  const { error: updErr } = await supabaseServer
    .from('guests')
    .update({
      screen_cycle_seconds: cycle,
      screen_transition: settings.transition,
    })
    .eq('id', screenGuestId)
  if (updErr) throw new Error('Failed to update cycle settings')

  // Trigger a realtime push by touching the lowest-sort_order assignment.
  // No-op when the screen has zero assignments — fine, since a screen with
  // zero assignments isn't in pages mode and has nothing to refresh.
  const { data: firstRow, error: pickErr } = await supabaseServer
    .from('screen_page_assignments')
    .select('id')
    .eq('screen_guest_id', screenGuestId)
    .order('sort_order')
    .limit(1)
    .maybeSingle()
  if (pickErr) throw new Error('Failed to load assignment for refresh bump')
  if (firstRow) {
    const { error: bumpErr } = await supabaseServer
      .from('screen_page_assignments')
      .update({ created_at: new Date().toISOString() })
      .eq('id', (firstRow as { id: string }).id)
    if (bumpErr) throw new Error('Failed to bump realtime trigger')
  }

  revalidatePath('/admin/sider')
  revalidatePath(`/admin/deltagere/${screenGuestId}/rediger`)
}

// =============================================================================
// Polymorphic / mixed-assignment surface (migration 011 / Plan 08-02)
// =============================================================================
//
// The exports below extend the existing page-only API with first-class
// support for static-key assignments (Galleri, Deltagere, Hvor, Opgaver,
// Program). Wave 2 plans 08-03 (admin UI) and 08-05 (cycler refactor) consume
// these.
//
// Existing exports above remain page-only (filtered to `kind='page'`) so
// that pre-existing call sites — `ScreenPageCycle`, the `/sider` admin page,
// `GuestForm`, `ScreenAssignmentToggle`, `ScreenCycleSettings`, etc. — keep
// the exact behavior they had pre-migration. New consumers MUST use the
// `*Mixed` helpers.

/**
 * Append a static menu item to a screen's cycle. Static rows live on the
 * SAME polymorphic table as page assignments (migration 011) so a single
 * sort_order space lets admins interleave pages and static views in any
 * order.
 *
 * Validation: `staticKey` must be in `STATIC_NAV_KEYS`. Unknown keys are
 * rejected at the action layer so the database never sees garbage.
 *
 * Idempotency: protected by `spa_unique_screen_static` partial-unique
 * index. Re-adding an already-assigned static key is a no-op.
 *
 * Sort order: takes the next slot after the current max across BOTH kinds
 * for the screen, so a freshly-added static item appears at the END of the
 * cycle by default. Reordering is a Wave 2 admin-UI concern.
 */
export async function addStaticItemToScreen(
  screenGuestId: string,
  staticKey: string
): Promise<void> {
  await assertAdmin()

  if (!isStaticNavKey(staticKey)) {
    throw new Error(`Ukendt statisk nøgle: ${staticKey}`)
  }

  const { data: maxRow, error: maxErr } = await supabaseServer
    .from('screen_page_assignments')
    .select('sort_order')
    .eq('screen_guest_id', screenGuestId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (maxErr) throw new Error('Failed to determine next sort_order')
  const nextSort =
    maxRow && typeof (maxRow as { sort_order: number }).sort_order === 'number'
      ? (maxRow as { sort_order: number }).sort_order + 1
      : 0

  const { error } = await supabaseServer
    .from('screen_page_assignments')
    .insert({
      screen_guest_id: screenGuestId,
      kind: 'static',
      static_key: staticKey,
      page_id: null,
      sort_order: nextSort,
    })
  if (error) {
    // Unique violation = static key already assigned for this screen;
    // treat as idempotent.
    if (!/duplicate key|unique/i.test(error.message)) {
      throw new Error('Failed to add static item to screen')
    }
  }

  revalidatePath('/admin/sider')
}

/**
 * Remove a static menu item from a screen's cycle. Idempotent — a missing
 * row produces a no-op delete.
 *
 * Validation: rejects unknown static keys at the action layer.
 */
export async function removeStaticItemFromScreen(
  screenGuestId: string,
  staticKey: string
): Promise<void> {
  await assertAdmin()

  if (!isStaticNavKey(staticKey)) {
    throw new Error(`Ukendt statisk nøgle: ${staticKey}`)
  }

  const { error } = await supabaseServer
    .from('screen_page_assignments')
    .delete()
    .eq('screen_guest_id', screenGuestId)
    .eq('kind', 'static')
    .eq('static_key', staticKey)
  if (error) throw new Error('Failed to remove static item from screen')

  revalidatePath('/admin/sider')
}

/**
 * All assignments for a screen (page + static), ordered by sort_order.
 * Includes inactive / windowed-out items — admin UI uses this to render
 * the assignment list with status badges across both kinds.
 *
 * Caller must hold admin cookie. The screen render path uses
 * `getVisibleScreenAssignmentsMixed` instead.
 */
export async function getScreenAssignmentsMixed(
  screenGuestId: string
): Promise<MixedAssignment[]> {
  await assertAdmin()
  const { data, error } = await supabaseServer
    .from('screen_page_assignments')
    .select(MIXED_ASSIGNMENT_SELECT)
    .eq('screen_guest_id', screenGuestId)
    .order('sort_order')
  if (error) throw new Error('Failed to load mixed screen assignments')
  const rows = (data ?? []) as unknown as RawMixedAssignmentRow[]
  return rows
    .map(rowToMixed)
    .filter((a): a is MixedAssignment => a !== null)
}

/**
 * Mixed assignments for a screen, ordered by sort_order. Used by the
 * screen render path (Wave 2 plan 08-05's cycler refactor).
 *
 * Screens intentionally bypass guest-facing visibility (page is_active /
 * visible_from / visible_until + static_item_settings). Those gate the
 * bottom-nav and /p/[slug]; for screens the assignment IS the gate —
 * admin pins items per screen explicitly. Double-gating made it
 * impossible to display a still-hidden page on a screen.
 *
 * Note: this is NOT admin-gated — the screen render path runs without an
 * admin cookie. Mirrors `getVisibleScreenAssignments`.
 */
export async function getVisibleScreenAssignmentsMixed(
  screenGuestId: string
): Promise<MixedAssignment[]> {
  // Screens bypass page + static-item visibility. The guest-facing
  // visibility flags (page.is_active / visible_from / visible_until and
  // static_item_settings) gate the bottom-nav and /p/[slug]; for screens,
  // assignment IS the gate. Filtering here would silently drop items
  // admin has explicitly pinned to a screen (e.g. activating a page that
  // is not yet visible to guests).
  const { data, error } = await supabaseServer
    .from('screen_page_assignments')
    .select(MIXED_ASSIGNMENT_SELECT)
    .eq('screen_guest_id', screenGuestId)
    .order('sort_order')
  if (error) throw new Error('Failed to load mixed screen assignments')

  const rows = (data ?? []) as unknown as RawMixedAssignmentRow[]
  return rows.map(rowToMixed).filter((a): a is MixedAssignment => a !== null)
}

/**
 * Discriminated payload used by the polymorphic screen cycler (Plan 08-05).
 * Each visible screen-assignment row is paired with the data the renderer
 * needs to draw a slide:
 *   - `kind: 'page'` carries the same `{ id, title, content }` triple the
 *     pre-08-05 ScreenPageCycle consumed.
 *   - `kind: 'static'` carries `staticKey` and an opaque `data` payload.
 *     The cycler narrows `data` per `staticKey` at render time.
 *
 * This type is intentionally serialisable so it can be passed from a server
 * component to the client cycler as a prop, AND returned from a server
 * action as the realtime-refetch result.
 */
export type MixedScreenItem =
  | {
      kind: 'page'
      id: string
      title: string
      content: Record<string, unknown> | null
      /** Per-page max-width Tailwind suffix (`'2xl'` … `'7xl'`, `'full'`). */
      maxWidth: string
    }
  | {
      kind: 'static'
      id: string
      staticKey: string
      data: unknown
    }

/**
 * Hydrate the runtime-data payload for a single static-key cycle slot.
 * Centralised here so both the server-side initial render and the client
 * realtime refetch can share one fetch path per static kind.
 *
 * Returns `null` if the static key is unknown or its required data source
 * is empty in a way that should hide the slide (the cycler treats `null` as
 * "skip this slot"). Callers MUST filter null entries out before passing
 * the list to ScreenPageCycle.
 *
 * No admin assertion — this is read-only and runs on the public screen
 * render path. The data shapes mirror the existing `/[uuid]/<route>` pages
 * so no PII is exposed beyond what guests already see.
 */
async function hydrateStaticItemData(staticKey: string): Promise<unknown> {
  if (staticKey === 'galleri') {
    const { getGalleryItems } = await import('@/lib/actions/guest/gallery')
    return await getGalleryItems()
  }
  if (staticKey === 'deltagere') {
    const { data } = await supabaseServer
      .from('guests')
      .select('id, name, type, relation')
      .neq('type', 'screen')
      .order('name')
    return { guests: data ?? [] }
  }
  if (staticKey === 'hvor') {
    // Alias the embedded relation to `locations` so the row shape matches
    // `ScreenHvorEvent.locations` in `src/components/screen/ScreenHvor.tsx`.
    // Without the alias, the field would be returned as `event_locations`
    // and `event.locations.length` blows up at render time.
    const { data } = await supabaseServer
      .from('events')
      .select('*, locations:event_locations(id, title, description)')
      .order('sort_order')
    return { events: data ?? [] }
  }
  if (staticKey === 'tasks') {
    const { data } = await supabaseServer
      .from('tasks')
      .select(
        '*, task_assignments(id, guest_id, is_owner, guests(id, name, type))'
      )
      .order('sort_order')
    return { tasks: data ?? [] }
  }
  if (staticKey === 'program') {
    const { data } = await supabaseServer
      .from('program_items')
      .select(
        '*, performances(id, title, type, duration_minutes, guests(name))'
      )
      .order('sort_order')
    return { items: data ?? [] }
  }
  // Unknown / unsupported static key — defensive null so the cycler can
  // skip this slot rather than crashing.
  return null
}

/**
 * Server action that returns the FULL hydrated cycle list for a screen:
 * visible mixed assignments, each with its renderer payload baked in.
 *
 * Used by the polymorphic ScreenPageCycle on realtime refetch — replaces
 * the old `getVisibleScreenAssignments` call so that BOTH page and static
 * slots are refreshed in a single round trip.
 *
 * Identity-gated: caller must EITHER be the screen guest itself (the only
 * legitimate non-admin caller — the cycler running on the screen browser),
 * OR be an authenticated admin. This closes the cross-guest leak where
 * any logged-in guest could request another screen's hydrated payload
 * (full task list with assignees, full guest list, etc.) by passing a
 * different UUID. Visibility-filtered + null-dropped (defensive).
 */
export async function getHydratedMixedScreenItems(
  screenGuestId: string
): Promise<MixedScreenItem[]> {
  // Caller-identity check. The proxy sets x-guest-id / x-guest-type headers
  // on UUID-prefixed requests; admin requests don't carry guest headers but
  // do present a valid admin_token cookie. Accept either.
  const h = await headers()
  const callerGuestId = h.get('x-guest-id')
  const callerGuestType = h.get('x-guest-type')
  const isLegitimateScreen =
    callerGuestId === screenGuestId && callerGuestType === 'screen'
  if (!isLegitimateScreen) {
    // Fall back to admin gate. assertAdmin throws on failure.
    await assertAdmin()
  }

  const visible = await getVisibleScreenAssignmentsMixed(screenGuestId)
  // Hydrate static-item data in parallel — these are independent fetches.
  const hydrated = await Promise.all(
    visible.map(async (a): Promise<MixedScreenItem | null> => {
      if (a.kind === 'page') {
        const rawMaxWidth = (a.page as { max_width?: unknown }).max_width
        return {
          kind: 'page',
          id: a.page.id,
          title: a.page.title,
          content: a.page.content,
          maxWidth: coercePageMaxWidth(rawMaxWidth),
        }
      }
      const data = await hydrateStaticItemData(a.static_key)
      if (data === null) return null
      return {
        kind: 'static',
        id: a.id,
        staticKey: a.static_key,
        data,
      }
    })
  )
  return hydrated.filter((x): x is MixedScreenItem => x !== null)
}

/**
 * Admin helper, mirrors `getAssignmentsMapByPage` for the static-row
 * universe. Returns `{ static_key: [screen_guest_id, ...] }` so the
 * `/admin/sider` page can render which screens have a given static item
 * assigned without N+1 queries.
 *
 * Admin-gated.
 */
export async function getStaticAssignmentsMapByKey(): Promise<
  Record<string, string[]>
> {
  await assertAdmin()
  const { data, error } = await supabaseServer
    .from('screen_page_assignments')
    .select('static_key, screen_guest_id')
    .eq('kind', 'static')
  if (error) throw new Error('Failed to load static assignments map')

  const out: Record<string, string[]> = {}
  for (const row of (data ?? []) as {
    static_key: string | null
    screen_guest_id: string
  }[]) {
    if (!row.static_key) continue
    const list = out[row.static_key] ?? []
    list.push(row.screen_guest_id)
    out[row.static_key] = list
  }
  return out
}
