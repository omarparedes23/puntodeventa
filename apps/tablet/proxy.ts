import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
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

  const { pathname } = request.nextUrl

  // POST = server actions. Usan su propio getUser() para validar seguridad.
  // Aquí solo necesitamos saber si hay sesión para redirigir — getSession() lee
  // la cookie localmente sin llamar al servidor Supabase (~0ms vs ~400ms).
  // GET = navegación de página. Hacemos getUser() completo para refrescar el token.
  let user: { id: string } | null = null
  if (request.method === 'POST') {
    const { data: { session } } = await supabase.auth.getSession()
    user = session?.user ?? null
  } else {
    const { data: { user: u } } = await supabase.auth.getUser()
    user = u
  }

  if (!user && !pathname.startsWith('/login') && !pathname.startsWith('/onboarding')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/pos', request.url))
  }
  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
