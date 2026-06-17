'use server'

import { clienteSchema, type ClienteInput } from '@marketpos/core'
import type { Cliente } from '@marketpos/core'
import { getSession, getSessionFast } from '@/lib/session'

type ActionResponse<T> = {
  data: T | null
  error: string | null
}

export async function getClientes(query: string = ''): Promise<ActionResponse<Cliente[]>> {
  const t0 = Date.now()
  const { supabase, perfil } = await getSessionFast()
  if (!perfil?.empresa_id) return { data: null, error: 'No autenticado o sin empresa' }

  let q = supabase
    .from('ptovta_clientes')
    .select('id, nombre, tipo_cliente, tipo_documento, nro_documento, telefono, email, activo, created_at')
    .eq('empresa_id', perfil.empresa_id)
    .order('nombre')
    .limit(100)

  if (query) {
    q = q.or(`nombre.ilike.%${query}%,nro_documento.ilike.%${query}%`)
  }

  const { data, error } = await q
  console.log(`[TABLET:clientes] getClientes "${query}" → ${Date.now() - t0}ms (${data?.length ?? 0} rows)`)
  if (error) return { data: null, error: 'Error al obtener clientes' }
  return { data: data as Cliente[], error: null }
}

export async function createCliente(input: ClienteInput): Promise<ActionResponse<Cliente>> {
  const { supabase, perfil } = await getSession()
  if (!perfil?.empresa_id) return { data: null, error: 'No autenticado o sin empresa' }

  const parsed = clienteSchema.safeParse(input)
  if (!parsed.success) return { data: null, error: parsed.error.issues[0].message }

  const { data, error } = await supabase
    .from('ptovta_clientes')
    .insert({ ...parsed.data, empresa_id: perfil.empresa_id })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return { data: null, error: 'El documento ya está registrado en esta empresa' }
    return { data: null, error: 'Error al crear el cliente' }
  }
  return { data: data as Cliente, error: null }
}

export async function updateCliente(id: string, input: ClienteInput): Promise<ActionResponse<Cliente>> {
  const { supabase, perfil } = await getSession()
  if (!perfil?.empresa_id) return { data: null, error: 'No autenticado o sin empresa' }
  if (perfil.rol !== 'administrador') return { data: null, error: 'Solo administradores pueden editar clientes' }

  const parsed = clienteSchema.safeParse(input)
  if (!parsed.success) return { data: null, error: parsed.error.issues[0].message }

  const { data, error } = await supabase
    .from('ptovta_clientes')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) return { data: null, error: 'Error al actualizar el cliente' }
  return { data: data as Cliente, error: null }
}

export async function deleteCliente(id: string): Promise<ActionResponse<null>> {
  const { supabase, perfil } = await getSession()
  if (!perfil?.empresa_id) return { data: null, error: 'No autenticado o sin empresa' }
  if (perfil.rol !== 'administrador') return { data: null, error: 'Solo administradores pueden eliminar clientes' }

  const { error } = await supabase.from('ptovta_clientes').delete().eq('id', id)
  if (error) return { data: null, error: 'Error al eliminar el cliente' }
  return { data: null, error: null }
}

export async function getOrCreateClienteGenerico(): Promise<ActionResponse<Cliente>> {
  const { supabase, perfil } = await getSession()
  if (!perfil?.empresa_id) return { data: null, error: 'No autenticado o sin empresa' }

  const { data: existing } = await supabase
    .from('ptovta_clientes')
    .select('*')
    .eq('empresa_id', perfil.empresa_id)
    .eq('nro_documento', '00000000')
    .maybeSingle()

  if (existing) return { data: existing as Cliente, error: null }

  const { data: created, error } = await supabase
    .from('ptovta_clientes')
    .insert({
      empresa_id: perfil.empresa_id,
      tipo_documento: 'DNI',
      nro_documento: '00000000',
      nombre: 'CLIENTE GENÉRICO',
      tipo_cliente: 'minorista',
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      const { data: retry } = await supabase
        .from('ptovta_clientes')
        .select('*')
        .eq('empresa_id', perfil.empresa_id)
        .eq('nro_documento', '00000000')
        .single()
      if (retry) return { data: retry as Cliente, error: null }
    }
    return { data: null, error: 'Error al crear cliente genérico' }
  }

  return { data: created as Cliente, error: null }
}
