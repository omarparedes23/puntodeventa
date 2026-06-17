import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@marketpos/core'
import { createClient } from '@/lib/supabase/server'

export const getCachedPerfil = unstable_cache(
  async (userId: string) => {
    const admin = createAdminClient()
    const { data } = await admin
      .from('ptovta_perfiles')
      .select('id, rol, empresa_id')
      .eq('id', userId)
      .single()
    return data
  },
  ['perfil'],
  { revalidate: 300 }
)

// Para ESCRITURAS: verifica el token contra los servidores de Supabase (~280ms local, ~20ms Vercel).
// Garantiza que el usuario no fue revocado. Usar en procesarVenta, abrirCaja, cerrarCaja, etc.
export async function getSession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, perfil: null }
  const perfil = await getCachedPerfil(user.id)
  return { supabase, user, perfil }
}

// Para LECTURAS: valida la firma del JWT localmente (~0ms). No hace round trip a Supabase.
// Seguro para queries de solo lectura — el JWT está firmado por Supabase y no puede falsificarse.
export async function getSessionFast() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return { supabase, user: null, perfil: null }
  const perfil = await getCachedPerfil(session.user.id)
  return { supabase, user: session.user, perfil }
}
