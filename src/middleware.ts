import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'
import { verifyAdminToken } from '@/lib/auth/adminToken'

const GUEST_PASSWORD = process.env.GUEST_PASSWORD ?? ''

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') return NextResponse.next()

    const adminToken = request.cookies.get('admin_token')?.value
    if (!adminToken || !verifyAdminToken(adminToken)) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    return NextResponse.next()
  }

  const segments = pathname.split('/').filter(Boolean)
  if (segments.length > 0 && UUID_PATTERN.test(segments[0])) {
    const uuid = segments[0]

    if (segments[1] === 'enter') return NextResponse.next()

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

    const response = NextResponse.next()
    response.headers.set('x-guest-id', data.id)
    response.headers.set('x-guest-type', data.type)
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
