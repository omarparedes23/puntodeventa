'use client'

import { Database } from '@marketpos/core'
import { useSessionStore } from '@marketpos/core'
import { useTransition } from 'react'
import { deleteCliente } from '@/app/(dashboard)/clientes/actions'

type Cliente = Database['public']['Tables']['ptovta_clientes']['Row']

interface ClientesTableProps {
  clientes: Cliente[]
  onEdit: (cliente: Cliente) => void
  onDeleteSuccess: () => void
}

export function ClientesTable({ clientes, onEdit, onDeleteSuccess }: ClientesTableProps) {
  const { perfil } = useSessionStore()
  const [isPending, startTransition] = useTransition()
  
  const canModify = perfil?.rol === 'administrador'

  const handleDelete = (id: string) => {
    if (!confirm('¿Seguro que desea eliminar este cliente?')) return

    startTransition(async () => {
      const res = await deleteCliente(id)
      if (!res.error) {
        onDeleteSuccess()
      } else {
        alert(res.error)
      }
    })
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left border rounded-lg overflow-hidden">
        <thead className="bg-gray-50 text-gray-700">
          <tr>
            <th className="px-4 py-3">Documento</th>
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Teléfono</th>
            <th className="px-4 py-3">Tipo</th>
            {canModify && <th className="px-4 py-3 text-right">Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {clientes.length === 0 ? (
            <tr>
              <td colSpan={canModify ? 5 : 4} className="px-4 py-8 text-center text-gray-500">
                No se encontraron clientes.
              </td>
            </tr>
          ) : (
            clientes.map((cliente) => (
              <tr key={cliente.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="text-xs text-gray-500 block">{cliente.tipo_documento}</span>
                  {cliente.nro_documento}
                </td>
                <td className="px-4 py-3 font-medium">{cliente.nombre}</td>
                <td className="px-4 py-3">{cliente.telefono || '-'}</td>
                <td className="px-4 py-3 capitalize">{cliente.tipo_cliente}</td>
                {canModify && (
                  <td className="px-4 py-3 text-right space-x-2">
                    <button 
                      onClick={() => onEdit(cliente)}
                      className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                      disabled={isPending}
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => handleDelete(cliente.id)}
                      className="text-red-600 hover:text-red-800 disabled:opacity-50"
                      disabled={isPending}
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
  )
}
