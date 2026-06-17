'use client'

import { Proveedor } from '@marketpos/core'
import { useSessionStore } from '@marketpos/core'

interface Props {
  proveedores: Proveedor[]
  onEdit: (proveedor: Proveedor) => void
  onDelete: (id: string) => void
}

export function ProveedoresTable({ proveedores, onEdit, onDelete }: Props) {
  const { perfil } = useSessionStore()
  const isAdmin = perfil?.rol === 'administrador'

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3">RUC</th>
              <th className="px-4 py-3">Razón Social</th>
              <th className="px-4 py-3">Contacto</th>
              <th className="px-4 py-3">Teléfono</th>
              <th className="px-4 py-3">Estado</th>
              {isAdmin && <th className="px-4 py-3 text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {proveedores.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="px-4 py-8 text-center text-gray-500">
                  No hay proveedores registrados.
                </td>
              </tr>
            ) : (
              proveedores.map((proveedor) => (
                <tr key={proveedor.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">{proveedor.ruc || '-'}</td>
                  <td className="px-4 py-3 font-medium">{proveedor.nombre}</td>
                  <td className="px-4 py-3">{proveedor.contacto || '-'}</td>
                  <td className="px-4 py-3">{proveedor.telefono || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${proveedor.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {proveedor.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => onEdit(proveedor)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('¿Estás seguro de eliminar este proveedor?')) {
                            onDelete(proveedor.id)
                          }
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        Eliminar
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
