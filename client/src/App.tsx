import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import React, { lazy, Suspense } from 'react';
import Layout from './components/Layout';
import { ConfirmProvider } from './components/ConfirmProvider';
import { useAuthStore } from './stores/auth';
import Login from './pages/Login';
import Register from './pages/Register';
import { useTranslation } from 'react-i18next';

const Orders = lazy(() => import('./pages/Orders'));
const OrderDetail = lazy(() => import('./pages/OrderDetail'));
const Products = lazy(() => import('./pages/Products'));
const Warehouses = lazy(() => import('./pages/Warehouses'));
const WarehouseDetail = lazy(() => import('./pages/WarehouseDetail'));
const Inventory = lazy(() => import('./pages/Inventory'));
const StockTransfers = lazy(() => import('./pages/StockTransfers'));
const BatchTracePage = lazy(() => import('./pages/BatchTrace/index'));
const Inbound = lazy(() => import('./pages/Inbound'));
const Outbound = lazy(() => import('./pages/Outbound/index'));
const Transport = lazy(() => import('./pages/Transport/index'));
const DispatchCenter = lazy(() => import('./pages/DispatchCenter'));
const DispatchDetail = lazy(() => import('./pages/DispatchDetail'));
const Returns = lazy(() => import('./pages/Returns/index'));
const ReturnDetail = lazy(() => import('./pages/ReturnDetail/index'));
const Carriers = lazy(() => import('./pages/Carriers'));
const Owners = lazy(() => import('./pages/Owners'));
const Customers = lazy(() => import('./pages/Customers'));
const Suppliers = lazy(() => import('./pages/Suppliers'));
const ProductBasicDataPage = lazy(() => import('./pages/ProductBasicDataPage'));
const PurchaseOrders = lazy(() => import('./pages/Purchase/index'));
const PurchaseDetail = lazy(() => import('./pages/PurchaseDetail/index'));
const KnowledgeBase = lazy(() => import('./pages/KnowledgeBase'));
const SystemManage = lazy(() => import('./pages/System'));
const Profile = lazy(() => import('./pages/Profile'));
const QRCode = lazy(() => import('./pages/QRCode'));

function PageLoader() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span className="mt-2 text-sm text-gray-500">{t('common.loading')}</span>
    </div>
  );
}

function ProtectedRoute() {
  const { token, user } = useAuthStore();
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

function App() {
  return (
    <BrowserRouter>
      <ConfirmProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route element={<Layout />}>
              <Route element={<ProtectedRoute />}>
                <Route index element={<Navigate to="/orders" replace />} />
                <Route path="orders" element={<Orders />} />
                <Route path="orders/:id" element={<OrderDetail />} />
                <Route path="products" element={<Products />} />
                <Route path="product-basic-data" element={<ProductBasicDataPage />} />
                <Route path="customers" element={<Customers />} />
                <Route path="suppliers" element={<Suppliers />} />
                <Route path="purchases" element={<PurchaseOrders />} />
                <Route path="purchases/:id" element={<PurchaseDetail />} />
                <Route path="warehouses" element={<Warehouses />} />
                <Route path="warehouses/:id" element={<WarehouseDetail />} />
                <Route path="inventory" element={<Inventory />} />
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
                <Route path="knowledge-base" element={<KnowledgeBase />} />
                <Route path="system" element={<SystemManage />} />
                <Route path="profile" element={<Profile />} />
                <Route path="qrcode" element={<QRCode />} />
                <Route path="*" element={<Navigate to="/orders" replace />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </ConfirmProvider>
    </BrowserRouter>
  );
}

export default App;
