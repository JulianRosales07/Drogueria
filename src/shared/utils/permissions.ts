/**
 * Permisos por página (users.permissions). Centralizado aquí para que el guard
 * de rutas (App.tsx), el menú (AppShell) y el formulario de usuarios usen
 * exactamente la misma lista y las mismas reglas.
 */

export const SUPER_ADMIN_ROLE = 'Super Administrador'
export const CASHIER_ROLE = 'Cajero'
export const SELLER_ROLE = 'Vendedor'

/** Roles de operación (caja/venta) */
export const OPERATOR_ROLES = [CASHIER_ROLE, SELLER_ROLE]

/** Páginas que se pueden asignar a un usuario */
export const ALL_PAGES = [
  { key: '/dashboard', label: 'Dashboard', icon: '🏠' },
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
] as const

export const ADMIN_DEFAULT_PAGES = ALL_PAGES.map((p) => p.key as string)

export const OPERATOR_DEFAULT_PAGES = ['/pos', '/facturas', '/caja', '/reportes', '/configuracion']

/** Rutas permitidas a los roles de operación cuando no tienen permisos explícitos */
export const OPERATOR_ALLOWED_PATHS = OPERATOR_DEFAULT_PAGES

type PermissionUser = {
  role?: string
  permissions?: string[] | null
} | null

const isOperator = (user: PermissionUser) => Boolean(user?.role && OPERATOR_ROLES.includes(user.role))

/**
 * Permisos efectivos de un usuario administrador.
 *
 * El Dashboard no existía en la lista de páginas asignables, así que los
 * usuarios creados antes quedaron con un arreglo de permisos sin `/dashboard`
 * y el guard los expulsaba de su propio panel. Para los roles administrativos
 * el Dashboard se considera siempre permitido; a los roles de operación se les
 * sigue respetando la lista tal cual.
 */
export function effectivePermissions(user: PermissionUser): string[] | null {
  const permissions = user?.permissions
  if (!permissions || permissions.length === 0) return null

  if (!isOperator(user) && !permissions.includes('/dashboard')) {
    return ['/dashboard', ...permissions]
  }

  return permissions
}

/** ¿El usuario puede entrar a esta ruta? */
export function canAccessPath(user: PermissionUser, pathname: string): boolean {
  const permissions = effectivePermissions(user)
  if (!permissions) return true
  return permissions.includes(pathname)
}

/** Ruta a la que enviar al usuario cuando la actual no está permitida */
export function fallbackPathFor(user: PermissionUser): string {
  const permissions = effectivePermissions(user)
  return permissions?.[0] ?? (isOperator(user) ? '/pos' : '/dashboard')
}
