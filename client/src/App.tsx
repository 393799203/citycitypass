import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Layout from './components/Layout';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Products from './pages/Products';
import Warehouses from './pages/Warehouses';
import WarehouseDetail from './pages/WarehouseDetail';
import StockIns from './pages/StockIns';
import StockTransfers from './pages/StockTransfers';
import Outbound from './pages/Outbound';
import Transport from './pages/Transport';
import DispatchCenter from './pages/DispatchCenter';
import DispatchDetail from './pages/DispatchDetail';
import Returns from './pages/Returns';
import ReturnDetail from './pages/ReturnDetail';
import Owners from './pages/Owners';
import Users from './pages/Users';
import Customers from './pages/Customers';
import { ConfirmProvider } from './components/ConfirmProvider';
import { useAuthStore } from './stores/auth';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <ConfirmProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
          <Route index element={<Navigate to="/orders" replace />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="products" element={<Products />} />
          <Route path="customers" element={<Customers />} />
          <Route path="warehouses" element={<Warehouses />} />
          <Route path="warehouses/:id" element={<WarehouseDetail />} />
          <Route path="inbound" element={<StockIns />} />
          <Route path="stock-transfers" element={<StockTransfers />} />
          <Route path="outbound" element={<Outbound />} />
          <Route path="transport" element={<Transport />} />
          <Route path="dispatch" element={<DispatchCenter />} />
          <Route path="dispatch/:id" element={<DispatchDetail />} />
          <Route path="returns" element={<Returns />} />
          <Route path="returns/:id" element={<ReturnDetail />} />
          <Route path="carriers" element={<div className="text-gray-500">运力管理</div>} />
          <Route path="owners" element={<Owners />} />
          <Route path="users" element={<Users />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </ConfirmProvider>
    </BrowserRouter>
  );
}

export default App;
