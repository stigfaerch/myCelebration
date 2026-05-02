import { getAppSettings, getAdminNavOrder } from '@/lib/actions/settings'
import { SmsTemplateEditor } from '@/components/admin/SmsTemplateEditor'
import { AdminMenuOrderEditor } from '@/components/admin/AdminMenuOrderEditor'
import { FontSizeEditor } from '@/components/admin/FontSizeEditor'
import { ProgramTypeIconsToggle } from '@/components/admin/ProgramTypeIconsToggle'

export default async function IndstillingerPage() {
  const [settings, adminNavOrder] = await Promise.all([
    getAppSettings(),
    getAdminNavOrder(),
  ])

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

      <section className="mb-10">
        <h2 className="text-lg font-medium mb-1">Admin-menu rækkefølge</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Træk for at ændre rækkefølgen af punkterne i admin-menuen.
        </p>
        <AdminMenuOrderEditor initialOrder={adminNavOrder} />
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-medium mb-1">Skriftstørrelser</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Justerer skriftstørrelsen i alt rich-text-indhold (sider, festinfo,
          skærmvisning). Anbefalet område: 12 – 64 px for brødtekst.
        </p>
        <FontSizeEditor initial={settings.fontSizes} />
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-medium mb-1">Programtype-ikoner</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Vis ikoner for programtyper på programsiden og skærmvisningen. Slå
          fra for at skjule alle ikoner uden at miste de valgte ikoner pr.
          punkt.
        </p>
        <ProgramTypeIconsToggle initial={settings.show_program_type_icons} />
      </section>
    </div>
  )
}
