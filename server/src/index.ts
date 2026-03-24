import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { errorHandler } from './middleware/errorHandler';
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
import stockTransferRoutes from './routes/stockTransfer';
import vehicleRoutes from './routes/vehicles';
import driverRoutes from './routes/drivers';
import dispatchRoutes from './routes/dispatches';
import geocodeRoutes from './routes/geocode';
import customerRoutes from './routes/customers';
import contractRoutes from './routes/contracts';
import uploadRoutes from './routes/upload';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/owners', ownerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/bundles', bundleRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/pick-orders', pickOrderRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/stock-transfers', stockTransferRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/dispatches', dispatchRoutes);
app.use('/api/geocode', geocodeRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/upload', uploadRoutes);

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});
