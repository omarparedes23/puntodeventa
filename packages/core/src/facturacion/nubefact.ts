import type { FacturacionService, ComprobanteData, ComprobanteResult, EstadoComprobante, NotaCreditoData } from './index'

const TIPO_DOCUMENTO: Record<string, number> = {
  DNI: 1,
  RUC: 6,
  CE: 4,
  PASAPORTE: 7,
}

// "2026-06-01" → "01/06/2026"
function formatFecha(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function buildPayload(data: ComprobanteData, tipoComprobante: 1 | 2) {
  return {
    operacion: 'generar_comprobante',
    tipo_de_comprobante: tipoComprobante,
    serie: data.serie,
    numero: data.correlativo,
    sunat_transaction: 1,
    cliente_tipo_de_documento: TIPO_DOCUMENTO[data.cliente.tipo_documento] ?? 0,
    cliente_numero_de_documento: data.cliente.nro_documento,
    cliente_denominacion: data.cliente.nombre,
    cliente_direccion: '',
    cliente_email: '',
    fecha_de_emision: formatFecha(data.fecha_emision),
    moneda: 1,
    porcentaje_de_igv: 18.0,
    total_descuento: data.totales.descuento,
    total_gravada: data.totales.subtotal,
    total_inafecta: 0,
    total_exonerada: 0,
    total_igv: data.totales.igv,
    total_gratuita: 0,
    total: data.totales.total,
    enviar_automaticamente_a_la_sunat: true,
    enviar_automaticamente_al_cliente: false,
    items: data.items.map((item) => ({
      unidad_de_medida: 'NIU',
      codigo: '',
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      valor_unitario: item.valor_unitario,
      // Nubefact valida: precio_unitario = valor_unitario × 1.18 (precio neto por unidad con IGV)
      precio_unitario: parseFloat((item.valor_unitario * 1.18).toFixed(6)),
      descuento: 0,
      subtotal: item.subtotal,
      tipo_de_igv: item.afecto_igv ? 1 : 8,
      igv: item.igv,
      total: item.total,
      anticipo_regularizacion: false,
    })),
  }
}

export class NubefactService implements FacturacionService {
  private readonly url: string
  private readonly token: string

  constructor() {
    this.url = process.env.NUBEFACT_URL ?? ''
    this.token = process.env.NUBEFACT_TOKEN ?? ''
  }

  private async post(payload: object): Promise<ComprobanteResult> {
    if (!this.url || !this.token) {
      console.error('[FACTURACION] NUBEFACT_URL o NUBEFACT_TOKEN no configurados en .env.local')
      return { exito: false, error: 'Nubefact no configurado' }
    }

    let json: Record<string, unknown>
    try {
      const res = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${this.token}`,
        },
        body: JSON.stringify(payload),
      })
      json = await res.json()

      // Nubefact no retorna "accepted" — el éxito se determina por HTTP 200 + PDF generado.
      // "aceptada_por_sunat: false" es normal para boletas (validación SUNAT es asíncrona).
      if (!res.ok || !json.enlace_del_pdf) {
        console.error('[FACTURACION] Nubefact respuesta completa:', JSON.stringify(json))
        const errors = json.errors
        let msg: string
        if (typeof errors === 'string') msg = errors
        else if (Array.isArray(errors)) msg = errors.join(', ')
        else if (errors && typeof errors === 'object') msg = JSON.stringify(errors)
        else msg = (json.sunat_description as string | undefined) ?? (json.mensajes as string | undefined) ?? 'Error desconocido'
        console.error('[FACTURACION] Nubefact rechazó el comprobante:', msg)
        return { exito: false, error: msg }
      }
    } catch (err) {
      console.error('[FACTURACION] Error de red al llamar Nubefact:', err)
      return { exito: false, error: 'Error de red' }
    }

    const sunatAceptada = json.aceptada_por_sunat === true
    console.log(`[FACTURACION] ✓ Comprobante creado: ${json.serie}-${json.numero} | SUNAT: ${sunatAceptada ? 'aceptada' : 'pendiente'}`)

    return {
      exito: true,
      sunat_aceptada: sunatAceptada,
      id_externo: `${json.serie}-${json.numero}`,
      pdf_url: json.enlace_del_pdf as string,
      xml_url: json.enlace_del_xml as string,
      hash: json.codigo_hash as string,
    }
  }

  async emitirBoleta(data: ComprobanteData): Promise<ComprobanteResult> {
    console.log(`[FACTURACION] Emitiendo boleta ${data.serie}-${data.correlativo}`)
    return this.post(buildPayload(data, 2))
  }

  async emitirFactura(data: ComprobanteData): Promise<ComprobanteResult> {
    console.log(`[FACTURACION] Emitiendo factura ${data.serie}-${data.correlativo}`)
    return this.post(buildPayload(data, 1))
  }

  async emitirNotaCredito(data: NotaCreditoData): Promise<ComprobanteResult> {
    console.log(`[FACTURACION] Emitiendo NC ${data.serie}-${data.correlativo} | motivo: ${data.motivo_codigo}`)
    const payload = {
      operacion: 'generar_comprobante',
      tipo_de_comprobante: 3,
      serie: data.serie,
      numero: data.correlativo,
      sunat_transaction: 1,
      cliente_tipo_de_documento: TIPO_DOCUMENTO[data.cliente.tipo_documento] ?? 0,
      cliente_numero_de_documento: data.cliente.nro_documento,
      cliente_denominacion: data.cliente.nombre,
      cliente_direccion: '',
      cliente_email: '',
      fecha_de_emision: formatFecha(data.fecha_emision),
      moneda: 1,
      porcentaje_de_igv: 18.0,
      total_descuento: data.totales.descuento,
      total_gravada: data.totales.subtotal,
      total_inafecta: 0,
      total_exonerada: 0,
      total_igv: data.totales.igv,
      total_gratuita: 0,
      total: data.totales.total,
      enviar_automaticamente_a_la_sunat: true,
      enviar_automaticamente_al_cliente: false,
      documento_que_se_modifica_tipo: data.documento_ref.tipo === 'boleta' ? 2 : 1,
      documento_que_se_modifica_serie: data.documento_ref.serie,
      documento_que_se_modifica_numero: data.documento_ref.correlativo,
      tipo_de_nota_de_credito: data.motivo_codigo,
      items: data.items.map((item) => ({
        unidad_de_medida: 'NIU',
        codigo: '',
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        valor_unitario: item.valor_unitario,
        precio_unitario: parseFloat((item.valor_unitario * 1.18).toFixed(6)),
        descuento: 0,
        subtotal: item.subtotal,
        tipo_de_igv: item.afecto_igv ? 1 : 8,
        igv: item.igv,
        total: item.total,
        anticipo_regularizacion: false,
      })),
    }
    return this.post(payload)
  }

  async anularComprobante(id_externo: string, motivo: string, tipo: 'boleta' | 'factura'): Promise<void> {
    if (!this.url || !this.token) {
      console.error('[FACTURACION] NUBEFACT_URL o NUBEFACT_TOKEN no configurados')
      return
    }

    // id_externo formato "BBB1-1" → serie="BBB1", numero=1
    const partes = id_externo.split('-')
    const serie = partes.slice(0, -1).join('-')
    const numero = parseInt(partes[partes.length - 1], 10)

    const hoy = new Date()
    const fecha = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`

    const payload = {
      operacion: 'generar_anulacion',
      tipo_de_comprobante: tipo === 'boleta' ? 2 : 1,
      serie,
      numero,
      fecha_de_generacion: fecha,
      motivo: motivo.toUpperCase(),
    }

    console.log(`[FACTURACION] Enviando baja a Nubefact: ${id_externo} | motivo: ${motivo}`)

    const res = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${this.token}`,
      },
      body: JSON.stringify(payload),
    })

    const json = await res.json()

    if (!res.ok || !json.accepted) {
      const msg = (json.sunat_description ?? json.errors ?? 'Error al anular') as string
      console.error('[FACTURACION] Nubefact rechazó la baja:', msg)
      throw new Error(msg)
    }

    console.log(`[FACTURACION] ✓ Baja aceptada: ${id_externo}`)
  }

  async consultarEstado(_id_externo: string): Promise<EstadoComprobante> {
    return 'pendiente'
  }
}

// Note: use getFacturacionService() from factory.ts for the singleton instance
export const nubefactServiceInstance = new NubefactService()
