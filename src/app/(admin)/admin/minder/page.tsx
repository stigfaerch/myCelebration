import { getMemories } from '@/lib/actions/memories'
import { getActiveSingleOverrides } from '@/lib/actions/screen'
import { MemoryManager } from '@/components/admin/MemoryManager'

export default async function MinderPage() {
  const [memories, overrides] = await Promise.all([
    getMemories(),
    getActiveSingleOverrides(),
  ])
  const activeOverrides = overrides
    .filter((o) => o.kind === 'memory')
    .map((o) => ({ screenId: o.screenId, screenName: o.screenName }))
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Minder</h1>
        <p className="text-sm text-muted-foreground">
          Minder oprettet af gæster. Rediger tekst, slet eller vis på skærm.
        </p>
      </div>
      <MemoryManager initialMemories={memories} activeOverrides={activeOverrides} />
    </div>
  )
}
