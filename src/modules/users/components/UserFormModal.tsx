import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  createUser,
  updateUser,
  getRoles,
  type UserRecord,
  type CreateUserInput,
} from '../../../services/api/users'
import { listStores } from '../../../services/api/stores'

type Props = {
  open: boolean
  user: UserRecord | null
  onClose: () => void
}

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Activo' },
  { value: 'BLOCKED', label: 'Bloqueado' },
  { value: 'DISABLED', label: 'Deshabilitado' },
]

export function UserFormModal({ open, user, onClose }: Props) {
  const queryClient = useQueryClient()
  const isEditing = Boolean(user)

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: getRoles,
  })

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: listStores,
    enabled: open,
  })

  const [form, setForm] = useState({
    email: '',
    username: '',
    fullName: '',
    password: '',
    roleId: '',
    storeId: '',
    status: 'ACTIVE',
  })

  // Obtener rol seleccionado actualmente
  const selectedRole = roles.find((r) => r.id === form.roleId)
  const isSuperAdminRole = selectedRole?.name === 'Super Administrador'

  // Determinar el tipo de tienda seleccionada para filtrar roles disponibles
  const selectedStore = stores.find((s) => s.id === form.storeId)
  const selectedStoreType = selectedStore?.type ?? null

  // Roles disponibles según el tipo de tienda seleccionada
  const PHARMACY_ROLES = ['Administrador de Drogueria', 'Cajero']
  const STORE_ROLES = ['Administrador de Tienda', 'Vendedor']
  const SUPER_ADMIN_ROLE_NAME = 'Super Administrador'

  const filteredRoles = useMemo(() => {
    if (!selectedStoreType) return roles // Sin tienda seleccionada, mostrar todos
    const allowedNames = selectedStoreType === 'PHARMACY' ? PHARMACY_ROLES : STORE_ROLES
    return roles.filter((r) => allowedNames.includes(r.name) || r.name === SUPER_ADMIN_ROLE_NAME)
  }, [roles, selectedStoreType])

  useEffect(() => {
    if (user) {
      setForm({
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        password: '',
        roleId: user.roleId,
        storeId: user.storeId || '',
        status: user.status,
      })
    } else {
      setForm({
        email: '',
        username: '',
        fullName: '',
        password: '',
        roleId: roles[0]?.id ?? '',
        storeId: '',
        status: 'ACTIVE',
      })
    }
  }, [user, roles, open])

  const createMutation = useMutation({
    mutationFn: (input: CreateUserInput & { storeId?: string | null }) => createUser(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Usuario creado correctamente')
      onClose()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Error al crear usuario')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (input: Partial<CreateUserInput> & { storeId?: string | null }) =>
      updateUser(user!.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Usuario actualizado correctamente')
      onClose()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Error al actualizar usuario')
    },
  })

  const isLoading = createMutation.isPending || updateMutation.isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.email || !form.username || !form.fullName || !form.roleId) {
      toast.error('Completa todos los campos obligatorios')
      return
    }

    if (!isEditing && !form.password) {
      toast.error('La contraseña es obligatoria al crear un usuario')
      return
    }

    if (!isSuperAdminRole && !form.storeId) {
      toast.error('Debes seleccionar un establecimiento para este usuario')
      return
    }

    const payload: any = {
      email: form.email,
      username: form.username,
      fullName: form.fullName,
      roleId: form.roleId,
      storeId: isSuperAdminRole ? null : form.storeId,
      status: form.status,
    }

    if (form.password) payload.password = form.password

    if (isEditing) {
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleChange = (field: string, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      // Al cambiar la tienda, limpiar el rol seleccionado para evitar combinaciones inválidas
      if (field === 'storeId') next.roleId = ''
      return next
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {isEditing ? 'Editar usuario' : 'Nuevo usuario'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isEditing ? 'Modifica los datos del usuario.' : 'Completa los datos para crear un nuevo usuario.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {/* Nombre completo */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Nombre completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              placeholder="Ej: Juan Pérez"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
            />
          </div>

          {/* Email y Username */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Correo electrónico <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Usuario <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => handleChange('username', e.target.value)}
                placeholder="usuario123"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
              />
            </div>
          </div>

          {/* Contraseña */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Contraseña {!isEditing && <span className="text-red-500">*</span>}
              {isEditing && <span className="text-xs text-slate-400 ml-1">(dejar en blanco para no cambiar)</span>}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => handleChange('password', e.target.value)}
              placeholder={isEditing ? 'Nueva contraseña (opcional)' : 'Mínimo 8 caracteres'}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
            />
          </div>

          {/* Rol y Estado */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Rol <span className="text-red-500">*</span>
              </label>
              <select
                value={form.roleId}
                onChange={(e) => handleChange('roleId', e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                <option value="">Seleccionar rol</option>
                {filteredRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Estado
              </label>
              <select
                value={form.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Establecimiento (Tenancy) - Ocultar si es Super Admin */}
          {!isSuperAdminRole && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Establecimiento Asignado <span className="text-red-500">*</span>
              </label>
              <select
                value={form.storeId}
                onChange={(e) => handleChange('storeId', e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                <option value="">Seleccionar establecimiento</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id} disabled={!s.isActive}>
                    {s.type === 'STORE' ? '🏪 ' : '💊 '}
                    {s.name} {!s.isActive && '(Inactiva)'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {isLoading ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
