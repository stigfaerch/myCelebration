import {
  CalendarDays,
  ClipboardList,
  FileText,
  Heart,
  Image as ImageIcon,
  Info,
  LayoutDashboard,
  LayoutGrid,
  Settings,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react'

/**
 * Admin nav keys in canonical order. New entries are appended at the end so
 * that an existing stored `admin_nav_order` (which lists known keys) keeps
 * working after a deploy — the reconciler appends unseen keys to the tail.
 */
export const ADMIN_NAV_KEYS = [
  'dashboard',
  'guests',
  'information',
  'program',
  'performances',
  'tasks',
  'pages',
  'photos',
  'memories',
  'gallery',
  'settings',
] as const

export type AdminNavKey = (typeof ADMIN_NAV_KEYS)[number]

interface AdminNavMeta {
  href: string
  /** Translation key under the `admin.nav` namespace. */
  labelKey: string
  icon: LucideIcon
}

export const ADMIN_NAV_META: Record<AdminNavKey, AdminNavMeta> = {
  dashboard: { href: '/admin', labelKey: 'dashboard', icon: LayoutDashboard },
  guests: { href: '/admin/deltagere', labelKey: 'guests', icon: Users },
  information: { href: '/admin/information', labelKey: 'information', icon: Info },
  program: { href: '/admin/program', labelKey: 'program', icon: CalendarDays },
  performances: { href: '/admin/indslag', labelKey: 'performances', icon: Sparkles },
  tasks: { href: '/admin/opgaver', labelKey: 'tasks', icon: ClipboardList },
  pages: { href: '/admin/sider', labelKey: 'pages', icon: FileText },
  photos: { href: '/admin/billeder', labelKey: 'photos', icon: ImageIcon },
  memories: { href: '/admin/minder', labelKey: 'memories', icon: Heart },
  gallery: { href: '/admin/galleri', labelKey: 'gallery', icon: LayoutGrid },
  settings: { href: '/admin/indstillinger', labelKey: 'settings', icon: Settings },
}

const ADMIN_KEY_SET = new Set<string>(ADMIN_NAV_KEYS)

export function isAdminNavKey(value: unknown): value is AdminNavKey {
  return typeof value === 'string' && ADMIN_KEY_SET.has(value)
}

/**
 * Parse a stored `admin_nav_order` JSON value into a clean key list.
 * Drops malformed and unknown entries.
 */
export function parseAdminNavOrder(raw: unknown): AdminNavKey[] {
  if (!Array.isArray(raw)) return []
  const out: AdminNavKey[] = []
  const seen = new Set<AdminNavKey>()
  for (const entry of raw) {
    if (isAdminNavKey(entry) && !seen.has(entry)) {
      seen.add(entry)
      out.push(entry)
    }
  }
  return out
}

/**
 * Reconcile a stored order against the canonical key list:
 *   - Drop unknown / duplicate keys (already done by parse, kept for safety)
 *   - Append any canonical key the stored order is missing, preserving the
 *     canonical order of the missing tail.
 *
 * Pure helper — no DB writes. The application uses this to ensure the nav
 * is always complete even if the admin hasn't saved a custom order yet.
 */
export function reconcileAdminNavOrder(stored: AdminNavKey[]): AdminNavKey[] {
  const seen = new Set(stored)
  const out = [...stored]
  for (const k of ADMIN_NAV_KEYS) {
    if (!seen.has(k)) out.push(k)
  }
  return out
}
