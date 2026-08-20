import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  createSaleReturn,
  listSaleReturns,
  type Sale,
  type ReturnItemInput,
} from '../../../services/api/sales'

function money(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

function invoiceNumber(saleId: string) {
  return `#${saleId.substring(0, 8).toUpperCase()}`
}

interface ReturnModalProps {
  sale: Sale
  onClose: () => void
  onSuccess?: () => void
}

export function ReturnModal({ sale, onClose, onSuccess }: ReturnModalProps) {
  const queryClient = useQueryClient()
  const [notes, setNotes] = useState('')
  // Map of sale_item_id -> quantity to return
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({})

  // Fetch any past returns for this sale
  const returnsQuery = useQuery({
    queryKey: ['sale-returns', sale.id],
    queryFn: () => listSaleReturns(sale.id),
  })

  // Calculate previously returned quantities per sale_item_id
  const previouslyReturnedMap = useMemo(() => {
    const map: Record<string, number> = {}
    if (!returnsQuery.data) return map

    for (const ret of returnsQuery.data) {
      for (const item of ret.sale_return_items) {
        map[item.sale_item_id] = (map[item.sale_item_id] || 0) + Number(item.unit_quantity)
      }
    }
    return map
  }, [returnsQuery.data])

  // Items info with available qty to return
  const itemsWithAvailability = useMemo(() => {
    return sale.sale_items.map((item) => {
      const returned = previouslyReturnedMap[item.id] || 0
      const available = Math.max(0, item.unit_quantity - returned)
      const selectedQty = returnQuantities[item.id] || 0
      const lineRefund = selectedQty * item.unit_price

      return {
        ...item,
        returned,
        available,
        selectedQty,
        lineRefund,
      }
    })
  }, [sale.sale_items, previouslyReturnedMap, returnQuantities])

  const totalRefund = useMemo(() => {
    return itemsWithAvailability.reduce((sum, item) => sum + item.lineRefund, 0)
  }, [itemsWithAvailability])

  const totalItemsToReturn = useMemo(() => {
    return itemsWithAvailability.reduce((sum, item) => sum + item.selectedQty, 0)
  }, [itemsWithAvailability])

  const handleQtyChange = (itemId: string, maxAvailable: number, rawValue: string) => {
    const parsed = parseInt(rawValue, 10)
    if (isNaN(parsed) || parsed <= 0) {
      setReturnQuantities((prev) => {
        const next = { ...prev }
        delete next[itemId]
        return next
      })
      return
    }

    const clamped = Math.min(parsed, maxAvailable)
    setReturnQuantities((prev) => ({
      ...prev,
      [itemId]: clamped,
    }))
  }

  const handleReturnAll = () => {
    const next: Record<string, number> = {}
    for (const item of itemsWithAvailability) {
      if (item.available > 0) {
        next[item.id] = item.available
      }
    }
    setReturnQuantities(next)
  }

  const handleClearAll = () => {
    setReturnQuantities({})
  }

  const returnMutation = useMutation({
    mutationFn: async () => {
      const items: ReturnItemInput[] = []
      for (const [saleItemId, unitQuantity] of Object.entries(returnQuantities)) {
        if (unitQuantity > 0) {
          items.push({ saleItemId, unitQuantity })
        }
      }

      if (items.length === 0) {
        throw new Error('Debes seleccionar al menos un producto y cantidad a devolver.')
      }

      if (!notes.trim()) {
        throw new Error('La observación / motivo de la devolución es obligatoria.')
      }

      return createSaleReturn(sale.id, {
        notes: notes.trim(),
        items,
      })
    },
    onSuccess: () => {
      toast.success('Devolución procesada con éxito y stock reintegrado.')
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['cash-register-current'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      onSuccess?.()
      onClose()
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || error?.message || 'Error al procesar la devolución'
      toast.error(msg)
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>🔄</span> Devolución de Productos — Factura {invoiceNumber(sale.id)}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Cliente: {sale.customers?.full_name || 'Venta de mostrador'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {returnsQuery.isLoading ? (
            <div className="py-6 text-center text-sm text-slate-400">Consultando historial de la venta…</div>
          ) : null}

          {/* Quick buttons */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Selecciona los productos a devolver
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleReturnAll}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline"
              >
                Devolver todo lo disponible
              </button>
              {totalItemsToReturn > 0 && (
                <>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:underline"
                  >
                    Limpiar
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
                <tr>
                  <th className="px-3.5 py-2.5">Producto</th>
                  <th className="px-2 py-2.5 text-center">Vendidos</th>
                  <th className="px-2 py-2.5 text-center">Devueltos</th>
                  <th className="px-2 py-2.5 text-center">Disponible</th>
                  <th className="px-3 py-2.5 text-center w-28">Cant. a Devolver</th>
                  <th className="px-3 py-2.5 text-right">Reembolso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {itemsWithAvailability.map((item) => {
                  const isFullyReturned = item.available === 0
                  return (
                    <tr
                      key={item.id}
                      className={
                        isFullyReturned
                          ? 'bg-slate-50/50 opacity-60 dark:bg-slate-800/30'
                          : item.selectedQty > 0
                          ? 'bg-blue-50/40 dark:bg-blue-900/10'
                          : ''
                      }
                    >
                      <td className="px-3.5 py-3">
                        <p className="font-medium text-slate-900 dark:text-white">
                          {item.products.name}
                        </p>
                        {item.unit_label !== 'Unidad' && (
                          <span className="inline-block mt-0.5 rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                            {item.unit_label}
                          </span>
                        )}
                        <p className="text-xs text-slate-400">
                          {money(item.unit_price)} c/u
                        </p>
                      </td>
                      <td className="px-2 py-3 text-center text-slate-600 dark:text-slate-300 font-medium">
                        {item.unit_quantity}
                      </td>
                      <td className="px-2 py-3 text-center text-amber-600 dark:text-amber-400 font-medium">
                        {item.returned}
                      </td>
                      <td className="px-2 py-3 text-center text-slate-700 dark:text-slate-200 font-semibold">
                        {item.available}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {isFullyReturned ? (
                          <span className="text-xs text-slate-400 italic">Devuelto</span>
                        ) : (
                          <input
                            type="number"
                            min={0}
                            max={item.available}
                            value={returnQuantities[item.id] || ''}
                            placeholder="0"
                            onChange={(e) => handleQtyChange(item.id, item.available, e.target.value)}
                            className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center text-sm font-semibold text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-slate-900 dark:text-white">
                        {money(item.lineRefund)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Refund summary banner */}
          <div className="flex items-center justify-between rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Total a reintegrar al cliente en efectivo:
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {totalItemsToReturn} {totalItemsToReturn === 1 ? 'producto seleccionado' : 'productos seleccionados'}
              </p>
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {money(totalRefund)}
            </p>
          </div>

          {/* Observation / Note */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Observación / Motivo de la devolución <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Producto en mal estado, vencimiento cercano, cambio de opinión del cliente, etc."
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Information callout */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 text-xs text-blue-800 dark:border-blue-900/50 dark:bg-blue-900/10 dark:text-blue-300">
            <div className="flex items-start gap-2">
              <span className="text-sm">ℹ️</span>
              <p>
                Al confirmar la devolución, las unidades seleccionadas se <strong>sumarán automáticamente al inventario</strong>, se registrará el movimiento de stock correspondiente y el dinero se descontará del turno de caja actual.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={returnMutation.isPending}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => returnMutation.mutate()}
            disabled={totalItemsToReturn === 0 || !notes.trim() || returnMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {returnMutation.isPending ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Procesando…
              </>
            ) : (
              <>
                <span>🔄</span> Confirmar Devolución ({money(totalRefund)})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
