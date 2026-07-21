import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useMemo, useState, type ReactElement } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useUiStore } from '../store/ui-store'
import { useStoreContext } from '../hooks/useStoreContext'
import { getDashboardSummary } from '../services/api/dashboard'
import CapsulaLogos from '../assets/Capsulas.png'
import {
  BagIcon,
  BoxIcon,
  BuildingIcon,
  CartIcon,
  CashIcon,
  ChartIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  GearIcon,
  HomeIcon,
  LogOutIcon,
  MenuIcon,
  MoonIcon,
  SearchIcon,
  SunIcon,
  TruckIcon,
  UserIcon,
  UsersIcon,
  XIcon,
} from '../components/icons'

const SUPER_ADMIN_ROLE = 'Super Administrador'
const CASHIER_ROLE = 'Cajero'
const SELLER_ROLE = 'Vendedor'
const OPERATOR_ROLES = [CASHIER_ROLE, SELLER_ROLE]

type NavItem = {
  label: string
  path: string
  icon: (props: { className?: string }) => ReactElement
  badgeKey?: 'lowStock'
}

type NavGroup = {
  title: string
  items: NavItem[]
}

const superAdminGroups: NavGroup[] = [
  {
    title: 'Administración',
    items: [
      { label: 'Establecimientos', path: '/droguerias', icon: BuildingIcon },
      { label: 'Usuarios', path: '/usuarios', icon: UsersIcon },
    ],
  },
]

const businessGroups: NavGroup[] = [
  {
    title: 'General',
    items: [{ label: 'Dashboard', path: '/dashboard', icon: HomeIcon }],
  },
  {
    title: 'Operación',
    items: [
      { label: 'Punto de venta', path: '/pos', icon: CartIcon },
      { label: 'Caja', path: '/caja', icon: CashIcon },
      { label: 'Inventario', path: '/inventario', icon: BoxIcon, badgeKey: 'lowStock' },
      { label: 'Compras', path: '/compras', icon: BagIcon },
    ],
  },
  {
    title: 'Contactos',
    items: [
      { label: 'Clientes', path: '/clientes', icon: UserIcon },
      { label: 'Proveedores', path: '/proveedores', icon: TruckIcon },
    ],
  },
  {
    title: 'Otros',
    items: [
      { label: 'Reportes', path: '/reportes', icon: ChartIcon },
      { label: 'Configuración', path: '/configuracion', icon: GearIcon },
    ],
  },
]

// El Cajero solo debe ver Punto de venta, Caja, Reportes y Configuración
const cashierGroups: NavGroup[] = [
  {
    title: 'Operación',
    items: [
      { label: 'Punto de venta', path: '/pos', icon: CartIcon },
      { label: 'Caja', path: '/caja', icon: CashIcon },
    ],
  },
  {
    title: 'Otros',
    items: [
      { label: 'Reportes', path: '/reportes', icon: ChartIcon },
      { label: 'Configuración', path: '/configuracion', icon: GearIcon },
    ],
  },
]

