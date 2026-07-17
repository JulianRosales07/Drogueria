import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import toast from 'react-hot-toast'
import { DataTable } from '../../../components/ui/DataTable'
import { SectionCard } from '../../../components/ui/SectionCard'
import { listUsers, deleteUser, type UserRecord } from '../../../services/api/users'
import { UserFormModal } from '../components/UserFormModal'

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: 'Activo', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
  BLOCKED: { label: 'Bloqueado', className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
  DISABLED: { label: 'Deshabilitado', className: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' },
}

export function UsersPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: listUsers,
  })

  const users = usersQuery.data ?? []

  const stats = useMemo(() => {
    const total = users.length
    const active = users.filter((u) => u.status === 'ACTIVE').length
    const blocked = users.filter((u) => u.status === 'BLOCKED').length
    return { total, active, blocked }
  }, [users])

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Usuario eliminado correctamente')
      setDeletingId(null)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Error al eliminar usuario')
      setDeletingId(null)
    },
  })

  const handleDelete = (userId: string, userEmail: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar al usuario "${userEmail}"? Esta acción no se puede deshacer.`)) return
    setDeletingId(userId)
    deleteMutation.mutate(userId)
  }

  const columns = useMemo<ColumnDef<UserRecord>[]>(
    () => [
      {
        header: 'Nombre completo',
        accessorKey: 'fullName',
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-slate-900 dark:text-white">{row.original.fullName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{row.original.username}</p>
          </div>
        ),
      },
      { header: 'Correo electrónico', accessorKey: 'email' },
      {
        header: 'Rol',
        accessorKey: 'roleName',
        cell: ({ row }) => (
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
            {row.original.roleName ?? 'Sin rol'}
          </span>
        ),
      },
      {
        header: 'Droguería',
        accessorKey: 'storeName',
        cell: ({ row }) => (
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {row.original.storeName ?? 'Global (Super Admin)'}
          </span>
        ),
      },
      {
        header: 'Estado',
        accessorKey: 'status',
        cell: ({ row }) => {
          const badge = STATUS_BADGE[row.original.status] ?? STATUS_BADGE['DISABLED']
          return (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
              {badge.label}
            </span>
          )
        },
      },
      {
        header: 'Último acceso',
        accessorKey: 'lastLoginAt',
        cell: ({ row }) =>
          row.original.lastLoginAt
            ? new Date(row.original.lastLoginAt).toLocaleDateString('es-CO', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
            : 'Nunca',
      },
      {
        header: 'Acciones',
        id: 'actions',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingUser(row.original)
                setModalOpen(true)
              }}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Editar
            </button>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <button
              onClick={() => handleDelete(row.original.id, row.original.email)}
              disabled={deletingId === row.original.id}
              className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50 dark:text-red-400"
            >
              {deletingId === row.original.id ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        ),
      },
    ],
    [deletingId],
  )

  const handleOpenCreate = () => {
    setEditingUser(null)
    setModalOpen(true)
  }

  const handleClose = () => {
    setModalOpen(false)
    setEditingUser(null)
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Gestión de Usuarios"
        description="Administra los usuarios del sistema y sus roles de acceso."
        action={
          <button
            type="button"
            onClick={handleOpenCreate}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            + Nuevo usuario
          </button>
        }
      >
        {/* Stats */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
            <p className="text-sm text-slate-500 dark:text-slate-400">Total usuarios</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{stats.total}</p>
          </article>
          <article className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800/50 dark:bg-emerald-500/10">
            <p className="text-sm text-emerald-600 dark:text-emerald-400">Usuarios activos</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-700 dark:text-emerald-300">{stats.active}</p>
          </article>
          <article className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/50 dark:bg-amber-500/10">
            <p className="text-sm text-amber-600 dark:text-amber-400">Bloqueados / Inactivos</p>
            <p className="mt-2 text-2xl font-semibold text-amber-700 dark:text-amber-300">{stats.blocked}</p>
          </article>
        </div>

        {/* Table */}
        {usersQuery.isLoading ? (
          <div className="py-10 text-center text-sm text-slate-400">Cargando usuarios...</div>
        ) : usersQuery.isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600 dark:border-red-800 dark:bg-red-500/10 dark:text-red-400">
            Error al cargar usuarios
          </div>
        ) : (
          <DataTable columns={columns} data={users} />
        )}
      </SectionCard>

      <UserFormModal open={modalOpen} user={editingUser} onClose={handleClose} />
    </div>
  )
}
