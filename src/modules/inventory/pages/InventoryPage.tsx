import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import toast from 'react-hot-toast'
import { DataTable } from '../../../components/ui/DataTable'
import { SectionCard } from '../../../components/ui/SectionCard'
import { ProductFormModal } from '../components/ProductFormModal'
import { ProductDetailModal } from '../components/ProductDetailModal'
import { ImportInventoryModal } from '../components/ImportInventoryModal'
import { downloadInventoryTemplate } from '../../../services/excel/inventoryTemplate'
import { listProducts, deleteProduct, type Product } from '../../../services/api/products'

function money(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

function getStatus(product: Product): 'Disponible' | 'Crítico' {
  return product.stock <= product.minStock ? 'Crítico' : 'Disponible'
}

export function InventoryPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null)

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: listProducts,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Producto eliminado')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al eliminar el producto')
    },
  })

  const handleDelete = (product: Product) => {
    if (confirm(`¿Eliminar "${product.name}"? Esta acción no se puede deshacer.`)) {
      deleteMutation.mutate(product.id)
    }
  }

  const products = productsQuery.data ?? []

  const stats = useMemo(() => {
    const active = products.filter((p) => p.isActive).length
    const critical = products.filter((p) => p.stock <= p.minStock).length
    const totalStockValue = products.reduce((sum, p) => sum + p.stock * p.cost, 0)
    return { active, critical, totalStockValue }
  }, [products])

  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      { header: 'SKU', accessorKey: 'sku' },
      {
        header: 'Producto',
        accessorKey: 'name',
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-slate-900 dark:text-white">{row.original.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {row.original.categoryName ?? 'Sin categoría'}
            </p>
          </div>
        ),
      },
      { header: 'Stock', accessorKey: 'stock' },
      { header: 'Mínimo', accessorKey: 'minStock' },
      {
        header: 'Costo',
        accessorKey: 'cost',
        cell: ({ row }) => money(row.original.cost),
      },
      {
        header: 'Precio',
        accessorKey: 'price',
        cell: ({ row }) => money(row.original.price),
      },
      {
        header: 'Estado',
        id: 'status',
        cell: ({ row }) => {
          const status = getStatus(row.original)
          const tone =
            status === 'Disponible'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
              : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'

          return <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${tone}`}>{status}</span>
        },
      },
      {
        header: '',
        id: 'actions',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setViewingProduct(row.original)
              }}
              className="text-sm font-medium text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white"
            >
              Ver
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setEditingProduct(row.original)
                setModalOpen(true)
              }}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Editar
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDelete(row.original)
              }}
              className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400"
            >
              Eliminar
            </button>
          </div>
        ),
      },
    ],
    [],
  )

  const handleOpenCreate = () => {
    setEditingProduct(null)
    setModalOpen(true)
  }

  const handleClose = () => {
    setModalOpen(false)
    setEditingProduct(null)
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Inventario"
        description="Consulta stock, niveles mínimos y alertas operativas."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadInventoryTemplate}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              ⬇️ Plantilla Excel
            </button>
            <button
              type="button"
              onClick={() => setImportModalOpen(true)}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              ⬆️ Importar Excel
            </button>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              + Nuevo producto
            </button>
          </div>
        }
      >
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
            <p className="text-sm text-slate-500 dark:text-slate-400">Productos activos</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{stats.active}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
            <p className="text-sm text-slate-500 dark:text-slate-400">Stock crítico</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{stats.critical}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
            <p className="text-sm text-slate-500 dark:text-slate-400">Valor de inventario</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
              {money(stats.totalStockValue)}
            </p>
          </div>
        </div>

        {productsQuery.isLoading ? (
          <div className="py-10 text-center text-sm text-slate-400">Cargando productos…</div>
        ) : productsQuery.isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600 dark:border-red-800 dark:bg-red-500/10 dark:text-red-400">
            Error al cargar productos: {(productsQuery.error as any)?.response?.data?.message || (productsQuery.error as any)?.message}
            <div className="mt-3">
              <button
                onClick={() => productsQuery.refetch()}
                className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300"
              >
                Reintentar
              </button>
            </div>
          </div>
        ) : (
          <>
            <DataTable data={products} columns={columns} />
            {products.length === 0 && (
              <div className="mt-3 rounded-lg border border-dashed border-slate-300 py-6 text-center text-sm text-slate-400 dark:border-slate-700">
                No hay productos registrados. Crea el primero con el botón "Nuevo producto" o impórtalos desde Excel.
              </div>
            )}
          </>
        )}
      </SectionCard>

      <ProductFormModal open={modalOpen} product={editingProduct} onClose={handleClose} />
      <ProductDetailModal
        open={Boolean(viewingProduct)}
        product={viewingProduct}
        onClose={() => setViewingProduct(null)}
      />
      <ImportInventoryModal open={importModalOpen} onClose={() => setImportModalOpen(false)} />
    </div>
  )
}
