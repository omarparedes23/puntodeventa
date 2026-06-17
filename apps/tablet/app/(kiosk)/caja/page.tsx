import { getCajaActiva } from './actions'
import { AbrirCajaScreen } from './components/AbrirCajaScreen'
import { CajaScreen } from './components/CajaScreen'

export default async function CajaPage() {
  const { data: caja } = await getCajaActiva()

  if (!caja) {
    return <AbrirCajaScreen />
  }

  return <CajaScreen cajaId={caja.id} />
}
