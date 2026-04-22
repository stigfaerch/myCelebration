import { getChoiceDefinitions } from '@/lib/actions/choices'
import { ChoiceManager } from '@/components/admin/ChoiceManager'

export default async function ValgPage() {
  const choices = await getChoiceDefinitions()

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Deltager-valg</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Konfigurér hvad deltagerne skal svare på (allergier, ønsker, osv.)
          </p>
        </div>
      </div>
      <ChoiceManager initialChoices={choices} />
    </div>
  )
}
