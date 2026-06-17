'use server'

import { proveedorSchema, type ProveedorFormValues } from '@marketpos/core'
import type { Proveedor } from '@marketpos/core'
import { getSession, getSessionFast } from '@/lib/session'

type ActionResponse<T> = { data: T | null; error: string | null }

export async function getProveedores(): Promise<ActionResponse<Proveedor[]>> {
  const t0 = Date.now()
  const { supabase, perfil } = await getSessionFast()
  if (!perfil?.empresa_id) return { data: null, error: 'No autenticado' }

  const { data, error } = await supabase
    .from('ptovta_proveedores')
    .select('*')
    .eq('empresa_id', perfil.empresa_id)
    .order('nombre', { ascending: true })

  console.log(`[TABLET:proveedores] getProveedores → ${Date.now() - t0}ms (${data?.length ?? 0} rows)`)
  if (error) return { data: null, error: error.message }
  return { data: data as Proveedor[], error: null }
}

export async function getProveedor(id: string): Promise<ActionResponse<Proveedor>> {
  const { supabase, perfil } = await getSessionFast()
  if (!perfil?.empresa_id) return { data: null, error: 'No autenticado' }

  const { data, error } = await supabase
    .from('ptovta_proveedores')
    .select('*')
    .eq('id', id)
    .eq('empresa_id', perfil.empresa_id)
    .single()

  if (error) return { data: null, error: error.message }
  return { data: data as Proveedor, error: null }
}

export async function createProveedor(formData: ProveedorFormValues): Promise<ActionResponse<Proveedor>> {
  const { supabase, perfil } = await getSession()
  if (!perfil?.empresa_id) return { data: null, error: 'No autenticado' }

  const validated = proveedorSchema.safeParse(formData)
  if (!validated.success) {
    return { data: null, error: validated.error.issues.map((i) => i.message).join(', ') }
  }

  const { data, error } = await supabase
    .from('ptovta_proveedores')
    .insert({ ...validated.data, empresa_id: perfil.empresa_id })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data: data as Proveedor, error: null }
}

export async function updateProveedor(id: string, formData: ProveedorFormValues): Promise<ActionResponse<Proveedor>> {
  const { supabase, perfil } = await getSession()
  if (!perfil?.empresa_id) return { data: null, error: 'No autenticado' }

  const validated = proveedorSchema.safeParse(formData)
  if (!validated.success) {
    return { data: null, error: validated.error.issues.map((i) => i.message).join(', ') }
  }

  const { data, error } = await supabase
    .from('ptovta_proveedores')
    .update(validated.data)
    .eq('id', id)
    .eq('empresa_id', perfil.empresa_id)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data: data as Proveedor, error: null }
}

export async function deleteProveedor(id: string): Promise<{ success: boolean; error: string | null }> {
  const { supabase, perfil } = await getSession()
  if (!perfil?.empresa_id) return { success: false, error: 'No autenticado' }

  const { error } = await supabase
    .from('ptovta_proveedores')
    .delete()
    .eq('id', id)
    .eq('empresa_id', perfil.empresa_id)

  if (error) return { success: false, error: error.message }
  return { success: true, error: null }
}
