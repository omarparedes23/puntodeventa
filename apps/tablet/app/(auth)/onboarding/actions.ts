'use server'

import { createAdminClient } from '@marketpos/core'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Empresa } from '@marketpos/core'

type ActionResponse<T> = { data: T | null; error: string | null }

export type EmpresaOpcion = Pick<Empresa, 'id' | 'ruc' | 'razon_social' | 'nombre_comercial'>

export async function getEmpresas(): Promise<ActionResponse<EmpresaOpcion[]>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ptovta_empresas')
    .select('id, ruc, razon_social, nombre_comercial')
    .order('razon_social')

  if (error) return { data: null, error: 'Error al cargar empresas' }
  return { data: data as EmpresaOpcion[], error: null }
}

export async function vincularEmpresa(empresaId: string): Promise<ActionResponse<null>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'No autenticado' }

  const admin = createAdminClient()

  // Verificar que la empresa existe
  const { data: empresa } = await admin
    .from('ptovta_empresas')
    .select('id')
    .eq('id', empresaId)
    .single()

  if (!empresa) return { data: null, error: 'Empresa no encontrada' }

  // Vincular o crear perfil
  const { data: perfilExistente } = await admin
    .from('ptovta_perfiles')
    .select('id, empresa_id')
    .eq('id', user.id)
    .single()

  if (perfilExistente?.empresa_id) {
    redirect('/pos')
  }

  if (perfilExistente) {
    const { error } = await admin
      .from('ptovta_perfiles')
      .update({ empresa_id: empresaId })
      .eq('id', user.id)

    if (error) return { data: null, error: 'Error al vincular empresa' }
  } else {
    const { error } = await admin
      .from('ptovta_perfiles')
      .insert({
        id: user.id,
        nombre: user.email?.split('@')[0] ?? 'Usuario',
        rol: 'vendedor',
        empresa_id: empresaId,
        activo: true,
      })

    if (error) return { data: null, error: 'Error al crear perfil' }
  }

  redirect('/pos')
}
