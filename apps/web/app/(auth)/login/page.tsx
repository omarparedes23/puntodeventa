'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@marketpos/core'
import { loginSchema, recoverySchema, type LoginInput, type RecoveryInput } from '@marketpos/core'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'recovery'>('login')
  const [serverError, setServerError] = useState<string | null>(null)
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null)

  const loginForm = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })
  const recoveryForm = useForm<RecoveryInput>({ resolver: zodResolver(recoverySchema) })

  async function onLogin(data: LoginInput) {
    setServerError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      setServerError('Email o contraseña incorrectos')
      return
    }

    router.refresh()
  }

  async function onRecovery(data: RecoveryInput) {
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    })
    // Mensaje genérico — no revelar si el email existe
    setRecoveryMessage('Si el email existe, recibirás un enlace en breve.')
  }

  if (mode === 'recovery') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-sm p-8 bg-white rounded-xl shadow-sm">
          <h1 className="text-xl font-semibold mb-6">Recuperar acceso</h1>

          {recoveryMessage ? (
            <p className="text-sm text-green-600">{recoveryMessage}</p>
          ) : (
            <form onSubmit={recoveryForm.handleSubmit(onRecovery)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  {...recoveryForm.register('email')}
                  type="email"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="tu@email.com"
                />
                {recoveryForm.formState.errors.email && (
                  <p className="text-xs text-red-500 mt-1">
                    {recoveryForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium"
              >
                Enviar enlace
              </button>
            </form>
          )}

          <button
            onClick={() => setMode('login')}
            className="mt-4 text-sm text-gray-500 hover:text-gray-700"
          >
            ← Volver al login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm p-8 bg-white rounded-xl shadow-sm">
        <h1 className="text-xl font-semibold mb-2">MarketPos</h1>
        <p className="text-sm text-gray-500 mb-6">Ingresa a tu cuenta</p>

        <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              {...loginForm.register('email')}
              type="email"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="tu@email.com"
            />
            {loginForm.formState.errors.email && (
              <p className="text-xs text-red-500 mt-1">
                {loginForm.formState.errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Contraseña</label>
            <input
              {...loginForm.register('password')}
              type="password"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="••••••••"
            />
            {loginForm.formState.errors.password && (
              <p className="text-xs text-red-500 mt-1">
                {loginForm.formState.errors.password.message}
              </p>
            )}
          </div>

          {serverError && (
            <p className="text-sm text-red-500">{serverError}</p>
          )}

          <button
            type="submit"
            disabled={loginForm.formState.isSubmitting}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {loginForm.formState.isSubmitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <button
          onClick={() => setMode('recovery')}
          className="mt-4 text-sm text-gray-500 hover:text-gray-700 w-full text-center"
        >
          Olvidé mi contraseña
        </button>
      </div>
    </div>
  )
}
