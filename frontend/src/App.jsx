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
import { PermissionRoute } from './routes/PermissionRoute'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { PublicOnlyRoute } from './routes/PublicOnlyRoute'

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
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
