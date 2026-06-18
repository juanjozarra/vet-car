import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

  const isAuthPage = pathname === '/login' || pathname === '/register'

  // Redirect authenticated users away from login/register
  if (isAuthPage) {
    if (!token) return NextResponse.next()
    if (token.role === 'MECHANIC') {
      if (!token.workshopId) {
        return NextResponse.redirect(new URL('/workshop/setup', request.url))
      }
      return NextResponse.redirect(new URL('/mechanic', request.url))
    }
    return NextResponse.redirect(new URL('/owner', request.url))
  }

  // Unauthenticated → login
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Root: redirect based on role
  if (pathname === '/') {
    if (token.role === 'MECHANIC') {
      if (!token.workshopId) {
        return NextResponse.redirect(new URL('/workshop/setup', request.url))
      }
      return NextResponse.redirect(new URL('/mechanic', request.url))
    }
    return NextResponse.redirect(new URL('/owner', request.url))
  }

  // Workshop setup: MECHANIC only, workshopId must be null
  if (pathname.startsWith('/workshop/setup')) {
    if (token.role !== 'MECHANIC') {
      return NextResponse.redirect(new URL('/owner', request.url))
    }
    if (token.workshopId) {
      return NextResponse.redirect(new URL('/mechanic', request.url))
    }
    return NextResponse.next()
  }

  // Mechanic routes: MECHANIC + workshopId required
  if (pathname.startsWith('/mechanic')) {
    if (token.role !== 'MECHANIC') {
      return NextResponse.redirect(new URL('/owner', request.url))
    }
    if (!token.workshopId) {
      return NextResponse.redirect(new URL('/workshop/setup', request.url))
    }
    return NextResponse.next()
  }

  // Owner routes: OWNER only
  if (pathname.startsWith('/owner')) {
    if (token.role !== 'OWNER') {
      return NextResponse.redirect(new URL('/mechanic', request.url))
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
