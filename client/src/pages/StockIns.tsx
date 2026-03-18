import React, { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { Plus, Package, Warehouse, X } from 'lucide-react';
import { stockApi, productApi, warehouseApi } from '../api';

interface Product {
  id: string;
  name: string;
  brand: { name: string };
  skus: SKU[];
}

interface SKU {
  id: string;
  productId: string;
  packaging: string;
  spec: string;
  price: string;
}

interface Warehouse {
  id: string;
  code: string;
  name: string;
  ownerId?: string;
  owner?: { id: string; name: string };
  shelves?: Shelf[];
}

interface Shelf {
  id: string;
  code: string;
  warehouseId: string;
  row: number;
  column: number;
  level: number;
}

export default function StockInsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showStockInModal, setShowStockInModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedSku, setSelectedSku] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedShelf, setSelectedShelf] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [batchNo, setBatchNo] = useState('');
  const [remark, setRemark] = useState('');
  const [stockIns, setStockIns] = useState<any[]>([]);
  const [stockInLoading, setStockInLoading] = useState(false);
  const [stocks, setStocks] = useState<any[]>([]);
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterShelf, setFilterShelf] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [productRes, warehouseRes, stockRes, stockInRes] = await Promise.all([
        productApi.list(),
        warehouseApi.list({ status: 'ACTIVE' }),
        stockApi.list(),
        fetchStockIns()
      ]);
      if (productRes.data.success) {
        setProducts(productRes.data.data);
      }
      if (warehouseRes.data.success) {
        setWarehouses(warehouseRes.data.data);
      }
      if (stockRes.data.success) {
        setStocks(stockRes.data.data);
      }
    } catch (error) {
      console.error('Fetch data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStockIns = async () => {
    setStockInLoading(true);
    try {
      const res = await fetch('/api/stock/stock-in', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) {
        setStockIns(data.data);
      }
    } finally {
      setStockInLoading(false);
    }
  };

  useEffect(() => {
    if (showStockInModal) {
      fetchStockIns();
    }
  }, [showStockInModal]);

  useEffect(() => {
    const warehouse = warehouses.find(w => w.id === filterWarehouse);
    if (warehouse && (warehouse as any).shelves) {
      setShelves((warehouse as any).shelves);
    } else {
      setShelves([]);
    }
  }, [filterWarehouse, warehouses]);

  useEffect(() => {
    const warehouse = warehouses.find(w => w.id === selectedWarehouse);
    if (warehouse && (warehouse as any).shelves) {
      setShelves((warehouse as any).shelves);
    } else {
      setShelves([]);
    }
  }, [selectedWarehouse, warehouses]);

  const selectedProductSkus = selectedProduct 
    ? products.find(p => p.id === selectedProduct)?.skus || []
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSku || !selectedWarehouse || quantity <= 0) {
      toast.error('请填写完整信息');
      return;
    }

    try {
      const res = await stockApi.stockIn({
        skuId: selectedSku,
        warehouseId: selectedWarehouse,
        shelfId: selectedShelf || null,
        quantity,
        batchNo: batchNo || null,
        remark: remark || null,
      });
      
      if (res.data.success) {
        toast.success('入库成功');
        setShowModal(false);
        fetchData();
        resetForm();
      } else {
        toast.error(res.data.message || '入库失败');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '入库失败');
    }
  };

  const resetForm = () => {
    setSelectedProduct('');
    setSelectedSku('');
    setSelectedWarehouse('');
    setSelectedShelf('');
    setQuantity(1);
    setBatchNo('');
    setRemark('');
  };

  const getSkuInfo = (skuId: string) => {
    for (const product of products) {
      const sku = product.skus.find(s => s.id === skuId);
      if (sku) {
        return `${product.name} - ${sku.spec} / ${sku.packaging}`;
      }
    }
    return skuId;
  };

  const getWarehouseName = (warehouseId: string) => {
    const wh = warehouses.find(w => w.id === warehouseId);
    return wh?.name || warehouseId;
  };

  return (
    <div className="space-y-6">
      <ToastContainer />
      
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">库存管理</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowStockInModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <Warehouse className="w-5 h-5" />
            入库记录
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-5 h-5" />
            入库
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Package className="w-5 h-5" />
          库存列表
        </h2>
          
          <div className="flex gap-2 mb-4 flex-wrap justify-end items-center">
            <select
              value={filterWarehouse}
              onChange={(e) => { setFilterWarehouse(e.target.value); setFilterShelf(''); }}
              className="px-3 py-2 border rounded text-sm w-36"
            >
              <option value="">全部仓库</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name} ({w.code}) - {w.owner?.name || '无货主'}</option>
              ))}
            </select>
            <select
              value={filterShelf}
              onChange={(e) => setFilterShelf(e.target.value)}
              disabled={!filterWarehouse}
              className="px-3 py-2 border rounded text-sm w-32 disabled:opacity-50"
            >
              <option value="">全部货架</option>
              {shelves.filter(s => s.warehouseId === filterWarehouse).map(s => (
                <option key={s.id} value={s.id}>{s.code}</option>
              ))}
            </select>
            <select
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value)}
              className="px-3 py-2 border rounded text-sm w-36"
            >
              <option value="">全部商品</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button
              onClick={() => { setFilterWarehouse(''); setFilterShelf(''); setFilterProduct(''); }}
              className="px-3 py-2 border border-gray-300 text-gray-600 rounded text-sm"
            >
              重置
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">仓库名</th>
                  <th className="px-3 py-2 text-left">商品</th>
                  <th className="px-3 py-2 text-left">货架</th>
                  <th className="px-3 py-2 text-right">总库存</th>
                  <th className="px-3 py-2 text-right">已锁定</th>
                  <th className="px-3 py-2 text-right">可用</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const filteredStocks = stocks.filter((stock: any) => {
                    if (filterWarehouse && stock.warehouseId !== filterWarehouse) return false;
                    if (filterShelf && stock.shelfId !== filterShelf) return false;
                    if (filterProduct && stock.sku?.product?.id !== filterProduct) return false;
                    return true;
                  });
                  const groupedStocks = filteredStocks.reduce((acc: any, stock: any) => {
                    const key = stock.warehouse?.name || '未知仓库';
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(stock);
                    return acc;
                  }, {});
                  return Object.entries(groupedStocks).map(([warehouseName, list]: [string, any]) => (
                    <React.Fragment key={warehouseName}>
                      {list.map((stock: any, idx: number) => (
                        <tr key={stock.id} className="border-t">
                          {idx === 0 && <td rowSpan={list.length} className="px-3 py-2 align-middle text-primary-600 font-medium">{warehouseName}</td>}
                          <td className="px-3 py-2">{getSkuInfo(stock.skuId)}</td>
                          <td className="px-3 py-2">{stock.shelf?.code || '-'}</td>
                          <td className="px-3 py-2 text-right">{stock.totalQuantity}</td>
                          <td className="px-3 py-2 text-right text-orange-600">{stock.lockedQuantity}</td>
                          <td className="px-3 py-2 text-right text-green-600 font-medium">{stock.availableQuantity}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ));
                })()}
                {stocks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                      暂无库存数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">商品入库</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">商品</label>
                <select
                  value={selectedProduct}
                  onChange={(e) => { setSelectedProduct(e.target.value); setSelectedSku(''); }}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">请选择商品</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.brand.name})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">规格</label>
                <select
                  value={selectedSku}
                  onChange={(e) => setSelectedSku(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  disabled={!selectedProduct}
                  required
                >
                  <option value="">请选择规格</option>
                  {selectedProductSkus.map(sku => (
                    <option key={sku.id} value={sku.id}>
                      {sku.spec} / {sku.packaging} - ¥{sku.price}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">仓库</label>
                <select
                  value={selectedWarehouse}
                  onChange={(e) => { setSelectedWarehouse(e.target.value); setSelectedShelf(''); }}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">请选择仓库</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.code}) - {w.owner?.name || '无货主'}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">货架（可选）</label>
                <select
                  value={selectedShelf}
                  onChange={(e) => setSelectedShelf(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  disabled={!selectedWarehouse}
                >
                  <option value="">请选择货架</option>
                  {shelves.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.code} (排{s.row}-列{s.column})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">入库数量</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded-lg"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">批次号（可选）</label>
                <input
                  type="text"
                  value={batchNo}
                  onChange={(e) => setBatchNo(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="请输入批次号"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注（可选）</label>
                <input
                  type="text"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="请输入备注"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  确认入库
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showStockInModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">入库记录</h2>
              <button onClick={() => setShowStockInModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-auto max-h-[60vh] p-6">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">仓库名</th>
                    <th className="px-3 py-2 text-left">商品</th>
                    <th className="px-3 py-2 text-left">货架</th>
                    <th className="px-3 py-2 text-right">数量</th>
                    <th className="px-3 py-2 text-left">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const groupedStockIns = stockIns.reduce((acc: any, item: any) => {
                      const key = item.warehouse?.name || '未知仓库';
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(item);
                      return acc;
                    }, {});
                    return Object.entries(groupedStockIns).map(([warehouseName, list]: [string, any]) => (
                      <React.Fragment key={warehouseName}>
                        {list.map((item: any, idx: number) => (
                          <tr key={item.id} className="border-t">
                            {idx === 0 && <td rowSpan={list.length} className="px-3 py-2 align-middle text-primary-600 font-medium">{warehouseName}</td>}
                            <td className="px-3 py-2">{getSkuInfo(item.skuId)}</td>
                            <td className="px-3 py-2">{item.shelf?.code || '-'}</td>
                            <td className="px-3 py-2 text-right">+{item.quantity}</td>
                            <td className="px-3 py-2 text-gray-500">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ));
                  })()}
                  {stockIns.length === 0 && !stockInLoading && (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                        暂无入库记录
                      </td>
                    </tr>
                  )}
                  {stockInLoading && (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                        加载中...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
