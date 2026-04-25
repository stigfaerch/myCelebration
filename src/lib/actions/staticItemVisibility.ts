'use server'

import { revalidatePath } from 'next/cache'
import { supabaseServer } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/auth/assertAdmin'
import { isPageVisibleNow, isStaticNavKey } from '@/lib/guest/navItems'

/**
 * Visibility metadata for a single static menu item.
 *
 * Shape mirrors the equivalent columns on the `pages` table so the existing
 * `isPageVisibleNow` predicate can be applied unchanged.
 */
export interface StaticItemVisibility {
  static_key: string
  is_active: boolean
  visible_from: string | null
  visible_until: string | null
}

interface StaticItemSettingsRow {
  static_key: string
  is_active: boolean
  visible_from: string | null
  visible_until: string | null
}

/**
 * Read-only fetch of all per-static-key visibility records as a map keyed by
 * `static_key`.
 *
 * Consumers:
 *   - Guest path: `getResolvedNavForGuest` (Wave 2 plan 08-04) — filter the
 *     bottom menu and per-route visibility guards.
 *   - Admin UI: `MenuManager` (Wave 2 plan 08-03) — render visibility
 *     indicators on static rows.
 *
 * Default behavior: a static key with NO row in the table is treated as
 * fully visible by callers (see `isStaticItemVisibleNow`). This preserves
 * current behavior for keys an admin has never touched.
 *
 * No admin assertion — this is consumed by guest paths too. The data shape
 * is non-sensitive (visibility flags only).
 */
export async function getStaticItemVisibilityMap(): Promise<
  Record<string, StaticItemVisibility>
> {
  const { data, error } = await supabaseServer
    .from('static_item_settings')
    .select('static_key, is_active, visible_from, visible_until')

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as StaticItemSettingsRow[]
  const out: Record<string, StaticItemVisibility> = {}
  for (const row of rows) {
    out[row.static_key] = {
      static_key: row.static_key,
      is_active: row.is_active,
      visible_from: row.visible_from,
      visible_until: row.visible_until,
    }
  }
  return out
}

/**
 * Upsert visibility metadata for a single static key.
 *
 * Consumer: admin UI (Wave 2 plan 08-03) — toggle / time-window editor on
 * the static rows in `MenuManager`.
 *
 * Validates `staticKey` against `STATIC_NAV_KEYS` to reject unknown keys
 * before they reach the database. Mutating action → `assertAdmin()` first.
 *
 * Idempotency: uses Postgres upsert via `onConflict: 'static_key'`. Calling
 * twice with the same args is safe.
 *
 * Revalidation: invalidates the admin nav editor (`/admin/sider`) and the
 * guest layout (`/[uuid]`) so bottom-menu rendering picks up the change on
 * the next request.
 */
export async function updateStaticItemVisibility(
  staticKey: string,
  settings: {
    is_active: boolean
    visible_from: string | null
    visible_until: string | null
  }
): Promise<void> {
  await assertAdmin()

  if (!isStaticNavKey(staticKey)) {
    throw new Error(`Ukendt statisk nøgle: ${staticKey}`)
  }

  const { error } = await supabaseServer
    .from('static_item_settings')
    .upsert(
      {
        static_key: staticKey,
        is_active: settings.is_active,
        visible_from: settings.visible_from,
        visible_until: settings.visible_until,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'static_key' }
    )

  if (error) throw new Error(error.message)

  revalidatePath('/admin/sider')
  revalidatePath('/[uuid]', 'layout')
}

/**
 * Pure synchronous helper: is a static item currently visible to guests?
 *
 * Looks up the visibility record for `staticKey` in the provided `map`
 * (typically obtained via a single `getStaticItemVisibilityMap()` call at
 * the top of a server route). If no entry exists, returns `true` —
 * absence-of-record == fully visible (preserves default behavior).
 *
 * If an entry exists, defers to `isPageVisibleNow` from
 * `@/lib/guest/navItems` since the column shape is identical to dynamic
 * pages.
 *
 * Consumers:
 *   - Guest path: per-route visibility guards on static routes
 *     (e.g. `/[uuid]/galleri`) — Wave 2 plan 08-04.
 *   - Guest path: bottom-menu filter — Wave 2 plan 08-04.
 *
 * NOTE: This function is exposed from a `'use server'` module and therefore
 * compiled as an async server action by Next.js. Callers should `await` it
 * even though the underlying logic is synchronous.
 */
export async function isStaticItemVisibleNow(
  staticKey: string,
  map?: Record<string, StaticItemVisibility>
): Promise<boolean> {
  const visibilityMap = map ?? (await getStaticItemVisibilityMap())
  const entry = visibilityMap[staticKey]
  if (!entry) return true
  return isPageVisibleNow({
    is_active: entry.is_active,
    visible_from: entry.visible_from,
    visible_until: entry.visible_until,
  })
}
