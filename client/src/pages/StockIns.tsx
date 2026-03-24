import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { Plus, Package, Warehouse, X, Info, MapPin } from 'lucide-react';
import { stockApi, productApi, warehouseApi, bundleApi, ownerApi } from '../api';

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
  const [bundles, setBundles] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [shelves, setShelves] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showStockInModal, setShowStockInModal] = useState(false);
  const [itemType, setItemType] = useState<'product' | 'bundle'>('product');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedSku, setSelectedSku] = useState('');
  const [selectedBundle, setSelectedBundle] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedShelf, setSelectedShelf] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [batchNo, setBatchNo] = useState('');
  const [remark, setRemark] = useState('');
  const [stockIns, setStockIns] = useState<any[]>([]);
  const [stockOuts, setStockOuts] = useState<any[]>([]);
  const [stockInLoading, setStockInLoading] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: React.ReactNode } | null>(null);
  const [stocks, setStocks] = useState<any[]>([]);
  const [bundleStocks, setBundleStocks] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [showStockOutModal, setShowStockOutModal] = useState(false);
  const [filterOwner, setFilterOwner] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterZone, setFilterZone] = useState('');
  const [filterShelf, setFilterShelf] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterBundle, setFilterBundle] = useState('');
  const [inventoryType, setInventoryType] = useState<'all' | 'sales'>('sales');
  const [zones, setZones] = useState<any[]>([]);
  const [filterShelfOptions, setFilterShelfOptions] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [inventoryType]);

  useEffect(() => {
    if (filterWarehouse) {
      warehouseApi.listZones(filterWarehouse).then(res => {
        if (res.data.success) {
          const allZones = res.data.data;
          if (inventoryType === 'sales') {
            setZones(allZones.filter((z: any) => z.type === 'STORAGE' || z.type === 'PICKING'));
          } else {
            setZones(allZones);
          }
        }
      });
    } else {
      setZones([]);
    }
  }, [filterWarehouse, inventoryType]);

  useEffect(() => {
    if (filterZone) {
      const zone = zones.find(z => z.id === filterZone);
      if (zone) {
        setFilterShelfOptions(zone.shelves || []);
      }
      setFilterShelf('');
    } else {
      setFilterShelfOptions([]);
      setFilterShelf('');
    }
  }, [filterZone, zones]);

  useEffect(() => {
    if (selectedWarehouse) {
      warehouseApi.listZones(selectedWarehouse).then(res => {
        if (res.data.success) {
          setZones(res.data.data);
        }
      });
    } else {
      setZones([]);
      setSelectedZone('');
      setSelectedShelf('');
      setSelectedLocation('');
    }
    setSelectedShelf('');
    setSelectedLocation('');
  }, [selectedWarehouse]);

  useEffect(() => {
    if (selectedZone) {
      const zone = zones.find(z => z.id === selectedZone);
      if (zone) {
        setShelves(zone.shelves || []);
      }
    } else {
      setShelves([]);
      setSelectedShelf('');
      setSelectedLocation('');
    }
    setSelectedLocation('');
  }, [selectedZone, zones]);

  useEffect(() => {
    if (selectedShelf) {
      const shelf = shelves.find(s => s.id === selectedShelf);
      if (shelf) {
        setLocations(shelf.locations || []);
      }
    } else {
      setLocations([]);
      setSelectedLocation('');
    }
  }, [selectedShelf, shelves]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [productRes, warehouseRes, stockRes, bundleRes, ownerRes] = await Promise.all([
        productApi.list(),
        warehouseApi.list({ status: 'ACTIVE' }),
        stockApi.list({ inventoryType }),
        bundleApi.list(),
        ownerApi.list(),
      ]);
      if (productRes.data.success) {
        setProducts(productRes.data.data);
      }
      if (warehouseRes.data.success) {
        setWarehouses(warehouseRes.data.data);
      }
      if (ownerRes.data.success) {
        setOwners(ownerRes.data.data);
      }
      if (stockRes.data.success) {
        const data = stockRes.data.data;
        setStocks([...(data.productStocks || []), ...(data.bundleStocks || [])]);
      }
      if (bundleRes.data.success) {
        setBundles(bundleRes.data.data);
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
    
    if (itemType === 'product') {
      if (!selectedSku || !selectedWarehouse || quantity <= 0) {
        toast.error('请填写完整信息');
        return;
      }
      try {
        const res = await stockApi.stockIn({
          skuId: selectedSku,
          warehouseId: selectedWarehouse,
          locationId: selectedLocation || null,
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
    } else {
      if (!selectedBundle || !selectedWarehouse || quantity <= 0) {
        toast.error('请填写完整信息');
        return;
      }
      try {
        const res = await stockApi.stockIn({
          type: 'bundle',
          bundleId: selectedBundle,
          warehouseId: selectedWarehouse,
          locationId: selectedLocation || null,
          quantity,
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
    }
  };

  const resetForm = () => {
    setItemType('product');
    setSelectedProduct('');
    setSelectedSku('');
    setSelectedBundle('');
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

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Package className="w-5 h-5" />
            库存列表
          </h2>
          <div className="flex gap-2 items-center">
            {inventoryType === 'sales' && (
              <span className="text-orange-500 text-sm">存储区与拣货区库存为销售库存！</span>
            )}
            <span className="text-sm text-gray-500">库存类型：</span>
            <div className="flex rounded-lg overflow-hidden border">
              <button
                onClick={() => { setInventoryType('sales'); }}
                className={`px-3 py-1.5 text-sm ${inventoryType === 'sales' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                销售库存
              </button>
              <button
                onClick={() => { setInventoryType('all'); }}
                className={`px-3 py-1.5 text-sm ${inventoryType === 'all' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                全部库存
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center flex-wrap">
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white rounded text-sm hover:bg-primary-700"
            >
              <Plus className="w-4 h-4" />
              入库
            </button>
            <button
              onClick={() => setShowStockInModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50"
            >
              <Warehouse className="w-4 h-4" />
              入库记录
            </button>
            <button
              onClick={() => {
                stockApi.stockOuts().then(res => {
                  if (res.data.success) {
                    setStockOuts(res.data.data);
                    setShowStockOutModal(true);
                  }
                });
              }}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50"
            >
              <Package className="w-4 h-4" />
              出库记录
            </button>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <select
              value={filterOwner}
              onChange={(e) => { setFilterOwner(e.target.value); setFilterWarehouse(''); setFilterZone(''); setFilterShelf(''); setFilterProduct(''); }}
              className="px-3 py-1.5 border rounded text-sm w-36"
            >
              <option value="">全部货主</option>
              {owners.filter(o => o.status !== 'STOPPED').map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
            <select
              value={filterWarehouse}
              onChange={(e) => { setFilterWarehouse(e.target.value); setFilterZone(''); setFilterShelf(''); }}
              disabled={!filterOwner}
              className="px-3 py-2 border rounded text-sm w-36 disabled:opacity-50"
            >
              <option value="">全部仓库</option>
              {warehouses.filter(w => !filterOwner || w.ownerId === filterOwner).map(w => (
                <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
              ))}
            </select>
            <select
              value={filterZone}
              onChange={(e) => setFilterZone(e.target.value)}
              disabled={!filterWarehouse}
              className="px-3 py-2 border rounded text-sm w-32 disabled:opacity-50"
            >
              <option value="">全部货区</option>
              {zones.map(z => {
                const typeMap: Record<string, string> = { PICKING: '拣货区', STORAGE: '存储区', RETURNING: '退货区', RECEIVING: '收货区', DAMAGED: '损坏区' };
                return <option key={z.id} value={z.id}>{z.code}-{typeMap[z.type] || z.type}</option>;
              })}
            </select>
            <select
              value={filterShelf}
              onChange={(e) => setFilterShelf(e.target.value)}
              disabled={!filterZone}
              className="px-3 py-2 border rounded text-sm w-28 disabled:opacity-50"
            >
              <option value="">全部货架</option>
              {filterShelfOptions.map(s => (
                <option key={s.id} value={s.id}>{s.code}</option>
              ))}
            </select>
            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setFilterProduct(''); setFilterBundle(''); }}
              className="px-3 py-2 border rounded text-sm w-28"
            >
              <option value="">全部类型</option>
              <option value="product">普通商品</option>
              <option value="bundle">套装</option>
            </select>
            <select
              value={filterType === 'bundle' ? filterBundle : filterProduct}
              onChange={(e) => {
                if (filterType === 'bundle') {
                  setFilterBundle(e.target.value);
                } else {
                  setFilterProduct(e.target.value);
                }
              }}
              className="px-3 py-2 border rounded text-sm w-36"
            >
              <option value="">全部{filterType === 'bundle' ? '套装' : filterType === 'product' ? '商品' : '商品/套装'}</option>
              {filterType === 'bundle'
                ? bundles.map(b => <option key={b.id} value={b.id}>{b.name}</option>)
                : filterType === 'product'
                  ? products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                  : [...products.map(p => ({ id: p.id, name: p.name })), ...bundles.map(b => ({ id: b.id, name: b.name }))].map(item => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))
              }
            </select>
            <button
              onClick={() => { setFilterOwner(''); setFilterWarehouse(''); setFilterZone(''); setFilterProduct(''); setFilterType(''); setFilterBundle(''); }}
              className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded text-sm"
            >
              重置
            </button>
          </div>
        </div>
        {(() => {
          const filteredStocks = stocks.filter((stock: any) => {
            if (filterOwner && stock.warehouse?.ownerId !== filterOwner) return false;
            if (filterWarehouse && stock.warehouseId !== filterWarehouse) return false;
            if (filterZone && stock.location?.shelf?.zoneId !== filterZone) return false;
            if (filterShelf && stock.location?.shelfId !== filterShelf) return false;
            if (filterType && stock.type !== filterType) return false;
            if (filterType === 'bundle' && filterBundle && stock.bundleId !== filterBundle) return false;
            if (filterProduct) {
              if (stock.type === 'product') {
                if (stock.sku?.product?.id !== filterProduct) return false;
              } else if (stock.type === 'bundle') {
                return false;
              }
            }
            return true;
          });
          const groupedStocks = filteredStocks.reduce((acc: any, stock: any) => {
            const key = stock.warehouse?.name || '未知仓库';
            if (!acc[key]) acc[key] = [];
            acc[key].push(stock);
            return acc;
          }, {});
          const warehouseEntries = Object.entries(groupedStocks);

          if (warehouseEntries.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Package className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg">暂无库存数据</p>
              </div>
            );
          }

          return (
            <div className="grid gap-4 mt-4">
              {warehouseEntries.map(([warehouseName, list]: [string, any]) => {
                const groupedBySku = list.reduce((acc: any, stock: any) => {
                  const key = stock.type === 'bundle'
                    ? `bundle-${stock.bundleId}`
                    : `product-${stock.skuId}`;
                  if (!acc[key]) {
                    acc[key] = {
                      ...stock,
                      shelves: [],
                      totalQuantity: 0,
                      lockedQuantity: 0,
                      availableQuantity: 0,
                    };
                  }
                  acc[key].shelves.push({
                    code: `${stock.location?.shelf?.zone?.code || '-'}-${stock.location?.shelf?.code || '-'}-L${stock.location?.level}`,
                    zoneType: stock.location?.shelf?.zone?.type || '',
                    total: stock.totalQuantity,
                    locked: stock.lockedQuantity,
                    available: stock.availableQuantity,
                  });
                  acc[key].totalQuantity += stock.totalQuantity;
                  acc[key].lockedQuantity += stock.lockedQuantity;
                  acc[key].availableQuantity += stock.availableQuantity;
                  return acc;
                }, {});

                const skuList = Object.values(groupedBySku);
                const productSkus = skuList.filter((s: any) => s.type === 'product');
                const bundleSkus = skuList.filter((s: any) => s.type === 'bundle');
                const productTotal = productSkus.reduce((sum: number, s: any) => sum + s.totalQuantity, 0);
                const bundleTotal = bundleSkus.reduce((sum: number, s: any) => sum + s.totalQuantity, 0);

                return (
                <div key={warehouseName} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-visible">
                  <div className="bg-gradient-to-r from-primary-50 to-blue-50 px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-white rounded-lg shadow-sm">
                          <Warehouse className="w-4 h-4 text-primary-600" />
                        </div>
                        <h3 className="font-semibold text-gray-800">{warehouseName}</h3>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1.5">
                          <Package className="w-3 h-3 text-blue-500" />
                          <span className="text-gray-600">商品</span>
                          <span className="font-medium text-gray-800">{productSkus.length} SKU</span>
                          <span className="text-gray-400">/</span>
                          <span className="text-blue-600 font-medium">{productTotal}件</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Package className="w-3 h-3 text-purple-500" />
                          <span className="text-gray-600">套装</span>
                          <span className="font-medium text-gray-800">{bundleSkus.length} SKU</span>
                          <span className="text-gray-400">/</span>
                          <span className="text-purple-600 font-medium">{bundleTotal}件</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {skuList.map((stock: any) => (
                      <div key={stock.id} className="hover:bg-gray-50/50 transition-colors">
                        <div className="px-4 py-3 flex items-center gap-3">
                          <span className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded ${
                            stock.type === 'bundle'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {stock.type === 'bundle' ? '套装' : '商品'}
                          </span>
                          <div className="flex-1 min-w-0">
                            {stock.type === 'bundle' ? (
                              <div className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-purple-500 shrink-0" />
                                <span className="font-medium text-gray-800 truncate">{stock.bundle?.name}</span>
                                {stock.bundle?.items?.length > 0 && (
                                  <button
                                    type="button"
                                    onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, content: <div><div className="font-semibold mb-2 text-blue-400">套装包含：</div>{stock.bundle.items.map((item: any) => (<div key={item.id} className="text-gray-200 py-1"><span className="text-blue-400">{item.sku?.product?.name}</span><span className="text-gray-400"> · {item.sku?.spec}/{item.sku?.packaging}</span><span className="text-yellow-400 ml-1">×{item.quantity}</span></div>))}</div> })}
                                    onMouseLeave={() => setTooltip(null)}
                                    onMouseMove={(e) => setTooltip({ x: e.clientX, y: e.clientY, content: <div><div className="font-semibold mb-2 text-blue-400">套装包含：</div>{stock.bundle.items.map((item: any) => (<div key={item.id} className="text-gray-200 py-1"><span className="text-blue-400">{item.sku?.product?.name}</span><span className="text-gray-400"> · {item.sku?.spec}/{item.sku?.packaging}</span><span className="text-yellow-400 ml-1">×{item.quantity}</span></div>))}</div> })}
                                    className="p-0.5 hover:bg-gray-100 rounded shrink-0"
                                  >
                                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-blue-500 shrink-0" />
                                <span className="font-medium text-gray-800 truncate">{stock.sku?.product?.name}</span>
                                <span className="text-gray-400 text-sm truncate">{stock.sku?.spec} / {stock.sku?.packaging}</span>
                              </div>
                            )}
                          </div>
                          <div className="shrink-0 flex items-center gap-3 text-xs">
                         
                            {(
                              <div className="flex items-center gap-1.5">
                                {stock.shelves.map((shelf: any, idx: number) => (
                                  <div key={idx} className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1">
                                    <MapPin className="w-3 h-3 text-gray-400" />
                                    <span className="font-mono text-gray-600 text-xs">{shelf.code}</span>
                                    <span className="text-gray-300">|</span>
                                    <span className="text-gray-500">库<span className="text-gray-700">{shelf.total}</span></span>
                                    {shelf.zoneType === 'STORAGE' || shelf.zoneType === 'PICKING' ? (
                                      <>
                                        <span className="text-gray-300">|</span>
                                        <span className="text-orange-500">冻<span className="text-gray-700">{shelf.locked}</span></span>
                                        <span className="text-gray-300">|</span>
                                        <span className="text-green-600">可<span className="text-gray-700">{shelf.available}</span></span>
                                      </>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="text-center">
                              <div className="text-base font-bold text-gray-700">{stock.totalQuantity}</div>
                              <div className="text-gray-400">总库存</div>
                            </div>
                            <div className="w-px h-6 bg-gray-200"></div>
                            <div className="text-center">
                              <div className={`text-base font-bold ${stock.lockedQuantity > 0 ? 'text-orange-500' : 'text-gray-300'}`}>
                                {stock.lockedQuantity}
                              </div>
                              <div className="text-gray-400">已锁定</div>
                            </div>
                            <div className="w-px h-6 bg-gray-200"></div>
                            <div className="text-center">
                              <div className={`text-base font-bold ${stock.availableQuantity > 0 ? 'text-green-600' : 'text-red-400'}`}>
                                {stock.availableQuantity}
                              </div>
                              <div className="text-gray-400">可用</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            </div>
          );
        })()}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
            <div className="flex justify-between items-center p-4 border-b bg-gray-50">
              <h2 className="text-lg font-bold">{itemType === 'product' ? '商品入库' : '套装入库'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 hover:bg-gray-200 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4">
              <div className="flex border-b mb-4">
                <button
                  type="button"
                  onClick={() => { setItemType('product'); setSelectedBundle(''); }}
                  className={`flex-1 py-2 text-sm font-medium border-b-2 ${
                    itemType === 'product' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'
                  }`}
                >
                  商品入库
                </button>
                <button
                  type="button"
                  onClick={() => { setItemType('bundle'); setSelectedProduct(''); setSelectedSku(''); }}
                  className={`flex-1 py-2 text-sm font-medium border-b-2 ${
                    itemType === 'bundle' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500'
                  }`}
                >
                  套装入库
                </button>
              </div>

              {itemType === 'product' ? (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">商品</label>
                      <select
                        value={selectedProduct}
                        onChange={(e) => { setSelectedProduct(e.target.value); setSelectedSku(''); }}
                        className="w-full px-2 py-1.5 border rounded-lg text-sm"
                        required
                      >
                        <option value="">选择商品</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">规格</label>
                      <select
                        value={selectedSku}
                        onChange={(e) => setSelectedSku(e.target.value)}
                        className="w-full px-2 py-1.5 border rounded-lg text-sm"
                        disabled={!selectedProduct}
                        required
                      >
                        <option value="">选择规格</option>
                        {selectedProductSkus.map(sku => (
                          <option key={sku.id} value={sku.id}>
                            {sku.spec} / {sku.packaging}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">入库数量</label>
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 border rounded-lg text-sm"
                        min="1"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">仓库</label>
                      <select
                        value={selectedWarehouse}
                        onChange={(e) => { setSelectedWarehouse(e.target.value); setSelectedZone(''); setSelectedShelf(''); setSelectedLocation(''); }}
                        className="w-full px-2 py-1.5 border rounded-lg text-sm"
                        required
                      >
                        <option value="">选择仓库</option>
                        {warehouses.map(w => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                    </div>
                    <span className="text-gray-400 mt-4">-</span>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">库区</label>
                      <select
                        value={selectedZone}
                        onChange={(e) => { setSelectedZone(e.target.value); setSelectedShelf(''); setSelectedLocation(''); }}
                        className="w-full px-2 py-1.5 border rounded-lg text-sm"
                        disabled={!selectedWarehouse}
                        required
                      >
                        <option value="">选择库区</option>
                        {zones.map(z => (
                          <option key={z.id} value={z.id}>{z.code}-{z.name}</option>
                        ))}
                      </select>
                    </div>
                    <span className="text-gray-400 mt-4">-</span>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">货架</label>
                      <select
                        value={selectedShelf}
                        onChange={(e) => { setSelectedShelf(e.target.value); setSelectedLocation(''); }}
                        className="w-full px-2 py-1.5 border rounded-lg text-sm"
                        disabled={!selectedZone}
                        required
                      >
                        <option value="">选择货架</option>
                        {shelves.map(s => (
                          <option key={s.id} value={s.id}>{s.code}</option>
                        ))}
                      </select>
                    </div>
                    <span className="text-gray-400 mt-4">-</span>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">库位</label>
                      <select
                        value={selectedLocation}
                        onChange={(e) => setSelectedLocation(e.target.value)}
                        className="w-full px-2 py-1.5 border rounded-lg text-sm"
                        disabled={!selectedShelf}
                        required
                      >
                        <option value="">选择库位</option>
                        {locations.map(l => (
                          <option key={l.id} value={l.id}>L{l.level}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">批次号（可选）</label>
                      <input
                        type="text"
                        value={batchNo}
                        onChange={(e) => setBatchNo(e.target.value)}
                        className="w-full px-2 py-1.5 border rounded-lg text-sm"
                        placeholder="批次号"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">备注（可选）</label>
                      <input
                        type="text"
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        className="w-full px-2 py-1.5 border rounded-lg text-sm"
                        placeholder="备注"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">套装</label>
                      <select
                        value={selectedBundle}
                        onChange={(e) => setSelectedBundle(e.target.value)}
                        className="w-full px-2 py-1.5 border rounded-lg text-sm"
                        required
                      >
                        <option value="">选择套装</option>
                        {bundles.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">入库数量</label>
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 border rounded-lg text-sm"
                        min="1"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">仓库</label>
                      <select
                        value={selectedWarehouse}
                        onChange={(e) => { setSelectedWarehouse(e.target.value); setSelectedZone(''); setSelectedShelf(''); setSelectedLocation(''); }}
                        className="w-full px-2 py-1.5 border rounded-lg text-sm"
                        required
                      >
                        <option value="">选择仓库</option>
                        {warehouses.map(w => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                    </div>
                    <span className="text-gray-400 mt-4">-</span>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">库区</label>
                      <select
                        value={selectedZone}
                        onChange={(e) => { setSelectedZone(e.target.value); setSelectedShelf(''); setSelectedLocation(''); }}
                        className="w-full px-2 py-1.5 border rounded-lg text-sm"
                        disabled={!selectedWarehouse}
                        required
                      >
                        <option value="">选择库区</option>
                        {zones.map(z => (
                          <option key={z.id} value={z.id}>{z.code}-{z.name}</option>
                        ))}
                      </select>
                    </div>
                    <span className="text-gray-400 mt-4">-</span>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">货架</label>
                      <select
                        value={selectedShelf}
                        onChange={(e) => { setSelectedShelf(e.target.value); setSelectedLocation(''); }}
                        className="w-full px-2 py-1.5 border rounded-lg text-sm"
                        disabled={!selectedZone}
                        required
                      >
                        <option value="">选择货架</option>
                        {shelves.map(s => (
                          <option key={s.id} value={s.id}>{s.code}</option>
                        ))}
                      </select>
                    </div>
                    <span className="text-gray-400 mt-4">-</span>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">库位</label>
                      <select
                        value={selectedLocation}
                        onChange={(e) => setSelectedLocation(e.target.value)}
                        className="w-full px-2 py-1.5 border rounded-lg text-sm"
                        disabled={!selectedShelf}
                        required
                      >
                        <option value="">选择库位</option>
                        {locations.map(l => (
                          <option key={l.id} value={l.id}>L{l.level}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="block text-xs text-gray-600 mb-1">备注（可选）</label>
                    <input
                      type="text"
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      className="w-full px-2 py-1.5 border rounded-lg text-sm"
                      placeholder="备注"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 py-2 border rounded-lg text-sm hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
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
            <div className="overflow-y-auto max-h-[60vh]">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">仓库名</th>
                    <th className="px-3 py-2 text-left">类型</th>
                    <th className="px-3 py-2 text-left">商品/套装</th>
                    <th className="px-3 py-2 text-left">货位</th>
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
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 text-xs rounded ${item.type === 'bundle' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                {item.type === 'bundle' ? '套装' : '商品'}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              {item.type === 'bundle' 
                                ? <div className="flex items-center gap-1">
                                    {item.bundle?.name}
                                    {item.bundle?.items?.length > 0 && (
                                      <button
                                        type="button"
                                        onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, content: <div><div className="font-semibold mb-2 text-blue-400">套装包含：</div>{item.bundle.items.map((bundleItem: any) => (<div key={bundleItem.id} className="text-gray-200 py-1"><span className="text-blue-400">{bundleItem.sku?.product?.name}</span><span className="text-gray-400"> · {bundleItem.sku?.spec}/{bundleItem.sku?.packaging}</span><span className="text-yellow-400 ml-1">×{bundleItem.quantity}</span></div>))}</div> })}
                                        onMouseLeave={() => setTooltip(null)}
                                        onMouseMove={(e) => setTooltip({ x: e.clientX, y: e.clientY, content: <div><div className="font-semibold mb-2 text-blue-400">套装包含：</div>{item.bundle.items.map((bundleItem: any) => (<div key={bundleItem.id} className="text-gray-200 py-1"><span className="text-blue-400">{bundleItem.sku?.product?.name}</span><span className="text-gray-400"> · {bundleItem.sku?.spec}/{bundleItem.sku?.packaging}</span><span className="text-yellow-400 ml-1">×{bundleItem.quantity}</span></div>))}</div> })}
                                        className="p-0.5 hover:bg-gray-100 rounded"
                                      >
                                        <Info className="w-4 h-4 text-gray-400 cursor-help" />
                                      </button>
                                    )}
                                  </div>
                                : getSkuInfo(item.skuId)}
                            </td>
                            <td className="px-3 py-2">{item.location?.shelf?.zone?.code || '-'}-{item.location?.shelf?.code || '-'}-L{item.location?.level}</td>
                            <td className="px-3 py-2 text-right">+{item.quantity}</td>
                            <td className="px-3 py-2 text-gray-500">
                              {new Date(item.createdAt).toLocaleString()}
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

      {showStockOutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b shrink-0">
              <h2 className="text-xl font-bold">出库记录</h2>
              <button onClick={() => setShowStockOutModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-auto flex-1">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">仓库</th>
                    <th className="px-3 py-2 text-left">订单号</th>
                    <th className="px-3 py-2 text-left">类型</th>
                    <th className="px-3 py-2 text-left">商品/套装</th>
                    <th className="px-3 py-2 text-left">货位</th>
                    <th className="px-3 py-2 text-right">数量</th>
                    <th className="px-3 py-2 text-left">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {stockOuts.length > 0 ? stockOuts.map((out: any) => (
                    <tr key={out.id} className="border-t overflow-visible">
                      <td className="px-3 py-2">{out.warehouse?.name || '-'}</td>
                      <td className="px-3 py-2 font-mono text-sm">
                          {out.order?.orderNo ? (
                            <Link to={`/orders/${out.orderId}`} className="text-primary-600 hover:text-primary-800 hover:underline">
                              {out.order.orderNo}
                            </Link>
                          ) : out.orderId.substring(0, 8)}
                        </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 text-xs rounded ${out.skuId ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                          {out.skuId ? '商品' : '套装'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {out.skuId
                          ? `${out.sku?.product?.name || ''} - ${out.sku?.spec || ''}/${out.sku?.packaging || ''}`
                          : (
                            <div className="flex items-center gap-2">
                              <span>{out.bundle?.name || '-'}</span>
                              {out.bundle?.items?.length > 0 && (
                                <button
                                  type="button"
                                  onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, content: <div><div className="font-semibold mb-2 text-blue-400">套装包含：</div>{out.bundle.items.map((item: any) => (<div key={item.id} className="text-gray-200 py-1"><span className="text-blue-400">{item.sku?.product?.name}</span><span className="text-gray-400"> · {item.sku?.spec}/{item.sku?.packaging}</span><span className="text-yellow-400 ml-1">×{item.quantity}</span></div>))}</div> })}
                                  onMouseLeave={() => setTooltip(null)}
                                  onMouseMove={(e) => setTooltip({ x: e.clientX, y: e.clientY, content: <div><div className="font-semibold mb-2 text-blue-400">套装包含：</div>{out.bundle.items.map((item: any) => (<div key={item.id} className="text-gray-200 py-1"><span className="text-blue-400">{item.sku?.product?.name}</span><span className="text-gray-400"> · {item.sku?.spec}/{item.sku?.packaging}</span><span className="text-yellow-400 ml-1">×{item.quantity}</span></div>))}</div> })}
                                  className="p-0.5 hover:bg-gray-100 rounded"
                                >
                                  <Info className="w-4 h-4 text-gray-400 cursor-help" />
                                </button>
                              )}
                            </div>
                          )}
                      </td>
                      <td className="px-3 py-2">{out.location?.shelf?.zone?.code || '-'}-{out.location?.shelf?.code || '-'}-L{out.location?.level}</td>
                      <td className="px-3 py-2 text-right text-red-600">-{out.quantity}</td>
                      <td className="px-3 py-2 text-gray-500">
                        {new Date(out.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
                        暂无出库记录
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tooltip && (
        <div
          className="fixed bg-gray-900 text-white text-xs rounded-xl p-3 min-w-[220px] shadow-xl z-[9999] pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y - 30 }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}
