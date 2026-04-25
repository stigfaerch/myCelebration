'use server'
import { revalidatePath } from 'next/cache'
import { supabaseServer } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/auth/assertAdmin'
import {
  ICON_BY_KEY,
  STATIC_NAV_KEYS,
  STATIC_NAV_META,
  iconKeyForStatic,
  isPageVisibleNow,
  isStaticNavKey,
  parseNavOrder,
  type NavIconKey,
  type NavOrderItem,
  type StaticNavKey,
} from '@/lib/guest/navItems'
import { getStaticItemVisibilityMap } from '@/lib/actions/staticItemVisibility'

interface AppSettingsRow {
  id: string
  sms_template: string
  nav_order: unknown
}

export interface AppSettings {
  id: string
  sms_template: string
  nav_order: NavOrderItem[]
}

export async function getAppSettings(): Promise<AppSettings> {
  const { data, error } = await supabaseServer
    .from('app_settings')
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  const row = data as AppSettingsRow
  return {
    id: row.id,
    sms_template: row.sms_template,
    nav_order: parseNavOrder(row.nav_order),
  }
}

export async function updateSmsTemplate(template: string) {
  const { data: existing } = await supabaseServer
    .from('app_settings')
    .select('id')
    .single()
  if (!existing) throw new Error('App settings not found')
  const { error } = await supabaseServer
    .from('app_settings')
    .update({ sms_template: template })
    .eq('id', existing.id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/indstillinger')
}

// =============================================================================
// Bottom-menu nav order
// =============================================================================

interface PageNavRow {
  id: string
  slug: string
  title: string
  is_active: boolean
  visible_from: string | null
  visible_until: string | null
}

export interface ResolvedNavAdminItem {
  /** Stable key suitable for React's `key=` prop. */
  key: string
  kind: 'static' | 'page'
  /** Static-only: i18n label key under `guest.nav.*` */
  labelKey?: string
  /** Static-only: which static slot this is */
  staticKey?: StaticNavKey
  /** Page-only */
  pageId?: string
  /** Page-only: URL slug under `/{uuid}/p/` */
  pageSlug?: string
  /** Page-only: human title to display */
  pageTitle?: string
  /** Page-only: visibility flags so admin can show indicators */
  pageIsActive?: boolean
  pageVisibleFrom?: string | null
  pageVisibleUntil?: string | null
  /** True when the page is hidden from guests because of date window. */
  pageOutsideWindow?: boolean
}

export interface ResolvedNavGuestItem {
  /** Stable key for `key=` prop. */
  key: string
  href: string
  /** Static items use an i18n key; page items use `pageTitle`. */
  labelKey?: string
  pageTitle?: string
  iconKey: NavIconKey
}

/**
 * Reconcile a stored nav order against the current set of pages.
 *
 * Rules:
 *   - Drop `kind: 'page'` entries whose id no longer exists.
 *   - Append new pages (not yet in order) to the end.
 *   - Ensure every STATIC_NAV_KEY appears exactly once (append if missing).
 *
 * Pure helper: does not touch the DB.
 */
function reconcileOrder(
  stored: NavOrderItem[],
  pages: { id: string }[]
): { order: NavOrderItem[]; changed: boolean } {
  const pageIdSet = new Set(pages.map((p) => p.id))
  const seenStatic = new Set<StaticNavKey>()
  const seenPage = new Set<string>()
  const cleaned: NavOrderItem[] = []
  let changed = false

  for (const item of stored) {
    if (item.kind === 'static') {
      if (seenStatic.has(item.key)) {
        changed = true
        continue
      }
      seenStatic.add(item.key)
      cleaned.push(item)
    } else if (item.kind === 'page') {
      if (!pageIdSet.has(item.id) || seenPage.has(item.id)) {
        changed = true
        continue
      }
      seenPage.add(item.id)
      cleaned.push(item)
    }
  }

  for (const k of STATIC_NAV_KEYS) {
    if (!seenStatic.has(k)) {
      cleaned.push({ kind: 'static', key: k })
      changed = true
    }
  }

  for (const p of pages) {
    if (!seenPage.has(p.id)) {
      cleaned.push({ kind: 'page', id: p.id })
      changed = true
    }
  }

  return { order: cleaned, changed }
}

/**
 * Read the resolved nav for the admin editor. Returns ALL pages (active or
 * not) annotated with visibility metadata so the UI can render hidden badges.
 *
 * Reconciliation is performed in-memory only — the admin must click Save to
 * persist any drift. This avoids surprising silent writes when an admin opens
 * the page after another admin has edited pages elsewhere.
 */
export async function getResolvedNavForAdmin(): Promise<ResolvedNavAdminItem[]> {
  await assertAdmin()

  const [{ data: settingsRow, error: settingsError }, { data: pagesRows, error: pagesError }] =
    await Promise.all([
      supabaseServer.from('app_settings').select('nav_order').single(),
      supabaseServer
        .from('pages')
        .select('id, slug, title, is_active, visible_from, visible_until')
        .order('sort_order'),
    ])
  if (settingsError) throw new Error(settingsError.message)
  if (pagesError) throw new Error(pagesError.message)

  const stored = parseNavOrder((settingsRow as { nav_order: unknown }).nav_order)
  const pages = (pagesRows ?? []) as PageNavRow[]
  const pagesById = new Map(pages.map((p) => [p.id, p]))
  const { order } = reconcileOrder(stored, pages)

  return order.map((item): ResolvedNavAdminItem => {
    if (item.kind === 'static') {
      return {
        key: `static:${item.key}`,
        kind: 'static',
        staticKey: item.key,
        labelKey: STATIC_NAV_META[item.key].labelKey,
      }
    }
    const page = pagesById.get(item.id)
    if (!page) {
      // Should not happen — reconcileOrder strips missing pages — but be safe.
      return {
        key: `page:${item.id}`,
        kind: 'page',
        pageId: item.id,
        pageSlug: '',
        pageTitle: '(slettet)',
        pageIsActive: false,
        pageVisibleFrom: null,
        pageVisibleUntil: null,
        pageOutsideWindow: false,
      }
    }
    const visibleNow = isPageVisibleNow(page)
    const outsideWindow = page.is_active && !visibleNow
    return {
      key: `page:${page.id}`,
      kind: 'page',
      pageId: page.id,
      pageSlug: page.slug,
      pageTitle: page.title,
      pageIsActive: page.is_active,
      pageVisibleFrom: page.visible_from,
      pageVisibleUntil: page.visible_until,
      pageOutsideWindow: outsideWindow,
    }
  })
}

/**
 * Read the resolved nav for guest rendering. Filters out hidden pages and
 * silently drops anything that no longer exists.
 *
 * Static items are also filtered against `static_item_settings` (Phase 8 plan
 * 08-01). A static key with NO entry in the visibility map is treated as
 * fully visible (preserves default behavior). Admin-side resolver
 * (`getResolvedNavForAdmin`) intentionally does NOT apply this filter — admin
 * sees hidden items with badges.
 */
export async function getResolvedNavForGuest(uuid: string): Promise<ResolvedNavGuestItem[]> {
  const [
    { data: settingsRow, error: settingsError },
    { data: pagesRows, error: pagesError },
    staticVisibilityMap,
  ] = await Promise.all([
    supabaseServer.from('app_settings').select('nav_order').single(),
    supabaseServer
      .from('pages')
      .select('id, slug, title, is_active, visible_from, visible_until')
      .order('sort_order'),
    getStaticItemVisibilityMap(),
  ])
  if (settingsError) throw new Error(settingsError.message)
  if (pagesError) throw new Error(pagesError.message)

  const stored = parseNavOrder((settingsRow as { nav_order: unknown }).nav_order)
  const allPages = (pagesRows ?? []) as (PageNavRow & { slug: string })[]
  const pagesById = new Map(allPages.map((p) => [p.id, p]))
  const { order } = reconcileOrder(stored, allPages)

  const out: ResolvedNavGuestItem[] = []
  for (const item of order) {
    if (item.kind === 'static') {
      const visibility = staticVisibilityMap[item.key]
      if (visibility && !isPageVisibleNow(visibility)) continue
      const meta = STATIC_NAV_META[item.key]
      out.push({
        key: `static:${item.key}`,
        href: `/${uuid}${meta.pathSuffix}`,
        labelKey: meta.labelKey,
        iconKey: iconKeyForStatic(item.key),
      })
    } else {
      const page = pagesById.get(item.id)
      if (!page) continue
      if (!isPageVisibleNow(page)) continue
      out.push({
        key: `page:${page.id}`,
        href: `/${uuid}/p/${page.slug}`,
        pageTitle: page.title,
        iconKey: 'page',
      })
    }
  }

  // Defensive — unused but stops dead-code elimination from removing the
  // import; ICON_BY_KEY is consumed on the client. (Kept intentionally.)
  void ICON_BY_KEY

  return out
}

interface ValidationFailure {
  ok: false
  reason: string
}
interface ValidationOk {
  ok: true
  order: NavOrderItem[]
}

function validateOrderShape(input: unknown): ValidationFailure | ValidationOk {
  if (!Array.isArray(input)) return { ok: false, reason: 'order must be an array' }
  const seenStatic = new Set<StaticNavKey>()
  const seenPage = new Set<string>()
  const out: NavOrderItem[] = []
  for (const entry of input) {
    if (!entry || typeof entry !== 'object') {
      return { ok: false, reason: 'invalid entry' }
    }
    const e = entry as Record<string, unknown>
    if (e.kind === 'static') {
      if (!isStaticNavKey(e.key)) {
        return { ok: false, reason: `unknown static key: ${String(e.key)}` }
      }
      if (seenStatic.has(e.key)) {
        return { ok: false, reason: `duplicate static key: ${e.key}` }
      }
      seenStatic.add(e.key)
      out.push({ kind: 'static', key: e.key })
    } else if (e.kind === 'page') {
      if (typeof e.id !== 'string' || e.id.length === 0) {
        return { ok: false, reason: 'page id must be a non-empty string' }
      }
      if (seenPage.has(e.id)) {
        return { ok: false, reason: `duplicate page id: ${e.id}` }
      }
      seenPage.add(e.id)
      out.push({ kind: 'page', id: e.id })
    } else {
      return { ok: false, reason: `unknown entry kind: ${String(e.kind)}` }
    }
  }
  for (const k of STATIC_NAV_KEYS) {
    if (!seenStatic.has(k)) {
      return { ok: false, reason: `missing static key: ${k}` }
    }
  }
  return { ok: true, order: out }
}

export async function updateNavOrder(order: NavOrderItem[]): Promise<void> {
  await assertAdmin()

  const validation = validateOrderShape(order)
  if (!validation.ok) {
    throw new Error(`Ugyldig rækkefølge: ${validation.reason}`)
  }

  // Cross-check page ids against the database.
  const pageIds = validation.order
    .filter((i): i is { kind: 'page'; id: string } => i.kind === 'page')
    .map((i) => i.id)

  if (pageIds.length > 0) {
    const { data: existingPages, error: pagesError } = await supabaseServer
      .from('pages')
      .select('id')
      .in('id', pageIds)
    if (pagesError) throw new Error(pagesError.message)
    const existingIds = new Set((existingPages ?? []).map((p) => (p as { id: string }).id))
    for (const id of pageIds) {
      if (!existingIds.has(id)) {
        throw new Error(`Ukendt side: ${id}`)
      }
    }
  }

  // Total page count must match (no missing or extra pages).
  const { count: totalPagesCount, error: countError } = await supabaseServer
    .from('pages')
    .select('*', { count: 'exact', head: true })
  if (countError) throw new Error(countError.message)
  if ((totalPagesCount ?? 0) !== pageIds.length) {
    throw new Error('Antallet af sider stemmer ikke — opdater siden og prøv igen.')
  }

  const { data: existing } = await supabaseServer
    .from('app_settings')
    .select('id')
    .single()
  if (!existing) throw new Error('App settings not found')

  const { error } = await supabaseServer
    .from('app_settings')
    .update({ nav_order: validation.order })
    .eq('id', (existing as { id: string }).id)
  if (error) throw new Error(error.message)

  revalidatePath('/admin/indstillinger')
  revalidatePath('/admin/sider')
  revalidatePath('/[uuid]', 'layout')
}

/**
 * Append a `kind: 'page'` entry to the stored nav_order.
 * Called from `createPage` after insert. Idempotent.
 */
export async function appendPageToNavOrder(pageId: string): Promise<void> {
  const { data: row, error } = await supabaseServer
    .from('app_settings')
    .select('id, nav_order')
    .single()
  if (error) throw new Error(error.message)

  const settingsId = (row as { id: string }).id
  const stored = parseNavOrder((row as { nav_order: unknown }).nav_order)
  if (stored.some((i) => i.kind === 'page' && i.id === pageId)) return

  const next: NavOrderItem[] = [...stored, { kind: 'page', id: pageId }]
  const { error: updateError } = await supabaseServer
    .from('app_settings')
    .update({ nav_order: next })
    .eq('id', settingsId)
  if (updateError) throw new Error(updateError.message)
}

/** Remove a `kind: 'page'` entry from stored nav_order. Idempotent. */
export async function removePageFromNavOrder(pageId: string): Promise<void> {
  const { data: row, error } = await supabaseServer
    .from('app_settings')
    .select('id, nav_order')
    .single()
  if (error) throw new Error(error.message)

  const settingsId = (row as { id: string }).id
  const stored = parseNavOrder((row as { nav_order: unknown }).nav_order)
  const next = stored.filter((i) => !(i.kind === 'page' && i.id === pageId))
  if (next.length === stored.length) return

  const { error: updateError } = await supabaseServer
    .from('app_settings')
    .update({ nav_order: next })
    .eq('id', settingsId)
  if (updateError) throw new Error(updateError.message)
}
