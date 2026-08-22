import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  createStore,
  updateStore,
  type StoreRecord,
  type CreateStoreInput,
} from '../../../services/api/stores'

type Props = {
  open: boolean
  store: StoreRecord | null
  onClose: () => void
}

export function StoreFormModal({ open, store, onClose }: Props) {
  const queryClient = useQueryClient()
  const isEditing = Boolean(store)

  const [form, setForm] = useState({
    name: '',
    nit: '',
    address: '',
    phone: '',
    email: '',
    type: 'PHARMACY' as 'PHARMACY' | 'STORE',
    isActive: true,
    hasReservations: false,
    subscriptionStatus: 'TRIAL' as 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'SUSPENDED',
    trialDays: 15,
  })

  useEffect(() => {
    if (store) {
      setForm({
        name: store.name,
        nit: store.nit || '',
        address: store.address || '',
        phone: store.phone || '',
        email: store.email || '',
        type: store.type || 'PHARMACY',
        isActive: store.isActive,
        hasReservations: Boolean(store.hasReservations),
        subscriptionStatus: store.subscriptionStatus || 'TRIAL',
        trialDays: (store.daysRemaining !== null && store.daysRemaining !== undefined) ? store.daysRemaining : (store.trialDays || 15),
      })
    } else {
      setForm({
        name: '',
        nit: '',
        address: '',
        phone: '',
        email: '',
        type: 'PHARMACY',
        isActive: true,
        hasReservations: false,
        subscriptionStatus: 'TRIAL',
        trialDays: 15,
      })
    }
  }, [store, open])

  const createMutation = useMutation({
    mutationFn: (input: CreateStoreInput) => createStore(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] })
      toast.success('Establecimiento creado correctamente')
      onClose()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Error al crear el establecimiento')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (input: Partial<CreateStoreInput> & { isActive?: boolean }) =>
      updateStore(store!.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] })
      toast.success('Establecimiento actualizado correctamente')
      onClose()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Error al actualizar el establecimiento')
    },
  })

  const isLoading = createMutation.isPending || updateMutation.isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.name.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }

    const payload: CreateStoreInput & { isActive?: boolean } = {
      name: form.name,
      nit: form.nit || null,
      address: form.address || null,
      phone: form.phone || null,
      email: form.email || null,
      type: form.type,
      hasReservations: form.hasReservations,
      subscriptionStatus: form.subscriptionStatus,
      trialDays: Number(form.trialDays) || 15,
    }

    if (isEditing) {
      payload.isActive = form.isActive
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-2 sm:p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[92vh] sm:max-h-[88vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4 dark:border-slate-700">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
              {isEditing ? 'Editar establecimiento' : 'Nuevo establecimiento'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {isEditing ? 'Modifica los datos del establecimiento.' : 'Completa los datos para registrar un nuevo establecimiento.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden min-h-0">
          <div className="flex-1 overflow-y-auto space-y-4 px-4 py-4 sm:px-6 sm:py-5">
            {/* Nombre */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Nombre del Establecimiento <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Ej: Mi Negocio"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
              />
            </div>

            {/* Tipo de establecimiento */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Tipo de Establecimiento <span className="text-red-500">*</span>
              </label>
              <select
                value={form.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                <option value="PHARMACY">💊 Droguería / Farmacia</option>
                <option value="STORE">🏪 Tienda General / Comercio</option>
              </select>
            </div>

            {/* NIT y Teléfono */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  NIT / Identificación
                </label>
                <input
                  type="text"
                  value={form.nit}
                  onChange={(e) => handleChange('nit', e.target.value)}
                  placeholder="900.000.000-1"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="3001234567"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                />
              </div>
            </div>

            {/* Dirección y Email */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Dirección
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Calle 123 # 45 - 67"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="contacto@negocio.com"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
              />
            </div>

            {/* Suscripción y Período de Prueba */}
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3.5 dark:border-blue-900/50 dark:bg-blue-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                  Plan y Acceso
                </span>
                {store?.trialEndsAt && store.subscriptionStatus === 'TRIAL' && (
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Vence: {new Date(store.trialEndsAt).toLocaleDateString('es-CO')}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Estado de Suscripción
                  </label>
                  <select
                    value={form.subscriptionStatus}
                    onChange={(e) => handleChange('subscriptionStatus', e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="TRIAL">⏳ Período de Prueba (Trial)</option>
                    <option value="ACTIVE">💎 Activo Permanente / Pagado</option>
                    <option value="EXPIRED">🔴 Prueba Vencida (Solo Lectura)</option>
                    <option value="SUSPENDED">⏸️ Suspendido</option>
                  </select>
                </div>

                {form.subscriptionStatus === 'TRIAL' && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Días de prueba {isEditing ? '(Configurar días)' : 'a otorgar'}
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={form.trialDays}
                        onChange={(e) => handleChange('trialDays', e.target.value)}
                        placeholder="15"
                        className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                      />
                      <span className="text-xs text-slate-500 dark:text-slate-400">días</span>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {form.subscriptionStatus === 'TRIAL'
                  ? 'Al finalizar los días de prueba, el establecimiento entrará en modo solo lectura (no podrá registrar ventas ni compras).'
                  : form.subscriptionStatus === 'ACTIVE'
                  ? 'Acceso operativo total sin restricción de días de prueba.'
                  : 'El establecimiento está bloqueado para nuevas ventas y compras.'}
              </p>
            </div>

            {/* Módulo de Canchas y Reservas */}
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3.5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  id="hasReservations"
                  checked={form.hasReservations}
                  onChange={(e) => handleChange('hasReservations', e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="text-sm font-semibold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                    <span>⚽</span> Activar Módulo de Canchas Sintéticas / Reservas
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Habilita la agenda de reservas de canchas, control de abonos/anticipos en caja y la liquidación del saldo en el punto de venta (POS).
                  </p>
                </div>
              </label>
            </div>

            {isEditing && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) => handleChange('isActive', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Establecimiento Activo (Habilitar inicio de sesión)
                </label>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex shrink-0 flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 border-t border-slate-200 px-4 py-3 sm:px-6 sm:py-4 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="w-full sm:w-auto rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 text-center"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60 text-center"
            >
              {isLoading ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear establecimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
