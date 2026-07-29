import type { ClosedCashRegister } from '../../../services/api/cash-registers'

type Props = {
  open: boolean
  register: ClosedCashRegister | null
  onClose: () => void
}

function money(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Resumen que aparece al cerrar el turno: ventas, costo de los productos
 * vendidos (COGS), utilidad generada y el arqueo de efectivo.
 */
export function CloseShiftSummaryModal({ open, register, onClose }: Props) {
  if (!open || !register) return null

  const salesTotal = register.salesTotal ?? 0
  const cogs = register.cogsTotal
  const profit = register.profitTotal
  const margin = cogs !== null && salesTotal > 0 ? ((salesTotal - cogs) / salesTotal) * 100 : null
  const difference = register.difference ?? 0

  const differenceTone =
    difference === 0
      ? 'text-slate-900 dark:text-white'
      : difference > 0
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-red-600 dark:text-red-400'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl dark:bg-slate-900">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Turno cerrado · Resumen del día
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {formatDateTime(register.openedAt)} →{' '}
              {register.closedAt ? formatDateTime(register.closedAt) : '—'} ·{' '}
              {register.salesCount ?? 0} venta(s)
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Rentabilidad del turno */}
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Rentabilidad del turno</h3>
          <p className="mt-1 text-xs text-slate-400">
            Utilidad = Ventas − Costo de los productos vendidos
          </p>

          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
              <p className="text-xs text-slate-500 dark:text-slate-400">Ventas</p>
              <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">
                {money(salesTotal)}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Efectivo {money(register.cashSalesTotal ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
              <p className="text-xs text-slate-500 dark:text-slate-400">Costo de lo vendido</p>
              <p className="mt-1 text-xl font-semibold text-amber-600 dark:text-amber-400">
                {cogs !== null ? money(cogs) : 'No disponible'}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">Costo real de la mercancía entregada</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-500/5">
              <p className="text-xs text-slate-500 dark:text-slate-400">Utilidad generada</p>
              <p
                className={`mt-1 text-xl font-semibold ${
                  (profit ?? 0) >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {profit !== null ? money(profit) : 'No disponible'}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {margin !== null ? `Margen ${margin.toFixed(1)}%` : 'Sin datos de costo'}
              </p>
            </div>
          </div>

          {cogs === null && (
            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-400">
              No se pudo calcular el costo de lo vendido. Verifica que la migración 016 esté aplicada en
              la base de datos.
            </p>
          )}

          {/* Arqueo de caja */}
          <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Arqueo de efectivo</h3>
            <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">Monto de apertura</td>
                    <td className="px-4 py-2.5 text-right font-medium text-slate-900 dark:text-white">
                      {money(register.openingAmount)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">
                      Ventas en efectivo del turno
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-slate-900 dark:text-white">
                      {money(register.cashSalesTotal ?? 0)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">Efectivo esperado</td>
                    <td className="px-4 py-2.5 text-right font-medium text-slate-900 dark:text-white">
                      {money(register.expectedAmount ?? 0)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">Efectivo contado</td>
                    <td className="px-4 py-2.5 text-right font-medium text-slate-900 dark:text-white">
                      {money(register.closingAmount ?? 0)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200">
                      Diferencia
                    </td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${differenceTone}`}>
                      {money(difference)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {register.closingNote && (
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Nota de cierre: {register.closingNote}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Imprimir
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}
