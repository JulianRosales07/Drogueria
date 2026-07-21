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
import { useUiStore } from '../../../store/ui-store'

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

const ALL_PAGES = [
  { key: '/pos', label: 'Punto de venta', icon: '🛒' },
  { key: '/caja', label: 'Caja', icon: '💵' },
  { key: '/facturas', label: 'Facturas', icon: '📄' },
  { key: '/inventario', label: 'Inventario', icon: '📦' },
  { key: '/clientes', label: 'Clientes', icon: '👤' },
  { key: '/proveedores', label: 'Proveedores', icon: '🚚' },
  { key: '/compras', label: 'Compras', icon: '🛍️' },
  { key: '/contabilidad', label: 'Contabilidad', icon: '📊' },
  { key: '/reportes', label: 'Reportes', icon: '📈' },
  { key: '/configuracion', label: 'Configuración', icon: '⚙️' },
  { key: '/usuarios', label: 'Usuarios', icon: '👥' },
]

const PHARMACY_ROLES = ['Administrador de Drogueria', 'Cajero']
const STORE_ROLES = ['Administrador de Tienda', 'Vendedor']
const SUPER_ADMIN_ROLE_NAME = 'Super Administrador'

const OPERATOR_DEFAULT_PAGES = ['/pos', '/facturas', '/caja', '/reportes', '/configuracion']
const ADMIN_DEFAULT_PAGES = ALL_PAGES.map((p) => p.key)

export function UserFormModal({ open, user, onClose }: Props) {
  const queryClient = useQueryClient()
  const currentUser = useUiStore((state) => state.user)
  const isCurrentUserSuperAdmin = currentUser?.role === SUPER_ADMIN_ROLE_NAME
  const isEditing = Boolean(user)

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: getRoles,
    enabled: open,
  })

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: listStores,
    enabled: open && isCurrentUserSuperAdmin,
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

  const [permissions, setPermissions] = useState<string[]>(OPERATOR_DEFAULT_PAGES)

  // Obtener rol seleccionado actualmente en el formulario
  const selectedRole = roles.find((r) => r.id === form.roleId)
  const isSuperAdminRole = selectedRole?.name === SUPER_ADMIN_ROLE_NAME

  // Determinar el tipo de tienda seleccionada para filtrar roles disponibles
  const selectedStore = stores.find((s) => s.id === form.storeId)
  const selectedStoreType = isCurrentUserSuperAdmin
    ? selectedStore?.type ?? null
    : currentUser?.storeType ?? null

  const filteredRoles = useMemo(() => {
    if (isCurrentUserSuperAdmin) {
      if (!selectedStoreType) return roles // Sin tienda seleccionada, mostrar todos los roles
      const allowedNames = selectedStoreType === 'PHARMACY' ? PHARMACY_ROLES : STORE_ROLES
      return roles.filter((r) => allowedNames.includes(r.name) || r.name === SUPER_ADMIN_ROLE_NAME)
    } else {
      // Para Administrador de Droguería o Tienda
      const currentStoreType = currentUser?.storeType ?? 'PHARMACY'
      const allowedNames = currentStoreType === 'PHARMACY' ? PHARMACY_ROLES : STORE_ROLES
      return roles.filter((r) => allowedNames.includes(r.name))
    }
  }, [roles, isCurrentUserSuperAdmin, selectedStoreType, currentUser?.storeType])

  useEffect(() => {
    if (user) {
      setForm({
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        password: '',
        roleId: user.roleId,
        storeId: user.storeId || currentUser?.storeId || '',
        status: user.status,
      })
      setPermissions(user.permissions ?? OPERATOR_DEFAULT_PAGES)
    } else {
      const defaultStoreId = isCurrentUserSuperAdmin ? '' : (currentUser?.storeId || '')
      const defaultRole = filteredRoles[0]?.id ?? ''
      setForm({
        email: '',
        username: '',
        fullName: '',
        password: '',
        roleId: defaultRole,
        storeId: defaultStoreId,
        status: 'ACTIVE',
      })
      setPermissions(OPERATOR_DEFAULT_PAGES)
    }
  }, [user, roles, open, isCurrentUserSuperAdmin, currentUser, filteredRoles])

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

    const effectiveStoreId = isCurrentUserSuperAdmin
      ? (isSuperAdminRole ? null : form.storeId)
      : (currentUser?.storeId || null)

    if (!isSuperAdminRole && !effectiveStoreId) {
      toast.error('Debes seleccionar un establecimiento para este usuario')
      return
    }

    const payload: any = {
      email: form.email,
      username: form.username,
      fullName: form.fullName,
      roleId: form.roleId,
      storeId: effectiveStoreId,
      permissions,
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
      if (field === 'storeId') next.roleId = ''
      return next
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {isEditing ? 'Editar usuario' : 'Nuevo usuario'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isEditing ? 'Modifica los datos del usuario y sus permisos.' : 'Completa los datos para crear un nuevo usuario.'}
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 px-6 py-5">
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

          {/* Establecimiento (Tenancy) */}
          {isCurrentUserSuperAdmin ? (
            !isSuperAdminRole && (
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
            )
          ) : (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Establecimiento Asignado
              </label>
              <div className="w-full rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {currentUser?.storeType === 'STORE' ? '🏪 ' : '💊 '}
                {currentUser?.storeName || 'Establecimiento actual'}
              </div>
            </div>
          )}

          {/* Permisos de Acceso a Páginas */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Permisos de Acceso a Páginas
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPermissions(ADMIN_DEFAULT_PAGES)}
                  className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                >
                  Todas
                </button>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <button
                  type="button"
                  onClick={() => setPermissions(OPERATOR_DEFAULT_PAGES)}
                  className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                >
                  Operación
                </button>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <button
                  type="button"
                  onClick={() => setPermissions([])}
                  className="text-xs text-red-600 hover:underline dark:text-red-400"
                >
                  Ninguna
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-md border border-slate-200 p-3 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
              {ALL_PAGES.map((page) => {
                const isChecked = permissions.includes(page.key)
                return (
                  <label
                    key={page.key}
                    className={`flex items-center gap-2 rounded-md p-2 text-xs font-medium cursor-pointer transition border ${
                      isChecked
                        ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-300'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setPermissions((prev) => [...prev, page.key])
                        } else {
                          setPermissions((prev) => prev.filter((p) => p !== page.key))
                        }
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500 dark:bg-slate-900"
                    />
                    <span>
                      {page.icon} {page.label}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

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

