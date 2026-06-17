'use server'

import { createClient } from '@/lib/supabase/server'
import { clienteSchema, type ClienteInput } from '@marketpos/core'
import type { Cliente } from '@marketpos/core'

type ActionResponse<T> = {
  data: T | null
  error: string | null
}

async function getSession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, profile: null }

  const { data: profile } = await supabase
    .from('ptovta_perfiles')
    .select('empresa_id, rol')
    .eq('id', user.id)
    .single()

  return { supabase, user, profile }
}

export async function getClientes(query: string = ''): Promise<ActionResponse<Cliente[]>> {
  const { supabase, profile } = await getSession()
  if (!profile?.empresa_id) return { data: null, error: 'No autenticado o sin empresa' }

  let q = supabase
    .from('ptovta_clientes')
    .select('*')
    .order('nombre')
    .limit(100)

  if (query) {
    q = q.or(`nombre.ilike.%${query}%,nro_documento.ilike.%${query}%`)
  }

  const { data, error } = await q
  if (error) return { data: null, error: 'Error al obtener clientes' }
  return { data, error: null }
}

export async function createCliente(input: ClienteInput): Promise<ActionResponse<Cliente>> {
  const { supabase, profile } = await getSession()
  if (!profile?.empresa_id) return { data: null, error: 'No autenticado o sin empresa' }

  const parsed = clienteSchema.safeParse(input)
  if (!parsed.success) return { data: null, error: parsed.error.issues[0].message }

  const { data, error } = await supabase
    .from('ptovta_clientes')
    .insert({ ...parsed.data, empresa_id: profile.empresa_id })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return { data: null, error: 'El documento ya está registrado en esta empresa' }
    return { data: null, error: 'Error al crear el cliente' }
  }
  return { data, error: null }
}

export async function updateCliente(id: string, input: ClienteInput): Promise<ActionResponse<Cliente>> {
  const { supabase, profile } = await getSession()
  if (!profile?.empresa_id) return { data: null, error: 'No autenticado o sin empresa' }
  if (profile.rol !== 'administrador') return { data: null, error: 'Solo administradores pueden editar clientes' }

  const parsed = clienteSchema.safeParse(input)
  if (!parsed.success) return { data: null, error: parsed.error.issues[0].message }

  const { data, error } = await supabase
    .from('ptovta_clientes')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) return { data: null, error: 'Error al actualizar el cliente' }
  return { data, error: null }
}

export async function deleteCliente(id: string): Promise<ActionResponse<null>> {
  const { supabase, profile } = await getSession()
  if (!profile?.empresa_id) return { data: null, error: 'No autenticado o sin empresa' }
  if (profile.rol !== 'administrador') return { data: null, error: 'Solo administradores pueden eliminar clientes' }

  const { error } = await supabase.from('ptovta_clientes').delete().eq('id', id)
  if (error) return { data: null, error: 'Error al eliminar el cliente' }
  return { data: null, error: null }
}

// Cliente genérico para ventas sin identificar (POS)
export async function getOrCreateClienteGenerico(): Promise<ActionResponse<Cliente>> {
  const { supabase, profile } = await getSession()
  if (!profile?.empresa_id) return { data: null, error: 'No autenticado o sin empresa' }

  const { data: existing } = await supabase
    .from('ptovta_clientes')
    .select('*')
    .eq('empresa_id', profile.empresa_id)
    .eq('nro_documento', '00000000')
    .maybeSingle()

  if (existing) return { data: existing, error: null }

  // '00000000' pasa la validación DNI (exactamente 8 dígitos)
  const { data: created, error } = await supabase
    .from('ptovta_clientes')
    .insert({
      empresa_id: profile.empresa_id,
      tipo_documento: 'DNI',
      nro_documento: '00000000',
      nombre: 'CLIENTE GENÉRICO',
      tipo_cliente: 'minorista',
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      // Condición de carrera: otro proceso lo creó
      const { data: retry } = await supabase
        .from('ptovta_clientes')
        .select('*')
        .eq('empresa_id', profile.empresa_id)
        .eq('nro_documento', '00000000')
        .single()
      if (retry) return { data: retry, error: null }
    }
    return { data: null, error: 'Error al crear cliente genérico' }
  }

  return { data: created, error: null }
}
