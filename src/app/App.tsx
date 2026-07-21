import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from '../layout/AppShell'
import { LoginPage } from '../modules/auth/pages/LoginPage'
import { DashboardPage } from '../modules/dashboard/pages/DashboardPage'
import { InventoryPage } from '../modules/inventory/pages/InventoryPage'
import { PosPage } from '../modules/pos/pages/PosPage'
import { InvoicesPage } from '../modules/invoices/pages/InvoicesPage'
import { AccountingPage } from '../modules/accounting/pages/AccountingPage'
import { CustomersPage } from '../modules/customers/pages/CustomersPage'
import { SuppliersPage } from '../modules/suppliers/pages/SuppliersPage'
import { PurchasesPage } from '../modules/purchases/pages/PurchasesPage'
import { ReportsPage } from '../modules/reports/pages/ReportsPage'
import { SettingsPage } from '../modules/settings/pages/SettingsPage'
import { UsersPage } from '../modules/users/pages/UsersPage'
import { StoresPage } from '../modules/stores/pages/StoresPage'
import { CashRegisterPage } from '../modules/cash-register/pages/CashRegisterPage'
import { useUiStore } from '../store/ui-store'

const SUPER_ADMIN_ROLE = 'Super Administrador'
const CASHIER_ROLE = 'Cajero'
const SELLER_ROLE = 'Vendedor'

/** Roles con permisos tipo cajero (redirección por defecto a POS). */
const OPERATOR_ROLES = [CASHIER_ROLE, SELLER_ROLE]

/** Rutas a las que los roles de caja/venta tienen acceso. Cualquier otra ruta de negocio los redirige a /pos. */
const OPERATOR_ALLOWED_PATHS = ['/pos', '/facturas', '/reportes', '/caja', '/configuracion']

function ProtectedLayout() {
  const isAuthenticated = useUiStore((state) => state.isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <AppShell />
}

function PublicRoute() {
  const isAuthenticated = useUiStore((state) => state.isAuthenticated)
  const user = useUiStore((state) => state.user)

  if (isAuthenticated) {
    return <Navigate to={homeRouteFor(user)} replace />
  }

  return <LoginPage />
}

/** Ruta solo accesible para el Super Administrador */
function SuperAdminRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useUiStore((state) => state.isAuthenticated)
  const user = useUiStore((state) => state.user)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.role !== SUPER_ADMIN_ROLE) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

/** Ruta accesible para cualquier tipo de administrador (Super Admin, Admin de Droguería, Admin de Tienda) */
function AdminRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useUiStore((state) => state.isAuthenticated)
  const user = useUiStore((state) => state.user)
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.role && OPERATOR_ROLES.includes(user.role)) {
    return <Navigate to="/pos" replace />
  }

  if (user?.role !== SUPER_ADMIN_ROLE && user?.permissions && user.permissions.length > 0) {
    if (!user.permissions.includes(location.pathname)) {
      const fallback = user.permissions[0] || '/pos'
      return <Navigate to={fallback} replace />
    }
  }

  return children
}

/** Ruta solo accesible para roles de negocio (no Super Admin) */
function BusinessRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useUiStore((state) => state.isAuthenticated)
  const user = useUiStore((state) => state.user)
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.role === SUPER_ADMIN_ROLE) {
    return <Navigate to="/droguerias" replace />
  }

  // Verificar si hay permisos explícitos asignados al usuario
  if (user?.permissions && user.permissions.length > 0) {
    if (!user.permissions.includes(location.pathname)) {
      const fallback = user.permissions[0] || '/pos'
      return <Navigate to={fallback} replace />
    }
  } else if (user?.role && OPERATOR_ROLES.includes(user.role) && !OPERATOR_ALLOWED_PATHS.includes(location.pathname)) {
    return <Navigate to="/pos" replace />
  }

  return children
}

function homeRouteFor(user: { role?: string; permissions?: string[] | null } | null) {
  if (user?.role === SUPER_ADMIN_ROLE) return '/droguerias'
  if (user?.permissions && user.permissions.length > 0) return user.permissions[0]
  if (user?.role && OPERATOR_ROLES.includes(user.role)) return '/pos'
  return '/dashboard'
}

export function App() {
  const user = useUiStore((state) => state.user)

  return (
    <Routes>
      <Route path="/login" element={<PublicRoute />} />

      <Route element={<ProtectedLayout />}>
        {/* Redirigir raíz según el rol y permisos */}
        <Route path="/" element={<Navigate to={homeRouteFor(user)} replace />} />

        <Route
          path="/pos"
          element={
            <BusinessRoute>
              <PosPage />
            </BusinessRoute>
          }
        />
        <Route
          path="/caja"
          element={
            <BusinessRoute>
              <CashRegisterPage />
            </BusinessRoute>
          }
        />
        <Route
          path="/facturas"
          element={
            <BusinessRoute>
              <InvoicesPage />
            </BusinessRoute>
          }
        />
        <Route
          path="/contabilidad"
          element={
            <BusinessRoute>
              <AccountingPage />
            </BusinessRoute>
          }
        />

        {/* Módulos de administración */}
        <Route
          path="/droguerias"
          element={
            <SuperAdminRoute>
              <StoresPage />
            </SuperAdminRoute>
          }
        />
        <Route
          path="/usuarios"
          element={
            <AdminRoute>
              <UsersPage />
            </AdminRoute>
          }
        />

        {/* Módulos de negocio (solo Administrador de Droguería / Cajero) */}
        <Route
          path="/dashboard"
          element={
            <BusinessRoute>
              <DashboardPage />
            </BusinessRoute>
          }
        />
        <Route
          path="/inventario"
          element={
            <BusinessRoute>
              <InventoryPage />
            </BusinessRoute>
          }
        />
        <Route
          path="/clientes"
          element={
            <BusinessRoute>
              <CustomersPage />
            </BusinessRoute>
          }
        />
        <Route
          path="/proveedores"
          element={
            <BusinessRoute>
              <SuppliersPage />
            </BusinessRoute>
          }
        />
        <Route
          path="/compras"
          element={
            <BusinessRoute>
              <PurchasesPage />
            </BusinessRoute>
          }
        />
        <Route
          path="/reportes"
          element={
            <BusinessRoute>
              <ReportsPage />
            </BusinessRoute>
          }
        />
        <Route
          path="/configuracion"
          element={
            <BusinessRoute>
              <SettingsPage />
            </BusinessRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
