import { getTranslations } from 'next-intl/server'

export default async function RootPage() {
  const t = await getTranslations('root')
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('invitePrompt')}</p>
      </div>
    </main>
  )
}
