type MemoryType = 'funny' | 'solemn' | 'everyday' | 'milestone'

interface Props {
  memory: {
    title: string
    description: string | null
    when_date: string | null
    image_url: string | null
    type: MemoryType
  }
}

const TYPE_LABEL: Record<MemoryType, string> = {
  funny: 'Sjov',
  solemn: 'Højtidelig',
  everyday: 'Hverdag',
  milestone: 'Milepæl',
}

const TYPE_CLASS: Record<MemoryType, string> = {
  funny: 'bg-yellow-400 text-yellow-950',
  solemn: 'bg-purple-500 text-white',
  everyday: 'bg-blue-500 text-white',
  milestone: 'bg-green-500 text-white',
}

function formatWhenDate(value: string | null): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('da-DK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Full-viewport memory display for screen guests. Two layouts:
 *  - with image: fullscreen image + bottom gradient overlay with title/description/date
 *  - without image: centered typography on dark background
 * Type badge top-right in both variants.
 */
export function ScreenMemory({ memory }: Props) {
  const when = formatWhenDate(memory.when_date)
  const badgeClass = TYPE_CLASS[memory.type] ?? TYPE_CLASS.everyday
  const badgeLabel = TYPE_LABEL[memory.type] ?? TYPE_LABEL.everyday

  if (memory.image_url) {
    return (
      <div className="relative h-screen w-screen overflow-hidden bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={memory.image_url}
          alt=""
          className="h-screen w-screen object-contain"
        />
        <span
          className={`absolute right-6 top-6 rounded-full px-3 py-1 text-sm font-semibold ${badgeClass}`}
        >
          {badgeLabel}
        </span>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-10 pb-12 pt-24 text-white">
          <h1 className="text-4xl font-bold tracking-tight">{memory.title}</h1>
          {memory.description && (
            <p className="mt-3 text-xl opacity-95">{memory.description}</p>
          )}
          {when && <p className="mt-4 text-sm uppercase tracking-widest opacity-75">{when}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-screen w-screen flex-col items-center justify-center bg-slate-950 px-10 text-white">
      <span
        className={`absolute right-6 top-6 rounded-full px-3 py-1 text-sm font-semibold ${badgeClass}`}
      >
        {badgeLabel}
      </span>
      <h1 className="max-w-5xl text-center text-6xl font-bold tracking-tight">
        {memory.title}
      </h1>
      {memory.description && (
        <p className="mt-8 max-w-3xl text-center text-2xl opacity-90">
          {memory.description}
        </p>
      )}
      {when && (
        <p className="mt-10 text-base uppercase tracking-widest opacity-60">{when}</p>
      )}
    </div>
  )
}
