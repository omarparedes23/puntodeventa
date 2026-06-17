'use client'

import { useState } from 'react'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Categoria } from '@marketpos/core'
import { CategoriaForm } from './categoria-form'
import { deleteCategoria } from '../../actions'
import { useRouter } from 'next/navigation'

export function CategoriasClient({ data }: { data: Categoria[] }) {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<Categoria | null>(null)
  
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deletingCat, setDeletingCat] = useState<Categoria | null>(null)
  
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const [search, setSearch] = useState('')
  const router = useRouter()

  const filteredData = data.filter(c => 
    c.nombre.toLowerCase().includes(search.toLowerCase())
  )

  const handleEdit = (cat: Categoria) => {
    setEditingCat(cat)
    setIsFormOpen(true)
  }

  const handleDeleteClick = (cat: Categoria) => {
    setDeleteError(null)
    setDeletingCat(cat)
    setIsDeleteOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingCat) return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      const result = await deleteCategoria(deletingCat.id)
      if (result.error) {
        setDeleteError(result.error)
      } else {
        setIsDeleteOpen(false)
        setDeletingCat(null)
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
          placeholder="Buscar categorías..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Button onClick={() => { setEditingCat(null); setIsFormOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" /> Nueva Categoría
        </Button>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400 border-b">
            <tr>
              <th className="px-6 py-3 font-medium">Nombre</th>
              <th className="px-6 py-3 font-medium">Categoría Padre</th>
              <th className="px-6 py-3 font-medium">Estado</th>
              <th className="px-6 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                  No se encontraron categorías.
                </td>
              </tr>
            ) : (
              filteredData.map((cat) => (
                <tr key={cat.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="px-6 py-4 font-medium">{cat.nombre}</td>
                  <td className="px-6 py-4 text-gray-500">
                    {cat.parent_id 
                      ? data.find(c => c.id === cat.parent_id)?.nombre || 'Desconocido'
                      : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${cat.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {cat.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(cat)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteClick(cat)}>
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
              {editingCat ? 'Editar Categoría' : 'Nueva Categoría'}
            </h3>
            <CategoriaForm 
              initialData={editingCat} 
              allCategories={data.filter(c => c.id !== editingCat?.id)} // Prevent circular parent
              onClose={() => setIsFormOpen(false)} 
            />
          </div>
        </div>
      )}

      {isDeleteOpen && deletingCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold mb-2">Confirmar Eliminación</h3>
            <p className="text-sm text-gray-500 mb-4">
              ¿Estás seguro de que deseas eliminar la categoría "{deletingCat.nombre}"? Esta acción no se puede deshacer.
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
