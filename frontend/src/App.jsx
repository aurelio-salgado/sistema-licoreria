import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { AppLayout } from './layout/AppLayout'
import { DashboardPage } from './pages/DashboardPage'
import { ForbiddenPage } from './pages/ForbiddenPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { CatalogPage } from './pages/CatalogPage'
import { ProductsPage } from './pages/ProductsPage'
import { DirectoryPage } from './pages/DirectoryPage'
import { PurchaseDetailPage } from './pages/PurchaseDetailPage'
import { PurchasesPage } from './pages/PurchasesPage'
import { SaleDetailPage } from './pages/SaleDetailPage'
import { SalesPage } from './pages/SalesPage'
import { CashDetailPage } from './pages/CashDetailPage'
import { CashPage } from './pages/CashPage'
import { InventoryPage } from './pages/InventoryPage'
import { RolesPage } from './pages/RolesPage'
import { UsersPage } from './pages/UsersPage'
import { SettingsPage } from './pages/SettingsPage'
import { AuditPage } from './pages/AuditPage'
import { ReportsPage } from './pages/ReportsPage'
import { BackupsPage } from './pages/BackupsPage'
import { PermissionRoute } from './routes/PermissionRoute'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { PublicOnlyRoute } from './routes/PublicOnlyRoute'
import { PublicCatalogLayout } from './layout/PublicCatalogLayout'
import { PublicCatalogPage } from './pages/PublicCatalogPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />

          <Route element={<PublicCatalogLayout />}>
            <Route path="catalog" element={<PublicCatalogPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route
                index
                element={
                  <PermissionRoute permission="dashboard.ver">
                    <DashboardPage />
                  </PermissionRoute>
                }
              />
              <Route path="forbidden" element={<ForbiddenPage />} />
              <Route path="categories" element={<PermissionRoute permission="productos.ver"><CatalogPage type="categories" /></PermissionRoute>} />
              <Route path="brands" element={<PermissionRoute permission="productos.ver"><CatalogPage type="brands" /></PermissionRoute>} />
              <Route path="units" element={<PermissionRoute permission="productos.ver"><CatalogPage type="units" /></PermissionRoute>} />
              <Route path="products" element={<PermissionRoute permission="productos.ver"><ProductsPage /></PermissionRoute>} />
              <Route path="clients" element={<PermissionRoute permission="clientes.ver"><DirectoryPage type="clients" /></PermissionRoute>} />
              <Route path="suppliers" element={<PermissionRoute permission="proveedores.ver"><DirectoryPage type="suppliers" /></PermissionRoute>} />
              <Route path="purchases" element={<PermissionRoute permission="compras.ver"><PurchasesPage /></PermissionRoute>} />
              <Route path="purchases/:id" element={<PermissionRoute permission="compras.ver"><PurchaseDetailPage /></PermissionRoute>} />
              <Route path="sales" element={<PermissionRoute permission="ventas.ver"><SalesPage /></PermissionRoute>} />
              <Route path="sales/:id" element={<PermissionRoute permission="ventas.ver"><SaleDetailPage /></PermissionRoute>} />
              <Route path="cash" element={<PermissionRoute permission="caja.movimientos"><CashPage /></PermissionRoute>} />
              <Route path="cash/:id" element={<PermissionRoute permission="caja.movimientos"><CashDetailPage /></PermissionRoute>} />
              <Route path="inventory" element={<PermissionRoute permission="inventario.ver"><InventoryPage /></PermissionRoute>} />
              <Route path="users" element={<PermissionRoute permission="usuarios.ver"><UsersPage /></PermissionRoute>} />
              <Route path="roles" element={<PermissionRoute permission="roles.ver"><RolesPage /></PermissionRoute>} />
              <Route path="settings" element={<PermissionRoute permission="configuracion.ver"><SettingsPage /></PermissionRoute>} />
              <Route path="audit" element={<PermissionRoute permission="bitacora.ver"><AuditPage /></PermissionRoute>} />
              <Route path="reports" element={<PermissionRoute permission="reportes.ver"><ReportsPage /></PermissionRoute>} />
              <Route path="backups" element={<PermissionRoute permission="respaldos.ver"><BackupsPage /></PermissionRoute>} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
