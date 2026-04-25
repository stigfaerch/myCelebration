'use server'
import { revalidatePath } from 'next/cache'
import { supabaseServer } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/auth/assertAdmin'
import { isPageVisibleNow } from '@/lib/guest/navItems'
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
  page: PageSummary & { content: Record<string, unknown> | null }
}

interface RawAssignmentRow {
  id: string
  page_id: string
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

const ASSIGNMENT_SELECT =
  'id, page_id, sort_order, pages (id, slug, title, content, is_active, visible_from, visible_until, sort_order, created_at)'

function rowToAssignment(row: RawAssignmentRow): ScreenAssignment | null {
  if (!row.pages) return null
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
  const { data, error } = await supabaseServer
    .from('screen_page_assignments')
    .select(ASSIGNMENT_SELECT)
    .eq('screen_guest_id', screenGuestId)
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
  const { data, error } = await supabaseServer
    .from('screen_page_assignments')
    .select('page_id, screen_guest_id')
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
 * Per-screen rotation count: how many of a screen's assigned pages are
 * currently visible (active + within window) and how many are hidden. Used
 * by the cycle-settings UI to show "I rotation: N sider (P sider er skjult
 * lige nu)". Public — no admin assertion since it does not leak PII.
 */
export async function getRotationCountsForScreen(
  screenGuestId: string
): Promise<{ visible: number; hidden: number }> {
  const all = await supabaseServer
    .from('screen_page_assignments')
    .select(ASSIGNMENT_SELECT)
    .eq('screen_guest_id', screenGuestId)
  if (all.error) throw new Error('Failed to load assignments for rotation count')

  const rows = (all.data ?? []) as unknown as RawAssignmentRow[]
  let visible = 0
  let hidden = 0
  for (const r of rows) {
    if (!r.pages) continue
    const ok = isPageVisibleNow({
      is_active: r.pages.is_active,
      visible_from: r.pages.visible_from,
      visible_until: r.pages.visible_until,
    })
    if (ok) visible++
    else hidden++
  }
  return { visible, hidden }
}

/**
 * Lightweight existence check — does the screen have ANY assignments,
 * regardless of visibility? Used by the screen render path to decide
 * "pages mode" vs "fall through to override/gallery". Cheaper than
 * fetching the full join.
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
 * Currently-visible assignments for a screen, ordered by sort_order.
 * Used by the screen render path AND by the client cycler when refetching
 * after a realtime tick. Visibility filtering happens server-side so the
 * rule is consistent with `/p/[slug]` and the bottom-nav.
 */
export async function getVisibleScreenAssignments(
  screenGuestId: string
): Promise<ScreenAssignment[]> {
  const { data, error } = await supabaseServer
    .from('screen_page_assignments')
    .select(ASSIGNMENT_SELECT)
    .eq('screen_guest_id', screenGuestId)
    .order('sort_order')
  if (error) throw new Error('Failed to load screen assignments')
  const rows = (data ?? []) as unknown as RawAssignmentRow[]
  return rows
    .map(rowToAssignment)
    .filter((a): a is ScreenAssignment => a !== null)
    .filter((a) =>
      isPageVisibleNow({
        is_active: a.page.is_active,
        visible_from: a.page.visible_from,
        visible_until: a.page.visible_until,
      })
    )
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

  const { error } = await supabaseServer
    .from('screen_page_assignments')
    .insert({
      screen_guest_id: screenGuestId,
      page_id: pageId,
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

  const { error } = await supabaseServer
    .from('screen_page_assignments')
    .delete()
    .eq('screen_guest_id', screenGuestId)
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

  const { data: existing, error: existErr } = await supabaseServer
    .from('screen_page_assignments')
    .select('page_id')
    .eq('screen_guest_id', screenGuestId)
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
