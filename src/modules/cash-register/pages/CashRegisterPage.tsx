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
} from '../../../services/api/cash-registers'

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
  const [lastClosed, setLastClosed] = useState<CashRegister | null>(null)

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
      setClosingAmount('')
      setClosingNote('')
      setLastClosed(register)
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
                <p className="text-sm text-slate-500 dark:text-slate-400">Efectivo esperado</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                  {money(current.openingAmount + current.salesTotalSoFar)}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Cerrar caja</h3>
              <p className="mt-1 text-xs text-slate-400">
                Cuenta el efectivo en caja e ingresa el monto real. Se calculará la diferencia contra lo esperado.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={closingAmount}
                  onChange={(e) => setClosingAmount(e.target.value)}
                  placeholder="Monto contado en caja"
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
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
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
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
        <SectionCard title="Resumen del último cierre" description="Ventas del día registradas en el turno recién cerrado.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
              <p className="text-sm text-slate-500 dark:text-slate-400">Ventas del turno</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                {money(lastClosed.salesTotal ?? 0)}
              </p>
              <p className="text-xs text-slate-400">{lastClosed.salesCount ?? 0} venta(s)</p>
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
    </div>
  )
}
