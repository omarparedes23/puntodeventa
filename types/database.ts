// Tipos generados manualmente desde supabase/migrations/
// Regenerar con: npx supabase gen types typescript (requiere Docker Desktop)

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      ptovta_empresas: {
        Row: {
          id: string
          razon_social: string
          nombre_comercial: string | null
          ruc: string
          direccion: string | null
          telefono: string | null
          email: string | null
          logo_url: string | null
          serie_boleta: string
          serie_factura: string
          nubefact_token: string | null
          nubefact_modo: 'demo' | 'produccion'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          razon_social: string
          nombre_comercial?: string | null
          ruc: string
          direccion?: string | null
          telefono?: string | null
          email?: string | null
          logo_url?: string | null
          serie_boleta?: string
          serie_factura?: string
          nubefact_token?: string | null
          nubefact_modo?: 'demo' | 'produccion'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          razon_social?: string
          nombre_comercial?: string | null
          ruc?: string
          direccion?: string | null
          telefono?: string | null
          email?: string | null
          logo_url?: string | null
          serie_boleta?: string
          serie_factura?: string
          nubefact_token?: string | null
          nubefact_modo?: 'demo' | 'produccion'
          updated_at?: string
        }
        Relationships: []
      }
      ptovta_perfiles: {
        Row: {
          id: string
          nombre: string
          rol: 'administrador' | 'vendedor' | 'lectura'
          activo: boolean
          empresa_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          nombre: string
          rol?: 'administrador' | 'vendedor' | 'lectura'
          activo?: boolean
          empresa_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          nombre?: string
          rol?: 'administrador' | 'vendedor' | 'lectura'
          activo?: boolean
          empresa_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ptovta_perfiles_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'ptovta_empresas'
            referencedColumns: ['id']
          }
        ]
      }
      ptovta_categorias: {
        Row: {
          id: string
          empresa_id: string
          nombre: string
          parent_id: string | null
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          nombre: string
          parent_id?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          empresa_id?: string
          nombre?: string
          parent_id?: string | null
          activo?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ptovta_categorias_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'ptovta_empresas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ptovta_categorias_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'ptovta_categorias'
            referencedColumns: ['id']
          }
        ]
      }
      ptovta_unidades_medida: {
        Row: {
          id: string
          empresa_id: string
          nombre: string
          simbolo: string
          permite_decimal: boolean
          created_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          nombre: string
          simbolo: string
          permite_decimal?: boolean
          created_at?: string
        }
        Update: {
          empresa_id?: string
          nombre?: string
          simbolo?: string
          permite_decimal?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'ptovta_unidades_medida_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'ptovta_empresas'
            referencedColumns: ['id']
          }
        ]
      }
      ptovta_productos: {
        Row: {
          id: string
          empresa_id: string
          categoria_id: string | null
          unidad_medida_id: string | null
          codigo: string | null
          nombre: string
          descripcion: string | null
          foto_url: string | null
          precio_compra: number
          precio_minorista: number
          precio_mayorista: number
          stock_actual: number
          stock_minimo: number | null
          activo: boolean
          afecto_igv: boolean
          codigo_sunat: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          categoria_id?: string | null
          unidad_medida_id?: string | null
          codigo?: string | null
          nombre: string
          descripcion?: string | null
          foto_url?: string | null
          precio_compra?: number
          precio_minorista?: number
          precio_mayorista?: number
          stock_actual?: number
          stock_minimo?: number | null
          activo?: boolean
          afecto_igv?: boolean
          codigo_sunat?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          empresa_id?: string
          categoria_id?: string | null
          unidad_medida_id?: string | null
          codigo?: string | null
          nombre?: string
          descripcion?: string | null
          foto_url?: string | null
          precio_compra?: number
          precio_minorista?: number
          precio_mayorista?: number
          stock_actual?: number
          stock_minimo?: number | null
          activo?: boolean
          afecto_igv?: boolean
          codigo_sunat?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ptovta_productos_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'ptovta_empresas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ptovta_productos_categoria_id_fkey'
            columns: ['categoria_id']
            isOneToOne: false
            referencedRelation: 'ptovta_categorias'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ptovta_productos_unidad_medida_id_fkey'
            columns: ['unidad_medida_id']
            isOneToOne: false
            referencedRelation: 'ptovta_unidades_medida'
            referencedColumns: ['id']
          }
        ]
      }
      ptovta_clientes: {
        Row: {
          id: string
          empresa_id: string
          tipo_cliente: 'mayorista' | 'minorista'
          tipo_documento: 'DNI' | 'RUC' | 'CE' | 'PASAPORTE' | null
          nro_documento: string | null
          nombre: string
          telefono: string | null
          email: string | null
          direccion: string | null
          tiene_credito: boolean
          limite_credito: number
          saldo_deudor: number
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          tipo_cliente?: 'mayorista' | 'minorista'
          tipo_documento?: 'DNI' | 'RUC' | 'CE' | 'PASAPORTE' | null
          nro_documento?: string | null
          nombre: string
          telefono?: string | null
          email?: string | null
          direccion?: string | null
          tiene_credito?: boolean
          limite_credito?: number
          saldo_deudor?: number
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          empresa_id?: string
          tipo_cliente?: 'mayorista' | 'minorista'
          tipo_documento?: 'DNI' | 'RUC' | 'CE' | 'PASAPORTE' | null
          nro_documento?: string | null
          nombre?: string
          telefono?: string | null
          email?: string | null
          direccion?: string | null
          tiene_credito?: boolean
          limite_credito?: number
          saldo_deudor?: number
          activo?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ptovta_clientes_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'ptovta_empresas'
            referencedColumns: ['id']
          }
        ]
      }
      ptovta_proveedores: {
        Row: {
          id: string
          empresa_id: string
          ruc: string | null
          nombre: string
          contacto: string | null
          telefono: string | null
          email: string | null
          direccion: string | null
          saldo_deudor: number
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          ruc?: string | null
          nombre: string
          contacto?: string | null
          telefono?: string | null
          email?: string | null
          direccion?: string | null
          saldo_deudor?: number
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          empresa_id?: string
          ruc?: string | null
          nombre?: string
          contacto?: string | null
          telefono?: string | null
          email?: string | null
          direccion?: string | null
          saldo_deudor?: number
          activo?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ptovta_proveedores_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'ptovta_empresas'
            referencedColumns: ['id']
          }
        ]
      }
      ptovta_cajas: {
        Row: {
          id: string
          empresa_id: string
          usuario_id: string
          estado: 'abierta' | 'cerrada'
          monto_inicial: number
          monto_final: number | null
          fecha_apertura: string
          fecha_cierre: string | null
          notas: string | null
          created_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          usuario_id: string
          estado?: 'abierta' | 'cerrada'
          monto_inicial?: number
          monto_final?: number | null
          fecha_apertura?: string
          fecha_cierre?: string | null
          notas?: string | null
          created_at?: string
        }
        Update: {
          estado?: 'abierta' | 'cerrada'
          monto_final?: number | null
          fecha_cierre?: string | null
          notas?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'ptovta_cajas_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'ptovta_empresas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ptovta_cajas_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'ptovta_perfiles'
            referencedColumns: ['id']
          }
        ]
      }
      ptovta_movimientos_caja: {
        Row: {
          id: string
          caja_id: string
          tipo: 'ingreso' | 'egreso'
          concepto: string
          monto: number
          metodo_pago: 'efectivo' | 'yape' | 'tarjeta' | 'transferencia' | 'credito'
          referencia_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          caja_id: string
          tipo: 'ingreso' | 'egreso'
          concepto: string
          monto: number
          metodo_pago?: 'efectivo' | 'yape' | 'tarjeta' | 'transferencia' | 'credito'
          referencia_id?: string | null
          created_at?: string
        }
        Update: Record<string, never>
        Relationships: [
          {
            foreignKeyName: 'ptovta_movimientos_caja_caja_id_fkey'
            columns: ['caja_id']
            isOneToOne: false
            referencedRelation: 'ptovta_cajas'
            referencedColumns: ['id']
          }
        ]
      }
      ptovta_compras: {
        Row: {
          id: string
          empresa_id: string
          proveedor_id: string | null
          usuario_id: string
          nro_documento: string | null
          fecha_compra: string
          subtotal: number | null
          igv: number | null
          total: number
          monto_pagado: number
          estado_pago: 'pendiente' | 'parcial' | 'pagado'
          notas: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          proveedor_id?: string | null
          usuario_id: string
          nro_documento?: string | null
          fecha_compra?: string
          subtotal?: number | null
          igv?: number | null
          total: number
          monto_pagado?: number
          estado_pago?: 'pendiente' | 'parcial' | 'pagado'
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          monto_pagado?: number
          estado_pago?: 'pendiente' | 'parcial' | 'pagado'
          notas?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ptovta_compra_items: {
        Row: {
          id: string
          compra_id: string
          producto_id: string
          cantidad: number
          precio_unitario: number
          subtotal: number
          created_at: string
        }
        Insert: {
          id?: string
          compra_id: string
          producto_id: string
          cantidad: number
          precio_unitario: number
          subtotal: number
          created_at?: string
        }
        Update: Record<string, never>
        Relationships: []
      }
      ptovta_kardex: {
        Row: {
          id: string
          empresa_id: string
          producto_id: string
          tipo: 'entrada' | 'salida' | 'ajuste'
          motivo: 'venta' | 'compra' | 'ajuste_manual' | 'devolucion' | 'merma'
          cantidad: number
          stock_anterior: number
          stock_nuevo: number
          referencia_id: string | null
          notas: string | null
          usuario_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          producto_id: string
          tipo: 'entrada' | 'salida' | 'ajuste'
          motivo: 'venta' | 'compra' | 'ajuste_manual' | 'devolucion' | 'merma'
          cantidad: number
          stock_anterior: number
          stock_nuevo: number
          referencia_id?: string | null
          notas?: string | null
          usuario_id?: string | null
          created_at?: string
        }
        Update: Record<string, never>
        Relationships: []
      }
      ptovta_ventas: {
        Row: {
          id: string
          empresa_id: string
          caja_id: string | null
          cliente_id: string | null
          usuario_id: string
          tipo_venta: 'mayorista' | 'minorista'
          tipo_comprobante: 'boleta' | 'factura' | 'ticket'
          serie: string | null
          correlativo: number | null
          numero_completo: string | null
          subtotal: number
          descuento_total: number
          igv: number
          total: number
          estado: 'pendiente' | 'emitida' | 'anulada' | 'error_sunat'
          sunat_estado: string | null
          sunat_cdr: string | null
          sunat_hash: string | null
          nubefact_id: string | null
          pdf_url: string | null
          xml_url: string | null
          fecha_emision: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          caja_id?: string | null
          cliente_id?: string | null
          usuario_id: string
          tipo_venta?: 'mayorista' | 'minorista'
          tipo_comprobante: 'boleta' | 'factura' | 'ticket'
          serie?: string | null
          correlativo?: number | null
          numero_completo?: string | null
          subtotal: number
          descuento_total?: number
          igv?: number
          total: number
          estado?: 'pendiente' | 'emitida' | 'anulada' | 'error_sunat'
          sunat_estado?: string | null
          sunat_cdr?: string | null
          sunat_hash?: string | null
          nubefact_id?: string | null
          pdf_url?: string | null
          xml_url?: string | null
          fecha_emision?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          estado?: 'pendiente' | 'emitida' | 'anulada' | 'error_sunat'
          sunat_estado?: string | null
          sunat_cdr?: string | null
          sunat_hash?: string | null
          nubefact_id?: string | null
          pdf_url?: string | null
          xml_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ptovta_venta_items: {
        Row: {
          id: string
          venta_id: string
          producto_id: string
          cantidad: number
          precio_unitario: number
          descuento: number
          subtotal: number
          igv: number
          total: number
          producto_nombre: string
          producto_codigo: string | null
          created_at: string
        }
        Insert: {
          id?: string
          venta_id: string
          producto_id: string
          cantidad: number
          precio_unitario: number
          descuento?: number
          subtotal: number
          igv?: number
          total: number
          producto_nombre: string
          producto_codigo?: string | null
          created_at?: string
        }
        Update: Record<string, never>
        Relationships: []
      }
      ptovta_venta_pagos: {
        Row: {
          id: string
          venta_id: string
          metodo_pago: 'efectivo' | 'yape' | 'tarjeta' | 'transferencia' | 'credito'
          monto: number
          referencia: string | null
          created_at: string
        }
        Insert: {
          id?: string
          venta_id: string
          metodo_pago: 'efectivo' | 'yape' | 'tarjeta' | 'transferencia' | 'credito'
          monto: number
          referencia?: string | null
          created_at?: string
        }
        Update: Record<string, never>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Empresa = Database['public']['Tables']['ptovta_empresas']['Row']
export type Perfil = Database['public']['Tables']['ptovta_perfiles']['Row']
export type Categoria = Database['public']['Tables']['ptovta_categorias']['Row']
export type UnidadMedida = Database['public']['Tables']['ptovta_unidades_medida']['Row']
export type Producto = Database['public']['Tables']['ptovta_productos']['Row']
export type Cliente = Database['public']['Tables']['ptovta_clientes']['Row']
export type Proveedor = Database['public']['Tables']['ptovta_proveedores']['Row']
export type Caja = Database['public']['Tables']['ptovta_cajas']['Row']
export type MovimientoCaja = Database['public']['Tables']['ptovta_movimientos_caja']['Row']

export type CategoriaInsert = Database['public']['Tables']['ptovta_categorias']['Insert']
export type UnidadMedidaInsert = Database['public']['Tables']['ptovta_unidades_medida']['Insert']
export type ProductoInsert = Database['public']['Tables']['ptovta_productos']['Insert']
export type ClienteInsert = Database['public']['Tables']['ptovta_clientes']['Insert']
export type ProveedorInsert = Database['public']['Tables']['ptovta_proveedores']['Insert']
export type Venta = Database['public']['Tables']['ptovta_ventas']['Row']
export type VentaItem = Database['public']['Tables']['ptovta_venta_items']['Row']
export type VentaPago = Database['public']['Tables']['ptovta_venta_pagos']['Row']
export type KardexEntry = Database['public']['Tables']['ptovta_kardex']['Row']
export type Compra = Database['public']['Tables']['ptovta_compras']['Row']
export type CompraItem = Database['public']['Tables']['ptovta_compra_items']['Row']
