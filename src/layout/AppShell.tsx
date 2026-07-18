import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useMemo } from 'react'
import toast from 'react-hot-toast'
import { useUiStore } from '../store/ui-store'
import { CapsulaLogo } from '../components/CapsulaLogo'

const SUPER_ADMIN_ROLE = 'Super Administrador'

const superAdminNavigation = [
  { label: 'Droguerías', path: '/droguerias', emoji: '🏢' },
  { label: 'Usuarios', path: '/usuarios', emoji: '👥' },
]

const businessNavigation = [
  { label: 'Dashboard', path: '/dashboard', emoji: '📊' },
  { label: 'Punto de venta', path: '/pos', emoji: '🧾' },
  { label: 'Inventario', path: '/inventario', emoji: '📦' },
  { label: 'Clientes', path: '/clientes', emoji: '👤' },
  { label: 'Proveedores', path: '/proveedores', emoji: '🚚' },
  { label: 'Compras', path: '/compras', emoji: '🛒' },
  { label: 'Reportes', path: '/reportes', emoji: '📈' },
  { label: 'Configuración', path: '/configuracion', emoji: '⚙️' },
]

export function AppShell() {
  const location = useLocation()
  const theme = useUiStore((state) => state.theme)
  const sidebarOpen = useUiStore((state) => state.sidebarOpen)
  const toggleSidebar = useUiStore((state) => state.toggleSidebar)
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen)
  const toggleTheme = useUiStore((state) => state.toggleTheme)
  const logout = useUiStore((state) => state.logout)
  const user = useUiStore((state) => state.user)

  const isSuperAdmin = user?.role === SUPER_ADMIN_ROLE
  const navigation = isSuperAdmin ? superAdminNavigation : businessNavigation

  const activeLabel = useMemo(
    () =>
      navigation.find((item) => location.pathname.startsWith(item.path))?.label ??
      (isSuperAdmin ? 'Droguerías' : 'Dashboard'),
    [location.pathname, navigation, isSuperAdmin],
  )

  const handleLogout = () => {
    logout()
    toast.success('Sesión cerrada')
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="flex min-h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-200 bg-white p-4 transition-transform dark:border-slate-800 dark:bg-slate-900 lg:static lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between px-2 py-2">
            <div className="flex items-center gap-2">
              <CapsulaLogo className="w-8 h-8" />
              <div className="leading-tight">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Cápsula
                </p>
                <p className="text-xs text-slate-400 truncate max-w-[130px]" title={user?.storeName || (isSuperAdmin ? 'Super Administrador' : 'Panel administrativo')}>
                  {user?.storeName || (isSuperAdmin ? 'Super Administrador' : 'Panel administrativo')}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="rounded-md border border-slate-200 px-2 py-1 text-xs lg:hidden dark:border-slate-700"
              onClick={() => setSidebarOpen(false)}
            >
              Cerrar
            </button>
          </div>

          {/* User info chip */}
          {user && (
            <div className="mx-2 mt-3 rounded-lg bg-slate-100 p-2.5 dark:bg-slate-800">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{user.fullName}</p>
              <p className="text-xs text-slate-400 truncate">{user.role}</p>
            </div>
          )}

          <nav className="mt-4 space-y-0.5">
            {navigation.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
                      : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`
                }
                onClick={() => setSidebarOpen(false)}
              >
                <span className="text-base leading-none">{item.emoji}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 md:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium dark:border-slate-700 lg:hidden"
                  onClick={toggleSidebar}
                >
                  Menú
                </button>
                <h2 className="text-lg font-semibold">{activeLabel}</h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  onClick={toggleTheme}
                >
                  {theme === 'dark' ? '☀️ Claro' : '🌙 Oscuro'}
                </button>
                <button
                  type="button"
                  className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                  onClick={handleLogout}
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 md:px-6">
            <Outlet />
          </main>
        </div>
      </div>

      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
    </div>
  )
}
