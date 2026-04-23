import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createAdminToken } from '@/lib/auth/adminToken'

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  async function submitPassword(formData: FormData) {
    'use server'
    const password = formData.get('password') as string
    const adminPassword = process.env.ADMIN_PASSWORD ?? ''

    if (password !== adminPassword) {
      redirect('/admin/login?error=1')
    }

    const cookieStore = await cookies()
    cookieStore.set('admin_token', createAdminToken(), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    })
    redirect('/admin')
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Admin</h1>
          <p className="text-muted-foreground text-sm">Indtast admin-kodeord</p>
        </div>
        {error && (
          <p className="text-center text-sm text-destructive">Forkert kodeord</p>
        )}
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
            Log ind
          </button>
        </form>
      </div>
    </main>
  )
}
