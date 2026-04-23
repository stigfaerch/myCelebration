import { getPages } from '@/lib/actions/pages'
import { PageManager } from '@/components/admin/PageManager'

export default async function SiderPage() {
  const pages = await getPages()
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Sider</h1>
        <p className="text-sm text-muted-foreground">
          Statiske sider som vises til gæster. Aktiver og tidsbegræns efter behov.
        </p>
      </div>
      <PageManager initialPages={pages} />
    </div>
  )
}