export function AppShell() {
  const location = useLocation()
  const [search, setSearch] = useState('')

  const theme = useUiStore((state) => state.theme)
  const sidebarOpen = useUiStore((state) => state.sidebarOpen)
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useUiStore((state) => state.toggleSidebar)
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen)
  const toggleSidebarCollapsed = useUiStore((state) => state.toggleSidebarCollapsed)
  const toggleTheme = useUiStore((state) => state.toggleTheme)
  const logout = useUiStore((state) => state.logout)
  const user = useUiStore((state) => state.user)

  const isSuperAdmin = user?.role === SUPER_ADMIN_ROLE
  const isOperator = user?.role ? OPERATOR_ROLES.includes(user.role) : false
  const { storeTerm } = useStoreContext()
  const groups = isSuperAdmin ? superAdminGroups : isOperator ? cashierGroups : businessGroups

  const { data: summary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: getDashboardSummary,
    enabled: !isSuperAdmin && !isOperator,
  })

  const badgeValues: Partial<Record<NonNullable<NavItem['badgeKey']>, number>> = {
    lowStock: summary?.lowStock?.length ?? 0,
  }

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups
    const term = search.trim().toLowerCase()
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.label.toLowerCase().includes(term)),
      }))
      .filter((group) => group.items.length > 0)
  }, [groups, search])

  const allItems = useMemo(() => groups.flatMap((g) => g.items), [groups])
  const activeLabel = useMemo(
    () =>
      allItems.find((item) => location.pathname.startsWith(item.path))?.label ??
      (isSuperAdmin ? 'Droguerías' : isOperator ? 'Punto de venta' : 'Dashboard'),
    [location.pathname, allItems, isSuperAdmin, isOperator],
  )

  const handleLogout = () => {
    logout()
    toast.success('Sesión cerrada')
    window.location.href = '/login'
  }

  const initials = (user?.fullName || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  const isPos = location.pathname.startsWith('/pos')

  return (
    <div className="h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="flex h-full">
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex border-r border-slate-200 bg-white transition-transform dark:border-slate-800 dark:bg-slate-900 lg:static lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Rail de iconos, siempre visible */}
          <div className="flex w-16 flex-col items-center gap-1 border-r border-slate-200 bg-slate-950 py-4 dark:border-slate-800">
            <div className="mb-3 flex h-9 w-9 items-center justify-center">
              <img src={CapsulaLogos} alt="Capsula" className="h-10 w-10" />
            </div>
            <div className="flex flex-1 flex-col items-center gap-1 overflow-x-hidden overflow-y-auto">
              {allItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path)
                const Icon = item.icon
                const badge = item.badgeKey ? badgeValues[item.badgeKey] : undefined
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={item.label}
                    onClick={() => setSidebarOpen(false)}
                    className={`relative flex h-10 w-10 items-center justify-center rounded-lg transition ${
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {badge ? (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-500 px-1 text-[10px] font-semibold text-white">
                        {badge}
                      </span>
                    ) : null}
                  </NavLink>
                )
              })}
            </div>
            {sidebarCollapsed ? (
              <div className="flex flex-col items-center gap-1 border-t border-white/10 pt-2">
                <button
                  type="button"
                  title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                  onClick={toggleTheme}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-white"
                >
                  {theme === 'dark' ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  title="Cerrar sesión"
                  onClick={handleLogout}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-white"
                >
                  <LogOutIcon className="h-4 w-4" />
                </button>
              </div>
            ) : null}
            <button
              type="button"
              title={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
              onClick={toggleSidebarCollapsed}
              className="mt-2 flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              {sidebarCollapsed ? (
                <ChevronRightIcon className="h-4 w-4" />
              ) : (
                <ChevronLeftIcon className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Panel expandido con grupos, buscador y detalle */}
          {!sidebarCollapsed ? (
            <div className="flex w-64 flex-col p-3">
              <div className="flex items-center justify-between px-1 py-1">
                <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate text-sm font-semibold text-slate-900 dark:text-white">
                      <img
                        src={CapsulaLogos}
                        alt="Cápsula"
                        className="h-12 w-12"
                      />
                      <span>Cápsula</span>
                    </p>
                  <p
                    className="truncate text-xs text-slate-400"
                    title={user?.storeName || (isSuperAdmin ? 'Super Administrador' : storeTerm)}
                  >
                    {user?.storeName || (isSuperAdmin ? 'Super Administrador' : storeTerm)}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
                  onClick={() => setSidebarOpen(false)}
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>

              {/* Chip de usuario */}
              {user ? (
                <div className="mt-3 flex items-center gap-2.5 rounded-lg bg-slate-100 p-2.5 dark:bg-slate-800">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white dark:bg-white dark:text-slate-900">
                    {initials}
                  </div>
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-300">
                      {user.fullName}
                    </p>
                    <p className="truncate text-xs text-slate-400">{user.role}</p>
                  </div>
                </div>
              ) : null}

              {/* Buscador de navegación */}
              <div className="relative mt-3">
                <SearchIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar en el menú"
                  className="w-full rounded-md border border-slate-200 bg-white py-1.5 pl-8 pr-2 text-xs text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                />
              </div>

              <nav className="mt-3 flex-1 space-y-4 overflow-y-auto pr-1">
                {filteredGroups.map((group) => (
                  <div key={group.title}>
                    <p className="px-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      {group.title}
                    </p>
                    <div className="mt-1 space-y-0.5">
                      {group.items.map((item) => {
                        const Icon = item.icon
                        const badge = item.badgeKey ? badgeValues[item.badgeKey] : undefined
                        return (
                          <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                              `flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition ${
                                isActive
                                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
                                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                              }`
                            }
                            onClick={() => setSidebarOpen(false)}
                          >
                            <Icon className="h-4.5 w-4.5 shrink-0" />
                            <span className="truncate">{item.label}</span>
                            {badge ? (
                              <span className="ml-auto rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                {badge}
                              </span>
                            ) : null}
                          </NavLink>
                        )
                      })}
                    </div>
                  </div>
                ))}
                {filteredGroups.length === 0 ? (
                  <p className="px-2 text-xs text-slate-400">Sin resultados</p>
                ) : null}
              </nav>

              {/* Tema y cierre de sesión */}
              <div className="mt-2 space-y-1.5 border-t border-slate-200 pt-2 dark:border-slate-800">
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                  onClick={toggleTheme}
                >
                  {theme === 'dark' ? (
                    <SunIcon className="h-4.5 w-4.5 shrink-0" />
                  ) : (
                    <MoonIcon className="h-4.5 w-4.5 shrink-0" />
                  )}
                  {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                  onClick={handleLogout}
                >
                  <LogOutIcon className="h-4.5 w-4.5 shrink-0" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          ) : null}
        </aside>

        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          {!isPos ? (
            <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 md:px-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="rounded-md border border-slate-200 p-1.5 dark:border-slate-700 lg:hidden"
                  onClick={toggleSidebar}
                >
                  <MenuIcon className="h-4 w-4" />
                </button>
                <h2 className="text-lg font-semibold">{activeLabel}</h2>
              </div>
            </header>
          ) : (
            <button
              type="button"
              className="absolute left-2 top-2 z-30 rounded-md border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:hidden"
              onClick={toggleSidebar}
            >
              <MenuIcon className="h-4 w-4" />
            </button>
          )}

          <main className={isPos ? 'flex-1 overflow-hidden' : 'flex-1 overflow-y-auto px-4 py-6 md:px-6'}>
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
