import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { errorHandler } from './middleware/errorHandler';
import { ownerMiddleware } from './middleware/owner';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import ownerRoutes from './routes/owners';
import productRoutes from './routes/products';
import bundleRoutes from './routes/bundles';
import orderRoutes from './routes/orders';
import pickOrderRoutes from './routes/pickOrders';
import returnRoutes from './routes/returns';
import warehouseRoutes from './routes/warehouses';
import stockRoutes from './routes/stock';
import vehicleRoutes from './routes/vehicles';
import driverRoutes from './routes/drivers';
import dispatchRoutes from './routes/dispatches';
import geocodeRoutes from './routes/geocode';
import customerRoutes from './routes/customers';
import contractRoutes from './routes/contracts';
import uploadRoutes from './routes/upload';
import supplierRoutes from './routes/suppliers';
import supplierContractRoutes from './routes/supplierContracts';
import supplierProductRoutes from './routes/supplierProducts';
import supplierMaterialRoutes from './routes/supplierMaterials';
import carrierRoutes from './routes/carriers';
import skuBatchRoutes from './routes/skuBatches';
import bundleBatchRoutes from './routes/bundleBatches';
import purchaseOrderRoutes from './routes/purchaseOrders';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', ownerMiddleware, userRoutes);
app.use('/api/owners', ownerMiddleware, ownerRoutes);
app.use('/api/products', ownerMiddleware, productRoutes);
app.use('/api/bundles', ownerMiddleware, bundleRoutes);
app.use('/api/orders', ownerMiddleware, orderRoutes);
app.use('/api/pick-orders', ownerMiddleware, pickOrderRoutes);
app.use('/api/returns', ownerMiddleware, returnRoutes);
app.use('/api/warehouses', ownerMiddleware, warehouseRoutes);
app.use('/api/stock', ownerMiddleware, stockRoutes);
app.use('/api/vehicles', ownerMiddleware, vehicleRoutes);
app.use('/api/drivers', ownerMiddleware, driverRoutes);
app.use('/api/dispatches', ownerMiddleware, dispatchRoutes);
app.use('/api/geocode', ownerMiddleware, geocodeRoutes);
app.use('/api/customers', ownerMiddleware, customerRoutes);
app.use('/api/contracts', ownerMiddleware, contractRoutes);
app.use('/api/upload', ownerMiddleware, uploadRoutes);
app.use('/api/suppliers', ownerMiddleware, supplierRoutes);
app.use('/api/supplier-contracts', ownerMiddleware, supplierContractRoutes);
app.use('/api/supplier-products', ownerMiddleware, supplierProductRoutes);
app.use('/api/supplier-materials', ownerMiddleware, supplierMaterialRoutes);
app.use('/api/carriers', ownerMiddleware, carrierRoutes);
app.use('/api/sku-batches', ownerMiddleware, skuBatchRoutes);
app.use('/api/bundle-batches', ownerMiddleware, bundleBatchRoutes);
app.use('/api/purchase-orders', ownerMiddleware, purchaseOrderRoutes);

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});
