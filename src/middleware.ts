import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isOwnerEmail } from '@/lib/auth/owners'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isAuthRoute = path.startsWith('/login')
  const isPublicRoute = path === '/'

  if (!user && !isAuthRoute && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user) {
    // Autorização: só donos (allowlist) ou membros ATIVOS acessam o Aivora.
    let authorized = isOwnerEmail(user.email)
    if (!authorized) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: member } = await (supabase.schema('aivora_rep').from('team_members') as any)
        .select('active')
        .eq('member_user_id', user.id)
        .maybeSingle()
      authorized = !!member?.active
    }

    if (!authorized && !isAuthRoute) {
      // Bloqueia: API → 403; páginas → /login com aviso
      if (path.startsWith('/api')) {
        return NextResponse.json({ error: 'Sem acesso a este sistema' }, { status: 403 })
      }
      const url = new URL('/login', request.url)
      url.searchParams.set('erro', 'sem_acesso')
      return NextResponse.redirect(url)
    }

    if (authorized && isAuthRoute) {
      return NextResponse.redirect(new URL('/inicio', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
