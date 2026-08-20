import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MenuPage from './pages/MenuPage';
import LoginPage from './pages/LoginPage';
import AdminLayout from './pages/admin/AdminLayout';
import DashboardPage from './pages/admin/DashboardPage';
import RegisterPage from './pages/admin/RegisterPage';
import OrdersPage from './pages/admin/OrdersPage';
import MenuManagePage from './pages/admin/MenuManagePage';
import TablesPage from './pages/admin/TablesPage';
import InventoryPage from './pages/admin/InventoryPage';
import SchemaPage from './pages/admin/SchemaPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Customer-facing, mobile-first e-menu */}
          <Route path="/" element={<MenuPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Staff dashboard — desktop-first, responsive */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="menu" element={<MenuManagePage />} />
            <Route path="tables" element={<TablesPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="schema" element={<SchemaPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
