'use client'

import { useState } from 'react'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Producto, Categoria, UnidadMedida } from '@/types/database'
import { ProductoForm } from './producto-form'
import { deleteProducto } from '../../actions'
import { useRouter } from 'next/navigation'

interface ProductosClientProps {
  data: Producto[]
  categorias: Categoria[]
  unidades: UnidadMedida[]
}

export function ProductosClient({ data, categorias, unidades }: ProductosClientProps) {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProd, setEditingProd] = useState<Producto | null>(null)
  
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deletingProd, setDeletingProd] = useState<Producto | null>(null)
  
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const [search, setSearch] = useState('')
  const router = useRouter()

  const filteredData = data.filter(p => 
    p.nombre.toLowerCase().includes(search.toLowerCase()) || 
    (p.codigo && p.codigo.toLowerCase().includes(search.toLowerCase()))
  )

  const handleEdit = (prod: Producto) => {
    setEditingProd(prod)
    setIsFormOpen(true)
  }

  const handleDeleteClick = (prod: Producto) => {
    setDeleteError(null)
    setDeletingProd(prod)
    setIsDeleteOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingProd) return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      const result = await deleteProducto(deletingProd.id)
      if (result.error) {
        setDeleteError(result.error)
      } else {
        setIsDeleteOpen(false)
        setDeletingProd(null)
        router.refresh()
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Error desconocido')
    } finally {
      setIsDeleting(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <input 
          placeholder="Buscar productos (nombre, código)..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
        />
        <Button onClick={() => { setEditingProd(null); setIsFormOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo Producto
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400 border-b">
            <tr>
              <th className="px-6 py-3 font-medium">Código</th>
              <th className="px-6 py-3 font-medium">Nombre</th>
              <th className="px-6 py-3 font-medium">Categoría</th>
              <th className="px-6 py-3 font-medium text-right">P. Venta</th>
              <th className="px-6 py-3 font-medium text-right">Stock</th>
              <th className="px-6 py-3 font-medium">Estado</th>
              <th className="px-6 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No se encontraron productos.
                </td>
              </tr>
            ) : (
              filteredData.map((prod) => (
                <tr key={prod.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="px-6 py-4 text-gray-500">{prod.codigo || '-'}</td>
                  <td className="px-6 py-4 font-medium">{prod.nombre}</td>
                  <td className="px-6 py-4 text-gray-500">
                    {prod.categoria_id 
                      ? categorias.find(c => c.id === prod.categoria_id)?.nombre || 'Desconocido'
                      : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">{formatCurrency(prod.precio_minorista)}</td>
                  <td className="px-6 py-4 text-right">
                    {prod.stock_actual}
                    <span className="text-xs text-gray-400 ml-1">
                      {prod.unidad_medida_id 
                        ? unidades.find(u => u.id === prod.unidad_medida_id)?.simbolo || ''
                        : ''}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${prod.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {prod.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(prod)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteClick(prod)}>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-2xl p-6 my-8">
            <h3 className="text-lg font-semibold mb-4">
              {editingProd ? 'Editar Producto' : 'Nuevo Producto'}
            </h3>
            <ProductoForm 
              initialData={editingProd} 
              categorias={categorias}
              unidades={unidades}
              onClose={() => setIsFormOpen(false)} 
            />
          </div>
        </div>
      )}

      {isDeleteOpen && deletingProd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold mb-2">Confirmar Eliminación</h3>
            <p className="text-sm text-gray-500 mb-4">
              ¿Estás seguro de que deseas eliminar el producto "{deletingProd.nombre}"? Esta acción no se puede deshacer.
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
