import { create } from 'zustand'
import Decimal from 'decimal.js'

export interface CartItem {
  producto_id: string
  nombre: string
  codigo: string | null
  afecto_igv: boolean
  permite_decimal: boolean
  precio_minorista: number
  precio_mayorista: number
  precio_unitario: number  // precio según tipoVenta (con IGV incluido)
  cantidad: number
  descuento: number        // descuento en soles sobre la línea
  line_total: number       // precio_unitario * cantidad - descuento
}

interface CartTotals {
  subtotal: number         // base imponible (sin IGV)
  igv: number
  total: number            // con IGV (lo que paga el cliente)
  descuento_total: number
}

interface CartState {
  items: CartItem[]
  tipoVenta: 'mayorista' | 'minorista'
  setTipoVenta: (tipo: 'mayorista' | 'minorista') => void
  addItem: (producto: Omit<CartItem, 'precio_unitario' | 'cantidad' | 'descuento' | 'line_total'>) => void
  updateCantidad: (producto_id: string, cantidad: number) => void
  updateDescuento: (producto_id: string, descuento: number) => void
  removeItem: (producto_id: string) => void
  clear: () => void
  getTotals: () => CartTotals
}

function calcLineTotal(precio: number, cantidad: number, descuento: number): number {
  return new Decimal(precio).times(cantidad).minus(descuento).toDecimalPlaces(2).toNumber()
}

function selectPrecio(item: Pick<CartItem, 'precio_minorista' | 'precio_mayorista'>, tipo: 'mayorista' | 'minorista'): number {
  return tipo === 'mayorista' ? item.precio_mayorista : item.precio_minorista
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  tipoVenta: 'minorista',

  setTipoVenta: (tipo) => set((state) => ({
    tipoVenta: tipo,
    items: state.items.map((item) => {
      const precio = selectPrecio(item, tipo)
      return {
        ...item,
        precio_unitario: precio,
        line_total: calcLineTotal(precio, item.cantidad, item.descuento),
      }
    }),
  })),

  addItem: (producto) => set((state) => {
    const existing = state.items.find((i) => i.producto_id === producto.producto_id)
    const precio = selectPrecio(producto, state.tipoVenta)

    if (existing) {
      return {
        items: state.items.map((i) =>
          i.producto_id === producto.producto_id
            ? { ...i, cantidad: i.cantidad + 1, line_total: calcLineTotal(i.precio_unitario, i.cantidad + 1, i.descuento) }
            : i
        ),
      }
    }

    const newItem: CartItem = {
      ...producto,
      precio_unitario: precio,
      cantidad: 1,
      descuento: 0,
      line_total: precio,
    }
    return { items: [...state.items, newItem] }
  }),

  updateCantidad: (producto_id, cantidad) => set((state) => ({
    items: state.items.map((i) =>
      i.producto_id === producto_id
        ? { ...i, cantidad, line_total: calcLineTotal(i.precio_unitario, cantidad, i.descuento) }
        : i
    ),
  })),

  updateDescuento: (producto_id, descuento) => set((state) => ({
    items: state.items.map((i) =>
      i.producto_id === producto_id
        ? { ...i, descuento, line_total: calcLineTotal(i.precio_unitario, i.cantidad, descuento) }
        : i
    ),
  })),

  removeItem: (producto_id) => set((state) => ({
    items: state.items.filter((i) => i.producto_id !== producto_id),
  })),

  clear: () => set({ items: [] }),

  getTotals: (): CartTotals => {
    const { items } = get()
    const IGV_DIVISOR = new Decimal('1.18')

    let total = new Decimal(0)
    let igv = new Decimal(0)
    let descuento_total = new Decimal(0)

    for (const item of items) {
      const lineTotal = new Decimal(item.line_total)
      total = total.plus(lineTotal)
      descuento_total = descuento_total.plus(item.descuento)
      if (item.afecto_igv) {
        const igvItem = lineTotal.minus(lineTotal.dividedBy(IGV_DIVISOR)).toDecimalPlaces(2)
        igv = igv.plus(igvItem)
      }
    }

    const subtotal = total.minus(igv).toDecimalPlaces(2)

    return {
      total: total.toDecimalPlaces(2).toNumber(),
      igv: igv.toDecimalPlaces(2).toNumber(),
      subtotal: subtotal.toNumber(),
      descuento_total: descuento_total.toDecimalPlaces(2).toNumber(),
    }
  },
}))
