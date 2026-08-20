import { useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useReactToPrint } from 'react-to-print'
import type { ColumnDef } from '@tanstack/react-table'
import { SectionCard } from '../../../components/ui/SectionCard'
import { DataTable } from '../../../components/ui/DataTable'
import { Receipt } from '../../../components/Receipt'
import { listSales, listSaleReturns, PAYMENT_METHOD_LABELS, type Sale } from '../../../services/api/sales'
import { useReceiptConfig } from '../../../hooks/useReceiptConfig'
import { ReturnModal } from '../components/ReturnModal'

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

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10)
}

function invoiceNumber(saleId: string) {
  return `#${saleId.substring(0, 8).toUpperCase()}`
}

function renderSaleStatus(status: string) {
  switch (status) {
    case 'RETURNED':
      return (
        <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
          Devuelta
        </span>
      )
    case 'PARTIAL_RETURN':
      return (
        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          Dev. Parcial
        </span>
      )
    case 'CANCELLED':
      return (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          Cancelada
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          Completada
        </span>
      )
  }
}

type RangePreset = 'today' | 'week' | 'month' | 'custom'

export function InvoicesPage() {
  const today = useMemo(() => new Date(), [])

  // Por defecto se muestran solo las facturas del día actual.
  const [preset, setPreset] = useState<RangePreset>('today')
  const [dateFrom, setDateFrom] = useState(toDateInputValue(today))
  const [dateTo, setDateTo] = useState(toDateInputValue(today))
  const [search, setSearch] = useState('')

  const applyPreset = (nextPreset: RangePreset) => {
    setPreset(nextPreset)
    if (nextPreset === 'custom') return

    const now = new Date()
    if (nextPreset === 'today') {
      setDateFrom(toDateInputValue(now))
      setDateTo(toDateInputValue(now))
      return
    }
    const start = new Date(now)
    start.setDate(start.getDate() - (nextPreset === 'week' ? 7 : 30))
    setDateFrom(toDateInputValue(start))
    setDateTo(toDateInputValue(now))
  }
  const [viewingSale, setViewingSale] = useState<Sale | null>(null)
  const [printingSale, setPrintingSale] = useState<Sale | null>(null)
  const [returningSale, setReturningSale] = useState<Sale | null>(null)

  const receiptRef = useRef<HTMLDivElement>(null)
  const receiptConfig = useReceiptConfig()

  const salesQuery = useQuery({
    queryKey: ['sales'],
    queryFn: () => listSales(),
  })

  const viewingSaleReturnsQuery = useQuery({
    queryKey: ['sale-returns', viewingSale?.id],
    queryFn: () => listSaleReturns(viewingSale!.id),
    enabled: !!viewingSale?.id,
  })

  const sales = salesQuery.data ?? []

  const filteredSales = useMemo(() => {
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null
    const to = dateTo ? new Date(`${dateTo}T23:59:59`) : null
    const term = search.trim().toLowerCase()

    return sales
      .filter((sale) => {
        const created = new Date(sale.created_at)
        if (from && created < from) return false
        if (to && created > to) return false
        if (term) {
          const matchesInvoice = invoiceNumber(sale.id).toLowerCase().includes(term)
          const matchesCustomer = (sale.customers?.full_name || 'venta de mostrador')
            .toLowerCase()
            .includes(term)
          const matchesProduct = sale.sale_items.some((item) =>
            item.products.name.toLowerCase().includes(term),
          )
          if (!matchesInvoice && !matchesCustomer && !matchesProduct) return false
        }
        return true
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [sales, dateFrom, dateTo, search])

  const stats = useMemo(() => {
    const count = filteredSales.length
    const totalAmount = filteredSales.reduce((sum, s) => sum + s.total, 0)
    const totalItems = filteredSales.reduce(
      (sum, s) => sum + s.sale_items.reduce((iSum, item) => iSum + item.unit_quantity, 0),
      0,
    )
    return { count, totalAmount, totalItems }
  }, [filteredSales])

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Factura-${printingSale?.id || 'reimpresion'}`,
    onAfterPrint: () => setPrintingSale(null),
  })

  const handleReprint = (sale: Sale) => {
    setPrintingSale(sale)
    setTimeout(() => handlePrint(), 100)
  }

  const columns = useMemo<ColumnDef<Sale>[]>(
    () => [
      {
        header: 'Factura',
        id: 'invoice',
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
            {invoiceNumber(row.original.id)}
          </span>
        ),
      },
      {
        header: 'Fecha',
        accessorKey: 'created_at',
        cell: ({ row }) => formatDateTime(row.original.created_at),
      },
      {
        header: 'Cliente',
        id: 'customer',
        cell: ({ row }) => row.original.customers?.full_name || 'Venta de mostrador',
      },
      {
        header: 'Cajero',
        id: 'cashier',
        cell: ({ row }) => row.original.users?.full_name || '—',
      },
      {
        header: 'Medio de pago',
        id: 'payment_method',
        cell: ({ row }) => {
          const s = row.original
          if (s.payment_method_2) {
            return (
              <div className="text-xs">
                <span className="font-medium text-slate-900 dark:text-white">
                  {PAYMENT_METHOD_LABELS[s.payment_method]} + {PAYMENT_METHOD_LABELS[s.payment_method_2]}
                </span>
                <p className="text-[10px] text-slate-400">
                  {money(s.amount_paid_1 || 0)} / {money(s.amount_paid_2 || 0)}
                </p>
              </div>
            )
          }
          return (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {PAYMENT_METHOD_LABELS[s.payment_method] || s.payment_method}
            </span>
          )
        },
      },
      {
        header: 'Estado',
        accessorKey: 'status',
        cell: ({ row }) => renderSaleStatus(row.original.status),
      },
      {
        header: 'Ítems',
        id: 'items',
        cell: ({ row }) => row.original.sale_items.reduce((sum, item) => sum + item.unit_quantity, 0),
      },
      {
        header: 'Total',
        accessorKey: 'total',
        cell: ({ row }) => (
          <span className="font-semibold text-slate-900 dark:text-white">{money(row.original.total)}</span>
        ),
      },
      {
        header: '',
        id: 'actions',
        cell: ({ row }) => {
          const canReturn = row.original.status !== 'RETURNED' && row.original.status !== 'CANCELLED'
          return (
            <div className="flex items-center gap-2.5">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setViewingSale(row.original)
                }}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Ver detalle
              </button>
              {canReturn && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setReturningSale(row.original)
                  }}
                  className="text-xs font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400 flex items-center gap-0.5"
                  title="Devolver productos de esta factura"
                >
                  🔄 Devolver
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleReprint(row.original)
                }}
                className="text-xs font-medium text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white"
              >
                🖨️
              </button>
            </div>
          )
        },
      },
    ],
    [],
  )


  return (
    <div className="space-y-6">
      <SectionCard
        title="Facturas"
        description="Consulta todas las facturas emitidas y los productos vendidos en cada una."
      >
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <article className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {preset === 'today' ? 'Facturas de hoy' : 'Facturas en el rango'}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{stats.count}</p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
            <p className="text-sm text-slate-500 dark:text-slate-400">Total facturado</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{money(stats.totalAmount)}</p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
            <p className="text-sm text-slate-500 dark:text-slate-400">Unidades vendidas</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{stats.totalItems}</p>
          </article>
        </div>

        <div className="mb-3 flex gap-1.5">
          {(
            [
              { key: 'today', label: 'Hoy' },
              { key: 'week', label: '7 días' },
              { key: 'month', label: '30 días' },
              { key: 'custom', label: 'Rango' },
            ] as { key: RangePreset; label: string }[]
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => applyPreset(opt.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                preset === opt.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-55">
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Buscar
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Número de factura, cliente o producto…"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setPreset('custom')
              }}
              className="rounded-md border border-slate-200 px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                setPreset('custom')
              }}
              className="rounded-md border border-slate-200 px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        {salesQuery.isLoading ? (
          <div className="py-10 text-center text-sm text-slate-400">Cargando facturas…</div>
        ) : salesQuery.isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600 dark:border-red-800 dark:bg-red-500/10 dark:text-red-400">
            Error al cargar las facturas
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 py-10 text-center text-sm text-slate-400 dark:border-slate-700">
            {preset === 'today'
              ? 'Aún no hay facturas registradas hoy.'
              : 'No hay facturas registradas en el rango seleccionado.'}
          </div>
        ) : (
          <DataTable data={filteredSales} columns={columns} />
        )}
      </SectionCard>

      {/* ===== Modal de detalle de factura ===== */}
      {viewingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Factura {invoiceNumber(viewingSale.id)}
                </h2>
                {renderSaleStatus(viewingSale.status)}
              </div>
              <button
                onClick={() => setViewingSale(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                ✕
              </button>
            </div>
            <p className="mb-4 text-xs text-slate-400">
              {formatDateTime(viewingSale.created_at)}
              {' · '}
              {viewingSale.customers?.full_name || 'Venta de mostrador'}
              {viewingSale.users?.full_name ? ` · Atendió: ${viewingSale.users.full_name}` : ''}
            </p>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Producto</th>
                      <th className="px-3 py-2 text-center font-medium">Cant.</th>
                      <th className="px-3 py-2 text-right font-medium">Precio</th>
                      <th className="px-3 py-2 text-right font-medium">Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingSale.sale_items.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                          {item.products.name}
                          {item.unit_label !== 'Unidad' && (
                            <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                              {item.unit_label}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center text-slate-500 dark:text-slate-400">
                          {item.unit_quantity}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-500 dark:text-slate-400">
                          {money(item.unit_price)}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-white">
                          {money(item.line_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Historial de Devoluciones registradas para esta factura */}
              {viewingSaleReturnsQuery.data && viewingSaleReturnsQuery.data.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 dark:border-amber-900/50 dark:bg-amber-950/20">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 mb-2 flex items-center gap-1.5">
                    <span>🔄</span> Historial de Devoluciones
                  </p>
                  <div className="space-y-2.5">
                    {viewingSaleReturnsQuery.data.map((ret) => (
                      <div
                        key={ret.id}
                        className="rounded-lg bg-white p-2.5 shadow-sm text-xs dark:bg-slate-800 border border-amber-100 dark:border-slate-700"
                      >
                        <div className="flex justify-between items-start font-medium text-slate-800 dark:text-slate-200">
                          <span>{formatDateTime(ret.created_at)}</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            Reembolso: {money(ret.total_refund)}
                          </span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 italic">
                          "{ret.notes}"
                        </p>
                        <ul className="mt-1.5 space-y-0.5 text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-700/50 pt-1">
                          {ret.sale_return_items.map((item) => (
                            <li key={item.id} className="flex justify-between">
                              <span>• {item.products?.name || 'Producto'}</span>
                              <span className="font-semibold">{item.unit_quantity} devueltos</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 space-y-1 border-t border-slate-200 pt-3 text-sm dark:border-slate-800">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Subtotal</span>
                <span>{money(viewingSale.subtotal)}</span>
              </div>
              {viewingSale.discount > 0 && (
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Descuento</span>
                  <span>-{money(viewingSale.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold text-slate-900 dark:text-white">
                <span>Total</span>
                <span>{money(viewingSale.total)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                <span>Medio de pago</span>
                <span>
                  {viewingSale.payment_method_2 ? (
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {PAYMENT_METHOD_LABELS[viewingSale.payment_method]} ({money(viewingSale.amount_paid_1 || 0)}) +{' '}
                      {PAYMENT_METHOD_LABELS[viewingSale.payment_method_2]} ({money(viewingSale.amount_paid_2 || 0)})
                    </span>
                  ) : (
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {PAYMENT_METHOD_LABELS[viewingSale.payment_method] || viewingSale.payment_method}
                    </span>
                  )}
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {viewingSale.status !== 'RETURNED' && viewingSale.status !== 'CANCELLED' && (
                <button
                  onClick={() => {
                    const target = viewingSale
                    setViewingSale(null)
                    setReturningSale(target)
                  }}
                  className="flex-1 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700"
                >
                  🔄 Devolver productos
                </button>
              )}
              <button
                onClick={() => handleReprint(viewingSale)}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                🖨️ Reimprimir
              </button>
              <button
                onClick={() => setViewingSale(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal de procesamiento de devolución ===== */}
      {returningSale && (
        <ReturnModal
          sale={returningSale}
          onClose={() => setReturningSale(null)}
        />
      )}

      {/* ===== Recibo usado solo para reimpresión ===== */}
      {printingSale && (
        <div className="fixed left-[-9999px] top-0">
          <Receipt
            ref={receiptRef}
            saleId={printingSale.id}
            date={printingSale.created_at}
            customerName={printingSale.customers?.full_name}
            paymentMethod={printingSale.payment_method}
            paymentMethod2={printingSale.payment_method_2}
            amountPaid1={printingSale.amount_paid_1}
            amountPaid2={printingSale.amount_paid_2}
            items={printingSale.sale_items.map((item) => ({
              name: `${item.products.name}${item.unit_label !== 'Unidad' ? ` (${item.unit_label})` : ''}`,
              quantity: item.unit_quantity,
              unitPrice: item.unit_price,
              lineTotal: item.line_total,
            }))}
            subtotal={printingSale.subtotal}
            tax={printingSale.tax}
            discount={printingSale.discount}
            total={printingSale.total}
            config={receiptConfig}
          />
        </div>
      )}
    </div>
  )
}

