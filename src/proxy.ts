import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export function proxy(request: NextRequest) {
  const mutating = !['GET', 'HEAD', 'OPTIONS'].includes(request.method)
  const browserCrossSite = request.headers.get('sec-fetch-site') === 'cross-site'
  const origin = request.headers.get('origin')
  const expectedOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? request.nextUrl.origin
  if (request.nextUrl.pathname.startsWith('/api/') && mutating && (browserCrossSite || (origin !== null && origin !== expectedOrigin))) {
    return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } })
  }
  if (request.nextUrl.pathname.startsWith('/dashboard') || ['/login', '/register'].includes(request.nextUrl.pathname)) return updateSession(request)
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
