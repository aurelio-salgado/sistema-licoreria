import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { AppLayout } from './layout/AppLayout'
import { DashboardPage } from './pages/DashboardPage'
import { ForbiddenPage } from './pages/ForbiddenPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { CatalogPage } from './pages/CatalogPage'
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
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
