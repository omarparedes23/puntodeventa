'use client'

import { useState, useTransition } from 'react'
import { useSessionStore } from '@/stores/sessionStore'
import { updatePerfil, type UsuarioPerfil } from '../actions'

const ROL_LABEL: Record<string, string> = {
  administrador: 'Administrador',
  vendedor: 'Vendedor',
  lectura: 'Solo lectura',
}

function UsuarioRow({ usuario, currentUserId }: { usuario: UsuarioPerfil; currentUserId: string }) {
  const isSelf = usuario.id === currentUserId
  const [rol, setRol] = useState(usuario.rol)
  const [activo, setActivo] = useState(usuario.activo)
  const [savedRol, setSavedRol] = useState(usuario.rol)
  const [savedActivo, setSavedActivo] = useState(usuario.activo)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const isDirty = rol !== savedRol || activo !== savedActivo

  function handleSave() {
    setError(null)
    setSaved(false)
    const updates: { rol?: typeof rol; activo?: boolean } = {}
    if (rol !== savedRol) updates.rol = rol
    if (activo !== savedActivo) updates.activo = activo

    startTransition(async () => {
      const res = await updatePerfil(usuario.id, updates)
      if (res.error) {
        setError(res.error)
        setRol(savedRol)
        setActivo(savedActivo)
        return
      }
      setSavedRol(rol)
      setSavedActivo(activo)
      setSaved(true)
    })
  }

  return (
    <tr className={`border-b last:border-0 ${!activo ? 'opacity-60' : ''}`}>
      <td className="px-4 py-3">
        <p className="text-sm font-medium">{usuario.nombre}</p>
        {isSelf && <p className="text-xs text-blue-600">Tú</p>}
      </td>
      <td className="px-4 py-3">
        {isSelf ? (
          <span className="text-sm text-gray-600">{ROL_LABEL[rol]}</span>
        ) : (
          <select
            value={rol}
            onChange={(e) => { setRol(e.target.value as typeof rol); setSaved(false) }}
            disabled={isPending}
            className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="administrador">Administrador</option>
            <option value="vendedor">Vendedor</option>
            <option value="lectura">Solo lectura</option>
          </select>
        )}
      </td>
      <td className="px-4 py-3">
        {isSelf ? (
          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
            Activo
          </span>
        ) : (
          <button
            onClick={() => { setActivo(!activo); setSaved(false) }}
            disabled={isPending}
            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium transition disabled:opacity-50 ${
              activo ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {activo ? 'Activo' : 'Inactivo'}
          </button>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          {error && <span className="text-xs text-red-500">{error}</span>}
          {saved && !isDirty && <span className="text-xs text-green-600">Guardado</span>}
          {!isSelf && isDirty && (
            <button
              onClick={handleSave}
              disabled={isPending}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
            >
              {isPending ? '...' : 'Guardar'}
            </button>
          )}
          {!isSelf && !isDirty && (
            <button
              onClick={handleSave}
              disabled
              className="px-3 py-1.5 text-xs text-gray-300 cursor-default"
            >
              Sin cambios
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

export function UsuariosPanel({ usuarios }: { usuarios: UsuarioPerfil[] }) {
  const currentUserId = useSessionStore((s) => s.perfil?.id ?? '')

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Usuarios del sistema</h2>
        <span className="text-xs text-gray-400">{usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''}</span>
      </div>

      {usuarios.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm">No hay usuarios registrados.</div>
      ) : (
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Nombre</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Rol</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Estado</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <UsuarioRow key={u.id} usuario={u} currentUserId={currentUserId} />
            ))}
          </tbody>
        </table>
      )}

      <div className="px-4 py-3 border-t bg-gray-50">
        <p className="text-xs text-gray-400">
          Para agregar nuevos usuarios, comparte el enlace de registro de tu empresa. El nuevo usuario debe registrarse con su email y luego asignarle un rol aquí.
        </p>
      </div>
    </div>
  )
}
