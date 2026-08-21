import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import toast from 'react-hot-toast'
import { DataTable } from '../../../components/ui/DataTable'
import { SectionCard } from '../../../components/ui/SectionCard'
import {
  closeCashRegister,
  getCurrentCashRegister,
  listCashRegisterHistory,
  openCashRegister,
  type CashRegister,
  type ClosedCashRegister,
} from '../../../services/api/cash-registers'
import { CloseShiftSummaryModal } from '../components/CloseShiftSummaryModal'

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

export function CashRegisterPage() {
  const queryClient = useQueryClient()
  const [openingAmount, setOpeningAmount] = useState('')
  const [openingNote, setOpeningNote] = useState('')
  const [closingAmount, setClosingAmount] = useState('')
  const [closingNote, setClosingNote] = useState('')
  const [lastClosed, setLastClosed] = useState<ClosedCashRegister | null>(null)
  const [summaryOpen, setSummaryOpen] = useState(false)

  const currentQuery = useQuery({
    queryKey: ['cash-register-current'],
    queryFn: getCurrentCashRegister,
  })

  const historyQuery = useQuery({
    queryKey: ['cash-register-history'],
    queryFn: listCashRegisterHistory,
  })

  const openMutation = useMutation({
    mutationFn: openCashRegister,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-register-current'] })
      queryClient.invalidateQueries({ queryKey: ['cash-register-history'] })
      setOpeningAmount('')
      setOpeningNote('')
      toast.success('Caja abierta')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al abrir la caja')
    },
  })

  const closeMutation = useMutation({
    mutationFn: closeCashRegister,
    onSuccess: (register) => {
      queryClient.invalidateQueries({ queryKey: ['cash-register-current'] })
      queryClient.invalidateQueries({ queryKey: ['cash-register-history'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      setClosingAmount('')
      setClosingNote('')
      setLastClosed(register)
      setSummaryOpen(true)
      toast.success('Caja cerrada')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al cerrar la caja')
    },
  })

  const current = currentQuery.data
  const history = historyQuery.data ?? []

  const handleOpen = () => {
    const amount = parseFloat(openingAmount)
    if (Number.isNaN(amount) || amount < 0) {
      toast.error('Ingresa un monto de apertura válido')
      return
    }
    openMutation.mutate({ openingAmount: amount, note: openingNote.trim() || undefined })
  }

  const handleClose = () => {
    const amount = parseFloat(closingAmount)
    if (Number.isNaN(amount) || amount < 0) {
      toast.error('Ingresa un monto de cierre válido')
      return
    }
    if (!confirm('¿Cerrar la caja? Se calculará el resumen de ventas del turno.')) return
    closeMutation.mutate({ closingAmount: amount, note: closingNote.trim() || undefined })
  }

  const historyColumns: ColumnDef<CashRegister>[] = [
    { header: 'Apertura', accessorKey: 'openedAt', cell: ({ row }) => formatDateTime(row.original.openedAt) },
    {
      header: 'Cierre',
      id: 'closedAt',
      cell: ({ row }) => (row.original.closedAt ? formatDateTime(row.original.closedAt) : '—'),
    },
    { header: 'Abrió', id: 'openedBy', cell: ({ row }) => row.original.openedByName ?? '—' },
    { header: 'Cerró', id: 'closedBy', cell: ({ row }) => row.original.closedByName ?? '—' },
    { header: 'Monto apertura', id: 'openingAmount', cell: ({ row }) => money(row.original.openingAmount) },
    {
      header: 'Ventas del turno',
      id: 'salesTotal',
      cell: ({ row }) => (row.original.salesTotal !== null ? money(row.original.salesTotal) : '—'),
    },
    {
      header: 'Monto cierre',
      id: 'closingAmount',
      cell: ({ row }) => (row.original.closingAmount !== null ? money(row.original.closingAmount) : '—'),
    },
    {
      header: 'Diferencia',
      id: 'difference',
      cell: ({ row }) => {
        if (row.original.difference === null) return '—'
        const tone = row.original.difference === 0
          ? 'text-slate-600 dark:text-slate-300'
          : row.original.difference > 0
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-red-600 dark:text-red-400'
        return <span className={`font-medium ${tone}`}>{money(row.original.difference)}</span>
      },
    },
    {
      header: 'Estado',
      id: 'status',
      cell: ({ row }) => (
        <span
          className={`rounded-md px-2.5 py-1 text-xs font-medium ${
            row.original.status === 'OPEN'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          {row.original.status === 'OPEN' ? 'Abierta' : 'Cerrada'}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <SectionCard
        title="Caja"
        description="Apertura y cierre de caja con resumen de ventas del turno."
      >
        {currentQuery.isLoading ? (
          <div className="py-6 text-center text-sm text-slate-400">Cargando estado de caja…</div>
        ) : current ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
                <p className="text-sm text-slate-500 dark:text-slate-400">Abierta desde</p>
                <p className="mt-2 text-base font-semibold text-slate-900 dark:text-white">
                  {formatDateTime(current.openedAt)}
                </p>
                <p className="text-xs text-slate-400">{current.openedByName ?? 'Usuario'}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
                <p className="text-sm text-slate-500 dark:text-slate-400">Monto de apertura</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                  {money(current.openingAmount)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
                <p className="text-sm text-slate-500 dark:text-slate-400">Ventas del turno (hasta ahora)</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                  {money(current.salesTotalSoFar)}
                </p>
                <p className="text-xs text-slate-400">{current.salesCountSoFar} venta(s)</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
                <p className="text-sm text-slate-500 dark:text-slate-400">Total esperado del turno</p>
                <p className="mt-2 text-2xl font-semibold text-blue-600 dark:text-blue-400">
                  {money(current.openingAmount + current.salesTotalSoFar)}
                </p>
                <p className="text-xs text-slate-400">Base + Todas las ventas</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
                <p className="text-sm text-slate-500 dark:text-slate-400">Costo de lo vendido</p>
                <p className="mt-2 text-2xl font-semibold text-amber-600 dark:text-amber-400">
                  {current.cogsTotalSoFar !== null ? money(current.cogsTotalSoFar) : '—'}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
                <p className="text-sm text-slate-500 dark:text-slate-400">Utilidad del turno</p>
                <p
                  className={`mt-2 text-2xl font-semibold ${
                    (current.profitTotalSoFar ?? 0) >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {current.profitTotalSoFar !== null ? money(current.profitTotalSoFar) : '—'}
                </p>
              </div>
            </div>

            {/* Desglose por método de pago */}
            {current.salesByPaymentMethodSoFar && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Ventas por método de pago</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {([
                    ['CASH', '💵', 'Efectivo', 'emerald'],
                    ['CARD', '💳', 'Tarjeta', 'blue'],
                    ['TRANSFER', '🏦', 'Transferencia', 'purple'],
                    ['PENDING', '⏳', 'Pendiente (Fiado)', 'amber'],
                    ['OTHER', '🔄', 'Otro', 'slate'],
                  ] as const).map(([key, icon, label]) => {
                    const val = (current.salesByPaymentMethodSoFar as any)?.[key] || 0
                    return (
                      <div key={key} className={`rounded-lg border p-3 text-center ${
                        key === 'PENDING' && val > 0
                          ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20'
                          : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60'
                      }`}>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{icon} {label}</p>
                        <p className={`mt-1 text-base font-semibold ${
                          key === 'PENDING' && val > 0
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-900 dark:text-white'
                        }`}>{money(val)}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Cerrar caja</h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Ingresa el monto total para realizar el arqueo del turno.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setClosingAmount(String(current.openingAmount + current.salesTotalSoFar))}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                >
                  ⚡ Usar valor esperado: {money(current.openingAmount + current.salesTotalSoFar)}
                </button>
              </div>

              {/* Guía de cálculo completa */}
              <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3.5 text-xs dark:border-slate-800 dark:bg-slate-800/80 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    📊 Total esperado del turno (Base + Todas las ventas):
                  </p>
                  <p className="text-sm font-bold text-blue-700 dark:text-blue-400">
                    {money(current.openingAmount + current.salesTotalSoFar)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-medium dark:bg-slate-700">
                    Base ({money(current.openingAmount)})
                  </span>
                  <span>+</span>
                  <span className="rounded bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    Efectivo ({money(current.cashSalesTotalSoFar)})
                  </span>
                  {(current.salesByPaymentMethodSoFar?.TRANSFER || 0) > 0 && (
                    <>
                      <span>+</span>
                      <span className="rounded bg-purple-50 px-2 py-0.5 font-medium text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                        Transferencias ({money(current.salesByPaymentMethodSoFar.TRANSFER)})
                      </span>
                    </>
                  )}
                  {(current.salesByPaymentMethodSoFar?.CARD || 0) > 0 && (
                    <>
                      <span>+</span>
                      <span className="rounded bg-blue-50 px-2 py-0.5 font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                        Tarjetas ({money(current.salesByPaymentMethodSoFar.CARD)})
                      </span>
                    </>
                  )}
                  <span>=</span>
                  <span className="rounded bg-blue-100 px-2 py-0.5 font-bold text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
                    {money(current.openingAmount + current.salesTotalSoFar)}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
                <div>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={closingAmount}
                    onChange={(e) => setClosingAmount(e.target.value)}
                    placeholder="Monto de cierre"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  {closingAmount !== '' && (
                    <p className={`mt-1 text-xs font-semibold ${
                      (parseFloat(closingAmount) || 0) - (current.openingAmount + current.salesTotalSoFar) === 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : (parseFloat(closingAmount) || 0) - (current.openingAmount + current.salesTotalSoFar) > 0
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {(parseFloat(closingAmount) || 0) - (current.openingAmount + current.salesTotalSoFar) === 0
                        ? '✅ Cuadre exacto (sin diferencia)'
                        : (parseFloat(closingAmount) || 0) - (current.openingAmount + current.salesTotalSoFar) > 0
                        ? `Sobran: +${money((parseFloat(closingAmount) || 0) - (current.openingAmount + current.salesTotalSoFar))}`
                        : `Faltan: ${money((parseFloat(closingAmount) || 0) - (current.openingAmount + current.salesTotalSoFar))}`}
                    </p>
                  )}
                </div>
                <input
                  type="text"
                  value={closingNote}
                  onChange={(e) => setClosingNote(e.target.value)}
                  placeholder="Nota de cierre (opcional)"
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={closeMutation.isPending}
                  className="rounded-md bg-red-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
                >
                  {closeMutation.isPending ? 'Cerrando...' : 'Cerrar caja'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No hay caja abierta</h3>
            <p className="mt-1 text-xs text-slate-400">
              Registra el monto con el que inicias el turno para poder vender en el punto de venta.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
              <input
                type="number"
                min={0}
                step="0.01"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
                placeholder="Monto de apertura"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <input
                type="text"
                value={openingNote}
                onChange={(e) => setOpeningNote(e.target.value)}
                placeholder="Nota de apertura (opcional)"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <button
                type="button"
                onClick={handleOpen}
                disabled={openMutation.isPending}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {openMutation.isPending ? 'Abriendo...' : 'Abrir caja'}
              </button>
            </div>
          </div>
        )}
      </SectionCard>

      {lastClosed ? (
        <SectionCard
          title="Resumen del último cierre"
          description="Ventas, costo y utilidad registrados en el turno recién cerrado."
          action={
            <button
              type="button"
              onClick={() => setSummaryOpen(true)}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Ver resumen completo
            </button>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
              <p className="text-sm text-slate-500 dark:text-slate-400">Ventas del turno</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                {money(lastClosed.salesTotal ?? 0)}
              </p>
              <p className="text-xs text-slate-400">{lastClosed.salesCount ?? 0} venta(s)</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
              <p className="text-sm text-slate-500 dark:text-slate-400">Costo de lo vendido</p>
              <p className="mt-2 text-2xl font-semibold text-amber-600 dark:text-amber-400">
                {lastClosed.cogsTotal !== null ? money(lastClosed.cogsTotal) : '—'}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
              <p className="text-sm text-slate-500 dark:text-slate-400">Utilidad del turno</p>
              <p
                className={`mt-2 text-2xl font-semibold ${
                  (lastClosed.profitTotal ?? 0) >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {lastClosed.profitTotal !== null ? money(lastClosed.profitTotal) : '—'}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
              <p className="text-sm text-slate-500 dark:text-slate-400">Efectivo esperado</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                {money(lastClosed.expectedAmount ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
              <p className="text-sm text-slate-500 dark:text-slate-400">Efectivo contado</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                {money(lastClosed.closingAmount ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
              <p className="text-sm text-slate-500 dark:text-slate-400">Diferencia</p>
              <p
                className={`mt-2 text-2xl font-semibold ${
                  (lastClosed.difference ?? 0) === 0
                    ? 'text-slate-900 dark:text-white'
                    : (lastClosed.difference ?? 0) > 0
                      ? 'text-emerald-600'
                      : 'text-red-600'
                }`}
              >
                {money(lastClosed.difference ?? 0)}
              </p>
            </div>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Historial de caja" description="Últimas aperturas y cierres registrados.">
        {historyQuery.isLoading ? (
          <div className="py-6 text-center text-sm text-slate-400">Cargando historial…</div>
        ) : history.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 py-6 text-center text-sm text-slate-400 dark:border-slate-700">
            Aún no hay registros de caja.
          </div>
        ) : (
          <DataTable data={history} columns={historyColumns} />
        )}
      </SectionCard>

      <CloseShiftSummaryModal
        open={summaryOpen}
        register={lastClosed}
        onClose={() => setSummaryOpen(false)}
      />
    </div>
  )
}
