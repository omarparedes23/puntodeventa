import { getCajaActiva, getMovimientos } from './actions'

export const dynamic = 'force-dynamic'
import { AbrirCajaForm } from './components/AbrirCajaForm'
import { CajaActiva } from './components/CajaActiva'

export default async function CajaPage() {
  const { data: caja } = await getCajaActiva()

  if (!caja) {
    return <AbrirCajaForm />
  }

  const { data: movimientos } = await getMovimientos(caja.id)

  return <CajaActiva caja={caja} movimientos={movimientos ?? []} />
}
