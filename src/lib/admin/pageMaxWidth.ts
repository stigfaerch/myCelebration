/**
 * Allowed per-page max-width values, mapped to literal Tailwind classes.
 *
 * Tailwind's scanner only sees class names that appear as full string
 * literals in the source — `max-w-${value}` would be invisible to the
 * extractor and the styles would be missing from the bundle. The map
 * below keeps every class as a literal so the build picks them up.
 */
export const PAGE_MAX_WIDTH_KEYS = [
  '2xl',
  '3xl',
  '4xl',
  '5xl',
  '6xl',
  '7xl',
  'full',
] as const

export type PageMaxWidth = (typeof PAGE_MAX_WIDTH_KEYS)[number]

export const DEFAULT_PAGE_MAX_WIDTH: PageMaxWidth = '2xl'

export const PAGE_MAX_WIDTH_CLASS: Record<PageMaxWidth, string> = {
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  'full': 'max-w-full',
}

export const PAGE_MAX_WIDTH_LABEL: Record<PageMaxWidth, string> = {
  '2xl': 'Smal (2xl — 672 px)',
  '3xl': 'Smal+ (3xl — 768 px)',
  '4xl': 'Mellem (4xl — 896 px)',
  '5xl': 'Bred (5xl — 1024 px)',
  '6xl': 'Bred+ (6xl — 1152 px)',
  '7xl': 'Meget bred (7xl — 1280 px)',
  'full': 'Fuld bredde',
}

const KEY_SET = new Set<string>(PAGE_MAX_WIDTH_KEYS)

export function isPageMaxWidth(value: unknown): value is PageMaxWidth {
  return typeof value === 'string' && KEY_SET.has(value)
}

/**
 * Coerce a stored / user-provided value into a valid `PageMaxWidth`.
 * Falls back to the default when the value is missing or unknown so the
 * renderer never has to guard against null.
 */
export function coercePageMaxWidth(value: unknown): PageMaxWidth {
  return isPageMaxWidth(value) ? value : DEFAULT_PAGE_MAX_WIDTH
}
