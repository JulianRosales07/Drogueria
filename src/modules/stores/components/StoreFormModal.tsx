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
    isActive: true,
  })

  useEffect(() => {
    if (store) {
      setForm({
        name: store.name,
        nit: store.nit || '',
        address: store.address || '',
        phone: store.phone || '',
        email: store.email || '',
        isActive: store.isActive,
      })
    } else {
      setForm({
        name: '',
        nit: '',
        address: '',
        phone: '',
        email: '',
        isActive: true,
      })
    }
  }, [store, open])

  const createMutation = useMutation({
    mutationFn: (input: CreateStoreInput) => createStore(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] })
      toast.success('Droguería creada correctamente')
      onClose()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Error al crear droguería')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (input: Partial<CreateStoreInput> & { isActive?: boolean }) =>
      updateStore(store!.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] })
      toast.success('Droguería actualizada correctamente')
      onClose()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Error al actualizar droguería')
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {isEditing ? 'Editar droguería' : 'Nueva droguería'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isEditing ? 'Modifica los datos de la droguería.' : 'Completa los datos para registrar una nueva droguería.'}
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
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {/* Nombre */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Nombre de la Droguería <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Ej: Droguería La Economía"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
            />
          </div>

          {/* NIT y Teléfono */}
          <div className="grid grid-cols-2 gap-3">
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
              placeholder="contacto@drogueria.com"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
            />
          </div>

          {isEditing && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => handleChange('isActive', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Droguería Activa (Permite accesos y operaciones)
              </label>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {isLoading ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear droguería'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
