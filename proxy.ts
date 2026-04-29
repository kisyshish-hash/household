import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const redirects: Record<string, string> = {
  '/tasks': '/routines',
  '/members': '/family',
}

export function proxy(request: NextRequest) {
  const destination = redirects[request.nextUrl.pathname]

  if (!destination) {
    return NextResponse.next()
  }

  return NextResponse.redirect(new URL(destination, request.url))
}

export const config = {
  matcher: ['/tasks', '/members'],
}
