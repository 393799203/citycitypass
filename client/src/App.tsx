import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import React, { lazy } from 'react';
import Layout from './components/Layout';
import { ConfirmProvider } from './components/ConfirmProvider';
import { useAuthStore } from './stores/auth';
import AIAssistant from './components/AIAssistant';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Orders = lazy(() => import('./pages/Orders'));
const OrderDetail = lazy(() => import('./pages/OrderDetail'));
const Products = lazy(() => import('./pages/Products'));
const Warehouses = lazy(() => import('./pages/Warehouses'));
const WarehouseDetail = lazy(() => import('./pages/WarehouseDetail'));
const StockIns = lazy(() => import('./pages/Inventory'));
const StockTransfers = lazy(() => import('./pages/StockTransfers'));
const BatchTracePage = lazy(() => import('./pages/BatchTracePage'));
const Inbound = lazy(() => import('./pages/Inbound'));
const Outbound = lazy(() => import('./pages/Outbound'));
const Transport = lazy(() => import('./pages/Transport'));
const DispatchCenter = lazy(() => import('./pages/DispatchCenter'));
const DispatchDetail = lazy(() => import('./pages/DispatchDetail'));
const Returns = lazy(() => import('./pages/Returns'));
const ReturnDetail = lazy(() => import('./pages/ReturnDetail'));
const Carriers = lazy(() => import('./pages/Carriers'));
const Owners = lazy(() => import('./pages/Owners'));
const Users = lazy(() => import('./pages/Users'));
const Customers = lazy(() => import('./pages/Customers'));
const Suppliers = lazy(() => import('./pages/Suppliers'));
const PurchaseOrders = lazy(() => import('./pages/PurchaseOrders'));
const PurchaseDetail = lazy(() => import('./pages/PurchaseDetail'));

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
                <AIAssistant />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/orders" replace />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:id" element={<OrderDetail />} />
            <Route path="products" element={<Products />} />
            <Route path="customers" element={<Customers />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="purchases" element={<PurchaseOrders />} />
            <Route path="purchases/:id" element={<PurchaseDetail />} />
            <Route path="warehouses" element={<Warehouses />} />
            <Route path="warehouses/:id" element={<WarehouseDetail />} />
            <Route path="inventory" element={<StockIns />} />
            <Route path="stock-transfers" element={<StockTransfers />} />
            <Route path="batch-trace" element={<BatchTracePage />} />
            <Route path="batch-trace/:batchNo" element={<BatchTracePage />} />
            <Route path="inbound" element={<Inbound />} />
            <Route path="outbound" element={<Outbound />} />
            <Route path="transport" element={<Transport />} />
            <Route path="dispatch" element={<DispatchCenter />} />
            <Route path="dispatch/:id" element={<DispatchDetail />} />
            <Route path="returns" element={<Returns />} />
            <Route path="returns/:id" element={<ReturnDetail />} />
            <Route path="carriers" element={<Carriers />} />
            <Route path="owners" element={<Owners />} />
            <Route path="users" element={<Users />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Route>
        </Routes>
      </ConfirmProvider>
    </BrowserRouter>
  );
}

export default App;