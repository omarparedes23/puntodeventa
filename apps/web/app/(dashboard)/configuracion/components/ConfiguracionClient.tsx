'use client'

import { useState } from 'react'
import type { EmpresaConfig, UsuarioPerfil } from '../actions'
import { EmpresaForm } from './EmpresaForm'
import { NubefactForm } from './NubefactForm'
import { UsuariosPanel } from './UsuariosPanel'

const TABS = [
  { id: 'empresa', label: 'Empresa' },
  { id: 'nubefact', label: 'Nubefact / SUNAT' },
  { id: 'usuarios', label: 'Usuarios' },
] as const

type TabId = (typeof TABS)[number]['id']

export function ConfiguracionClient({
  empresa,
  usuarios,
}: {
  empresa: EmpresaConfig
  usuarios: UsuarioPerfil[]
}) {
  const [activeTab, setActiveTab] = useState<TabId>('empresa')

  return (
    <div className="space-y-5">
      <div className="flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'empresa' && <EmpresaForm empresa={empresa} />}
      {activeTab === 'nubefact' && <NubefactForm empresa={empresa} />}
      {activeTab === 'usuarios' && <UsuariosPanel usuarios={usuarios} />}
    </div>
  )
}
