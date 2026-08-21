import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import toast from 'react-hot-toast'
import { DataTable } from '../../../components/ui/DataTable'
import { SectionCard } from '../../../components/ui/SectionCard'
import {
  listStores,
  deleteStore,
  extendStoreTrial,
  updateStoreSubscription,
  type StoreRecord,
} from '../../../services/api/stores'
import { StoreFormModal } from '../components/StoreFormModal'

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  true: { label: 'Habilitado', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
  false: { label: 'Deshabilitado', className: 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400' },
}

export function StoresPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingStore, setEditingStore] = useState<StoreRecord | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [extendingId, setExtendingId] = useState<string | null>(null)

  const storesQuery = useQuery({
    queryKey: ['stores'],
    queryFn: listStores,
  })

  const stores = storesQuery.data ?? []

  const stats = useMemo(() => {
    const total = stores.length
    const active = stores.filter((s) => s.isActive).length
    const inTrial = stores.filter((s) => s.subscriptionStatus === 'TRIAL' && !s.isTrialExpired).length
    const expired = stores.filter((s) => s.subscriptionStatus === 'EXPIRED' || (s.subscriptionStatus === 'TRIAL' && s.isTrialExpired)).length
    return { total, active, inTrial, expired }
  }, [stores])

  const deleteMutation = useMutation({
    mutationFn: deleteStore,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] })
      toast.success('Establecimiento eliminado correctamente')
      setDeletingId(null)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Error al eliminar el establecimiento')
      setDeletingId(null)
    },
  })

  const extendMutation = useMutation({
    mutationFn: ({ id, days }: { id: string; days: number }) => extendStoreTrial(id, days),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['stores'] })
      toast.success(`Prueba extendida por +${vars.days} días`)
      setExtendingId(null)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Error al extender los días de prueba')
      setExtendingId(null)
    },
  })

  const activateMutation = useMutation({
    mutationFn: (id: string) => updateStoreSubscription(id, { subscriptionStatus: 'ACTIVE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] })
      toast.success('Establecimiento activado permanentemente')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Error al activar el establecimiento')
    },
  })

  const handleDelete = (storeId: string, name: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el establecimiento "${name}"? Se eliminarán todos sus datos.`)) return
    setDeletingId(storeId)
    deleteMutation.mutate(storeId)
  }

  const handleExtend = (storeId: string, days: number) => {
    setExtendingId(storeId)
    extendMutation.mutate({ id: storeId, days })
  }

  const columns = useMemo<ColumnDef<StoreRecord>[]>(
    () => [
      {
        header: 'Nombre',
        accessorKey: 'name',
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-slate-900 dark:text-white">
              {row.original.type === 'STORE' ? '🏪 ' : '💊 '}
              {row.original.name}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">NIT: {row.original.nit || 'No definido'}</p>
          </div>
        ),
      },
      {
        header: 'Tipo',
        accessorKey: 'type',
        cell: ({ row }) => (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            row.original.type === 'STORE'
              ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
          }`}>
            {row.original.type === 'STORE' ? 'Tienda General' : 'Droguería / Farmacia'}
          </span>
        ),
      },
      {
        header: 'Plan / Período de Prueba',
        accessorKey: 'subscriptionStatus',
        cell: ({ row }) => {
          const s = row.original
          if (s.subscriptionStatus === 'ACTIVE') {
            return (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
                💎 Plan Permanente
              </span>
            )
          }
          if (s.isTrialExpired || s.subscriptionStatus === 'EXPIRED') {
            return (
              <div className="space-y-0.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-500/10 dark:text-red-300">
                  🔴 Prueba Vencida
                </span>
                <p className="text-[11px] text-red-600 dark:text-red-400">Solo lectura</p>
              </div>
            )
          }
          if (s.subscriptionStatus === 'SUSPENDED') {
            return (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                ⏸️ Suspendido
              </span>
            )
          }
          // TRIAL activo
          const days = s.daysRemaining ?? 0
          const isEndingSoon = days <= 3
          return (
            <div className="space-y-0.5">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isEndingSoon
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-300'
              }`}>
                ⏳ {days} {days === 1 ? 'día restante' : 'días restantes'}
              </span>
              {s.trialEndsAt && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Vence: {new Date(s.trialEndsAt).toLocaleDateString('es-CO')}
                </p>
              )}
            </div>
          )
        },
      },
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
        cell: ({ row }) => {
          const s = row.original
          const isExtending = extendingId === s.id
          return (
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => {
                  setEditingStore(s)
                  setModalOpen(true)
                }}
                className="text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Editar
              </button>

              {/* Botón rápido para extender prueba */}
              {s.subscriptionStatus !== 'ACTIVE' && (
                <>
                  <span className="text-slate-300 dark:text-slate-600">|</span>
                  <button
                    onClick={() => handleExtend(s.id, 15)}
                    disabled={isExtending}
                    className="inline-flex items-center rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                    title="Agregar 15 días de prueba"
                  >
                    +15d
                  </button>
                  <button
                    onClick={() => handleExtend(s.id, 30)}
                    disabled={isExtending}
                    className="inline-flex items-center rounded border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[11px] font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50 dark:border-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                    title="Agregar 30 días de prueba"
                  >
                    +30d
                  </button>
                  <button
                    onClick={() => activateMutation.mutate(s.id)}
                    className="inline-flex items-center rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                    title="Activar plan permanente sin vencimiento"
                  >
                    Activar
                  </button>
                </>
              )}

              {s.id !== 'store-default' && (
                <>
                  <span className="text-slate-300 dark:text-slate-600">|</span>
                  <button
                    onClick={() => handleDelete(s.id, s.name)}
                    disabled={deletingId === s.id}
                    className="text-xs sm:text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50 dark:text-red-400"
                  >
                    {deletingId === s.id ? '...' : 'Eliminar'}
                  </button>
                </>
              )}
            </div>
          )
        },
      },
    ],
    [deletingId, extendingId],
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
        title="Gestión de Establecimientos"
        description="Administra los diferentes comercios y establecimientos del sistema."
        action={
          <button
            type="button"
            onClick={handleOpenCreate}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            + Nuevo establecimiento
          </button>
        }
      >
        {/* Stats */}
        <div className="mb-6 grid gap-4 grid-cols-2 lg:grid-cols-4">
          <article className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Total establecimientos</p>
            <p className="mt-1 text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">{stats.total}</p>
          </article>
          <article className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800/50 dark:bg-emerald-500/10">
            <p className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">Habilitadas</p>
            <p className="mt-1 text-xl sm:text-2xl font-semibold text-emerald-700 dark:text-emerald-300">{stats.active}</p>
          </article>
          <article className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800/50 dark:bg-blue-500/10">
            <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400">En Prueba Activa</p>
            <p className="mt-1 text-xl sm:text-2xl font-semibold text-blue-700 dark:text-blue-300">{stats.inTrial}</p>
          </article>
          <article className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800/50 dark:bg-red-500/10">
            <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">Pruebas Vencidas</p>
            <p className="mt-1 text-xl sm:text-2xl font-semibold text-red-700 dark:text-red-300">{stats.expired}</p>
          </article>
        </div>

        {/* Table */}
        {storesQuery.isLoading ? (
          <div className="py-10 text-center text-sm text-slate-400">Cargando establecimientos...</div>
        ) : storesQuery.isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600 dark:border-red-800 dark:bg-red-500/10 dark:text-red-400">
            Error al cargar establecimientos
          </div>
        ) : (
          <DataTable columns={columns} data={stores} />
        )}
      </SectionCard>

      <StoreFormModal open={modalOpen} store={editingStore} onClose={handleClose} />
    </div>
  )
}
