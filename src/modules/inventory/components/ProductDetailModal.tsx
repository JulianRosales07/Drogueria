import { useQuery } from '@tanstack/react-query'
import { listProductUnits, type Product } from '../../../services/api/products'

function money(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

function marginPct(cost: number, price: number) {
  if (price <= 0) return 0
  return ((price - cost) / price) * 100
}

type PresentationRow = {
  key: string
  label: string
  factor: number
  cost: number
  price: number
  barcode: string | null
}

type ProductDetailModalProps = {
  open: boolean
  product: Product | null
  onClose: () => void
}

export function ProductDetailModal({ open, product, onClose }: ProductDetailModalProps) {
  const unitsQuery = useQuery({
    queryKey: ['product-units', product?.id],
    queryFn: () => listProductUnits(product!.id),
    enabled: open && Boolean(product),
  })

  if (!open || !product) return null

  const presentations: PresentationRow[] = [
    {
      key: 'base',
      label: 'Unidad',
      factor: 1,
      cost: product.cost,
      price: product.price,
      barcode: product.barcode,
    },
    ...(unitsQuery.data ?? product.units).map((unit) => ({
      key: unit.id,
      label: unit.name,
      factor: unit.factor,
      cost: unit.cost,
      price: unit.price,
      barcode: unit.barcode,
    })),
  ]

  const status = product.stock <= product.minStock ? 'Crítico' : 'Disponible'
  const statusTone =
    status === 'Disponible'
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
      : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{product.name}</h2>
            <p className="text-xs text-slate-400">
              SKU: {product.sku} {product.barcode ? `· Código: ${product.barcode}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {/* Datos generales */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
              <p className="text-xs text-slate-500 dark:text-slate-400">Categoría</p>
              <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                {product.categoryName ?? 'Sin categoría'}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
              <p className="text-xs text-slate-500 dark:text-slate-400">Estado</p>
              <span className={`mt-1 inline-block rounded-md px-2.5 py-1 text-xs font-medium ${statusTone}`}>
                {status}
              </span>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
              <p className="text-xs text-slate-500 dark:text-slate-400">Stock actual</p>
              <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                {product.stock} unidades <span className="text-xs text-slate-400">(mínimo {product.minStock})</span>
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
              <p className="text-xs text-slate-500 dark:text-slate-400">Producto activo</p>
              <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                {product.isActive ? 'Sí, visible en el POS' : 'No, oculto en el POS'}
              </p>
            </div>
          </div>

          {product.description && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
              <p className="text-xs text-slate-500 dark:text-slate-400">Descripción</p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{product.description}</p>
            </div>
          )}

          {/* Presentaciones y precios */}
          <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Presentaciones y precios</h3>
            <p className="mt-1 text-xs text-slate-400">
              Costo, precio de venta y margen de cada presentación disponible para este producto.
            </p>

            <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Presentación</th>
                    <th className="px-3 py-2 text-left font-medium">Contiene</th>
                    <th className="px-3 py-2 text-right font-medium">Costo</th>
                    <th className="px-3 py-2 text-right font-medium">Precio</th>
                    <th className="px-3 py-2 text-right font-medium">Margen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {presentations.map((row) => (
                    <tr key={row.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">
                        {row.label}
                        {row.barcode && (
                          <span className="ml-2 text-xs font-normal text-slate-400">· {row.barcode}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                        {row.factor === 1 ? '1 unidad' : `${row.factor} unidades`}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300">{money(row.cost)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-white">
                        {money(row.price)}
                      </td>
                      <td className="px-3 py-2 text-right text-emerald-600 dark:text-emerald-400">
                        {marginPct(row.cost, row.price).toFixed(0)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {unitsQuery.isLoading && (
              <p className="mt-2 text-xs text-slate-400">Actualizando presentaciones…</p>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
