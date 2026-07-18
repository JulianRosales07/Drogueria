import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
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
import { useUiStore } from '../store/ui-store'

const SUPER_ADMIN_ROLE = 'Super Administrador'

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
    const redirectTo = user?.role === SUPER_ADMIN_ROLE ? '/droguerias' : '/dashboard'
    return <Navigate to={redirectTo} replace />
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

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.role === SUPER_ADMIN_ROLE) {
    return <Navigate to="/droguerias" replace />
  }

  return children
}

export function App() {
  const user = useUiStore((state) => state.user)
  const isSuperAdmin = user?.role === SUPER_ADMIN_ROLE

  return (
    <Routes>
      <Route path="/login" element={<PublicRoute />} />

      <Route element={<ProtectedLayout />}>
        {/* Redirigir raíz según el rol */}
        <Route
          path="/"
          element={<Navigate to={isSuperAdmin ? '/droguerias' : '/dashboard'} replace />}
        />

        <Route
          path="/pos"
          element={
            <BusinessRoute>
              <PosPage />
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
