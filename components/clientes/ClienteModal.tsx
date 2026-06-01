'use client'

import { ClienteForm } from './ClienteForm'
import { ClienteInput } from '@/lib/validations/clientes'

interface ClienteModalProps {
  isOpen: boolean
  onClose: () => void
  initialData?: ClienteInput & { id?: string }
  onSuccess?: () => void
}

export function ClienteModal({ isOpen, onClose, initialData, onSuccess }: ClienteModalProps) {
  if (!isOpen) return null

  const handleSuccess = () => {
    onSuccess?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">
            {initialData ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">
            &times;
          </button>
        </div>
        <ClienteForm 
          initialData={initialData} 
          onSuccess={handleSuccess} 
          onCancel={onClose} 
        />
      </div>
    </div>
  )
}
