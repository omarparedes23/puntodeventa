'use client'

import { useState } from 'react'
import { Proveedor } from '@/types/database'
import { ProveedoresTable } from './ProveedoresTable'
import { ProveedorForm } from './ProveedorForm'
import { useSessionStore } from '@/stores/sessionStore'
import { ProveedorFormValues } from '@/lib/validations/proveedores'
import { createProveedor, updateProveedor, deleteProveedor } from '@/app/actions/proveedores'

interface Props {
  initialData: Proveedor[]
}

export function ProveedoresContainer({ initialData }: Props) {
  const [proveedores, setProveedores] = useState<Proveedor[]>(initialData)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null)
  
  const { perfil } = useSessionStore()
  const isAdmin = perfil?.rol === 'administrador'

  const handleOpenCreate = () => {
    setEditingProveedor(null)
    setIsFormOpen(true)
  }

  const handleEdit = (proveedor: Proveedor) => {
    setEditingProveedor(proveedor)
    setIsFormOpen(true)
  }

  const handleCancel = () => {
    setIsFormOpen(false)
    setEditingProveedor(null)
  }

  const handleSubmit = async (data: ProveedorFormValues) => {
    if (editingProveedor) {
      const res = await updateProveedor(editingProveedor.id, data)
      if (res.error) throw new Error(res.error)
      if (res.data) {
        setProveedores((prev) => prev.map((p) => (p.id === res.data!.id ? res.data! : p)))
      }
    } else {
      const res = await createProveedor(data)
      if (res.error) throw new Error(res.error)
      if (res.data) {
        setProveedores((prev) => [...prev, res.data!].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      }
    }
    setIsFormOpen(false)
    setEditingProveedor(null)
  }

  const handleDelete = async (id: string) => {
    const res = await deleteProveedor(id)
    if (res.error) {
      alert(res.error)
      return
    }
    setProveedores((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Proveedores</h1>
        {isAdmin && !isFormOpen && (
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Nuevo Proveedor
          </button>
        )}
      </div>

      {isFormOpen ? (
        <ProveedorForm
          proveedor={editingProveedor}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      ) : (
        <ProveedoresTable
          proveedores={proveedores}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
