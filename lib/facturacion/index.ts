export interface ItemComprobante {
  descripcion: string
  cantidad: number
  valor_unitario: number  // sin IGV
  precio_unitario: number // con IGV
  subtotal: number
  igv: number
  total: number
  afecto_igv: boolean
}

export interface ComprobanteData {
  tipo: 'boleta' | 'factura'
  serie: string
  correlativo: number
  fecha_emision: string
  cliente: {
    nombre: string
    tipo_documento: string
    nro_documento: string
  }
  items: ItemComprobante[]
  totales: {
    subtotal: number
    descuento: number
    igv: number
    total: number
  }
}

export interface ComprobanteResult {
  exito: boolean
  sunat_aceptada?: boolean   // true=aceptada, false=pendiente (boletas se validan async)
  id_externo?: string
  pdf_url?: string
  xml_url?: string
  hash?: string
  cdr?: string
  error?: string
}

export type EstadoComprobante = 'aceptada' | 'rechazada' | 'pendiente' | 'baja'

export type NotaCreditoMotivo = '01' | '03' | '04' | '06' | '07'

export interface NotaCreditoData {
  serie: string
  correlativo: number
  fecha_emision: string
  motivo_codigo: NotaCreditoMotivo
  documento_ref: {
    tipo: 'boleta' | 'factura'
    serie: string
    correlativo: number
  }
  cliente: { nombre: string; tipo_documento: string; nro_documento: string }
  items: ItemComprobante[]
  totales: { subtotal: number; descuento: number; igv: number; total: number }
}

export interface FacturacionService {
  emitirBoleta(data: ComprobanteData): Promise<ComprobanteResult>
  emitirFactura(data: ComprobanteData): Promise<ComprobanteResult>
  emitirNotaCredito(data: NotaCreditoData): Promise<ComprobanteResult>
  anularComprobante(id_externo: string, motivo: string, tipo: 'boleta' | 'factura'): Promise<void>
  consultarEstado(id_externo: string): Promise<EstadoComprobante>
}
