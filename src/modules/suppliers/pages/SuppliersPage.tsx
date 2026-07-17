import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '../../../components/ui/SectionCard'
import { listSuppliers, type Supplier } from '../../../services/api/suppliers'
import { SupplierFormModal } from '../components/SupplierFormModal'

export function SuppliersPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)

  const suppliersQuery = useQuery({
    queryKey: ['suppliers'],
    queryFn: listSuppliers,
  })

  const suppliers = suppliersQuery.data ?? []

  const handleOpenCreate = () => {
    setEditingSupplier(null)
    setModalOpen(true)
  }

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Proveedores"
        description="Gestión fiscal, datos de contacto y facturación de proveedores."
        action={
          <button
            type="button"
            onClick={handleOpenCreate}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            + Nuevo proveedor
          </button>
        }
      >
        {suppliersQuery.isLoading ? (
          <div className="py-10 text-center text-sm text-slate-400">Cargando proveedores...</div>
        ) : suppliersQuery.isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600 dark:border-red-800 dark:bg-red-500/10 dark:text-red-400">
            Error al cargar proveedores
          </div>
        ) : (
          <>
            <div className="grid gap-4 xl:grid-cols-3">
              {suppliers.map((supplier) => (
                <article
                  key={supplier.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-800/60 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{supplier.code}</p>
                        <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                          {supplier.businessName}
                        </h3>
                      </div>
                      {supplier.taxId && (
                        <span className="rounded-md bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-600 dark:text-slate-300">
                          {supplier.taxId}
                        </span>
                      )}
                    </div>

                    <dl className="mt-6 space-y-2 text-sm">
                      {supplier.contactName && (
                        <div className="flex items-center justify-between">
                          <dt className="text-slate-500 dark:text-slate-400 font-medium">Contacto</dt>
                          <dd className="text-slate-900 dark:text-white">{supplier.contactName}</dd>
                        </div>
                      )}
                      {supplier.phone && (
                        <div className="flex items-center justify-between">
                          <dt className="text-slate-500 dark:text-slate-400 font-medium">Teléfono</dt>
                          <dd className="text-slate-900 dark:text-white">{supplier.phone}</dd>
                        </div>
                      )}
                      {supplier.email && (
                        <div className="flex items-center justify-between">
                          <dt className="text-slate-500 dark:text-slate-400 font-medium">Correo</dt>
                          <dd className="text-slate-900 dark:text-white truncate max-w-[180px]">{supplier.email}</dd>
                        </div>
                      )}
                      {supplier.address && (
                        <div className="flex flex-col mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                          <span className="text-xs text-slate-400">Dirección</span>
                          <span className="text-slate-700 dark:text-slate-300 truncate">{supplier.address}</span>
                        </div>
                      )}
                    </dl>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                    <button
                      onClick={() => handleEdit(supplier)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      Editar Proveedor
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {suppliers.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-300 py-10 text-center text-sm text-slate-400 dark:border-slate-700">
                No hay proveedores registrados. Registra uno nuevo para comenzar.
              </div>
            )}
          </>
        )}
      </SectionCard>

      <SupplierFormModal open={modalOpen} supplier={editingSupplier} onClose={() => setModalOpen(false)} />
    </div>
  )
}
