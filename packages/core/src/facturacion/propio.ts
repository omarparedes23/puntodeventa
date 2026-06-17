import type {
  FacturacionService,
  ComprobanteData,
  ComprobanteResult,
  EstadoComprobante,
  NotaCreditoData,
} from './index'

// Mapeo MarketPos → código SUNAT (Catálogo 06)
const TIPO_DOC_SUNAT: Record<string, string> = {
  DNI:       '1',
  RUC:       '6',
  CE:        '4',
  PASAPORTE: '7',
}

function toSunatTipoDoc(tipo: string | null | undefined): string {
  if (!tipo) return '0'
  return TIPO_DOC_SUNAT[tipo.toUpperCase()] ?? '0'
}

// Catálogo 09 SUNAT — descripciones de motivo de nota de crédito
const MOTIVO_NC: Record<string, string> = {
  '01': 'Anulacion de la operacion',
  '02': 'Anulacion por error en el RUC',
  '03': 'Correccion por error en la descripcion',
  '04': 'Descuento global',
  '06': 'Devolucion total',
  '07': 'Devolucion por item',
}

function motivoDescripcion(codigo: string): string {
  return MOTIVO_NC[codigo] ?? 'Nota de credito'
}

function mapEstado(estado: string): EstadoComprobante {
  switch (estado) {
    case 'EMITIDA':   return 'aceptada'
    case 'RECHAZADA': return 'rechazada'
    case 'ANULADA':   return 'baja'
    default:          return 'pendiente'
  }
}

export class PropioService implements FacturacionService {
  private readonly url: string
  private readonly apiKey: string

  constructor() {
    this.url    = process.env.OSE_SUNAT_URL    ?? 'http://localhost:8080'
    this.apiKey = process.env.OSE_SUNAT_API_KEY ?? ''
  }

