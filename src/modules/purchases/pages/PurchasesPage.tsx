import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '../../../components/ui/SectionCard'
import { listPurchases } from '../../../services/api/purchases'
import { PurchaseFormModal } from '../components/PurchaseFormModal'

function money(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function PurchasesPage() {
  const [modalOpen, setModalOpen] = useState(false)

  const purchasesQuery = useQuery({
    queryKey: ['purchases'],
    queryFn: listPurchases,
  })

  const purchases = purchasesQuery.data ?? []

  return (
    <div className="space-y-6">
      <SectionCard
        title="Compras e Inventario"
        description="Historial de órdenes de compra y facturas de mercancía entrante."
        action={
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            + Nueva compra (Entrada)
          </button>
        }
      >
        {purchasesQuery.isLoading ? (
          <div className="py-10 text-center text-sm text-slate-400">Cargando compras...</div>
        ) : purchasesQuery.isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600 dark:border-red-800 dark:bg-red-500/10 dark:text-red-400">
            Error al cargar historial de compras
          </div>
        ) : (
          <>
            <div className="grid gap-4">
              {purchases.map((purchase) => (
                <article
                  key={purchase.id}
                  className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-800/60 md:grid-cols-[1fr_1fr_1fr_auto]"
                >
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase">Número Factura / ID</p>
                    <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                      {purchase.invoice_number || 'S/N'}
                    </p>
                    <p className="text-[10px] text-slate-500">{purchase.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase">Proveedor</p>
                    <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                      {purchase.suppliers?.business_name || 'Desconocido'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase">Fecha Registro</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {formatDate(purchase.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-col items-start md:items-end justify-between">
                    <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 uppercase">
                      {purchase.status}
                    </span>
                    <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                      {money(purchase.total)}
                    </p>
                  </div>

                  {purchase.notes && (
                    <div className="col-span-full border-t border-slate-200 dark:border-slate-700 pt-2 mt-1">
                      <p className="text-[11px] text-slate-400 font-medium">Notas:</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{purchase.notes}</p>
                    </div>
                  )}

                  {purchase.purchase_items && purchase.purchase_items.length > 0 && (
                    <div className="col-span-full bg-slate-100/50 dark:bg-slate-900/30 rounded p-3 mt-1 space-y-1">
                      <p className="text-[10px] text-slate-400 font-semibold uppercase mb-1">Ítems Recibidos:</p>
                      {purchase.purchase_items.map((item) => (
                        <div key={item.id} className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                          <span>
                            📦 {item.products?.name} ({item.unit_label})
                          </span>
                          <span className="font-semibold">
                            {item.quantity} x {money(item.unit_cost)} = {money(item.line_total)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ))}

              {purchases.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-300 py-10 text-center text-sm text-slate-400 dark:border-slate-700">
                  No hay compras registradas en el sistema.
                </div>
              )}
            </div>
          </>
        )}
      </SectionCard>

      <PurchaseFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
