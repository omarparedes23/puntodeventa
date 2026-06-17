'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSessionStore } from '@marketpos/core'
import { createClient } from '@marketpos/core'
import { Database } from '@marketpos/core'
import { ClientesTable } from './ClientesTable'
import { ClienteModal } from './ClienteModal'

type Cliente = Database['public']['Tables']['ptovta_clientes']['Row']

const supabase = createClient()

export function ClientesContainer({ initialClientes = [] }: { initialClientes?: Cliente[] }) {
  const [query, setQuery] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>(initialClientes)
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const empresaId = useSessionStore((s) => s.empresa?.id)

  const fetchClientes = useCallback(async (searchQuery: string) => {
    if (!empresaId) return
    setIsLoading(true)
    let q = supabase
      .from('ptovta_clientes')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nombre')
      .limit(100)

    if (searchQuery) {
      q = q.or(`nombre.ilike.%${searchQuery}%,nro_documento.ilike.%${searchQuery}%`)
    }

    const { data } = await q
    if (data) setClientes(data as Cliente[])
    setIsLoading(false)
  }, [empresaId])

  // Búsqueda debounced — solo cuando el usuario escribe, no en el mount inicial
  useEffect(() => {
    if (!query) {
      setClientes(initialClientes)
      return
    }
    const timer = setTimeout(() => fetchClientes(query), 300)
    return () => clearTimeout(timer)
  }, [query, fetchClientes, initialClientes])

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
