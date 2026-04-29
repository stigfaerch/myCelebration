import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { resolveGuest } from '@/lib/auth/resolveGuest'
import { getMyMemories } from '@/lib/actions/guest/memories'
import {
  getStaticItemVisibilityMap,
  isStaticItemVisibleNow,
} from '@/lib/actions/staticItemVisibility'
import { MemoryManager } from '@/components/guest/MemoryManager'

export const metadata: Metadata = { title: 'Minder' }

export default async function MinderPage() {
  await resolveGuest()
  const visibilityMap = await getStaticItemVisibilityMap()
  if (!(await isStaticItemVisibleNow('minder', visibilityMap))) notFound()

  const memories = await getMyMemories()
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Mine minder</h1>
      <MemoryManager initialMemories={memories} />
    </div>
  )
}
