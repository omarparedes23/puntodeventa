'use server'

import { createClient } from '@/lib/supabase/server'
import { Decimal } from 'decimal.js'
import {
  categoriaSchema,
  unidadMedidaSchema,
  productoSchema,
  type CategoriaFormData,
  type UnidadMedidaFormData,
  type ProductoFormData,
} from '@/lib/validations/inventario'
import type { Categoria, UnidadMedida, Producto } from '@/types/database'

export type ActionResponse<T> = {
  data: T | null
  error: string | null
}

async function getEmpresaId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: perfil } = await supabase
    .from('ptovta_perfiles')
    .select('empresa_id')
    .eq('id', user.id)
    .single()

  return perfil?.empresa_id ?? null
}

// --- CATEGORIAS ---

export async function createCategoria(data: CategoriaFormData): Promise<ActionResponse<Categoria>> {
  const parsed = categoriaSchema.safeParse(data)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0].message }
  }

  const empresa_id = await getEmpresaId()
  if (!empresa_id) return { data: null, error: 'No autenticado o sin empresa configurada' }

  const supabase = await createClient()
  const { data: row, error } = await supabase
    .from('ptovta_categorias')
    .insert({ ...parsed.data, empresa_id })
    .select()
    .single()

  if (error) return { data: null, error: 'Error al crear la categoría: ' + error.message }
  return { data: row, error: null }
}

export async function updateCategoria(id: string, data: CategoriaFormData): Promise<ActionResponse<Categoria>> {
  const parsed = categoriaSchema.safeParse(data)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: row, error } = await supabase
    .from('ptovta_categorias')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) return { data: null, error: 'Error al actualizar la categoría: ' + error.message }
  return { data: row, error: null }
}

export async function deleteCategoria(id: string): Promise<ActionResponse<null>> {
  const supabase = await createClient()
  const { error } = await supabase.from('ptovta_categorias').delete().eq('id', id)

  if (error) {
    if (error.code === '23503') {
      return { data: null, error: 'No se puede eliminar: la categoría tiene productos asignados' }
    }
    return { data: null, error: 'Error al eliminar la categoría: ' + error.message }
  }
  return { data: null, error: null }
}

// --- UNIDADES DE MEDIDA ---

export async function createUnidadMedida(data: UnidadMedidaFormData): Promise<ActionResponse<UnidadMedida>> {
  const parsed = unidadMedidaSchema.safeParse(data)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0].message }
  }

  const empresa_id = await getEmpresaId()
  if (!empresa_id) return { data: null, error: 'No autenticado o sin empresa configurada' }

  const supabase = await createClient()
  const { data: row, error } = await supabase
    .from('ptovta_unidades_medida')
    .insert({ ...parsed.data, empresa_id })
    .select()
    .single()

  if (error) return { data: null, error: 'Error al crear la unidad de medida: ' + error.message }
  return { data: row, error: null }
}

export async function updateUnidadMedida(id: string, data: UnidadMedidaFormData): Promise<ActionResponse<UnidadMedida>> {
  const parsed = unidadMedidaSchema.safeParse(data)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: row, error } = await supabase
    .from('ptovta_unidades_medida')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) return { data: null, error: 'Error al actualizar la unidad de medida: ' + error.message }
  return { data: row, error: null }
}

export async function deleteUnidadMedida(id: string): Promise<ActionResponse<null>> {
  const supabase = await createClient()
  const { error } = await supabase.from('ptovta_unidades_medida').delete().eq('id', id)

  if (error) {
    if (error.code === '23503') {
      return { data: null, error: 'No se puede eliminar: la unidad está en uso por productos' }
    }
    return { data: null, error: 'Error al eliminar la unidad de medida: ' + error.message }
  }
  return { data: null, error: null }
}

// --- PRODUCTOS ---

export async function createProducto(data: ProductoFormData): Promise<ActionResponse<Producto>> {
  const parsed = productoSchema.safeParse(data)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0].message }
  }

  const empresa_id = await getEmpresaId()
  if (!empresa_id) return { data: null, error: 'No autenticado o sin empresa configurada' }

  const payload = {
    ...parsed.data,
    empresa_id,
    precio_compra: new Decimal(parsed.data.precio_compra).toNumber(),
    precio_minorista: new Decimal(parsed.data.precio_minorista).toNumber(),
    precio_mayorista: new Decimal(parsed.data.precio_mayorista).toNumber(),
    stock_actual: new Decimal(parsed.data.stock_actual ?? 0).toNumber(),
    stock_minimo: parsed.data.stock_minimo != null
      ? new Decimal(parsed.data.stock_minimo).toNumber()
      : null,
  }

  const supabase = await createClient()
  const { data: row, error } = await supabase
    .from('ptovta_productos')
    .insert(payload)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return { data: null, error: 'Ya existe un producto con ese código' }
    return { data: null, error: 'Error al crear el producto: ' + error.message }
  }
  return { data: row, error: null }
}

export async function updateProducto(id: string, data: ProductoFormData): Promise<ActionResponse<Producto>> {
  const parsed = productoSchema.safeParse(data)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0].message }
  }

  const payload = {
    ...parsed.data,
    precio_compra: new Decimal(parsed.data.precio_compra).toNumber(),
    precio_minorista: new Decimal(parsed.data.precio_minorista).toNumber(),
    precio_mayorista: new Decimal(parsed.data.precio_mayorista).toNumber(),
    stock_actual: new Decimal(parsed.data.stock_actual ?? 0).toNumber(),
    stock_minimo: parsed.data.stock_minimo != null
      ? new Decimal(parsed.data.stock_minimo).toNumber()
      : null,
  }

  const supabase = await createClient()
  const { data: row, error } = await supabase
    .from('ptovta_productos')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return { data: null, error: 'Ya existe un producto con ese código' }
    return { data: null, error: 'Error al actualizar el producto: ' + error.message }
  }
  return { data: row, error: null }
}

export async function deleteProducto(id: string): Promise<ActionResponse<null>> {
  const supabase = await createClient()
  const { error } = await supabase.from('ptovta_productos').delete().eq('id', id)

  if (error) {
    if (error.code === '23503') {
      return { data: null, error: 'No se puede eliminar: el producto tiene registros relacionados' }
    }
    return { data: null, error: 'Error al eliminar el producto: ' + error.message }
  }
  return { data: null, error: null }
}
