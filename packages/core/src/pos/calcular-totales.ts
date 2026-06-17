import { Decimal } from 'decimal.js'

const IGV_RATE = new Decimal('0.18')

export interface ItemInput {
  productoId: string
  cantidad: number | string
  descuento?: number | string
}

export interface ProductoInput {
  id: string
  precio_minorista: number | string
  precio_mayorista: number | string
  afecto_igv: boolean
}

export interface ItemCalculado {
  productoId: string
  cantidad: number
  precioUnitario: number
  descuento: number
  subtotal: number
  igv: number
  total: number
}

export interface TotalesVenta {
  items: ItemCalculado[]
  subtotal: number
  igv: number
  descuento: number
  total: number
}

export function calcularTotalesVenta(
  items: ItemInput[],
  productos: ProductoInput[],
  tipoVenta: 'minorista' | 'mayorista',
  igvRate?: number | string
): TotalesVenta {
  const rate = igvRate !== undefined ? new Decimal(igvRate) : IGV_RATE

  let totalVenta = new Decimal(0)
  let totalIgv = new Decimal(0)
  let totalDescuentos = new Decimal(0)

  const itemsCalculados: ItemCalculado[] = items.map((item) => {
    const producto = productos.find((p) => p.id === item.productoId)
    if (!producto) {
      throw new Error(`Producto no encontrado: ${item.productoId}`)
    }

    const precio = new Decimal(
      tipoVenta === 'mayorista' ? producto.precio_mayorista : producto.precio_minorista
    )
    const cantidad = new Decimal(item.cantidad)
    const descuento = new Decimal(item.descuento ?? '0')
    const lineTotal = precio.times(cantidad).minus(descuento).toDecimalPlaces(2)

    let igvItem = new Decimal(0)
    if (producto.afecto_igv) {
      igvItem = lineTotal
        .times(rate)
        .dividedBy(new Decimal(1).plus(rate))
        .toDecimalPlaces(2)
    }

    const subtotalItem = lineTotal.minus(igvItem).toDecimalPlaces(2)

    totalVenta = totalVenta.plus(lineTotal)
    totalIgv = totalIgv.plus(igvItem)
    totalDescuentos = totalDescuentos.plus(descuento)

    return {
      productoId: item.productoId,
      cantidad: cantidad.toNumber(),
      precioUnitario: precio.toNumber(),
      descuento: descuento.toNumber(),
      subtotal: subtotalItem.toNumber(),
      igv: igvItem.toNumber(),
      total: lineTotal.toNumber(),
    }
  })

  const totalFinal = totalVenta.toDecimalPlaces(2).toNumber()
  const igvFinal = totalIgv.toDecimalPlaces(2).toNumber()
  const subtotalFinal = totalVenta.minus(totalIgv).toDecimalPlaces(2).toNumber()
  const descuentoFinal = totalDescuentos.toDecimalPlaces(2).toNumber()

  return {
    items: itemsCalculados,
    subtotal: subtotalFinal,
    igv: igvFinal,
    descuento: descuentoFinal,
    total: totalFinal,
  }
}
