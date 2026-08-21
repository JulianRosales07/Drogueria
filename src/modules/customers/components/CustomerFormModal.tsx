import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { createCustomer, updateCustomer, type Customer } from '../../../services/api/customers'

type CustomerFormValues = {
  code: string
  fullName: string
  document: string
  phone: string
  email: string
  address: string
  notes: string
}

type CustomerFormModalProps = {
  open: boolean
  customer?: Customer | null
  onClose: () => void
}

export function CustomerFormModal({ open, customer, onClose }: CustomerFormModalProps) {
  const queryClient = useQueryClient()
  const isEditing = Boolean(customer)

  const { register, handleSubmit, reset, formState } = useForm<CustomerFormValues>({
    defaultValues: {
      code: '',
      fullName: '',
      document: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
    },
  })

  useEffect(() => {
    if (!open) return

    if (customer) {
      reset({
        code: customer.code,
        fullName: customer.fullName,
        document: customer.document ?? '',
        phone: customer.phone ?? '',
        email: customer.email ?? '',
        address: customer.address ?? '',
        notes: customer.notes ?? '',
      })
    } else {
      reset({
        code: `CLI-${Math.floor(1000 + Math.random() * 9000)}`,
        fullName: '',
        document: '',
        phone: '',
        email: '',
        address: '',
        notes: '',
      })
    }
  }, [open, customer, reset])

  const saveMutation = useMutation({
    mutationFn: async (values: CustomerFormValues) => {
      const payload = {
        code: values.code.trim(),
        fullName: values.fullName.trim(),
        document: values.document.trim() || null,
        phone: values.phone.trim() || null,
        email: values.email.trim() || null,
        address: values.address.trim() || null,
        notes: values.notes.trim() || null,
      }

      if (isEditing && customer) {
        return updateCustomer(customer.id, payload)
      } else {
        return createCustomer(payload)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success(isEditing ? 'Cliente actualizado' : 'Cliente registrado')
      onClose()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al guardar el cliente')
    },
  })

  const onSubmit = handleSubmit((values) => {
    saveMutation.mutate(values)
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-2 sm:p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[92vh] sm:max-h-[88vh] flex flex-col rounded-2xl bg-white shadow-2xl dark:bg-slate-900 overflow-hidden">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4 dark:border-slate-800">
          <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
            {isEditing ? 'Editar cliente' : 'Nuevo cliente'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-1 flex-col overflow-hidden min-h-0">
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 space-y-4">
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Código del cliente *
                </span>
                <input
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  {...register('code', { required: true })}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Documento / Cédula
                </span>
                <input
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  {...register('document')}
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Nombre completo *
                </span>
                <input
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  {...register('fullName', { required: true })}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Teléfono
                </span>
                <input
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  {...register('phone')}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Correo electrónico
                </span>
                <input
                  type="email"
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  {...register('email')}
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Dirección / Ciudad
                </span>
                <input
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  {...register('address')}
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Notas
                </span>
                <textarea
                  rows={2}
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  {...register('notes')}
                />
              </label>
            </div>
          </div>

          <div className="flex shrink-0 flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 border-t border-slate-200 px-4 py-3 sm:px-6 sm:py-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 text-center"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={formState.isSubmitting || saveMutation.isPending}
              className="w-full sm:w-auto rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60 text-center"
            >
              {saveMutation.isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
