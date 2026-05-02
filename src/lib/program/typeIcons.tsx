import {
  AlertCircle,
  Coffee,
  Crown,
  Drama,
  Info,
  Mic,
  Music,
  Pause,
  Sparkles,
  Theater,
  type LucideIcon,
} from 'lucide-react'
import type { ProgramItemType } from '@/lib/actions/program'

export interface ProgramIconOption {
  key: string
  label: string
  Icon: LucideIcon
}

export const PROGRAM_TYPE_ICONS: Record<ProgramItemType, ProgramIconOption[]> = {
  event: [],
  info: [
    { key: 'info', label: 'Info', Icon: Info },
    { key: 'alert-circle', label: 'Bemærk', Icon: AlertCircle },
  ],
  performance: [
    { key: 'mic', label: 'Mikrofon', Icon: Mic },
    { key: 'music', label: 'Musik', Icon: Music },
    { key: 'theater', label: 'Teater', Icon: Theater },
    { key: 'drama', label: 'Drama', Icon: Drama },
  ],
  ceremony: [
    { key: 'sparkles', label: 'Funkler', Icon: Sparkles },
    { key: 'crown', label: 'Krone', Icon: Crown },
  ],
  break: [
    { key: 'coffee', label: 'Kaffe', Icon: Coffee },
    { key: 'pause', label: 'Pause', Icon: Pause },
  ],
}

const ICON_BY_KEY: Record<string, LucideIcon> = Object.fromEntries(
  Object.values(PROGRAM_TYPE_ICONS)
    .flat()
    .map((opt) => [opt.key, opt.Icon])
)

export function getProgramIconComponent(key: string | null | undefined): LucideIcon | null {
  if (!key) return null
  return ICON_BY_KEY[key] ?? null
}

export function getDefaultIconKey(type: ProgramItemType): string | null {
  const opts = PROGRAM_TYPE_ICONS[type]
  return opts.length > 0 ? opts[0].key : null
}

export function isValidIconForType(type: ProgramItemType, key: string | null | undefined): boolean {
  if (!key) return false
  return PROGRAM_TYPE_ICONS[type].some((opt) => opt.key === key)
}

interface ProgramTypeIconProps {
  iconKey: string | null | undefined
  size?: number
  className?: string
}

export function ProgramTypeIcon({ iconKey, size = 16, className }: ProgramTypeIconProps) {
  const Icon = getProgramIconComponent(iconKey)
  if (!Icon) return null
  return <Icon size={size} className={className} aria-hidden />
}
