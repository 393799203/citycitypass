import { useState, useEffect } from 'react';
import { stockTransferApi, warehouseApi, productApi, bundleApi, stockApi } from '../api';
import { Warehouse, Package, Plus, X, MapPin, Check, ArrowRight, Trash2, Search } from 'lucide-react';
import { useConfirm } from '../components/ConfirmProvider';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ZONE_TYPES: Record<string, string> = {
  RECEIVING: '收货区',
  STORAGE: '存储区',
  PICKING: '拣货区',
  RETURNING: '退货区',
  DAMAGED: '报废区',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_TRANSIT: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

const STATUS_NAMES: Record<string, string> = {
  PENDING: '待处理',
  IN_TRANSIT: '移库中',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

interface TransferItemInput {
  itemType: 'PRODUCT' | 'BUNDLE';
  skuId?: string;
  bundleId?: string;
  fromLocationId: string;
  fromLocationCode: string;
  toLocationId: string;
  toLocationCode: string;
  quantity: number;
  spec?: string;
  packaging?: string;
}

interface Transfer {
  id: string;
  transferNo: string;
  warehouseId: string;
  warehouse?: any;
  fromZone?: any;
  toZone?: any;
  status: string;
  items: any[];
  createdAt: string;
  executedAt?: string;
}

interface StockItem {
  locationId: string;
  locationCode: string;
  locationFullCode: string;
  zoneId: string;
  zoneName: string;
  zoneType: string;
  skuId?: string;
  bundleId?: string;
  productName?: string;
  bundleName?: string;
  spec?: string;
  packaging?: string;
  type: string;
  totalQuantity: number;
  availableQuantity: number;
  sku?: any;
  bundle?: any;
}

interface StockGroupListProps {
  stocks: StockItem[];
  selectedStock: StockItem | null;
  onSelectStock: (stock: StockItem) => void;
}

function StockGroupList({ stocks, selectedStock, onSelectStock }: StockGroupListProps) {
  const groups: Record<string, { items: StockItem[], key: string }> = {};

  stocks.forEach((stock, index) => {
    const name = stock.type === 'product' ? (stock.productName || '') : (stock.bundleName || '');
    const id = stock.type === 'product' ? (stock.skuId || '') : (stock.bundleId || '');
    const groupKey = `${stock.type}-${id}-${name}`;
    if (!groups[groupKey]) {
      groups[groupKey] = { items: [], key: groupKey };
    }
    groups[groupKey].items.push(stock);
  });

  const getDisplayName = (stock: StockItem) => {
    return stock.type === 'product' ? stock.productName : stock.bundleName;
  };

  const getTotalQty = (items: StockItem[]) => {
    const available = items.reduce((sum, i) => sum + i.availableQuantity, 0);
    const total = items.reduce((sum, i) => sum + i.totalQuantity, 0);
    return { available, total };
  };

  return (
    <div className="divide-y divide-gray-200">
      {Object.entries(groups).map(([groupKey, { items, key }]) => {
        const firstItem = items[0];
        const qty = getTotalQty(items);

        return (
          <div key={key} className="p-3">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {getDisplayName(firstItem)}
                  {firstItem.spec && (
                    <span className="ml-2 text-xs text-gray-500">
                      {firstItem.spec} | {firstItem.packaging}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-500 whitespace-nowrap ml-2">
                {items.length}库位 | 可用:{qty.available} | 总:{qty.total}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {items.map((stock, idx) => {
                const isItemSelected = selectedStock &&
                  stock.locationId === selectedStock.locationId &&
                  stock.type === selectedStock.type &&
                  ((stock.type === 'product' && stock.skuId === selectedStock.skuId) ||
                   (stock.type === 'bundle' && stock.bundleId === selectedStock.bundleId));
                return (
                  <div
                    key={`${stock.type}-${stock.type === 'product' ? stock.skuId : stock.bundleId}-${stock.locationId}-${idx}`}
                    onClick={() => onSelectStock(stock)}
                    className={`px-2 py-1 rounded text-xs cursor-pointer border ${
                      isItemSelected
                        ? 'bg-blue-100 border-blue-400 text-blue-700'
                        : 'bg-gray-50 border-gray-300 hover:bg-blue-50'
                    }`}
                  >
                    <span className="text-orange-600">{stock.locationFullCode}</span>
                    <span className="ml-1 text-green-600">{stock.availableQuantity}件</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InboundStockGroupList({ stocks, selectedStock, onSelectStock }: StockGroupListProps) {
  const groups: Record<string, { items: StockItem[], key: string }> = {};

  stocks.forEach((stock, index) => {
    const name = stock.type === 'product' ? (stock.productName || '') : (stock.bundleName || '');
    const id = stock.type === 'product' ? (stock.skuId || '') : (stock.bundleId || '');
    const groupKey = `${stock.type}-${id}-${name}`;
    if (!groups[groupKey]) {
      groups[groupKey] = { items: [], key: groupKey };
    }
    groups[groupKey].items.push(stock);
  });

  const getTotalQty = (items: StockItem[]) => {
    const available = items.reduce((sum, i) => sum + i.availableQuantity, 0);
    const total = items.reduce((sum, i) => sum + i.totalQuantity, 0);
    return { available, total };
  };

  return (
    <div className="divide-y divide-gray-200">
      {Object.entries(groups).map(([groupKey, { items, key }]) => {
        const qty = getTotalQty(items);

        return (
          <div key={key} className="p-3">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {items[0].type === 'product' ? items[0].productName : items[0].bundleName}
                </div>
                {items[0].spec && (
                  <div className="text-xs text-gray-500 truncate">
                    {items[0].spec} | {items[0].packaging}
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-400 whitespace-nowrap ml-2">
                {items.length}库位 | 可用:{qty.available} | 总:{qty.total}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {items.map((stock, idx) => {
                const isItemSelected = selectedStock &&
                  stock.locationId === selectedStock.locationId &&
                  stock.type === selectedStock.type &&
                  ((stock.type === 'product' && stock.skuId === selectedStock.skuId) ||
                   (stock.type === 'bundle' && stock.bundleId === selectedStock.bundleId));
                return (
                  <div
                    key={`${stock.type}-${stock.type === 'product' ? stock.skuId : stock.bundleId}-${stock.locationId}-${idx}`}
                    onClick={() => onSelectStock(stock)}
                    className={`px-2 py-1 rounded text-xs cursor-pointer border ${
                      isItemSelected
                        ? 'bg-green-100 border-green-400 text-green-700'
                        : 'bg-gray-50 border-gray-300 hover:bg-green-50'
                    }`}
                  >
                    <span className="text-orange-600">{stock.locationFullCode}</span>
                    <span className="ml-1 text-green-600">{stock.availableQuantity}件</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function StockTransfers() {
  const { confirm } = useConfirm();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterWarehouseId, setFilterWarehouseId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [formWarehouseId, setFormWarehouseId] = useState('');
  const [formItems, setFormItems] = useState<TransferItemInput[]>([]);
  const [formRemark, setFormRemark] = useState('');

  const [allStocks, setAllStocks] = useState<StockItem[]>([]);
  const [filteredStocks, setFilteredStocks] = useState<StockItem[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [loadingStocks, setLoadingStocks] = useState(false);

  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);
  const [toZoneId, setToZoneId] = useState('');
  const [toShelfId, setToShelfId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [transferQty, setTransferQty] = useState(1);

  const [zones, setZones] = useState<any[]>([]);
  const [targetLocations, setTargetLocations] = useState<any[]>([]);

  const [inboundType, setInboundType] = useState<'STOCK_IN' | 'TRANSFER'>('TRANSFER');
  const [inboundWarehouseId, setInboundWarehouseId] = useState('');
  const [inboundItems, setInboundItems] = useState<any[]>([]);
  const [inboundRemark, setInboundRemark] = useState('');
  const [inboundStocks, setInboundStocks] = useState<any[]>([]);
  const [inboundFilteredStocks, setInboundFilteredStocks] = useState<any[]>([]);
  const [inboundSearchKeyword, setInboundSearchKeyword] = useState('');
  const [inboundLoading, setInboundLoading] = useState(false);
  const [inboundSelectedStock, setInboundSelectedStock] = useState<any>(null);
  const [inboundToZoneId, setInboundToZoneId] = useState('');
  const [inboundToShelfId, setInboundToShelfId] = useState('');
  const [inboundToLocationId, setInboundToLocationId] = useState('');
  const [inboundQty, setInboundQty] = useState(1);
  const [inboundOrders, setInboundOrders] = useState<any[]>([]);

  const [products, setProducts] = useState<any[]>([]);
  const [bundles, setBundles] = useState<any[]>([]);
  const [inboundProductType, setInboundProductType] = useState<'SKU' | 'BUNDLE'>('SKU');
  const [shelves, setShelves] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

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

  const uniqueZones = zones.map((z: any) => ({ id: z.id, name: z.name, code: z.code }));
  const zoneShelves: any[] = toZoneId ? (zones.find((z: any) => z.id === toZoneId)?.shelves || []) : [];
  const shelfLocations: any[] = toShelfId ? (zoneShelves.find((s: any) => s.id === toShelfId)?.locations || []) : [];

  useEffect(() => {
    loadWarehouses();
    loadTransfers();
    loadInboundOrders();
  }, []);

  useEffect(() => {
    if (formWarehouseId) {
      loadWarehouseStocks(formWarehouseId);
      loadZones(formWarehouseId);
    } else {
      setAllStocks([]);
      setFilteredStocks([]);
      setZones([]);
      setTargetLocations([]);
    }
  }, [formWarehouseId]);

  useEffect(() => {
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      setFilteredStocks(
        allStocks.filter(
          (s) =>
            s.productName?.toLowerCase().includes(kw) ||
            s.bundleName?.toLowerCase().includes(kw) ||
            s.spec?.toLowerCase().includes(kw) ||
            s.packaging?.toLowerCase().includes(kw) ||
            s.locationCode.toLowerCase().includes(kw)
        )
      );
    } else {
      setFilteredStocks(allStocks);
    }
  }, [searchKeyword, allStocks]);

  useEffect(() => {
    if (inboundWarehouseId) {
      loadInboundProducts();
      loadInboundZones(inboundWarehouseId);
    }
  }, [inboundWarehouseId]);

  useEffect(() => {
    if (inboundSearchKeyword.trim()) {
      const kw = inboundSearchKeyword.toLowerCase();
      setInboundFilteredStocks(
        inboundStocks.filter(
          (s) =>
            s.productName?.toLowerCase().includes(kw) ||
            s.bundleName?.toLowerCase().includes(kw) ||
            s.spec?.toLowerCase().includes(kw) ||
            s.packaging?.toLowerCase().includes(kw) ||
            s.locationCode.toLowerCase().includes(kw)
        )
      );
    } else {
      setInboundFilteredStocks(inboundStocks);
    }
  }, [inboundSearchKeyword, inboundStocks]);

  useEffect(() => {
    loadProductsAndBundles();
  }, []);

  const loadProductsAndBundles = async () => {
    const [pRes, bRes] = await Promise.all([productApi.list(), bundleApi.list()]);
    if (pRes.data.success) setProducts(pRes.data.data);
    if (bRes.data.success) setBundles(bRes.data.data);
  };

  const loadInboundProducts = async () => {
    setInboundLoading(true);
    try {
      const [productRes, bundleRes] = await Promise.all([
        productApi.list(),
        bundleApi.list(),
      ]);

      const productItems = (productRes.data.data || []).flatMap((p: any) =>
        (p.skus || []).map((sku: any) => ({
          type: 'product' as const,
          skuId: sku.id,
          productId: p.id,
          productName: p.name,
          bundleName: undefined,
          spec: sku.spec,
          packaging: sku.packaging,
          brand: sku.brand || p.brand,
          category: sku.category || p.category,
          locationCode: '-',
          availableQuantity: 0,
          totalQuantity: 0,
        }))
      );

      const bundleItems = (bundleRes.data.data || []).map((b: any) => ({
        type: 'bundle' as const,
        bundleId: b.id,
        productName: undefined,
        bundleName: b.name,
        price: b.price,
        items: b.items || [],
        spec: undefined,
        packaging: undefined,
        locationCode: '-',
        availableQuantity: 0,
        totalQuantity: 0,
      }));

      const all = [...productItems, ...bundleItems];
      setInboundStocks(all);
      setInboundFilteredStocks(all);
    } finally {
      setInboundLoading(false);
    }
  };

  const loadInboundZones = async (warehouseId: string) => {
    const res = await warehouseApi.getZones(warehouseId);
    if (res.data.success) {
      const zonesData = res.data.data || [];
      setZones(zonesData);
      const salesZones = zonesData.filter(
        (z: any) => z.type === 'STORAGE' || z.type === 'PICKING'
      );
      if (salesZones.length > 0) {
        setInboundToZoneId(salesZones[0].id);
      }
    }
  };

  const handleInboundSelectStock = (stock: any) => {
    setInboundSelectedStock(stock);
    setInboundQty(1);
  };

  const handleInboundAddItem = () => {
    if (!selectedSku && !selectedBundle) {
      toast.error('请选择商品');
      return;
    }
    if (!toLocationId) {
      toast.error('请选择目标库位');
      return;
    }

    const location = shelfLocations.find((l: any) => l.id === toLocationId);
    const zone = uniqueZones.find(z => z.id === toZoneId);
    const shelf = zoneShelves.find(s => s.id === toShelfId);
    const locationCode = location
      ? `${zone?.code || ''}-${shelf?.code || ''}-L${location.level}`
      : '-';

    if (selectedSku) {
      const sku = inboundFilteredStocks.find((s: any) => s.skuId === selectedSku);
      const product = inboundFilteredStocks.find((s: any) => s.productId === selectedProduct);

      const existing = inboundItems.find(
        (item) => item.skuId === selectedSku && item.locationId === toLocationId
      );
      if (existing) {
        existing.quantity += transferQty;
        setInboundItems([...inboundItems]);
      } else {
        setInboundItems([
          ...inboundItems,
          {
            type: 'product',
            skuId: selectedSku,
            productId: selectedProduct,
            productName: product?.productName || sku?.productName || '',
            bundleId: undefined,
            bundleName: undefined,
            spec: sku?.spec || '',
            packaging: sku?.packaging || '',
            locationId: toLocationId,
            locationCode: locationCode,
            quantity: transferQty,
          },
        ]);
      }
    } else if (selectedBundle) {
      const bundle = inboundFilteredStocks.find((s: any) => s.bundleId === selectedBundle);

      const existing = inboundItems.find(
        (item) => item.bundleId === selectedBundle && item.locationId === toLocationId
      );
      if (existing) {
        existing.quantity += transferQty;
        setInboundItems([...inboundItems]);
      } else {
        setInboundItems([
          ...inboundItems,
          {
            type: 'bundle',
            skuId: undefined,
            productId: undefined,
            productName: bundle?.bundleName || '',
            bundleId: selectedBundle,
            bundleName: bundle?.bundleName || '',
            spec: '',
            packaging: '',
            locationId: toLocationId,
            locationCode: locationCode,
            quantity: transferQty,
          },
        ]);
      }
    }

    setSelectedSku('');
    setSelectedBundle('');
    setTransferQty(1);
  };

  const handleInboundRemoveItem = (index: number) => {
    setInboundItems(inboundItems.filter((_, i) => i !== index));
  };

  const handleCreateInbound = async () => {
    if (!inboundWarehouseId || inboundItems.length === 0) {
      toast.error('请完善信息');
      return;
    }
    const ok = await confirm({
      message: `确认创建入库单？共 ${inboundItems.length} 项商品`,
    });
    if (!ok) return;
    try {
      const res = await stockApi.createInboundOrder({
        warehouseId: inboundWarehouseId,
        remark: inboundRemark || undefined,
        items: inboundItems.map(item => ({
          type: item.type,
          skuId: item.skuId || null,
          bundleId: item.bundleId || null,
          locationId: item.locationId || null,
          quantity: item.quantity,
        })),
      });
      if (res.data.success) {
        toast.success('入库单创建成功');
        setInboundItems([]);
        setInboundRemark('');
        setInboundSearchKeyword('');
        setShowModal(false);
        loadTransfers();
      } else {
        toast.error(res.data.message || '创建失败');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '创建失败');
    }
  };

  const resetInboundForm = () => {
    setInboundItems([]);
    setInboundRemark('');
    setInboundSearchKeyword('');
    setInboundSelectedStock(null);
    setInboundToZoneId('');
    setInboundToShelfId('');
    setInboundToLocationId('');
    setInboundQty(1);
  };

  const resetInboundFormFields = () => {
    setItemType('product');
    setSelectedProduct('');
    setSelectedSku('');
    setSelectedBundle('');
    setSelectedWarehouse('');
    setSelectedZone('');
    setSelectedShelf('');
    setSelectedLocation('');
    setQuantity(1);
    setBatchNo('');
    setRemark('');
  };

  useEffect(() => {
    if (inboundWarehouseId) {
      warehouseApi.listZones(inboundWarehouseId).then(res => {
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
  }, [inboundWarehouseId]);

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

  const selectedProductSkus = selectedProduct
    ? products.find(p => p.id === selectedProduct)?.skus || []
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await stockApi.stockIn({
        warehouseId: selectedWarehouse,
        zoneId: selectedZone,
        shelfId: selectedShelf,
        locationId: selectedLocation,
        productType: itemType,
        skuId: itemType === 'product' ? selectedSku : undefined,
        bundleId: itemType === 'bundle' ? selectedBundle : undefined,
        quantity,
        batchNo: batchNo || undefined,
        remark: remark || undefined,
      });
      if (res.data.success) {
        const stockInData = res.data.data;
        const id = stockInData.data.id;
        const type = stockInData.type;
        const execRes = await stockApi.executeStockIn(id, type);
        if (execRes.data.success) {
          toast.success('入库成功');
          setShowModal(false);
          resetInboundFormFields();
        } else {
          toast.error(execRes.data.message || '入库执行失败');
        }
      } else {
        toast.error(res.data.message || '创建入库单失败');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '入库失败');
    }
  };

  const inboundZoneShelves = inboundToZoneId
    ? zones.find((z: any) => z.id === inboundToZoneId)?.shelves || []
    : [];
  const inboundShelfLocations = inboundToShelfId
    ? inboundZoneShelves.find((s: any) => s.id === inboundToShelfId)?.locations || []
    : [];

  const loadWarehouses = async () => {
    const res = await warehouseApi.list();
    if (res.data.success) setWarehouses(res.data.data);
  };

  const loadWarehouseStocks = async (warehouseId: string) => {
    setLoadingStocks(true);
    try {
      const res = await stockTransferApi.getZoneStocks(warehouseId);
      if (res.data.success) {
        const productStocks = (res.data.data.productStocks || []).map((s: any) => {
          const shelf = s.location?.shelf;
          const zone = shelf?.zone;
          return {
            ...s,
            skuId: s.sku?.id || s.skuId,
            locationId: s.locationId,
            locationCode: shelf?.code ? `${shelf.code}-L${s.location.level}` : s.locationId,
            locationFullCode: shelf?.code ? `${zone?.code || ''}-${shelf.code}-L${s.location.level}` : s.locationId,
            zoneId: zone?.id || s.zoneId,
            zoneName: zone?.name || '',
            zoneCode: zone?.code || '',
            zoneType: zone?.type || '',
            productName: s.sku?.product?.name || '',
            spec: s.sku?.spec || '',
            packaging: s.sku?.packaging || '',
            type: 'product',
          };
        });
        const bundleStocks = (res.data.data.bundleStocks || []).map((s: any) => {
          const shelf = s.location?.shelf;
          const zone = shelf?.zone;
          return {
            ...s,
            bundleId: s.bundle?.id || s.bundleId,
            locationId: s.locationId,
            locationCode: shelf?.code ? `${shelf.code}-L${s.location.level}` : s.locationId,
            locationFullCode: shelf?.code ? `${zone?.code || ''}-${shelf.code}-L${s.location.level}` : s.locationId,
            zoneId: zone?.id || s.zoneId,
            zoneName: zone?.name || '',
            zoneCode: zone?.code || '',
            zoneType: zone?.type || '',
            bundleName: s.bundle?.name || '',
            type: 'bundle',
          };
        });
        const combined = [...productStocks, ...bundleStocks].filter(
          (s) => s.totalQuantity > 0
        );
        const uniqueMap = new Map();
        combined.forEach(s => {
          const id = s.type === 'product' ? (s.skuId || '') : (s.bundleId || '');
          const key = `${s.type}-${id}-${s.locationId}`;
          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, s);
          }
        });
        const uniqueStocks = Array.from(uniqueMap.values());
        setAllStocks(uniqueStocks);
        setFilteredStocks(uniqueStocks);
      }
    } finally {
      setLoadingStocks(false);
    }
  };

  const loadZones = async (warehouseId: string) => {
    const res = await warehouseApi.listZones(warehouseId);
    if (res.data.success) {
      setZones(res.data.data);
      const locs: any[] = [];
      res.data.data.forEach((zone: any) => {
        zone.shelves?.forEach((shelf: any) => {
          shelf.locations?.forEach((loc: any) => {
            locs.push({
              id: loc.id,
              code: `${zone.code}-${shelf.code}-L${loc.level}`,
              zoneName: zone.name,
              zoneCode: zone.code,
            });
          });
        });
      });
      locs.sort((a, b) => a.code.localeCompare(b.code));
      setTargetLocations(locs);
    }
  };

  const loadTransfers = async () => {
    setLoading(true);
    try {
      const [transferRes, inboundRes] = await Promise.all([
        stockTransferApi.list({
          warehouseId: filterWarehouseId || undefined,
          status: filterStatus || undefined,
        }),
        stockApi.getInboundOrders({
          warehouseId: filterWarehouseId || undefined,
          status: filterStatus || undefined,
        }),
      ]);

      const transferRecords = transferRes.data.success ? transferRes.data.data.map((t: any) => ({
        ...t,
        recordType: 'TRANSFER',
      })) : [];

      const inboundRecords = inboundRes.data.success ? inboundRes.data.data.map((order: any) => ({
        id: order.id,
        transferNo: order.inboundNo,
        warehouse: order.warehouse,
        status: order.status,
        createdAt: order.createdAt,
        recordType: 'INBOUND',
        items: order.items?.map((item: any) => ({
          id: item.id,
          sku: item.sku,
          bundle: item.bundle,
          quantity: item.quantity,
          type: item.type,
          location: item.location,
        })) || [],
      })) : [];

      const allRecords = [...transferRecords, ...inboundRecords]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setTransfers(allRecords);
    } finally {
      setLoading(false);
    }
  };

  const loadInboundOrders = async () => {
  };

  const handleSelectStock = (stock: StockItem) => {
    setSelectedStock(stock);
    setTransferQty(1);
    setToLocationId('');
  };

  const handleAddItem = () => {
    if (!selectedStock || !toLocationId || !transferQty) {
      toast.error('请选择商品、目标库位和数量');
      return;
    }
    if (transferQty > selectedStock.availableQuantity) {
      toast.error('移库数量不能超过可用数量');
      return;
    }
    if (transferQty > selectedStock.totalQuantity) {
      toast.error('移库数量不能超过总数量');
      return;
    }

    const newItem: TransferItemInput = {
      itemType: selectedStock.type === 'product' ? 'PRODUCT' : 'BUNDLE',
      skuId: selectedStock.skuId,
      bundleId: selectedStock.bundleId,
      fromLocationId: selectedStock.locationId,
      fromLocationCode: selectedStock.locationFullCode,
      toLocationId: toLocationId,
      toLocationCode: targetLocations.find(l => l.id === toLocationId)?.code || toLocationId,
      quantity: transferQty,
      spec: selectedStock.spec,
      packaging: selectedStock.packaging,
    };

    const existingIndex = formItems.findIndex(
      (i) =>
        i.skuId === newItem.skuId &&
        i.bundleId === newItem.bundleId &&
        i.fromLocationId === newItem.fromLocationId &&
        i.toLocationId === newItem.toLocationId
    );

    if (existingIndex >= 0) {
      const updated = [...formItems];
      updated[existingIndex].quantity += newItem.quantity;
      setFormItems(updated);
    } else {
      setFormItems([...formItems, newItem]);
    }

    setSelectedStock(null);
    setTransferQty(1);
    setToLocationId('');
  };

  const handleRemoveItem = (index: number) => {
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  const handleCreateTransfer = async () => {
    if (!formWarehouseId || formItems.length === 0) {
      toast.error('请完善信息');
      return;
    }

    const ok = await confirm({ message: `确认创建移库单？共 ${formItems.length} 项商品` });
    if (!ok) return;

    try {
      const res = await stockTransferApi.create({
        warehouseId: formWarehouseId,
        remark: formRemark || undefined,
        items: formItems,
      });

      if (res.data.success) {
        toast.success('移库单创建成功');
        setShowModal(false);
        resetForm();
        loadTransfers();
      } else {
        toast.error(res.data.message || '创建失败');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '创建失败');
    }
  };

  const handleExecuteTransfer = async (id: string) => {
    const ok = await confirm({ message: '确认执行移库？' });
    if (!ok) return;
    try {
      const res = await stockTransferApi.execute(id);
      if (res.data.success) {
        toast.success('移库执行成功');
        loadTransfers();
      } else {
        toast.error(res.data.message || '执行失败');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '执行失败');
    }
  };

  const handleCancelTransfer = async (id: string) => {
    const ok = await confirm({ message: '确认取消该移库单？' });
    if (!ok) return;
    try {
      const res = await stockTransferApi.cancel(id);
      if (res.data.success) {
        toast.success('移库单已取消');
        loadTransfers();
      } else {
        toast.error(res.data.message || '取消失败');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '取消失败');
    }
  };

  const handleExecuteStockIn = async (id: string, type: string) => {
    const ok = await confirm({ message: '确认执行入库？' });
    if (!ok) return;
    try {
      const res = await stockApi.executeStockIn(id, type);
      if (res.data.success) {
        toast.success('入库执行成功');
        loadTransfers();
      } else {
        toast.error(res.data.message || '执行失败');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '执行失败');
    }
  };

  const handleCancelStockIn = async (id: string, type: string) => {
    const ok = await confirm({ message: '确认取消该入库单？' });
    if (!ok) return;
    try {
      const res = await stockApi.cancelStockIn(id, type);
      if (res.data.success) {
        toast.success('入库单已取消');
        loadTransfers();
      } else {
        toast.error(res.data.message || '取消失败');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '取消失败');
    }
  };

  const handleExecuteInboundOrder = async (id: string) => {
    const ok = await confirm({ message: '确认执行该入库单？' });
    if (!ok) return;
    try {
      const res = await stockApi.executeInboundOrder(id);
      if (res.data.success) {
        toast.success('入库单执行成功');
        loadTransfers();
      } else {
        toast.error(res.data.message || '执行失败');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '执行失败');
    }
  };

  const resetForm = () => {
    setFormWarehouseId('');
    setFormItems([]);
    setFormRemark('');
    setAllStocks([]);
    setFilteredStocks([]);
    setZones([]);
    setTargetLocations([]);
    setSelectedStock(null);
    setToZoneId('');
    setToShelfId('');
    setToLocationId('');
    setTransferQty(1);
    setSearchKeyword('');
  };

  const getStockDisplayName = (stock: StockItem) => {
    return stock.type === 'product' ? stock.productName : stock.bundleName;
  };

  const getItemDisplayName = (item: TransferItemInput) => {
    const stock = allStocks.find(
      (s) =>
        (s.skuId === item.skuId || s.bundleId === item.bundleId) &&
        s.locationId === item.fromLocationId
    );
    if (!stock) return '(商品)';
    return stock.type === 'product' ? stock.productName : stock.bundleName;
  };

  const getLocationCode = (locationId: string) => {
    const loc = targetLocations.find((l) => l.id === locationId);
    return loc?.code || locationId;
  };

  const getZoneName = (locationId: string) => {
    const loc = targetLocations.find((l) => l.id === locationId);
    return loc?.zoneName || '';
  };

  return (
    <div className="p-6">
      <ToastContainer />

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
            <Warehouse className="w-7 h-7" />
            入库移库
          </h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setInboundType('STOCK_IN');
              setInboundWarehouseId('');
              setInboundItems([]);
              setInboundRemark('');
              loadWarehouses();
              loadInboundProducts();
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus className="w-4 h-4" />
            新建入库单
          </button>
          <button
            onClick={() => {
              setInboundType('TRANSFER');
              setFormWarehouseId('');
              setFormItems([]);
              setFormRemark('');
              loadWarehouses();
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-4 h-4" />
            新建移库单
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-6 p-4 bg-white rounded-lg shadow">
        <select
          value={filterWarehouseId}
          onChange={(e) => setFilterWarehouseId(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="">全部仓库</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="">全部状态</option>
          <option value="PENDING">待移库</option>
          <option value="COMPLETED">已完成</option>
          <option value="CANCELLED">已取消</option>
        </select>
        <button
          onClick={loadTransfers}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
        >
          搜索
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                类型
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                移库单号
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                仓库
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                商品
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                源库位→目的库位
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">
                数量
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">
                状态
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                创建/执行时间
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {transfers.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-8 text-center text-gray-400"
                >
                  暂无记录
                </td>
              </tr>
            ) : (
              transfers.map((t: any) => {
                const isInbound = t.recordType === 'INBOUND';
                const rows = t.items?.map((item: any, idx: number) => {
                    const itemType = isInbound ? item.type : (item.bundle ? 'bundle' : 'product');
                    const itemName = isInbound
                      ? (item.type === 'bundle' ? item.bundle?.name || '-' : item.sku?.product?.name || '-')
                      : (item.sku?.product?.name || item.bundle?.name || '-');
                    const itemSpec = item.sku?.spec;
                    const itemPackaging = item.sku?.packaging;

                    let fromCode = '';
                    let toCode = '-';

                    if (isInbound) {
                      toCode = item.location?.shelf?.code
                        ? `${item.location.shelf?.zone?.name || ''}-${item.location.shelf?.code || ''}-L${item.location.level}`
                        : '-';
                    } else {
                      fromCode = item.fromLocation?.shelf?.code
                        ? `${item.fromLocation.shelf.zone?.code || ''}-${item.fromLocation.shelf.code}-L${item.fromLocation.level}`
                        : '-';
                      toCode = item.toLocation?.shelf?.code
                        ? `${item.toLocation.shelf.zone?.code || ''}-${item.toLocation.shelf.code}-L${item.toLocation.level}`
                        : '-';
                    }

                    return { idx, itemName, itemSpec, itemPackaging, fromCode, toCode, quantity: item.quantity, itemType };
                  }) || [];

                return rows.map((row: any, rowIdx: number) => (
                  <tr key={`${t.id}-${row.idx}`} className="hover:bg-gray-50">
                    {rowIdx === 0 && (
                      <>
                        <td className="px-4 py-3 text-sm" rowSpan={rows.length}>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            isInbound ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {isInbound ? '入库' : '移库'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono" rowSpan={rows.length}>
                          {t.transferNo}
                        </td>
                        <td className="px-4 py-3 text-sm" rowSpan={rows.length}>
                          {t.warehouse?.name}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-1">
                        <span className={`px-1.5 py-0.5 text-xs rounded ${
                          row.itemType === 'bundle' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {row.itemType === 'bundle' ? '套装' : '商品'}
                        </span>
                        <span className="font-medium">{row.itemName}</span>
                      </div>
                      {row.itemSpec && (
                        <div className="text-xs text-gray-500">{row.itemSpec} | {row.itemPackaging}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-1">
                        <span className="text-orange-600">{row.fromCode}</span>
                        <ArrowRight className="w-3 h-3 text-gray-400" />
                        <span className="text-green-600">{row.toCode}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-blue-600 font-medium">
                      {row.quantity}件
                    </td>
                    {rowIdx === 0 && (
                      <>
                        <td className="px-4 py-3 text-sm" rowSpan={rows.length}>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            t.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            t.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {t.status === 'PENDING' ? '待执行' :
                             t.status === 'COMPLETED' ? '已完成' : t.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm" rowSpan={rows.length}>
                          {new Date(t.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm" rowSpan={rows.length}>
                          {t.status === 'PENDING' && (
                            <>
                              {isInbound ? (
                                <button
                                  onClick={() => handleExecuteInboundOrder(t.id)}
                                  className="text-blue-600 hover:text-blue-800 text-sm"
                                >
                                  执行
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleExecuteTransfer(t.id)}
                                    className="text-blue-600 hover:text-blue-800 text-sm mr-2"
                                  >
                                    执行
                                  </button>
                                  <button
                                    onClick={() => handleCancelTransfer(t.id)}
                                    className="text-red-600 hover:text-red-800 text-sm"
                                  >
                                    取消
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ));
              })
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {inboundType === 'STOCK_IN' ? '新建入库单' : '新建移库单'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  if (inboundType === 'STOCK_IN') {
                    resetInboundForm();
                  } else {
                    resetForm();
                  }
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inboundType === 'STOCK_IN' ? (
              <form className="flex">
                <div className="w-1/2 border-r flex flex-col max-h-[70vh]">
                  <div className="p-4 border-b bg-gray-50">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-700">入库单信息</span>
                    </div>
                    <select
                      value={inboundWarehouseId}
                      onChange={async (e) => {
                        const wid = e.target.value;
                        setInboundWarehouseId(wid);
                        setToZoneId('');
                        setToShelfId('');
                        setToLocationId('');
                        if (wid) {
                          const res = await warehouseApi.listZones(wid);
                          if (res.data.success) {
                            setZones(res.data.data);
                          }
                        } else {
                          setZones([]);
                        }
                      }}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="">选择仓库</option>
                      {warehouses.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 px-4 py-2 border-b bg-gray-50">
                    <span className="text-sm font-medium text-gray-700">选择商品</span>
                  </div>

                  <div className="flex border-b">
                    <button
                      type="button"
                      onClick={() => { setInboundProductType('SKU'); setSelectedBundle(''); loadInboundProducts(); }}
                      className={`flex-1 py-2.5 text-sm font-medium border-b-2 ${
                        inboundProductType === 'SKU' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'
                      }`}
                    >
                      商品
                    </button>
                    <button
                      type="button"
                      onClick={() => { setInboundProductType('BUNDLE'); setSelectedProduct(''); setSelectedSku(''); loadInboundProducts(); }}
                      className={`flex-1 py-2.5 text-sm font-medium border-b-2 ${
                        inboundProductType === 'BUNDLE' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500'
                      }`}
                    >
                      套装
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2">
                    {inboundLoading ? (
                      <div className="text-center text-gray-400 py-10">加载中...</div>
                    ) : inboundProductType === 'SKU' ? (
                      (() => {
                        const productGroups = inboundFilteredStocks
                          .filter(s => s.type === 'product')
                          .reduce<Record<string, any[]>>((acc, s) => {
                            const name = s.productName || '';
                            if (!acc[name]) acc[name] = [];
                            acc[name].push(s);
                            return acc;
                          }, {});
                        const productEntries = Object.entries(productGroups);
                        if (productEntries.length === 0) {
                          return <div className="text-center text-gray-400 py-10">暂无商品</div>;
                        }
                        return (
                          <div className="space-y-3">
                            {productEntries.map(([productName, skus]) => {
                              const firstSku = skus[0];
                              return (
                                <div key={productName} className="border border-blue-200 rounded-lg p-3 hover:shadow-md transition-all bg-white">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <Package className="w-4 h-4 text-blue-500" />
                                      <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium">商品</span>
                                      <h3 className="font-bold text-sm text-blue-600">{productName}</h3>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {firstSku?.brand?.name && (
                                        <span className="px-1.5 py-0.5 bg-orange-100 text-orange-600 text-xs rounded">
                                          {firstSku.brand.name}
                                        </span>
                                      )}
                                      {firstSku?.category?.name && (
                                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                          {firstSku.category.name}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-4 gap-1.5">
                                    {skus.map((sku) => (
                                      <button
                                        key={sku.skuId}
                                        type="button"
                                        onClick={() => {
                                          setSelectedProduct(sku.productId);
                                          setSelectedSku(sku.skuId);
                                        }}
                                        className={`p-1.5 rounded-lg border text-left transition-all text-xs ${
                                          selectedSku === sku.skuId
                                            ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400'
                                            : 'bg-gray-50 border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                                        }`}
                                      >
                                        <div className="text-xs text-gray-600">{sku.spec} / {sku.packaging}</div>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()
                    ) : (
                      (() => {
                        const bundleItems = inboundFilteredStocks.filter(s => s.type === 'bundle');
                        if (bundleItems.length === 0) {
                          return <div className="text-center text-gray-400 py-10">暂无套装</div>;
                        }
                        return (
                          <div className="grid grid-cols-2 gap-3">
                            {bundleItems.map((b) => (
                              <div
                                key={b.bundleId}
                                className={`border border-purple-200 rounded-lg p-3 hover:shadow-lg transition-all bg-white ${
                                  selectedBundle === b.bundleId ? 'opacity-60' : 'cursor-pointer'
                                }`}
                                onClick={() => setSelectedBundle(b.bundleId || '')}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <Package className="w-4 h-4 text-purple-500" />
                                  <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded font-medium">套装</span>
                                  <span className="font-bold text-sm text-purple-600">{b.bundleName}</span>
                                </div>
                                {b.items && b.items.length > 0 && (
                                  <div className="text-xs text-purple-700 bg-purple-50 rounded p-2 mb-2 max-h-20 overflow-y-auto">
                                    {b.items.map((item: any, idx: number) => (
                                      <div key={idx} className="flex justify-between py-0.5">
                                        <span className="truncate">{item.sku?.product?.name || item.productName} {item.sku?.spec || item.spec}/{item.sku?.packaging || item.packaging}</span>
                                        <span className="font-medium ml-1">×{item.quantity}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500">{b.items?.length || 0}种商品</span>
                                  <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                                    selectedBundle === b.bundleId ? 'bg-gray-200 text-gray-500' : 'bg-purple-100 text-purple-700'
                                  }`}>
                                    {selectedBundle === b.bundleId ? '✓' : '选择'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()
                    )}
                  </div>
                </div>

                <div className="w-1/2 flex flex-col">
                  <div className="p-4 border-b bg-gray-50">
                    <div className="text-sm font-medium text-gray-700 mb-3">添加入库明细</div>
                    {(selectedSku || selectedBundle) ? (
                      <div className="border rounded-lg p-3 bg-blue-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {selectedBundle ? (
                              <>
                                <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded font-medium">套装</span>
                                <span className="font-medium text-sm text-purple-600">
                                  {inboundFilteredStocks.find(s => s.bundleId === selectedBundle)?.bundleName}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium">商品</span>
                                <span className="font-medium text-sm text-blue-600">
                                  {(() => {
                                    const sku = inboundFilteredStocks.find(s => s.skuId === selectedSku);
                                    const product = inboundFilteredStocks.find(s => s.productId === selectedProduct);
                                    return product?.productName || sku?.productName || '';
                                  })()}
                                </span>
                                {(() => {
                                  const sku = inboundFilteredStocks.find(s => s.skuId === selectedSku);
                                  return sku?.spec || sku?.packaging ? (
                                    <span className="text-xs text-gray-500">- {sku?.spec || ''} / {sku?.packaging || ''}</span>
                                  ) : null;
                                })()}
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs">数量:</label>
                            <input
                              type="number"
                              min="1"
                              max={9999}
                              value={transferQty}
                              onChange={(e) => setTransferQty(parseInt(e.target.value) || 1)}
                              className="w-16 px-2 py-1 border rounded text-center text-xs"
                            />
                            <button
                              onClick={handleInboundAddItem}
                              disabled={!inboundWarehouseId || !toLocationId}
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 text-xs"
                            >
                              添加
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm flex-wrap">
                          <span className="text-orange-600 whitespace-nowrap text-xs">库位:</span>
                          <select
                            value={toZoneId}
                            onChange={(e) => { setToZoneId(e.target.value); setToShelfId(''); setToLocationId(''); }}
                            className="px-2 py-1 border rounded text-xs"
                            disabled={!inboundWarehouseId}
                          >
                            <option value="">选库区</option>
                            {uniqueZones.map(z => (
                              <option key={z.id} value={z.id}>{z.name}({z.code})</option>
                            ))}
                          </select>
                          {toZoneId && (
                            <select
                              value={toShelfId}
                              onChange={(e) => { setToShelfId(e.target.value); setToLocationId(''); }}
                              className="px-2 py-1 border rounded text-xs"
                            >
                              <option value="">选货架</option>
                              {zoneShelves.map(s => (
                                <option key={s.id} value={s.id}>{s.name || s.code}({s.code})</option>
                              ))}
                            </select>
                          )}
                          {toShelfId && (
                            <select
                              value={toLocationId}
                              onChange={(e) => setToLocationId(e.target.value)}
                              className="px-2 py-1 border rounded text-xs"
                            >
                              <option value="">选库位</option>
                              {shelfLocations.map(l => (
                                <option key={l.id} value={l.id}>L{l.level}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="border rounded-lg p-8 text-center text-gray-400">
                        请从左侧选择商品
                      </div>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">入库清单 ({inboundItems.length})</div>
                    {inboundItems.length === 0 ? (
                      <div className="text-center text-gray-400 py-8 bg-gray-50 rounded-lg">
                        暂无商品，请从左侧添加
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {inboundItems.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
                                {item.type === 'bundle' ? (
                                  <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded font-medium">套装</span>
                                ) : (
                                  <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium">商品</span>
                                )}
                                <span className={`truncate font-medium text-sm ${item.type === 'bundle' ? 'text-purple-600' : 'text-blue-600'}`}>{item.productName}</span>
                                {item.spec && (
                                  <span className="text-xs text-gray-500 whitespace-nowrap">
                                    {item.spec} | {item.packaging}
                                  </span>
                                )}
                              </div>
                              <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span className="text-green-600 text-sm whitespace-nowrap flex-shrink-0">
                                {item.locationCode}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-blue-600 font-bold">
                                {item.quantity}件
                              </span>
                              <button
                                type="button"
                                onClick={() => handleInboundRemoveItem(idx)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t p-4 bg-gray-50">
                    <div className="mb-3">
                      <label className="block text-xs text-gray-600 mb-1">备注</label>
                      <textarea
                        value={inboundRemark}
                        onChange={(e) => setInboundRemark(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        rows={2}
                        placeholder="可选..."
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => { setShowModal(false); resetInboundFormFields(); }}
                        className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-100"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateInbound}
                        disabled={!inboundWarehouseId || inboundItems.length === 0}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        创建入库单
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            ) : (
              <form className="flex">
                <div className="w-1/2 border-r flex flex-col max-h-[70vh]">
                  <div className="p-4 border-b bg-gray-50">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-700">移库单信息</span>
                    </div>
                    <select
                      value={formWarehouseId}
                      onChange={async (e) => {
                        const wid = e.target.value;
                        setFormWarehouseId(wid);
                        setToZoneId('');
                        setToShelfId('');
                        setToLocationId('');
                        if (wid) {
                          const res = await warehouseApi.listZones(wid);
                          if (res.data.success) {
                            setZones(res.data.data);
                          }
                        } else {
                          setZones([]);
                        }
                      }}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="">选择仓库</option>
                      {warehouses.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 px-4 py-2 border-b bg-gray-50">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      placeholder="输入商品名称或库位码搜索..."
                      className="flex-1 px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto p-2">
                    {loadingStocks ? (
                      <div className="text-center text-gray-400 py-10">加载中...</div>
                    ) : filteredStocks.length === 0 ? (
                      <div className="text-center text-gray-400 py-10">暂无库存</div>
                    ) : (
                      <StockGroupList
                        stocks={filteredStocks}
                        selectedStock={selectedStock}
                        onSelectStock={handleSelectStock}
                      />
                    )}
                  </div>
                </div>

                <div className="w-1/2 flex flex-col">
                  <div className="p-4 border-b bg-gray-50">
                    <div className="text-sm font-medium text-gray-700 mb-3">添加移库明细</div>
                    {selectedStock ? (
                      <div className="border rounded-lg p-3 bg-blue-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium">商品</span>
                            <span className="font-medium text-sm text-blue-600">
                              {getStockDisplayName(selectedStock)}
                            </span>
                            {selectedStock.spec && (
                              <span className="text-xs text-gray-500">{selectedStock.spec} | {selectedStock.packaging}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs">数量:</label>
                            <input
                              type="number"
                              min="1"
                              max={selectedStock.availableQuantity}
                              value={transferQty}
                              onChange={(e) => setTransferQty(parseInt(e.target.value) || 1)}
                              className="w-16 px-2 py-1 border rounded text-center text-xs"
                            />
                            <button
                              onClick={handleAddItem}
                              disabled={!toLocationId}
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 text-xs"
                            >
                              添加
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm flex-wrap">
                          <span className="text-orange-600 whitespace-nowrap text-xs">{selectedStock.locationFullCode}</span>
                          <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <select
                            value={toZoneId}
                            onChange={(e) => { setToZoneId(e.target.value); setToShelfId(''); setToLocationId(''); }}
                            className="px-2 py-1 border rounded text-xs"
                            disabled={!formWarehouseId}
                          >
                            <option value="">选库区</option>
                            {uniqueZones.map(z => (
                              <option key={z.id} value={z.id}>{z.name}({z.code})</option>
                            ))}
                          </select>
                          {toZoneId && (
                            <select
                              value={toShelfId}
                              onChange={(e) => { setToShelfId(e.target.value); setToLocationId(''); }}
                              className="px-2 py-1 border rounded text-xs"
                            >
                              <option value="">选货架</option>
                              {zoneShelves.map(s => (
                                <option key={s.id} value={s.id}>{s.name || s.code}({s.code})</option>
                              ))}
                            </select>
                          )}
                          {toShelfId && (
                            <select
                              value={toLocationId}
                              onChange={(e) => setToLocationId(e.target.value)}
                              className="px-2 py-1 border rounded text-xs"
                            >
                              <option value="">选库位</option>
                              {shelfLocations.map(l => (
                                <option key={l.id} value={l.id}>L{l.level}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="border rounded-lg p-8 text-center text-gray-400">
                        请从左侧选择商品
                      </div>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">移库清单 ({formItems.length})</div>
                    {formItems.length === 0 ? (
                      <div className="text-center text-gray-400 py-8 bg-gray-50 rounded-lg">
                        暂无商品，请从左侧添加
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {formItems.map((item, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
                                <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium">商品</span>
                                <span className="truncate font-medium text-sm text-blue-600">{getItemDisplayName(item)}</span>
                                {item.spec && (
                                  <span className="text-xs text-gray-500 whitespace-nowrap">
                                    {item.spec} | {item.packaging}
                                  </span>
                                )}
                              </div>
                              <span className="text-orange-500 text-xs whitespace-nowrap">{item.fromLocationCode}</span>
                              <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span className="text-green-600 text-xs whitespace-nowrap flex-shrink-0">
                                {item.toLocationCode}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-blue-600 font-bold">
                                {item.quantity}件
                              </span>
                              <button
                                onClick={() => handleRemoveItem(index)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t p-4 bg-gray-50">
                    <div className="mb-3">
                      <label className="block text-xs text-gray-600 mb-1">备注</label>
                      <textarea
                        value={formRemark}
                        onChange={(e) => setFormRemark(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        rows={2}
                        placeholder="可选..."
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => { setShowModal(false); resetForm(); }}
                        className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-100"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateTransfer}
                        disabled={!formWarehouseId || formItems.length === 0}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        创建移库单
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}