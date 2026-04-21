import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? ''
const GUEST_PASSWORD = process.env.GUEST_PASSWORD ?? ''

// UUID v4 pattern
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // --- Admin routes ---
  if (pathname.startsWith('/admin')) {
    // Pass-through: login page
    if (pathname === '/admin/login') return NextResponse.next()

    const adminCookie = request.cookies.get('admin_password')?.value
    if (!adminCookie || adminCookie !== ADMIN_PASSWORD) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    return NextResponse.next()
  }

  // --- Guest/screen routes: /{uuid} and sub-paths ---
  // Match paths that start with a UUID segment
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length > 0 && UUID_PATTERN.test(segments[0])) {
    const uuid = segments[0]

    // Pass-through: password entry page
    if (segments[1] === 'enter') return NextResponse.next()

    // Check guest password cookie
    const guestCookie = request.cookies.get('guest_password')?.value
    if (!guestCookie || guestCookie !== GUEST_PASSWORD) {
      return NextResponse.redirect(new URL(`/${uuid}/enter`, request.url))
    }

    // Verify UUID exists in guests table
    const { data, error } = await supabaseServer
      .from('guests')
      .select('id, type')
      .eq('id', uuid)
      .single()

    if (error || !data) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Forward guest info to layouts via headers
    const response = NextResponse.next()
    response.headers.set('x-guest-id', data.id)
    response.headers.set('x-guest-type', data.type)
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all paths except static assets and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
