import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { createSupplier, updateSupplier, type Supplier } from '../../../services/api/suppliers'

type SupplierFormValues = {
  code: string
  businessName: string
  taxId: string
  contactName: string
  phone: string
  email: string
  address: string
}

type SupplierFormModalProps = {
  open: boolean
  supplier?: Supplier | null
  onClose: () => void
}

export function SupplierFormModal({ open, supplier, onClose }: SupplierFormModalProps) {
  const queryClient = useQueryClient()
  const isEditing = Boolean(supplier)

  const { register, handleSubmit, reset, formState } = useForm<SupplierFormValues>({
    defaultValues: {
      code: '',
      businessName: '',
      taxId: '',
      contactName: '',
      phone: '',
      email: '',
      address: '',
    },
  })

  useEffect(() => {
    if (!open) return

    if (supplier) {
      reset({
        code: supplier.code,
        businessName: supplier.businessName,
        taxId: supplier.taxId ?? '',
        contactName: supplier.contactName ?? '',
        phone: supplier.phone ?? '',
        email: supplier.email ?? '',
        address: supplier.address ?? '',
      })
    } else {
      reset({
        code: `PROV-${Math.floor(1000 + Math.random() * 9000)}`,
        businessName: '',
        taxId: '',
        contactName: '',
        phone: '',
        email: '',
        address: '',
      })
    }
  }, [open, supplier, reset])

  const saveMutation = useMutation({
    mutationFn: async (values: SupplierFormValues) => {
      const payload = {
        code: values.code.trim(),
        businessName: values.businessName.trim(),
        taxId: values.taxId.trim() || null,
        contactName: values.contactName.trim() || null,
        phone: values.phone.trim() || null,
        email: values.email.trim() || null,
        address: values.address.trim() || null,
      }

      if (isEditing && supplier) {
        return updateSupplier(supplier.id, payload)
      } else {
        return createSupplier(payload)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success(isEditing ? 'Proveedor actualizado' : 'Proveedor registrado')
      onClose()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al guardar el proveedor')
    },
  })

  const onSubmit = handleSubmit((values) => {
    saveMutation.mutate(values)
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {isEditing ? 'Editar proveedor' : 'Nuevo proveedor'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="px-6 py-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Código Proveedor *
              </span>
              <input
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                {...register('code', { required: true })}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                NIT / Identificación Fiscal
              </span>
              <input
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                {...register('taxId')}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Razón Social *
              </span>
              <input
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                {...register('businessName', { required: true })}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Persona de Contacto
              </span>
              <input
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                {...register('contactName')}
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
                Dirección
              </span>
              <input
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                {...register('address')}
              />
            </label>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={formState.isSubmitting || saveMutation.isPending}
              className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {saveMutation.isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
