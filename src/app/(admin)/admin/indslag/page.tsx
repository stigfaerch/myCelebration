import { getPerformances } from '@/lib/actions/performances'
import { PerformanceList } from '@/components/admin/PerformanceList'

export default async function IndslagPage() {
  const performances = await getPerformances()
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Indslag</h1>
      <PerformanceList initialPerformances={performances ?? []} />
    </div>
  )
}
