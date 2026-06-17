'use client'

import { useState } from 'react'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { UnidadMedida } from '@marketpos/core'
import { UnidadForm } from './unidad-form'
import { deleteUnidadMedida } from '../../actions'
import { useRouter } from 'next/navigation'

export function UnidadesClient({ data }: { data: UnidadMedida[] }) {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingUnidad, setEditingUnidad] = useState<UnidadMedida | null>(null)
  
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deletingUnidad, setDeletingUnidad] = useState<UnidadMedida | null>(null)
  
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const [search, setSearch] = useState('')
  const router = useRouter()

  const filteredData = data.filter(u => 
    u.nombre.toLowerCase().includes(search.toLowerCase()) || 
    u.simbolo.toLowerCase().includes(search.toLowerCase())
  )

  const handleEdit = (unidad: UnidadMedida) => {
    setEditingUnidad(unidad)
    setIsFormOpen(true)
  }

  const handleDeleteClick = (unidad: UnidadMedida) => {
    setDeleteError(null)
    setDeletingUnidad(unidad)
    setIsDeleteOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingUnidad) return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      const result = await deleteUnidadMedida(deletingUnidad.id)
      if (result.error) {
        setDeleteError(result.error)
      } else {
        setIsDeleteOpen(false)
        setDeletingUnidad(null)
        router.refresh()
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Error desconocido')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <input 
          placeholder="Buscar unidades..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Button onClick={() => { setEditingUnidad(null); setIsFormOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" /> Nueva Unidad
        </Button>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400 border-b">
            <tr>
              <th className="px-6 py-3 font-medium">Nombre</th>
              <th className="px-6 py-3 font-medium">Símbolo</th>
              <th className="px-6 py-3 font-medium">Permite Decimal</th>
              <th className="px-6 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                  No se encontraron unidades de medida.
                </td>
              </tr>
            ) : (
              filteredData.map((unidad) => (
                <tr key={unidad.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="px-6 py-4 font-medium">{unidad.nombre}</td>
                  <td className="px-6 py-4">{unidad.simbolo}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${unidad.permite_decimal ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                      {unidad.permite_decimal ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(unidad)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteClick(unidad)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingUnidad ? 'Editar Unidad de Medida' : 'Nueva Unidad de Medida'}
            </h3>
            <UnidadForm 
              initialData={editingUnidad} 
              onClose={() => setIsFormOpen(false)} 
            />
          </div>
        </div>
      )}

      {isDeleteOpen && deletingUnidad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold mb-2">Confirmar Eliminación</h3>
            <p className="text-sm text-gray-500 mb-4">
              ¿Estás seguro de que deseas eliminar la unidad "{deletingUnidad.nombre}"? Esta acción no se puede deshacer.
            </p>
            {deleteError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                {deleteError}
              </div>
            )}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
