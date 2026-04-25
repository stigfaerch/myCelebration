import {
  CheckSquare,
  Camera,
  Image as ImageIcon,
  MapPin,
  Users,
  BookHeart,
  LayoutGrid,
  FileText,
  CalendarDays,
  type LucideIcon,
} from 'lucide-react'

export const STATIC_NAV_KEYS = [
  'tasks',
  'camera',
  'photos',
  'program',
  'hvor',
  'deltagere',
  'minder',
  'galleri',
] as const

export type StaticNavKey = (typeof STATIC_NAV_KEYS)[number]

interface StaticNavMeta {
  /** Key under the i18n namespace `guest.nav` (e.g. 'tasks'). */
  labelKey: string
  /** Suffix appended to `/${uuid}` (e.g. '/opgaver'). */
  pathSuffix: string
  icon: LucideIcon
}

export const STATIC_NAV_META: Record<StaticNavKey, StaticNavMeta> = {
  tasks: { labelKey: 'tasks', pathSuffix: '/opgaver', icon: CheckSquare },
  camera: { labelKey: 'camera', pathSuffix: '/billeder/kamera', icon: Camera },
  photos: { labelKey: 'photos', pathSuffix: '/billeder', icon: ImageIcon },
  program: { labelKey: 'program', pathSuffix: '/program', icon: CalendarDays },
  hvor: { labelKey: 'where', pathSuffix: '/hvor', icon: MapPin },
  deltagere: { labelKey: 'guests', pathSuffix: '/deltagere', icon: Users },
  minder: { labelKey: 'memories', pathSuffix: '/minder', icon: BookHeart },
  galleri: { labelKey: 'gallery', pathSuffix: '/galleri', icon: LayoutGrid },
}

/** Generic icon used for dynamic admin-defined pages. */
export const PAGE_ICON: LucideIcon = FileText

export type NavOrderItem =
  | { kind: 'static'; key: StaticNavKey }
  | { kind: 'page'; id: string }

const STATIC_KEY_SET = new Set<string>(STATIC_NAV_KEYS)

export function isStaticNavKey(value: unknown): value is StaticNavKey {
  return typeof value === 'string' && STATIC_KEY_SET.has(value)
}

/**
 * Parse and sanitize a `nav_order` value loaded from the database.
 * Drops malformed entries silently. Returns an empty array on failure —
 * callers must reconcile to repopulate.
 */
export function parseNavOrder(raw: unknown): NavOrderItem[] {
  if (!Array.isArray(raw)) return []
  const out: NavOrderItem[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const e = entry as Record<string, unknown>
    if (e.kind === 'static' && isStaticNavKey(e.key)) {
      out.push({ kind: 'static', key: e.key })
    } else if (e.kind === 'page' && typeof e.id === 'string' && e.id.length > 0) {
      out.push({ kind: 'page', id: e.id })
    }
  }
  return out
}

/**
 * String discriminator for icon lookup on the client. Using a string instead
 * of passing the LucideIcon component as a prop keeps server→client component
 * props serializable in the strictest sense (no functions over the wire).
 */
export type NavIconKey = `static-${StaticNavKey}` | 'page'

export function iconKeyForStatic(key: StaticNavKey): NavIconKey {
  return `static-${key}`
}

export const ICON_BY_KEY: Record<NavIconKey, LucideIcon> = {
  'static-tasks': STATIC_NAV_META.tasks.icon,
  'static-camera': STATIC_NAV_META.camera.icon,
  'static-photos': STATIC_NAV_META.photos.icon,
  'static-program': STATIC_NAV_META.program.icon,
  'static-hvor': STATIC_NAV_META.hvor.icon,
  'static-deltagere': STATIC_NAV_META.deltagere.icon,
  'static-minder': STATIC_NAV_META.minder.icon,
  'static-galleri': STATIC_NAV_META.galleri.icon,
  page: PAGE_ICON,
}

/** Server-side helper: is a page currently visible to guests? */
export function isPageVisibleNow(page: {
  is_active: boolean
  visible_from: string | null
  visible_until: string | null
}): boolean {
  if (!page.is_active) return false
  const now = Date.now()
  if (page.visible_from) {
    const from = Date.parse(page.visible_from)
    if (!Number.isNaN(from) && from > now) return false
  }
  if (page.visible_until) {
    const until = Date.parse(page.visible_until)
    if (!Number.isNaN(until) && until <= now) return false
  }
  return true
}
