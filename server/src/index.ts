import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { errorHandler } from './middleware/errorHandler';
import { ownerMiddleware } from './middleware/owner';
import { authMiddleware } from './middleware/auth';
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
import aiRoutes from './routes/ai';
import permissionRoutes from './routes/permissions';
import { ragService } from './services/rag';
import { SearchMode } from './services/rag';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', authMiddleware, ownerMiddleware, userRoutes);
app.use('/api/owners', authMiddleware, ownerMiddleware, ownerRoutes);
app.use('/api/products', authMiddleware, ownerMiddleware, productRoutes);
app.use('/api/bundles', authMiddleware, ownerMiddleware, bundleRoutes);
app.use('/api/orders', authMiddleware, ownerMiddleware, orderRoutes);
app.use('/api/pick-orders', authMiddleware, ownerMiddleware, pickOrderRoutes);
app.use('/api/returns', authMiddleware, ownerMiddleware, returnRoutes);
app.use('/api/warehouses', authMiddleware, ownerMiddleware, warehouseRoutes);
app.use('/api/stock', authMiddleware, ownerMiddleware, stockRoutes);
app.use('/api/vehicles', authMiddleware, ownerMiddleware, vehicleRoutes);
app.use('/api/drivers', authMiddleware, ownerMiddleware, driverRoutes);
app.use('/api/dispatches', authMiddleware, ownerMiddleware, dispatchRoutes);
app.use('/api/geocode', authMiddleware, ownerMiddleware, geocodeRoutes);
app.use('/api/customers', authMiddleware, ownerMiddleware, customerRoutes);
app.use('/api/contracts', authMiddleware, ownerMiddleware, contractRoutes);
app.use('/api/upload', authMiddleware, ownerMiddleware, uploadRoutes);
app.use('/api/suppliers', authMiddleware, ownerMiddleware, supplierRoutes);
app.use('/api/supplier-contracts', authMiddleware, ownerMiddleware, supplierContractRoutes);
app.use('/api/supplier-products', authMiddleware, ownerMiddleware, supplierProductRoutes);
app.use('/api/supplier-materials', authMiddleware, ownerMiddleware, supplierMaterialRoutes);
app.use('/api/carriers', authMiddleware, ownerMiddleware, carrierRoutes);
app.use('/api/sku-batches', authMiddleware, ownerMiddleware, skuBatchRoutes);
app.use('/api/bundle-batches', authMiddleware, ownerMiddleware, bundleBatchRoutes);
app.use('/api/purchase-orders', authMiddleware, ownerMiddleware, purchaseOrderRoutes);
app.use('/api/ai', authMiddleware, ownerMiddleware, aiRoutes);
app.use('/api/permissions', authMiddleware, permissionRoutes);

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 测试向量搜索
app.get('/api/test-vector-search', async (req, res) => {
  try {
    console.log('[TEST] Testing vector search for "茅台不同规格的进货价"');
    const results = await ragService.search('茅台不同规格的进货价', {
      topK: 5,
      mode: SearchMode.VECTOR
    });
    console.log('[TEST] Vector search results:', results.map(r => ({ id: r.id, score: r.score, content: r.content.substring(0, 50) })));
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('[TEST] Vector search error:', error);
    res.status(500).json({ success: false, message: 'Test failed' });
  }
});

app.use(errorHandler);

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  
  // 启动时自动测试向量搜索
  try {
    console.log('\n[TEST] Running vector search test on startup...');
    const results = await ragService.search('茅台不同规格的进货价', {
      topK: 5,
      mode: SearchMode.VECTOR
    });
    console.log('[TEST] Vector search results:', results.map(r => ({ id: r.id, score: r.score, content: r.content.substring(0, 50) })));
  } catch (error) {
    console.error('[TEST] Vector search test failed:', error);
  }
});