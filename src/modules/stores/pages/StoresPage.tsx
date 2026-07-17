import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import toast from 'react-hot-toast'
import { DataTable } from '../../../components/ui/DataTable'
import { SectionCard } from '../../../components/ui/SectionCard'
import { listStores, deleteStore, type StoreRecord } from '../../../services/api/stores'
import { StoreFormModal } from '../components/StoreFormModal'

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  true: { label: 'Activo', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
  false: { label: 'Inactivo', className: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' },
}

export function StoresPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingStore, setEditingStore] = useState<StoreRecord | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const storesQuery = useQuery({
    queryKey: ['stores'],
    queryFn: listStores,
  })

  const stores = storesQuery.data ?? []

  const stats = useMemo(() => {
    const total = stores.length
    const active = stores.filter((s) => s.isActive).length
    const inactive = total - active
    return { total, active, inactive }
  }, [stores])

  const deleteMutation = useMutation({
    mutationFn: deleteStore,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] })
      toast.success('Droguería eliminada correctamente')
      setDeletingId(null)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Error al eliminar droguería')
      setDeletingId(null)
    },
  })

  const handleDelete = (storeId: string, name: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la droguería "${name}"? Se eliminarán todos sus datos.`)) return
    setDeletingId(storeId)
    deleteMutation.mutate(storeId)
  }

  const columns = useMemo<ColumnDef<StoreRecord>[]>(
    () => [
      {
        header: 'Nombre',
        accessorKey: 'name',
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-slate-900 dark:text-white">{row.original.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">NIT: {row.original.nit || 'No definido'}</p>
          </div>
        ),
      },
      { header: 'Dirección', accessorKey: 'address', cell: ({ row }) => row.original.address || 'Sin dirección' },
      { header: 'Teléfono', accessorKey: 'phone', cell: ({ row }) => row.original.phone || 'Sin teléfono' },
      {
        header: 'Estado',
        accessorKey: 'isActive',
        cell: ({ row }) => {
          const badge = STATUS_BADGE[String(row.original.isActive)]
          return (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
              {badge.label}
            </span>
          )
        },
      },
      {
        header: 'Acciones',
        id: 'actions',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingStore(row.original)
                setModalOpen(true)
              }}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Editar
            </button>
            {row.original.id !== 'store-default' && (
              <>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <button
                  onClick={() => handleDelete(row.original.id, row.original.name)}
                  disabled={deletingId === row.original.id}
                  className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50 dark:text-red-400"
                >
                  {deletingId === row.original.id ? 'Eliminando...' : 'Eliminar'}
                </button>
              </>
            )}
          </div>
        ),
      },
    ],
    [deletingId],
  )

  const handleOpenCreate = () => {
    setEditingStore(null)
    setModalOpen(true)
  }

  const handleClose = () => {
    setModalOpen(false)
    setEditingStore(null)
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Gestión de Droguerías"
        description="Administra los diferentes establecimientos (Tenants) del sistema."
        action={
          <button
            type="button"
            onClick={handleOpenCreate}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            + Nueva droguería
          </button>
        }
      >
        {/* Stats */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
            <p className="text-sm text-slate-500 dark:text-slate-400">Total droguerías</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{stats.total}</p>
          </article>
          <article className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800/50 dark:bg-emerald-500/10">
            <p className="text-sm text-emerald-600 dark:text-emerald-400">Activas</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-700 dark:text-emerald-300">{stats.active}</p>
          </article>
          <article className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800/50 dark:bg-red-500/10">
            <p className="text-sm text-red-600 dark:text-red-400">Inactivas</p>
            <p className="mt-2 text-2xl font-semibold text-red-700 dark:text-red-300">{stats.inactive}</p>
          </article>
        </div>

        {/* Table */}
        {storesQuery.isLoading ? (
          <div className="py-10 text-center text-sm text-slate-400">Cargando droguerías...</div>
        ) : storesQuery.isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600 dark:border-red-800 dark:bg-red-500/10 dark:text-red-400">
            Error al cargar droguerías
          </div>
        ) : (
          <DataTable columns={columns} data={stores} />
        )}
      </SectionCard>

      <StoreFormModal open={modalOpen} store={editingStore} onClose={handleClose} />
    </div>
  )
}
