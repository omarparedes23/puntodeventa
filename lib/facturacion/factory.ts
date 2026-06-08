import type { FacturacionService } from './index'

/**
 * Retorna la implementación activa según FACTURACION_PROVIDER:
 *  - "propio"   → microservicio Spring Boot en VPS
 *  - "nubefact" → Nubefact API (default)
 */
async function crearServicio(): Promise<FacturacionService> {
  const provider = process.env.FACTURACION_PROVIDER ?? 'nubefact'
  if (provider === 'propio') {
    const { PropioService } = await import('./propio')
    return new PropioService()
  }
  const { NubefactService } = await import('./nubefact')
  return new NubefactService()
}

// Singleton lazy — se crea al primer uso
let _instance: FacturacionService | null = null

async function getFacturacionService(): Promise<FacturacionService> {
  if (!_instance) {
    _instance = await crearServicio()
  }
  return _instance
}

export { getFacturacionService }

// Compatibilidad: permite seguir usando `facturacionService` como objeto
// mientras se migra. Las actions lo llaman via getFacturacionService().
export const facturacionService = {
  emitirBoleta:       (...args: Parameters<FacturacionService['emitirBoleta']>) =>
    getFacturacionService().then(s => s.emitirBoleta(...args)),
  emitirFactura:      (...args: Parameters<FacturacionService['emitirFactura']>) =>
    getFacturacionService().then(s => s.emitirFactura(...args)),
  emitirNotaCredito:  (...args: Parameters<FacturacionService['emitirNotaCredito']>) =>
    getFacturacionService().then(s => s.emitirNotaCredito(...args)),
  anularComprobante:  (...args: Parameters<FacturacionService['anularComprobante']>) =>
    getFacturacionService().then(s => s.anularComprobante(...args)),
  consultarEstado:    (...args: Parameters<FacturacionService['consultarEstado']>) =>
    getFacturacionService().then(s => s.consultarEstado(...args)),
}
