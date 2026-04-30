export interface FontSizes {
  p: number
  h1: number
  h2: number
}

export const DEFAULT_FONT_SIZES: FontSizes = { p: 16, h1: 32, h2: 24 }

export const FONT_SIZE_BOUNDS = { min: 10, max: 96 }

export function clampFontSize(
  raw: number | null | undefined,
  fallback: number
): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return fallback
  return Math.min(
    FONT_SIZE_BOUNDS.max,
    Math.max(FONT_SIZE_BOUNDS.min, Math.round(raw))
  )
}
