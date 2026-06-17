import { create } from 'zustand'
import type { ClienteSearchResult } from '@/app/(kiosk)/pos/actions'

export type TipoComprobante = 'ticket' | 'boleta' | 'factura'

interface PosState {
  cajaId: string | null
  cliente: ClienteSearchResult | null
  tipoComprobante: TipoComprobante
  clienteRuc: string
  clienteRazonSocial: string
  setCajaId: (id: string | null) => void
  setCliente: (cliente: ClienteSearchResult | null) => void
  setTipoComprobante: (tipo: TipoComprobante) => void
  setClienteRuc: (ruc: string) => void
  setClienteRazonSocial: (razonSocial: string) => void
  resetPosState: () => void
}

export const usePosStore = create<PosState>((set) => ({
  cajaId: null,
  cliente: null,
  tipoComprobante: 'ticket',
  clienteRuc: '',
  clienteRazonSocial: '',
  setCajaId: (id) => set({ cajaId: id }),
  setCliente: (cliente) => set({ cliente }),
  setTipoComprobante: (tipoComprobante) => set({ tipoComprobante }),
  setClienteRuc: (clienteRuc) => set({ clienteRuc }),
  setClienteRazonSocial: (clienteRazonSocial) => set({ clienteRazonSocial }),
  resetPosState: () =>
    set({ cliente: null, tipoComprobante: 'ticket', clienteRuc: '', clienteRazonSocial: '' }),
}))
