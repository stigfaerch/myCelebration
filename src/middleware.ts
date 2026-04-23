import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'
import { verifyAdminToken } from '@/lib/auth/adminToken'

const GUEST_PASSWORD = process.env.GUEST_PASSWORD ?? ''

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always strip any inbound x-guest-* headers — these are set exclusively by
  // this middleware and must never be trusted from the client.
  const forwarded = new Headers(request.headers)
  forwarded.delete('x-guest-id')
  forwarded.delete('x-guest-type')

  const isServerAction =
    request.method === 'POST' &&
    (request.headers.has('next-action') ||
      (request.headers.get('content-type') ?? '').startsWith('text/x-component'))

  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') {
      return NextResponse.next({ request: { headers: forwarded } })
    }

    const adminToken = request.cookies.get('admin_token')?.value
    if (!adminToken || !verifyAdminToken(adminToken)) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    return NextResponse.next({ request: { headers: forwarded } })
  }

  const segments = pathname.split('/').filter(Boolean)
  const firstIsUuid = segments.length > 0 && UUID_PATTERN.test(segments[0])

  if (firstIsUuid) {
    const uuid = segments[0]

    if (segments[1] === 'enter') {
      return NextResponse.next({ request: { headers: forwarded } })
    }

    const guestCookie = request.cookies.get('guest_password')?.value
    if (!guestCookie || guestCookie !== GUEST_PASSWORD) {
      return NextResponse.redirect(new URL(`/${uuid}/enter`, request.url))
    }

    const { data, error } = await supabaseServer
      .from('guests')
      .select('id, type')
      .eq('id', uuid)
      .single()

    if (error || !data) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    forwarded.set('x-guest-id', data.id)
    forwarded.set('x-guest-type', data.type)
    return NextResponse.next({ request: { headers: forwarded } })
  }

  // Non-admin, non-guest path. Reject Server Action POSTs outright — a guest
  // action invoked from a path with no UUID prefix cannot produce a trustworthy
  // identity, and without middleware headers resolveGuest() would throw anyway.
  if (isServerAction) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  return NextResponse.next({ request: { headers: forwarded } })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
