import { getMemories } from '@/lib/actions/memories'
import { MemoryManager } from '@/components/admin/MemoryManager'

export default async function MinderPage() {
  const memories = await getMemories()
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Minder</h1>
        <p className="text-sm text-muted-foreground">
          Minder oprettet af gæster. Rediger tekst, slet eller vis på skærm.
        </p>
      </div>
      <MemoryManager initialMemories={memories} />
    </div>
  )
}
