import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Adgang' }

interface Props {
  params: Promise<{ uuid: string }>
}

export default async function EnterPage({ params }: Props) {
  const { uuid } = await params

  async function submitPassword(formData: FormData) {
    'use server'
    const password = formData.get('password') as string
    const cookieStore = await cookies()
    cookieStore.set('guest_password', password, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    })
    redirect(`/${uuid}`)
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Velkommen</h1>
          <p className="text-muted-foreground text-sm">Indtast kodeordet for at fortsætte</p>
        </div>
        <form action={submitPassword} className="space-y-4">
          <input
            type="password"
            name="password"
            placeholder="Kodeord"
            required
            autoFocus
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Fortsæt
          </button>
        </form>
      </div>
    </main>
  )
}
