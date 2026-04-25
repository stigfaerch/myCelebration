import { getAppSettings } from '@/lib/actions/settings'
import { SmsTemplateEditor } from '@/components/admin/SmsTemplateEditor'

export default async function IndstillingerPage() {
  const settings = await getAppSettings()

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-2">Indstillinger</h1>
      <p className="text-muted-foreground text-sm mb-8">Generelle indstillinger for admin.</p>

      <section className="mb-10">
        <h2 className="text-lg font-medium mb-1">SMS-skabelon</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Brug <code className="bg-muted px-1 rounded text-xs">{'{navn}'}</code> for deltagerens navn
          og <code className="bg-muted px-1 rounded text-xs">{'{url}'}</code> for det personlige link.
        </p>
        <SmsTemplateEditor defaultTemplate={settings.sms_template} />
      </section>
    </div>
  )
}
