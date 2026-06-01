'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { empresaConfigSchema, nubefactConfigSchema } from '@/lib/validations/configuracion'
import { z } from 'zod'
import type { Database, Empresa, Perfil } from '@/types/database'

type ActionResponse<T> = { data: T | null; error: string | null }

async function getSession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, perfil: null }
  const { data: perfil } = await supabase
    .from('ptovta_perfiles')
    .select('id, rol, empresa_id')
    .eq('id', user.id)
    .single()
  return { supabase, user, perfil }
}

// -------------------------------------------------------
// Empresa
// -------------------------------------------------------
export type EmpresaConfig = Omit<Empresa, 'nubefact_token'> & {
  has_nubefact_token: boolean
  nubefact_token_hint: string | null
}

export async function getEmpresa(): Promise<ActionResponse<EmpresaConfig>> {
  const { supabase, perfil } = await getSession()
  if (!perfil?.empresa_id) return { data: null, error: 'No autenticado' }
  if (perfil.rol !== 'administrador') return { data: null, error: 'Sin permisos' }

  const { data, error } = await supabase
    .from('ptovta_empresas')
    .select('*')
    .eq('id', perfil.empresa_id)
    .single()

  if (error || !data) return { data: null, error: 'Error al obtener datos de empresa' }

  const { nubefact_token, ...rest } = data as Empresa
  return {
    data: {
      ...rest,
      has_nubefact_token: !!nubefact_token,
      nubefact_token_hint: nubefact_token ? `****${nubefact_token.slice(-4)}` : null,
    },
    error: null,
  }
}

export async function updateEmpresa(
  input: z.input<typeof empresaConfigSchema>
): Promise<ActionResponse<null>> {
  const parse = empresaConfigSchema.safeParse(input)
  if (!parse.success) return { data: null, error: parse.error.issues[0].message }

  const { supabase, perfil } = await getSession()
  if (!perfil?.empresa_id) return { data: null, error: 'No autenticado' }
  if (perfil.rol !== 'administrador') return { data: null, error: 'Sin permisos' }

  const { error } = await supabase
    .from('ptovta_empresas')
    .update({ ...parse.data, updated_at: new Date().toISOString() })
    .eq('id', perfil.empresa_id)

  if (error) return { data: null, error: 'Error al guardar datos de empresa' }
  return { data: null, error: null }
}

export async function updateNubefact(
  input: z.input<typeof nubefactConfigSchema>
): Promise<ActionResponse<null>> {
  const parse = nubefactConfigSchema.safeParse(input)
  if (!parse.success) return { data: null, error: parse.error.issues[0].message }

  const { perfil } = await getSession()
  if (!perfil?.empresa_id) return { data: null, error: 'No autenticado' }
  if (perfil.rol !== 'administrador') return { data: null, error: 'Sin permisos' }

  type EmpresaUpdate = Database['public']['Tables']['ptovta_empresas']['Update']
  const update: EmpresaUpdate = {
    nubefact_modo: parse.data.nubefact_modo,
    updated_at: new Date().toISOString(),
  }
  if (parse.data.nubefact_token?.trim()) {
    update.nubefact_token = parse.data.nubefact_token.trim()
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('ptovta_empresas')
    .update(update)
    .eq('id', perfil.empresa_id)

  if (error) return { data: null, error: 'Error al guardar configuración Nubefact' }
  return { data: null, error: null }
}

// -------------------------------------------------------
// Usuarios
// -------------------------------------------------------
export type UsuarioPerfil = Pick<Perfil, 'id' | 'nombre' | 'rol' | 'activo' | 'created_at'>

export async function getUsuarios(): Promise<ActionResponse<UsuarioPerfil[]>> {
  const { supabase, perfil } = await getSession()
  if (!perfil?.empresa_id) return { data: null, error: 'No autenticado' }
  if (perfil.rol !== 'administrador') return { data: null, error: 'Sin permisos' }

  const { data, error } = await supabase
    .from('ptovta_perfiles')
    .select('id, nombre, rol, activo, created_at')
    .eq('empresa_id', perfil.empresa_id)
    .order('created_at')

  if (error) return { data: null, error: 'Error al obtener usuarios' }
  return { data: data as UsuarioPerfil[], error: null }
}

const perfilUpdateSchema = z.object({
  rol: z.enum(['administrador', 'vendedor', 'lectura']).optional(),
  activo: z.boolean().optional(),
})

export async function updatePerfil(
  targetId: string,
  input: z.input<typeof perfilUpdateSchema>
): Promise<ActionResponse<null>> {
  const parse = perfilUpdateSchema.safeParse(input)
  if (!parse.success) return { data: null, error: 'Datos inválidos' }

  const { supabase, user, perfil } = await getSession()
  if (!perfil?.empresa_id || !user) return { data: null, error: 'No autenticado' }
  if (perfil.rol !== 'administrador') return { data: null, error: 'Sin permisos' }
  if (targetId === user.id) return { data: null, error: 'No puedes modificar tu propio perfil' }

  const { data: target } = await supabase
    .from('ptovta_perfiles')
    .select('id')
    .eq('id', targetId)
    .eq('empresa_id', perfil.empresa_id)
    .single()

  if (!target) return { data: null, error: 'Usuario no encontrado' }

  const { error } = await supabase
    .from('ptovta_perfiles')
    .update({ ...parse.data, updated_at: new Date().toISOString() })
    .eq('id', targetId)

  if (error) return { data: null, error: 'Error al actualizar usuario' }
  return { data: null, error: null }
}
