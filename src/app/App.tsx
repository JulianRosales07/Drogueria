import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from '../layout/AppShell'
import { LoginPage } from '../modules/auth/pages/LoginPage'
import { DashboardPage } from '../modules/dashboard/pages/DashboardPage'
import { InventoryPage } from '../modules/inventory/pages/InventoryPage'
import { PosPage } from '../modules/pos/pages/PosPage'
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

/** Rutas a las que el Cajero tiene acceso. Cualquier otra ruta de negocio lo redirige a /pos. */
const CASHIER_ALLOWED_PATHS = ['/pos', '/reportes', '/caja']

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
    return <Navigate to={homeRouteFor(user?.role)} replace />
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

  // El Cajero solo puede acceder a Punto de venta, Reportes y Caja
  if (user?.role === CASHIER_ROLE && !CASHIER_ALLOWED_PATHS.includes(location.pathname)) {
    return <Navigate to="/pos" replace />
  }

  return children
}

function homeRouteFor(role: string | undefined) {
  if (role === SUPER_ADMIN_ROLE) return '/droguerias'
  if (role === CASHIER_ROLE) return '/pos'
  return '/dashboard'
}

export function App() {
  const user = useUiStore((state) => state.user)

  return (
    <Routes>
      <Route path="/login" element={<PublicRoute />} />

      <Route element={<ProtectedLayout />}>
        {/* Redirigir raíz según el rol */}
        <Route path="/" element={<Navigate to={homeRouteFor(user?.role)} replace />} />

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

        {/* Módulos exclusivos del Super Administrador */}
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
            <SuperAdminRoute>
              <UsersPage />
            </SuperAdminRoute>
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
