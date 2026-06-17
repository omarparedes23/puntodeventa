// Re-export from @marketpos/core — this file exists to satisfy @/lib/offline/sync imports in apps/web
export {
  syncProductos,
  syncClientes,
  syncAll,
  searchProductosOffline,
  searchClientesOffline,
  saveVentaPendiente,
  procesarVentasPendientes,
  contarVentasPendientes,
} from '@marketpos/core'
