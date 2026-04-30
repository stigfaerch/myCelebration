import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Monitor } from 'lucide-react'
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
      <div className="flex items-start gap-2 rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">
        <Monitor className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>Dine minder kan blive vist på en skærm i løbet af festen.</p>
      </div>
      <MemoryManager initialMemories={memories} />
    </div>
  )
}
