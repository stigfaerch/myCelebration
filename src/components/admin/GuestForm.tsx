'use client'
import { useState } from 'react'
import type { Guest, GuestType } from '@/lib/actions/guests'
import { ScreenCycleSettingsFields } from '@/components/admin/ScreenCycleSettings'

interface Props {
  defaultValues?: Partial<Guest>
  action: (formData: FormData) => Promise<void>
  submitLabel?: string
}

const GENDER_OPTIONS = [
  { value: '', label: '— Ikke angivet —' },
  { value: 'mand', label: 'Mand' },
  { value: 'kvinde', label: 'Kvinde' },
  { value: 'andet', label: 'Andet' },
]

const TASK_OPTIONS = [
  { value: 'none', label: 'Ingen opgaver' },
  { value: 'easy', label: 'Lette opgaver' },
  { value: 'all', label: 'Alle opgaver' },
]

const TYPE_OPTIONS = [
  { value: 'friend', label: 'Ven' },
  { value: 'family', label: 'Familie' },
  { value: 'main_person', label: 'Hovedperson' },
  { value: 'screen', label: 'Skærm' },
]

export function GuestForm({ defaultValues, action, submitLabel = 'Gem' }: Props) {
  const [type, setType] = useState<GuestType>(defaultValues?.type ?? 'friend')

  return (
    <form action={action} className="space-y-5 max-w-lg">
      {/* Navn */}
      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium">Navn *</label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={defaultValues?.name ?? ''}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      {/* Type */}
      <div className="space-y-1">
        <label htmlFor="type" className="text-sm font-medium">Type *</label>
        <select
          id="type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as GuestType)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Hovedperson-specific fields */}
      {type === 'main_person' && (
        <div className="space-y-1">
          <label htmlFor="wishlist_url" className="text-sm font-medium">
            Ønskeseddel-link
          </label>
          <input
            id="wishlist_url"
            name="wishlist_url"
            type="url"
            placeholder="https://..."
            defaultValue={defaultValues?.wishlist_url ?? ''}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Vises på gæsternes forside efter Mine indslag.
          </p>
        </div>
      )}

      {/* Screen-specific fields */}
      {type === 'screen' && (
        <div className="space-y-4 rounded-md border p-4 bg-muted/30">
          <p className="text-xs text-muted-foreground font-medium">Skærm-indstillinger</p>
          <div className="space-y-1">
            <label htmlFor="default_page" className="text-sm font-medium">Default side</label>
            <input
              id="default_page"
              name="default_page"
              type="text"
              placeholder="/gallery"
              defaultValue={defaultValues?.default_page ?? ''}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <p className="text-xs text-muted-foreground">F.eks. /gallery, /program</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="is_primary_screen"
              name="is_primary_screen"
              type="checkbox"
              defaultChecked={defaultValues?.is_primary_screen ?? false}
              className="h-4 w-4"
            />
            <label htmlFor="is_primary_screen" className="text-sm">Primær skærm</label>
          </div>
          {/* Cycle-settings fields. Submitted as part of updateGuestAction so
              the same form save handles both identity (is_primary_screen) and
              cycle behaviour. The /admin/sider bottom section persists via the
              dedicated updateScreenCycleSettings action — different surface,
              same data shape. */}
          <ScreenCycleSettingsFields
            defaultCycleSeconds={defaultValues?.screen_cycle_seconds ?? 8}
            defaultTransition={defaultValues?.screen_transition ?? 'fade'}
          />
          {/* Resolution fields — admin-curation metadata used only by the
              WYSIWYG iframe preview on /admin/sider. The screen renderer
              itself uses fluid CSS and does NOT read these values. */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="screen_width" className="text-sm font-medium">
                Bredde (px)
              </label>
              <input
                id="screen_width"
                name="screen_width"
                type="number"
                min={320}
                max={7680}
                step={1}
                defaultValue={defaultValues?.screen_width ?? 1920}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="screen_height" className="text-sm font-medium">
                Højde (px)
              </label>
              <input
                id="screen_height"
                name="screen_height"
                type="number"
                min={240}
                max={4320}
                step={1}
                defaultValue={defaultValues?.screen_height ?? 1080}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Forventet visningsareal — bruges kun til forhåndsvisning på
            /admin/sider, ikke til faktisk rendering.
          </p>
        </div>
      )}

      {/* Relation */}
      <div className="space-y-1">
        <label htmlFor="relation" className="text-sm font-medium">Relation</label>
        <input
          id="relation"
          name="relation"
          type="text"
          placeholder="F.eks. morbror, klasselærer"
          defaultValue={defaultValues?.relation ?? ''}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      {/* Alder + Køn */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="age" className="text-sm font-medium">Alder</label>
          <input
            id="age"
            name="age"
            type="number"
            min="0"
            max="120"
            defaultValue={defaultValues?.age ?? ''}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="gender" className="text-sm font-medium">Køn</label>
          <select
            id="gender"
            name="gender"
            defaultValue={defaultValues?.gender ?? ''}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {GENDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Email + Telefon */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium">E-mail</label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={defaultValues?.email ?? ''}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="phone" className="text-sm font-medium">Telefon</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={defaultValues?.phone ?? ''}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Opgave-deltagelse */}
      <div className="space-y-1">
        <label htmlFor="task_participation" className="text-sm font-medium">Opgave-deltagelse</label>
        <select
          id="task_participation"
          name="task_participation"
          defaultValue={defaultValues?.task_participation ?? 'none'}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {TASK_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        {submitLabel}
      </button>
    </form>
  )
}
