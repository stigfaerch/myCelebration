import {
  AlertCircle,
  Beer,
  Cake,
  Camera,
  Coffee,
  Cookie,
  Crown,
  Drama,
  Flag,
  Flame,
  Gift,
  Heart,
  Info,
  MapPin,
  Mic,
  Music,
  PartyPopper,
  Pause,
  Pizza,
  Sparkles,
  Sun,
  Tent,
  Theater,
  Users,
  Utensils,
  Wine,
  type LucideIcon,
} from 'lucide-react'
import type { ProgramItemType } from '@/lib/actions/program'

export interface ProgramIconOption {
  key: string
  label: string
  Icon: LucideIcon
}

export const PROGRAM_TYPE_ICONS: Record<ProgramItemType, ProgramIconOption[]> = {
  event: [
    { key: 'coffee', label: 'Kaffe', Icon: Coffee },
    { key: 'cake', label: 'Kage', Icon: Cake },
    { key: 'wine', label: 'Vin', Icon: Wine },
    { key: 'beer', label: 'Øl', Icon: Beer },
    { key: 'utensils', label: 'Middag', Icon: Utensils },
    { key: 'pizza', label: 'Pizza', Icon: Pizza },
    { key: 'cookie', label: 'Snack', Icon: Cookie },
    { key: 'party-popper', label: 'Fest', Icon: PartyPopper },
    { key: 'gift', label: 'Gave', Icon: Gift },
    { key: 'heart', label: 'Kærlighed', Icon: Heart },
    { key: 'users', label: 'Forsamling', Icon: Users },
    { key: 'camera', label: 'Foto', Icon: Camera },
    { key: 'tent', label: 'Udendørs', Icon: Tent },
    { key: 'flag', label: 'Start/slut', Icon: Flag },
    { key: 'sun', label: 'Sol', Icon: Sun },
    { key: 'map-pin', label: 'Sted', Icon: MapPin },
    { key: 'flame', label: 'Bål', Icon: Flame },
  ],
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
  // Event has icon options but no default — admin must opt in per item.
  if (type === 'event') return null
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
