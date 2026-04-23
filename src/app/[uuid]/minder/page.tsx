import { getMyMemories } from '@/lib/actions/guest/memories'
import { MemoryManager } from '@/components/guest/MemoryManager'

export default async function MinderPage() {
  const memories = await getMyMemories()
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Mine minder</h1>
      <MemoryManager initialMemories={memories} />
    </div>
  )
}
