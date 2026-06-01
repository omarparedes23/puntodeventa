'use client'

import { useState, useEffect, useCallback } from 'react'
import { getClientes } from '@/app/(dashboard)/clientes/actions'
import { Database } from '@/types/database'
import { ClientesTable } from './ClientesTable'
import { ClienteModal } from './ClienteModal'

type Cliente = Database['public']['Tables']['ptovta_clientes']['Row']

export function ClientesContainer({ initialClientes = [] }: { initialClientes?: Cliente[] }) {
  const [query, setQuery] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>(initialClientes)
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)

  const fetchClientes = useCallback(async (searchQuery: string) => {
    setIsLoading(true)
    const { data, error } = await getClientes(searchQuery)
    if (!error && data) {
      setClientes(data)
    }
    setIsLoading(false)
  }, [])

  // Debounced search
  useEffect(() => {
    // Only fetch if it's not the initial empty query mount
    const timer = setTimeout(() => {
      // Small optimization: If query is empty on first load, we already have initial data
      fetchClientes(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, fetchClientes])

  const handleCreate = () => {
    setEditingCliente(null)
    setIsModalOpen(true)
  }

  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente)
    setIsModalOpen(true)
  }

  const handleSuccess = () => {
    fetchClientes(query)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <input
          type="search"
          placeholder="Buscar por nombre o documento..."
          className="w-full sm:max-w-md p-2 border rounded-md"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 whitespace-nowrap"
        >
          Nuevo Cliente
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Cargando...</div>
      ) : (
        <ClientesTable 
          clientes={clientes} 
          onEdit={handleEdit} 
          onDeleteSuccess={handleSuccess} 
        />
      )}

      <ClienteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={editingCliente ? {
          id: editingCliente.id,
          tipo_documento: editingCliente.tipo_documento ?? undefined,
          nro_documento: editingCliente.nro_documento,
          nombre: editingCliente.nombre,
          direccion: editingCliente.direccion || '',
          email: editingCliente.email || '',
          telefono: editingCliente.telefono || '',
          tipo_cliente: editingCliente.tipo_cliente,
          tiene_credito: editingCliente.tiene_credito,
          limite_credito: editingCliente.limite_credito,
          saldo_deudor: editingCliente.saldo_deudor,
          activo: editingCliente.activo,
        } : undefined}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