  private async post(path: string, body: object): Promise<Response> {
    return fetch(`${this.url}${path}`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key':    this.apiKey,
      },
      body: JSON.stringify(body),
    })
  }

  private buildRequest(tipo: 'BOLETA' | 'FACTURA' | 'NOTA_CREDITO', data: ComprobanteData) {
    return {
      tipo,
      serie:        data.serie,
      correlativo:  data.correlativo,
      fechaEmision: data.fecha_emision,
      cliente: {
        nombre:         data.cliente.nombre,
        tipoDocCodigo:  toSunatTipoDoc(data.cliente.tipo_documento),
        numDoc:         data.cliente.nro_documento || '00000000',
      },
      items: data.items.map(item => ({
        descripcion:    item.descripcion,
        cantidad:       item.cantidad,
        valorUnitario:  item.valor_unitario,
        precioUnitario: item.precio_unitario,
        subtotal:       item.subtotal,
        igv:            item.igv,
        total:          item.total,
        afectoIgv:      item.afecto_igv,
      })),
      totales: {
        gravada:    data.totales.subtotal,
        descuento:  data.totales.descuento,
        igv:        data.totales.igv,
        totalPagar: data.totales.total,
      },
    }
  }

  private async emitir(tipo: 'BOLETA' | 'FACTURA', data: ComprobanteData): Promise<ComprobanteResult> {
    if (!this.apiKey) {
      console.error('[FACTURACION] OSE_SUNAT_API_KEY no configurado en .env.local')
      return { exito: false, error: 'Microservicio SUNAT no configurado' }
    }

    let json: Record<string, unknown>
    try {
      const res = await this.post('/api/v1/comprobantes', this.buildRequest(tipo, data))
      json = await res.json()
    } catch (err) {
      console.error('[FACTURACION] Error de red al llamar microservicio SUNAT:', err)
      return { exito: false, error: 'Error de red' }
    }

    const estado = json.estado as string
    const exito  = estado === 'EMITIDA' || estado === 'PENDIENTE'

    if (!exito) {
      const msg = (json.errorMensaje as string | undefined)
        ?? (json.detail as string | undefined)
        ?? estado
        ?? 'Error desconocido'
      console.error(`[FACTURACION] Microservicio SUNAT rechazó ${tipo} ${data.serie}-${data.correlativo}:`, msg)
      return { exito: false, error: msg }
    }

    console.log(`[FACTURACION] ✓ ${tipo} ${data.serie}-${data.correlativo} | estado: ${estado}`)

    return {
      exito:         true,
      sunat_aceptada: estado === 'EMITIDA',
      id_externo:     json.id as string,
      pdf_url:        json.pdfUrl as string | undefined,
      xml_url:        json.xmlUrl as string | undefined,
      hash:           json.sunatHash as string | undefined,
    }
  }

  async emitirBoleta(data: ComprobanteData): Promise<ComprobanteResult> {
    console.log(`[FACTURACION] Emitiendo boleta ${data.serie}-${data.correlativo}`)
    return this.emitir('BOLETA', data)
  }

  async emitirFactura(data: ComprobanteData): Promise<ComprobanteResult> {
    console.log(`[FACTURACION] Emitiendo factura ${data.serie}-${data.correlativo}`)
    return this.emitir('FACTURA', data)
  }

  async emitirNotaCredito(data: NotaCreditoData): Promise<ComprobanteResult> {
    console.log(`[FACTURACION] Emitiendo NC ${data.serie}-${data.correlativo}`)
    if (!this.apiKey) {
      return { exito: false, error: 'Microservicio SUNAT no configurado' }
    }

    let json: Record<string, unknown>
    try {
      const refId = `${data.documento_ref.serie}-${String(data.documento_ref.correlativo).padStart(8, '0')}`
      const tipoDocRef = data.documento_ref.tipo === 'factura' ? '01' : '03'

      const res = await this.post('/api/v1/comprobantes', {
        tipo:         'NOTA_CREDITO',
        serie:        data.serie,
        correlativo:  data.correlativo,
        fechaEmision: data.fecha_emision,
        cliente: {
          nombre:        data.cliente.nombre,
          tipoDocCodigo: toSunatTipoDoc(data.cliente.tipo_documento),
          numDoc:        data.cliente.nro_documento || '00000000',
        },
        items: data.items.map(item => ({
          descripcion:    item.descripcion,
          cantidad:       item.cantidad,
          valorUnitario:  item.valor_unitario,
          precioUnitario: item.precio_unitario,
          subtotal:       item.subtotal,
          igv:            item.igv,
          total:          item.total,
          afectoIgv:      item.afecto_igv,
        })),
        totales: {
          gravada:    data.totales.subtotal,
          descuento:  data.totales.descuento,
          igv:        data.totales.igv,
          totalPagar: data.totales.total,
        },
        notaCredito: {
          comprobanteReferenciadoId: refId,
          tipoDocReferenciado:       tipoDocRef,
          motivoCodigo:              data.motivo_codigo,
          motivoDescripcion:         motivoDescripcion(data.motivo_codigo),
        },
      })
      json = await res.json()
    } catch (err) {
      console.error('[FACTURACION] Error de red al emitir NC:', err)
      return { exito: false, error: 'Error de red' }
    }

    const estado = json.estado as string
    const exito  = estado === 'EMITIDA' || estado === 'PENDIENTE'
    return {
      exito,
      sunat_aceptada: estado === 'EMITIDA',
      id_externo:     json.id as string,
      xml_url:        json.xmlUrl as string | undefined,
      hash:           json.sunatHash as string | undefined,
      error:          exito ? undefined : (json.errorMensaje as string | undefined),
    }
  }

  async anularComprobante(id_externo: string, motivo: string, _tipo: 'boleta' | 'factura'): Promise<void> {
    if (!this.apiKey) {
      console.error('[FACTURACION] OSE_SUNAT_API_KEY no configurado')
      return
    }

    console.log(`[FACTURACION] Anulando ${id_externo} | motivo: ${motivo}`)
    const res = await this.post(`/api/v1/comprobantes/${id_externo}/anular`, { motivo })

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error((json as Record<string, unknown>).detail as string ?? 'Error al anular')
    }
  }

  async consultarEstado(id_externo: string): Promise<EstadoComprobante> {
    try {
      const res = await fetch(`${this.url}/api/v1/comprobantes/${id_externo}`, {
        headers: { 'X-Api-Key': this.apiKey },
      })
      if (!res.ok) return 'pendiente'
      const json: Record<string, unknown> = await res.json()
      return mapEstado(json.estado as string)
    } catch {
      return 'pendiente'
    }
  }
}
