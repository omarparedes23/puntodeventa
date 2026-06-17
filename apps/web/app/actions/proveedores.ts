'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ProveedorFormValues, proveedorSchema } from '@marketpos/core'
import { Proveedor } from '@marketpos/core'

export async function getProveedores(): Promise<{ data: Proveedor[] | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('ptovta_proveedores')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) {
      console.error('[PROVEEDORES] Error obteniendo proveedores:', error.message);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error: unknown) {
    console.error('[PROVEEDORES] Error inesperado:', error);
    return { data: null, error: 'Error inesperado al obtener proveedores' };
  }
}

export async function getProveedor(id: string): Promise<{ data: Proveedor | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('ptovta_proveedores')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`[PROVEEDORES] Error obteniendo proveedor ${id}:`, error.message);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error: unknown) {
    console.error('[PROVEEDORES] Error inesperado:', error);
    return { data: null, error: 'Error inesperado al obtener proveedor' };
  }
}

export async function createProveedor(formData: ProveedorFormValues): Promise<{ data: Proveedor | null; error: string | null }> {
  try {
    // Validate with Zod
    const validatedData = proveedorSchema.safeParse(formData);
    
    if (!validatedData.success) {
      // In Zod v4 we use .issues
      const errorMessages = validatedData.error.issues.map(issue => issue.message).join(', ');
      return { data: null, error: `Validación fallida: ${errorMessages}` };
    }

    const supabase = await createClient();
    
    // Get current user's profile to get empresa_id
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return { data: null, error: 'No autenticado' };
    }
    
    const { data: perfilData, error: perfilError } = await supabase
      .from('ptovta_perfiles')
      .select('empresa_id')
      .eq('id', userData.user.id)
      .single();
      
    if (perfilError || !perfilData.empresa_id) {
      return { data: null, error: 'No se pudo obtener la empresa del usuario' };
    }

    const { data, error } = await supabase
      .from('ptovta_proveedores')
      .insert({
        ...validatedData.data,
        empresa_id: perfilData.empresa_id,
        // Optional fields could be empty strings, let's map them properly if needed, but supabase accepts them
      })
      .select()
      .single();

    if (error) {
      console.error('[PROVEEDORES] Error creando proveedor:', error.message);
      return { data: null, error: error.message };
    }

    revalidatePath('/proveedores');
    return { data, error: null };
  } catch (error: unknown) {
    console.error('[PROVEEDORES] Error inesperado:', error);
    return { data: null, error: 'Error inesperado al crear proveedor' };
  }
}

export async function updateProveedor(id: string, formData: ProveedorFormValues): Promise<{ data: Proveedor | null; error: string | null }> {
  try {
    const validatedData = proveedorSchema.safeParse(formData);
    
    if (!validatedData.success) {
      const errorMessages = validatedData.error.issues.map(issue => issue.message).join(', ');
      return { data: null, error: `Validación fallida: ${errorMessages}` };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('ptovta_proveedores')
      .update(validatedData.data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`[PROVEEDORES] Error actualizando proveedor ${id}:`, error.message);
      return { data: null, error: error.message };
    }

    revalidatePath('/proveedores');
    return { data, error: null };
  } catch (error: unknown) {
    console.error('[PROVEEDORES] Error inesperado:', error);
    return { data: null, error: 'Error inesperado al actualizar proveedor' };
  }
}

export async function deleteProveedor(id: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('ptovta_proveedores')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`[PROVEEDORES] Error eliminando proveedor ${id}:`, error.message);
      return { success: false, error: error.message };
    }

    revalidatePath('/proveedores');
    return { success: true, error: null };
  } catch (error: unknown) {
    console.error('[PROVEEDORES] Error inesperado:', error);
    return { success: false, error: 'Error inesperado al eliminar proveedor' };
  }
}
