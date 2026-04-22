import { getProgramItems } from '@/lib/actions/program'
import { getPerformances } from '@/lib/actions/performances'
import { ProgramManager } from '@/components/admin/ProgramManager'

export default async function ProgramPage() {
  const [items, performances] = await Promise.all([
    getProgramItems(),
    getPerformances(),
  ])
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Program</h1>
      <ProgramManager items={items} performances={performances} />
    </div>
  )
}
