import { useState, useEffect } from 'react';
import { warehouseApi, productApi, bundleApi, stockApi, supplierApi } from '../api';
import { Warehouse, Package, Plus, X, ArrowRight, Trash2, Loader2, Truck, ClipboardCheck, MapPin, Barcode, CheckCircle, Search, Info } from 'lucide-react';
import { useConfirm } from '../components/ConfirmProvider';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import LicensePlateInput from '../components/LicensePlateInput';

const SOURCE_COLORS: Record<string, string> = {
  PURCHASE: 'bg-blue-100 text-blue-700',
  RETURN: 'bg-orange-100 text-orange-700',
  TRANSFER: 'bg-purple-100 text-purple-700',
  OTHER: 'bg-gray-100 text-gray-700',
};

const SOURCE_NAMES: Record<string, string> = {
  PURCHASE: '采购入库',
  RETURN: '退货入库',
  TRANSFER: '调拨入库',
  OTHER: '其他入库',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ARRIVED: 'bg-blue-100 text-blue-800',
  RECEIVING: 'bg-indigo-100 text-indigo-800',
  RECEIVED: 'bg-green-100 text-green-800',
  PUTAWAY: 'bg-teal-100 text-teal-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

const STATUS_NAMES: Record<string, string> = {
  PENDING: '待到货',
  ARRIVED: '已到货',
  RECEIVING: '验收中',
  RECEIVED: '已收货',
  PUTAWAY: '上架中',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

interface InboundOrder {
  id: string;
  inboundNo: string;
  source: string;
  warehouseId: string;
  warehouse?: any;
  remark?: string;

  arrivalQuantity?: number;
  palletNo?: string;
  vehicleNo?: string;
  arrivedAt?: string;

  receivedAt?: string;
  putawayAt?: string;

  erpSyncStatus?: string;

  status: string;
  items: any[];
  createdAt: string;
  executedAt?: string;
}

interface InboundItemInput {
  type: 'PRODUCT' | 'BUNDLE';
  skuId?: string;
  bundleId?: string;
  productName: string;
  spec?: string;
  packaging?: string;
  locationId: string;
  locationCode: string;
  quantity: number;
}

interface ArrivalItemInput {
  id: string;
  type: 'PRODUCT' | 'BUNDLE';
  skuId?: string;
  bundleId?: string;
  productName: string;
  spec?: string;
  packaging?: string;
  expectedQuantity: number;
  arrivalQuantity: number;
  supplierId?: string;
  batchNo?: string;
  expiryDate?: string;
  availableBatches?: { batchNo: string; expiryDate?: string; supplierId?: string; supplierName?: string }[];
}

interface ReceivingItemInput {
  id: string;
  type: 'PRODUCT' | 'BUNDLE';
  skuId?: string;
  bundleId?: string;
  productName: string;
  spec?: string;
  packaging?: string;
  expectedQuantity: number;
  receivedQuantity: number;
  batchNo?: string;
  expiryDate?: string;
  inspectionResult: 'OK' | 'SHORT' | 'DAMAGED' | 'PENDING';
  inspectionNote: string;
}

interface PutawayItemInput {
  id: string;
  type: 'PRODUCT' | 'BUNDLE';
  skuId?: string;
  bundleId?: string;
  productName: string;
  spec?: string;
  packaging?: string;
  quantity: number;
  originalLocationId?: string;
  originalLocationCode?: string;
  targetLocationId?: string;
  targetLocationCode?: string;
  recommendedLocationId?: string;
  recommendedLocationCode?: string;
  snCodes?: string[];
}

interface InboundProduct {
  type: 'product' | 'bundle';
  skuId?: string;
  skuCode?: string;
  productId?: string;
  productName?: string;
  bundleName?: string;
  bundleId?: string;
  spec?: string;
  packaging?: string;
  brand?: any;
  category?: any;
  items?: any[];
}

export default function InboundPage() {
  const { confirm } = useConfirm();
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: React.ReactNode } | null>(null);
  const [orders, setOrders] = useState<InboundOrder[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<InboundOrder | null>(null);

  const [formSource, setFormSource] = useState<string>('PURCHASE');
  const [formWarehouseId, setFormWarehouseId] = useState('');
  const [inboundItems, setInboundItems] = useState<InboundItemInput[]>([]);
  const [inboundRemark, setInboundRemark] = useState('');

  const [products, setProducts] = useState<InboundProduct[]>([]);
  const [bundles, setBundles] = useState<InboundProduct[]>([]);
  const [productType, setProductType] = useState<'SKU' | 'BUNDLE'>('SKU');
  const [selectedSkuId, setSelectedSkuId] = useState('');
  const [selectedBundleId, setSelectedBundleId] = useState('');

  const [zones, setZones] = useState<any[]>([]);
  const [toZoneId, setToZoneId] = useState('');
  const [toShelfId, setToShelfId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [quantity, setQuantity] = useState(1);

  const [searchKeyword, setSearchKeyword] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<InboundProduct[]>([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterWarehouseId, setFilterWarehouseId] = useState('');

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [supplierId, setSupplierId] = useState('');

  const [saving, setSaving] = useState(false);

  const [showArrivalModal, setShowArrivalModal] = useState(false);
  const [selectedArrivalOrder, setSelectedArrivalOrder] = useState<InboundOrder | null>(null);
  const [arrivalVehicleNo, setArrivalVehicleNo] = useState('');
  const [arrivalItems, setArrivalItems] = useState<ArrivalItemInput[]>([]);

  const [showReceivingModal, setShowReceivingModal] = useState(false);
  const [selectedReceivingOrder, setSelectedReceivingOrder] = useState<InboundOrder | null>(null);
  const [receivingItems, setReceivingItems] = useState<ReceivingItemInput[]>([]);
  const [receivingBarcode, setReceivingBarcode] = useState('');

  const [showPutawayModal, setShowPutawayModal] = useState(false);
  const [selectedPutawayOrder, setSelectedPutawayOrder] = useState<InboundOrder | null>(null);
  const [putawayItems, setPutawayItems] = useState<PutawayItemInput[]>([]);
  const [putawayZones, setPutawayZones] = useState<any[]>([]);
  const [putawayLoading, setPutawayLoading] = useState(false);

  const uniqueZones = zones.filter((z: any) => z.type === 'INBOUND').map((z: any) => ({ id: z.id, name: z.name, code: z.code }));
  const zoneShelves: any[] = toZoneId ? (zones.find((z: any) => z.id === toZoneId)?.shelves || []) : [];
  const shelfLocations: any[] = toShelfId ? (zoneShelves.find((s: any) => s.id === toShelfId)?.locations || []) : [];

  useEffect(() => {
    loadWarehouses();
    loadOrders();
  }, []);

  useEffect(() => {
    if (formWarehouseId) {
      const warehouse = warehouses.find((w: any) => w.id === formWarehouseId);
      loadProducts(warehouse?.ownerId);
      loadZones(formWarehouseId);
    }
  }, [formWarehouseId, warehouses]);

  useEffect(() => {
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      const source = productType === 'SKU' ? products : bundles;
      setFilteredProducts(
        source.filter((s: any) =>
          s.productName?.toLowerCase().includes(kw) ||
          s.bundleName?.toLowerCase().includes(kw) ||
          s.spec?.toLowerCase().includes(kw) ||
          s.packaging?.toLowerCase().includes(kw) ||
          s.skuCode?.toLowerCase().includes(kw)
        )
      );
    } else {
      setFilteredProducts(productType === 'SKU' ? products : bundles);
    }
  }, [searchKeyword, products, bundles, productType]);

  const loadWarehouses = async () => {
    try {
      const res = await warehouseApi.list();
      if (res.data.success) {
        setWarehouses(res.data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const loadOrders = async (statusFilter?: string, sourceFilter?: string, warehouseFilter?: string) => {
    setLoading(true);
    try {
      const res = await stockApi.getInboundOrders();
      if (res.data.success) {
        let data = res.data.data;
        const currentStatus = statusFilter !== undefined ? statusFilter : filterStatus;
        const currentSource = sourceFilter !== undefined ? sourceFilter : filterSource;
        const currentWarehouse = warehouseFilter !== undefined ? warehouseFilter : filterWarehouseId;
        if (currentStatus) {
          data = data.filter((o: any) => o.status === currentStatus);
        }
        if (currentSource) {
          data = data.filter((o: any) => o.source === currentSource);
        }
        if (currentWarehouse) {
          data = data.filter((o: any) => o.warehouseId === currentWarehouse);
        }
        setOrders(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async (ownerId?: string) => {
    try {
      const params = ownerId ? { ownerId } : {};
      const [productRes, bundleRes] = await Promise.all([
        productApi.list(params),
        bundleApi.list(params),
      ]);

      const productItems = (productRes.data.data || []).flatMap((p: any) =>
        (p.skus || []).map((sku: any) => ({
          type: 'product' as const,
          skuId: sku.id,
          skuCode: sku.skuCode,
          productId: p.id,
          productName: p.name,
          bundleName: undefined,
          spec: sku.spec,
          packaging: sku.packaging,
          brand: sku.brand || p.brand,
          category: sku.category || p.category,
        }))
      );

      const bundleItems = (bundleRes.data.data || []).map((b: any) => ({
        type: 'bundle' as const,
        bundleId: b.id,
        skuCode: b.skuCode,
        productName: undefined,
        bundleName: b.name,
        price: b.price,
        items: (b.items || []).map((item: any) => ({
          productName: item.sku?.product?.name || '',
          spec: item.sku?.spec || '',
          packaging: item.sku?.packaging || '',
          quantity: item.quantity || 1,
        })),
        spec: undefined,
        packaging: undefined,
      }));

      setProducts(productItems);
      setBundles(bundleItems);
      setFilteredProducts(productItems);
    } catch (error) {
      console.error(error);
    }
  };

  const loadZones = async (warehouseId: string) => {
    try {
      const res = await warehouseApi.listZones(warehouseId);
      if (res.data.success) {
        setZones(res.data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddItem = () => {
    if (!toLocationId || (!selectedSkuId && !selectedBundleId)) {
      toast.error('请选择商品和库位');
      return;
    }

    const selectedLocation = shelfLocations.find(l => l.id === toLocationId);
    const selectedShelf = zoneShelves.find(s => s.id === toShelfId);
    const selectedZone = zones.find(z => z.id === toZoneId);
    const fullLocationCode = `${selectedZone?.code || ''}-${selectedShelf?.code || ''}-L${selectedLocation?.level || ''}`;

    const existingIndex = inboundItems.findIndex(item =>
      item.locationId === toLocationId &&
      (productType === 'BUNDLE' ? item.bundleId === selectedBundleId : item.skuId === selectedSkuId)
    );

    if (existingIndex !== -1) {
      const updatedItems = [...inboundItems];
      updatedItems[existingIndex] = {
        ...updatedItems[existingIndex],
        quantity: updatedItems[existingIndex].quantity + quantity,
      };
      setInboundItems(updatedItems);
      toast.success('已合并到同库位商品');
    } else {
      const item: InboundItemInput = {
        type: productType === 'BUNDLE' ? 'BUNDLE' : 'PRODUCT',
        ...(productType === 'BUNDLE'
          ? { bundleId: selectedBundleId }
          : { skuId: selectedSkuId }
        ),
        productName: productType === 'BUNDLE'
          ? bundles.find(b => b.bundleId === selectedBundleId)?.bundleName || ''
          : products.find(p => p.skuId === selectedSkuId)?.productName || '',
        spec: productType === 'BUNDLE'
          ? bundles.find(b => b.bundleId === selectedBundleId)?.spec
          : products.find(p => p.skuId === selectedSkuId)?.spec,
        packaging: productType === 'BUNDLE'
          ? bundles.find(b => b.bundleId === selectedBundleId)?.packaging
          : products.find(p => p.skuId === selectedSkuId)?.packaging,
        locationId: toLocationId,
        locationCode: fullLocationCode,
        quantity,
      };
      setInboundItems([...inboundItems, item]);
    }

    setSelectedSkuId('');
    setSelectedBundleId('');
    setQuantity(1);
  };

  const handleRemoveItem = (index: number) => {
    setInboundItems(inboundItems.filter((_, i) => i !== index));
  };

  const handleCreateOrder = async () => {
    if (!formWarehouseId) {
      toast.error('请选择仓库');
      return;
    }
    if (inboundItems.length === 0) {
      toast.error('请添加入库明细');
      return;
    }

    setSaving(true);
    try {
      const res = await stockApi.createInboundOrder({
        warehouseId: formWarehouseId,
        source: formSource,
        remark: inboundRemark,
        items: inboundItems,
      });

      if (res.data.success) {
        toast.success('入库单创建成功');
        setShowModal(false);
        resetForm();
        loadOrders();
      } else {
        toast.error(res.data.message || '创建失败');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '创建失败');
    } finally {
      setSaving(false);
    }
  };

  const openArrivalModal = async (order: InboundOrder) => {
    setSelectedArrivalOrder(order);
    setArrivalVehicleNo('');

    try {
      const ownerId = order.warehouse?.ownerId;
      const params = ownerId ? { ownerId } : {};
      const res = await supplierApi.list(params);
      if (res.data.success) {
        setSuppliers(res.data.data || []);
      }
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    }

    const batchListRes = await stockApi.batchList({ warehouseId: order.warehouseId });
    const allBatches = batchListRes.data.success ? batchListRes.data.data : [];

    setArrivalItems(order.items.map(item => {
      const itemBatches = allBatches.filter((b: any) => {
        if (item.type === 'PRODUCT') {
          return b.type === 'PRODUCT' && b.skuId === item.skuId;
        } else {
          return b.type === 'BUNDLE' && b.bundleId === item.bundleId;
        }
      });
      return {
        id: item.id,
        type: item.type as 'PRODUCT' | 'BUNDLE',
        skuId: item.skuId,
        bundleId: item.bundleId,
        productName: item.sku?.product?.name || item.bundle?.name || '',
        spec: item.sku?.spec || item.bundle?.spec || '',
        packaging: item.sku?.packaging || item.bundle?.packaging || '',
        expectedQuantity: item.expectedQuantity || 0,
        arrivalQuantity: item.arrivalQuantity || item.expectedQuantity || 0,
        supplierId: '',
        batchNo: '',
        expiryDate: '',
        availableBatches: itemBatches,
      };
    }));
    setShowArrivalModal(true);
  };

  const handleArrivalSubmit = async () => {
    if (!selectedArrivalOrder) return;
    try {
      const items = arrivalItems.map(item => ({
        id: item.id,
        type: item.type,
        skuId: item.skuId,
        bundleId: item.bundleId,
        arrivalQuantity: item.arrivalQuantity,
        supplierId: item.supplierId || null,
        batchNo: item.batchNo || null,
        expiryDate: item.expiryDate || null,
      }));
      const res = await stockApi.updateInboundOrder(selectedArrivalOrder.id, {
        status: 'ARRIVED',
        arrivedAt: new Date(),
        vehicleNo: arrivalVehicleNo,
        items,
      });
      if (res.data.success) {
        toast.success('到货登记成功');
        setShowArrivalModal(false);
        loadOrders();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  const handleArrived = async (id: string) => {
    const order = orders.find(o => o.id === id);
    if (order) {
      openArrivalModal(order);
    }
  };

  const openReceivingModal = (order: InboundOrder) => {
    setSelectedReceivingOrder(order);
    setReceivingItems(order.items.map(item => {
      const batch = item.type === 'PRODUCT' ? item.skuBatch : item.bundleBatch;
      return {
        id: item.id,
        type: item.type as 'PRODUCT' | 'BUNDLE',
        skuId: item.skuId,
        bundleId: item.bundleId,
        productName: item.sku?.product?.name || item.bundle?.name || '',
        spec: item.sku?.spec || item.bundle?.spec || '',
        packaging: item.sku?.packaging || item.bundle?.packaging || '',
        expectedQuantity: item.expectedQuantity || 0,
        receivedQuantity: item.receivedQuantity || 0,
        batchNo: batch?.batchNo || '',
        expiryDate: batch?.expiryDate ? batch.expiryDate.split('T')[0] : '',
        inspectionResult: (item.inspectionResult as any) || 'PENDING',
        inspectionNote: item.inspectionNote || '',
      };
    }));
    setShowReceivingModal(true);
  };

  const handleStartReceiving = async (id: string) => {
    const order = orders.find(o => o.id === id);
    if (order) {
      openReceivingModal(order);
    }
  };

  const handleBarcodeScan = (barcode: string) => {
    const matchedItem = receivingItems.find(i => {
      const orderItem = selectedReceivingOrder?.items.find(oi => oi.id === i.id);
      if (i.type === 'BUNDLE') {
        return orderItem?.bundle?.skuCode === barcode;
      }
      return orderItem?.sku?.skuCode === barcode || orderItem?.sku?.barcode === barcode;
    });
    if (matchedItem) {
      const newItems = receivingItems.map(i =>
        i.id === matchedItem.id ? { ...i, receivedQuantity: i.receivedQuantity + 1 } : i
      );
      setReceivingItems(newItems);
      toast.success(`已增加 ${matchedItem.productName} 数量`);
    } else {
      toast.error('未找到匹配的商品');
    }
  };

  const handleCompleteReceivingSubmit = async () => {
    if (!selectedReceivingOrder) return;
    const pendingItems = receivingItems.filter(i => i.inspectionResult === 'PENDING');
    if (pendingItems.length > 0) {
      toast.error('请完成所有商品的验收');
      return;
    }
    try {
      const items = receivingItems.map(item => ({
        id: item.id,
        receivedQuantity: item.receivedQuantity,
        inspectionResult: item.inspectionResult,
        inspectionNote: item.inspectionNote,
      }));
      const res = await stockApi.updateInboundOrder(selectedReceivingOrder.id, {
        status: 'RECEIVED',
        receivedAt: new Date(),
        items,
      });
      if (res.data.success) {
        toast.success('验收完成');
        setShowReceivingModal(false);
        loadOrders();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  const openPutawayModal = async (order: InboundOrder) => {
    setSelectedPutawayOrder(order);
    setPutawayLoading(true);
    setShowPutawayModal(true);

    try {
      let zonesData: any[] = [];

      const locationsRes = await warehouseApi.listZones(order.warehouseId);
      if (locationsRes.data.success) {
        zonesData = locationsRes.data.data;
        setPutawayZones(zonesData);
      }

      const items = order.items.map(item => {
        const location = item.location;
        const locationCode = location ? `${location.shelf?.zone?.code || ''}-${location.shelf?.code || ''}-L${location.level || ''}` : '';

        const recommendedLocation = recommendLocation(item, zonesData, order.source);
        const actualQty = item.receivedQuantity !== undefined && item.receivedQuantity !== null ? item.receivedQuantity : (item.expectedQuantity || 0);

        return {
          id: item.id,
          type: item.type as 'PRODUCT' | 'BUNDLE',
          skuId: item.skuId,
          bundleId: item.bundleId,
          productName: item.sku?.product?.name || item.bundle?.name || '',
          spec: item.sku?.spec || item.bundle?.spec || '',
          packaging: item.sku?.packaging || item.bundle?.packaging || '',
          batchNo: item.batchNo || '',
          quantity: actualQty,
          originalLocationId: item.locationId,
          originalLocationCode: locationCode,
          targetLocationId: recommendedLocation?.id || item.locationId || '',
          targetLocationCode: recommendedLocation?.code || locationCode,
          recommendedLocationId: recommendedLocation?.id || '',
          recommendedLocationCode: recommendedLocation?.code || '',
          snCodes: item.snCodes || [],
        };
      });
      setPutawayItems(items);
    } catch (error) {
      console.error('Failed to load putaway data:', error);
      toast.error('加载上架数据失败');
    } finally {
      setPutawayLoading(false);
    }
  };

  const findLocationById = (locationId: string) => {
    const targetZoneType = selectedPutawayOrder?.source === 'RETURN' ? 'RETURNING' : 'INBOUND';
    for (const zone of putawayZones.filter(z => z.type === targetZoneType)) {
      for (const shelf of zone.shelves || []) {
        for (const loc of shelf.locations || []) {
          if (loc.id === locationId) {
            return {
              id: loc.id,
              code: `${zone.code}-${shelf.code}-L${loc.level}`,
            };
          }
        }
      }
    }
    return null;
  };

  const recommendLocation = (item: any, zones: any[], source?: string) => {
    const targetZoneType = source === 'RETURN' ? 'RETURNING' : 'INBOUND';
    const inboundZones = zones.filter(z => z.type === targetZoneType);
    const locations: any[] = [];
    for (const zone of inboundZones) {
      for (const shelf of zone.shelves || []) {
        for (const loc of shelf.locations || []) {
          locations.push({
            id: loc.id,
            code: `${zone.code}-${shelf.code}-L${loc.level}`,
            zone,
            shelf,
            location: loc,
          });
        }
      }
    }

    if (locations.length === 0) return null;

    if (item.type === 'BUNDLE') {
      const sameBundleBatchLocations = locations.filter(l =>
        l.location.bundleStock && l.location.bundleStock.bundleId === item.bundleId &&
        l.location.bundleStock.batchNo === item.batchNo
      );
      if (sameBundleBatchLocations.length > 0) {
        sameBundleBatchLocations.sort((a, b) =>
          (a.location.bundleStock?.totalQuantity || 0) - (b.location.bundleStock?.totalQuantity || 0)
        );
        return sameBundleBatchLocations[0];
      }

      const sameBundleLocations = locations.filter(l =>
        l.location.bundleStock && l.location.bundleStock.bundleId === item.bundleId
      );
      if (sameBundleLocations.length > 0) {
        sameBundleLocations.sort((a, b) =>
          (a.location.bundleStock?.totalQuantity || 0) - (b.location.bundleStock?.totalQuantity || 0)
        );
        return sameBundleLocations[0];
      }

      const locationsWithBundleStock = locations.filter(l =>
        l.location.bundleStock && l.location.bundleStock.totalQuantity > 0
      );
      if (locationsWithBundleStock.length > 0) {
        locationsWithBundleStock.sort((a, b) =>
          (a.location.bundleStock?.totalQuantity || 0) - (b.location.bundleStock?.totalQuantity || 0)
        );
        return locationsWithBundleStock[0];
      }
    } else {
      const sameProductBatchLocations = locations.filter(l =>
        l.location.stock && l.location.stock.skuId === item.skuId &&
        l.location.stock.batchNo === item.batchNo
      );
      if (sameProductBatchLocations.length > 0) {
        sameProductBatchLocations.sort((a, b) =>
          (a.location.stock?.totalQuantity || 0) - (b.location.stock?.totalQuantity || 0)
        );
        return sameProductBatchLocations[0];
      }

      const sameProductLocations = locations.filter(l =>
        l.location.stock && l.location.stock.skuId === item.skuId
      );
      if (sameProductLocations.length > 0) {
        sameProductLocations.sort((a, b) =>
          (a.location.stock?.totalQuantity || 0) - (b.location.stock?.totalQuantity || 0)
        );
        return sameProductLocations[0];
      }

      const locationsWithStock = locations.filter(l =>
        l.location.stock && l.location.stock.totalQuantity > 0
      );
      if (locationsWithStock.length > 0) {
        locationsWithStock.sort((a, b) =>
          (a.location.stock?.totalQuantity || 0) - (b.location.stock?.totalQuantity || 0)
        );
        return locationsWithStock[0];
      }
    }

    const emptyLocations = locations.filter(l =>
      (!l.location.stock || l.location.stock.totalQuantity === 0) &&
      (!l.location.bundleStock || l.location.bundleStock.totalQuantity === 0)
    );
    if (emptyLocations.length > 0) {
      return emptyLocations[0];
    }

    return locations[0];
  };

  const handleStartPutaway = async (id: string) => {
    const order = orders.find(o => o.id === id);
    if (order) {
      await openPutawayModal(order);
    }
  };

  const handlePutawayConfirm = async () => {
    if (!selectedPutawayOrder) return;

    const validItems = putawayItems.filter(i => i.quantity > 0);
    const invalidItems = validItems.filter(i => !i.targetLocationId);
    if (invalidItems.length > 0) {
      toast.error('请为所有有数量的商品分配库位');
      return;
    }

    try {
      const items = validItems.map(item => ({
        id: item.id,
        receivedQuantity: item.quantity,
        targetLocationId: item.targetLocationId,
      }));

      const res = await stockApi.updateInboundOrder(selectedPutawayOrder.id, {
        status: 'COMPLETED',
        putawayAt: new Date(),
        items,
      });

      if (res.data.success) {
        toast.success('上架完成，入库成功');
        setShowPutawayModal(false);
        loadOrders();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  const handleExecuteOrder = async (id: string) => {
    const ok = await confirm({ message: '确认执行该入库单？' });
    if (!ok) return;

    try {
      const res = await stockApi.executeInboundOrder(id);
      if (res.data.success) {
        toast.success('入库单执行成功');
        loadOrders();
      } else {
        toast.error(res.data.message || '执行失败');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '执行失败');
    }
  };

  const handleCancelOrder = async (id: string) => {
    const ok = await confirm({ message: '确认取消该入库单？' });
    if (!ok) return;

    try {
      const res = await stockApi.cancelInboundOrder(id);
      if (res.data.success) {
        toast.success('入库单已取消');
        loadOrders();
      } else {
        toast.error(res.data.message || '取消失败');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '取消失败');
    }
  };

  const handleViewDetail = (order: InboundOrder) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
  };

  const resetForm = () => {
    setFormSource('PURCHASE');
    setFormWarehouseId('');
    setInboundItems([]);
    setInboundRemark('');
    setZones([]);
    setToZoneId('');
    setToShelfId('');
    setToLocationId('');
    setSelectedSkuId('');
    setSelectedBundleId('');
    setQuantity(1);
    setSearchKeyword('');
  };

  const getNextAction = (order: InboundOrder) => {
    switch (order.status) {
      case 'PENDING':
        return { label: '到货登记', action: () => handleArrived(order.id), color: 'bg-blue-600 hover:bg-blue-700' };
      case 'ARRIVED':
        return { label: '开始验收', action: () => handleStartReceiving(order.id), color: 'bg-indigo-600 hover:bg-indigo-700' };
      case 'RECEIVING':
        return { label: '继续验收', action: () => handleStartReceiving(order.id), color: 'bg-indigo-600 hover:bg-indigo-700' };
      case 'RECEIVED':
        return { label: '开始上架', action: () => handleStartPutaway(order.id), color: 'bg-teal-600 hover:bg-teal-700' };
      case 'PUTAWAY':
        return { label: '执行入库', action: () => handleExecuteOrder(order.id), color: 'bg-emerald-600 hover:bg-emerald-700' };
      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <ToastContainer />

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Warehouse className="w-7 h-7" />
          入库管理
        </h1>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Plus className="w-4 h-4" />
          新建入库单
        </button>
      </div>

      <div className="flex gap-4 mb-4">
        <select
          value={filterWarehouseId}
          onChange={(e) => { setFilterWarehouseId(e.target.value); loadOrders(filterStatus, filterSource, e.target.value); }}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">全部仓库</option>
          {warehouses.map(w => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
        <select
          value={filterSource}
          onChange={(e) => { setFilterSource(e.target.value); loadOrders(filterStatus, e.target.value, filterWarehouseId); }}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">全部来源</option>
          <option value="PURCHASE">采购入库</option>
          <option value="RETURN">退货入库</option>
          <option value="TRANSFER">调拨入库</option>
          <option value="OTHER">其他</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); loadOrders(e.target.value, filterSource, filterWarehouseId); }}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">全部状态</option>
          <option value="PENDING">待收货</option>
          <option value="ARRIVED">已到货</option>
          <option value="RECEIVING">验收中</option>
          <option value="RECEIVED">已收货</option>
          <option value="PUTAWAY">上架中</option>
          <option value="COMPLETED">已完成</option>
          <option value="CANCELLED">已取消</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr className="text-center">
              <th className="px-4 py-3 text-sm font-medium text-gray-500">入库单号</th>
              <th className="px-4 py-3 text-sm font-medium text-gray-500">来源</th>
              <th className="px-4 py-3 text-sm font-medium text-gray-500">仓库</th>
              <th className="px-4 py-3 text-sm font-medium text-gray-500">商品</th>
              <th className="px-4 py-3 text-sm font-medium text-gray-500">库位</th>
              <th className="px-4 py-3 text-sm font-medium text-gray-500">数量</th>
              <th className="px-4 py-3 text-sm font-medium text-gray-500">状态</th>
              <th className="px-4 py-3 text-sm font-medium text-gray-500">时间</th>
              <th className="px-4 py-3 text-sm font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                  暂无入库记录
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const orderRows = order.items?.map((item: any, idx: number) => {
                  const itemName = item.type === 'BUNDLE'
                    ? item.bundle?.name || '-'
                    : item.sku?.product?.name || '-';
                  const itemSpec = item.type === 'BUNDLE' ? item.bundle?.spec : item.sku?.spec;
                  const itemPackaging = item.type === 'BUNDLE' ? item.bundle?.packaging : item.sku?.packaging;
                  const locationCode = item.location?.shelf?.code
                    ? `${item.location.shelf?.zone?.code || ''}-${item.location.shelf?.code || ''}-L${item.location.level || ''}`
                    : '-';
                  const batch = item.type === 'PRODUCT' ? item.skuBatch : item.bundleBatch;
                  return {
                    idx,
                    itemName,
                    itemSpec,
                    itemPackaging,
                    locationCode,
                    quantity: item.receivedQuantity || item.expectedQuantity || item.quantity || 0,
                    batchNo: batch?.batchNo || '-',
                    expiryDate: batch?.expiryDate ? batch.expiryDate.split('T')[0] : '-',
                    itemType: item.type,
                    items: item.bundle?.items,
                  };
                }) || [];

                return orderRows.map((row: any, rowIdx: number) => (
                  <tr key={`${order.id}-${row.idx}`} className="hover:bg-gray-50">
                    {rowIdx === 0 && (
                      <>
                        <td className="px-4 py-3 text-sm font-mono text-center" rowSpan={orderRows.length}>
                          {order.inboundNo}
                        </td>
                        <td className="px-4 py-3 text-center" rowSpan={orderRows.length}>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${SOURCE_COLORS[order.source] || 'bg-gray-100 text-gray-700'}`}>
                            {SOURCE_NAMES[order.source] || order.source}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center" rowSpan={orderRows.length}>
                          <div>{order.warehouse?.name}</div>
                          {order.warehouse?.owner?.name && (
                            <div className="text-xs text-gray-400">{order.warehouse.owner.name}</div>
                          )}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3 text-sm text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`px-1.5 py-0.5 text-xs rounded ${
                          row.itemType === 'BUNDLE' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {row.itemType === 'BUNDLE' ? '套装' : '商品'}
                        </span>
                        <span className="font-medium">{row.itemName}</span>
                        {row.itemType === 'BUNDLE' && row.items && row.items.length > 0 && (
                          <button
                            type="button"
                            onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, content: <div><div className="font-semibold mb-2 text-blue-400">套装包含：</div>{row.items.map((bi: any) => (<div key={bi.id || bi.skuCode} className="text-gray-200 py-1"><span className="text-blue-400">{bi.productName || bi.sku?.product?.name}</span><span className="text-gray-400"> · {bi.spec || bi.sku?.spec}/{bi.packaging || bi.sku?.packaging}</span><span className="text-yellow-400 ml-1">×{bi.quantity}</span></div>))}</div> })}
                            onMouseLeave={() => setTooltip(null)}
                            onMouseMove={(e) => setTooltip({ x: e.clientX, y: e.clientY, content: <div><div className="font-semibold mb-2 text-blue-400">套装包含：</div>{row.items.map((bi: any) => (<div key={bi.id || bi.skuCode} className="text-gray-200 py-1"><span className="text-blue-400">{bi.productName || bi.sku?.product?.name}</span><span className="text-gray-400"> · {bi.spec || bi.sku?.spec}/{bi.packaging || bi.sku?.packaging}</span><span className="text-yellow-400 ml-1">×{bi.quantity}</span></div>))}</div> })}
                            className="p-0.5 hover:bg-gray-100 rounded"
                          >
                            <Info className="w-4 h-4 text-purple-500 cursor-help" />
                          </button>
                        )}
                      </div>
                      {row.itemSpec && (
                        <div className="text-xs text-gray-500">{row.itemSpec} | {row.itemPackaging}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <div className="text-green-600">{row.locationCode}</div>
                      {row.batchNo && row.batchNo !== '-' && (
                        <div className="text-xs text-gray-400">批:{row.batchNo}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {row.quantity}件
                    </td>
                    {rowIdx === 0 && (
                      <>
                        <td className="px-4 py-3 text-center text-sm" rowSpan={orderRows.length}>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'}`}>
                            {STATUS_NAMES[order.status] || order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center" rowSpan={orderRows.length}>
                          {order.putawayAt ? (
                            <>
                              <div className="text-xs text-green-600">上架: {new Date(order.putawayAt).toLocaleString()}</div>
                              <div className="text-xs text-gray-400">创建: {new Date(order.createdAt).toLocaleString()}</div>
                            </>
                          ) : (
                            <div className="text-xs text-gray-400">创建: {new Date(order.createdAt).toLocaleString()}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center" rowSpan={orderRows.length}>
                          {getNextAction(order) && (
                            <button
                              onClick={getNextAction(order)!.action}
                              className={`text-white px-2 py-1 rounded text-xs ${getNextAction(order)!.color}`}
                            >
                              {getNextAction(order)!.label}
                            </button>
                          )}
                          {order.status === 'PENDING' && order.source !== 'RETURN' && (
                            <button
                              onClick={() => handleCancelOrder(order.id)}
                              className="text-white px-2 py-1 rounded text-xs bg-red-600 hover:bg-red-700 ml-2"
                            >
                              取消
                            </button>
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
              <h2 className="text-xl font-bold">新建入库单</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form className="flex">
              <div className="w-1/2 border-r flex flex-col max-h-[70vh]">
                <div className="p-4 border-b bg-gray-50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-700">入库单信息</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={formSource}
                      onChange={(e) => setFormSource(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                    >
                      <option value="PURCHASE">采购入库</option>
                      <option value="RETURN">退货入库</option>
                      <option value="TRANSFER">调拨入库</option>
                      <option value="OTHER">其他入库</option>
                    </select>
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
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                    >
                      <option value="">选择仓库</option>
                      {warehouses.map(w => (
                        <option key={w.id} value={w.id}>{w.name} {w.owner ? `(${w.owner.name})` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex border-b bg-gray-50">
                  <button
                    type="button"
                    onClick={() => { setProductType('SKU'); setSelectedBundleId(''); setFilteredProducts(products); }}
                    className={`flex-1 py-2.5 text-sm font-medium border-b-2 ${
                      productType === 'SKU' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'
                    }`}
                  >
                    商品
                  </button>
                  <button
                    type="button"
                    onClick={() => { setProductType('BUNDLE'); setSelectedSkuId(''); setFilteredProducts(bundles); }}
                    className={`flex-1 py-2.5 text-sm font-medium border-b-2 ${
                      productType === 'BUNDLE' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500'
                    }`}
                  >
                    套装
                  </button>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 border-b bg-gray-50">
                  <Search className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜索商品或套装..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                  />
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {productType === 'SKU' ? (
                      (() => {
                        const groups = filteredProducts
                          .filter(s => s.type === 'product')
                          .reduce<Record<string, any[]>>((acc, s) => {
                            const name = s.productName || '';
                            if (!acc[name]) acc[name] = [];
                            acc[name].push(s);
                            return acc;
                          }, {});

                        return Object.entries(groups).map(([productName, skus]) => (
                          <div key={productName} className="border border-blue-200 rounded-lg p-3 mb-2 bg-white">
                            <div className="flex items-center gap-2 mb-2">
                              <Package className="w-4 h-4 text-blue-500" />
                              <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium">商品</span>
                              <h3 className="font-bold text-sm text-blue-600">{productName}</h3>
                            </div>
                            <div className="grid grid-cols-4 gap-1.5">
                              {skus.map((sku) => (
                                <button
                                  key={sku.skuId}
                                  type="button"
                                  onClick={() => {
                                    setSelectedSkuId(sku.skuId);
                                  }}
                                  className={`p-1.5 rounded-lg border text-left transition-all text-xs ${
                                    selectedSkuId === sku.skuId
                                      ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400'
                                      : 'bg-gray-50 border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                                  }`}
                                >
                                  <div className="text-xs text-gray-600">{sku.spec} / {sku.packaging}</div>
                                  <div className="text-xs text-gray-500">({sku.skuCode})</div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ));
                      })()
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {filteredProducts.filter(s => s.type === 'bundle').map((bundle) => {
                          const isAdded = inboundItems.some(item => item.bundleId === bundle.bundleId);
                          return (
                            <div
                              key={bundle.bundleId}
                              className={`border border-purple-200 rounded-lg p-3 hover:shadow-lg transition-all bg-white ${
                                isAdded ? 'opacity-60' : 'cursor-pointer'
                              }`}
                              onClick={() => {
                                if (!isAdded && selectedBundleId !== bundle.bundleId) {
                                  setSelectedBundleId(bundle.bundleId || '');
                                }
                              }}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <Package className="w-4 h-4 text-purple-500" />
                                <span className="font-bold text-sm">{bundle.bundleName}</span>
                              </div>
                              {bundle.items && bundle.items.length > 0 && (
                                <div className="text-xs text-purple-700 bg-purple-50 rounded p-2 mb-2 max-h-20 overflow-y-auto">
                                  {bundle.items.map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between py-0.5">
                                      <span className="truncate">{item.productName} {item.spec}/{item.packaging}</span>
                                      <span className="font-medium ml-1">×{item.quantity}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">编码: {bundle.skuCode}</span>
                                <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                                  isAdded ? 'bg-gray-200 text-gray-500' : 'bg-purple-100 text-purple-700'
                                }`}>
                                  {isAdded ? '✓' : '选择'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="w-1/2 flex flex-col">
                  <div className="p-4 border-b bg-gray-50">
                    <div className="text-sm font-medium text-gray-700 mb-3">添加入库明细</div>
                    {(selectedSkuId || selectedBundleId) ? (
                      <div className="border rounded-lg p-3 bg-blue-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 text-xs rounded font-medium ${
                              productType === 'BUNDLE' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                            }`}>
                              {productType === 'BUNDLE' ? '套装' : '商品'}
                            </span>
                            <span className="font-medium text-sm">
                              {productType === 'BUNDLE'
                                ? bundles.find(b => b.bundleId === selectedBundleId)?.bundleName
                                : products.find(p => p.skuId === selectedSkuId)?.productName}
                            </span>
                            {(productType === 'SKU' && (products.find(p => p.skuId === selectedSkuId)?.spec || products.find(p => p.skuId === selectedSkuId)?.packaging)) && (
                              <span className="text-xs text-gray-500 whitespace-nowrap">
                                {products.find(p => p.skuId === selectedSkuId)?.spec}{products.find(p => p.skuId === selectedSkuId)?.spec && products.find(p => p.skuId === selectedSkuId)?.packaging ? '/' : ''}{products.find(p => p.skuId === selectedSkuId)?.packaging}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs">数量:</label>
                            <input
                              type="number"
                              min="1"
                              value={quantity}
                              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
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
                          <select
                            value={toZoneId}
                            onChange={(e) => { setToZoneId(e.target.value); setToShelfId(''); setToLocationId(''); }}
                            className="px-2 py-1 border rounded text-xs"
                            disabled={!formWarehouseId}
                          >
                            <option value="">选择库区</option>
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
                              <option value="">选择货架</option>
                              {zoneShelves.map(s => (
                                <option key={s.id} value={s.id}>{s.name || s.code}</option>
                              ))}
                            </select>
                          )}
                          {toShelfId && (
                            <select
                              value={toLocationId}
                              onChange={(e) => setToLocationId(e.target.value)}
                              className="px-2 py-1 border rounded text-xs"
                            >
                              <option value="">选择库位</option>
                              {shelfLocations.map(l => (
                                <option key={l.id} value={l.id}>L{l.level}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-gray-400 py-6 border rounded-lg">
                        请从左侧选择商品或套装
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
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`px-1.5 py-0.5 text-xs rounded font-medium ${
                                  item.type === 'BUNDLE' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                                }`}>
                                  {item.type === 'BUNDLE' ? '套装' : '商品'}
                                </span>
                                <span className="font-medium truncate max-w-32">{item.productName}</span>
                                {(item.spec || item.packaging) && (
                                  <span className="text-xs text-gray-500 whitespace-nowrap">
                                    {item.spec}{item.spec && item.packaging ? '/' : ''}{item.packaging}
                                  </span>
                                )}
                              </div>
                              <span className="text-green-600 text-xs whitespace-nowrap">{item.locationCode}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-blue-600 font-bold">{item.quantity}件</span>
                              <button onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-4">
                      <label className="block text-xs text-gray-600 mb-1">备注</label>
                      <textarea
                        value={inboundRemark}
                        onChange={(e) => setInboundRemark(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        rows={2}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
                    <button
                      onClick={() => { setShowModal(false); resetForm(); }}
                      className="px-4 py-2 border rounded-lg"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleCreateOrder}
                      disabled={saving || inboundItems.length === 0}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {saving ? '创建中...' : '创建入库单'}
                    </button>
                  </div>
                </div>
              </form>
          </div>
        </div>
      )}

      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">入库单详情</h2>
              <button onClick={() => { setShowDetailModal(false); setSelectedOrder(null); }} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600">入库单号</label>
                  <div className="font-mono font-medium">{selectedOrder.inboundNo}</div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600">状态</label>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[selectedOrder.status]}`}>
                    {STATUS_NAMES[selectedOrder.status]}
                  </span>
                </div>
                <div>
                  <label className="block text-sm text-gray-600">来源</label>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${SOURCE_COLORS[selectedOrder.source]}`}>
                    {SOURCE_NAMES[selectedOrder.source]}
                  </span>
                </div>
                <div>
                  <label className="block text-sm text-gray-600">仓库</label>
                  <div>{selectedOrder.warehouse?.name}</div>
                  {selectedOrder.warehouse?.owner?.name && (
                    <div className="text-xs text-gray-400">{selectedOrder.warehouse.owner.name}</div>
                  )}
                </div>
                {selectedOrder.arrivalQuantity && (
                  <div>
                    <label className="block text-sm text-gray-600">到货数量</label>
                    <div>{selectedOrder.arrivalQuantity}</div>
                  </div>
                )}
                {selectedOrder.palletNo && (
                  <div>
                    <label className="block text-sm text-gray-600">托盘号</label>
                    <div>{selectedOrder.palletNo}</div>
                  </div>
                )}
                {selectedOrder.vehicleNo && (
                  <div>
                    <label className="block text-sm text-gray-600">车牌号</label>
                    <div>{selectedOrder.vehicleNo}</div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">入库明细</label>
                <table className="min-w-full border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs">商品</th>
                      <th className="px-3 py-2 text-left text-xs">规格</th>
                      <th className="px-3 py-2 text-left text-xs">包装</th>
                      <th className="px-3 py-2 text-center text-xs">期望</th>
                      <th className="px-3 py-2 text-center text-xs">实收</th>
                      <th className="px-3 py-2 text-center text-xs">验收</th>
                      <th className="px-3 py-2 text-left text-xs">库位</th>
                      <th className="px-3 py-2 text-left text-xs">批次</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedOrder.items?.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-sm">
                          {item.type === 'BUNDLE' ? item.bundle?.name : item.sku?.product?.name}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500">{item.sku?.spec || '-'}</td>
                        <td className="px-3 py-2 text-sm text-gray-500">{item.sku?.packaging || '-'}</td>
                        <td className="px-3 py-2 text-sm text-center">{item.expectedQuantity || item.quantity}</td>
                        <td className="px-3 py-2 text-sm text-center text-blue-600 font-medium">{item.receivedQuantity || 0}</td>
                        <td className="px-3 py-2 text-sm text-center">
                          {item.inspectionResult ? (
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              item.inspectionResult === 'OK' ? 'bg-green-100 text-green-800' :
                              item.inspectionResult === 'SHORT' ? 'bg-orange-100 text-orange-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {item.inspectionResult === 'OK' ? '合格' : item.inspectionResult === 'SHORT' ? '少货' : '损坏'}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-3 py-2 text-sm">
                          {item.location ? `${item.location.shelf?.zone?.code || ''}-${item.location.shelf?.code || ''}-L${item.location.level || ''}` : '-'}
                        </td>
                        <td className="px-3 py-2 text-sm">{item.batchNo || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedOrder.items?.some((item: any) => item.snCodes && item.snCodes.length > 0) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">SN明细</label>
                  <table className="min-w-full border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs">商品</th>
                        <th className="px-3 py-2 text-left text-xs">批次</th>
                        <th className="px-3 py-2 text-left text-xs">SN码</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedOrder.items?.filter((item: any) => item.snCodes && item.snCodes.length > 0).map((item: any, idx: number) => (
                        item.snCodes.map((sn: string, snIdx: number) => (
                          <tr key={`${idx}-${snIdx}`}>
                            <td className="px-3 py-2 text-sm">
                              {item.type === 'BUNDLE' ? item.bundle?.name : item.sku?.product?.name}
                            </td>
                            <td className="px-3 py-2 text-sm">{item.batchNo || '-'}</td>
                            <td className="px-3 py-2 text-sm font-mono text-blue-600">{sn}</td>
                          </tr>
                        ))
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedOrder.remark && (
                <div>
                  <label className="block text-sm text-gray-600">备注</label>
                  <div>{selectedOrder.remark}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showArrivalModal && selectedArrivalOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">到货登记 - {selectedArrivalOrder.inboundNo}</h2>
              <button onClick={() => setShowArrivalModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm text-gray-600 mb-1">到货时间</label>
                <div className="border rounded-lg px-3 py-2 bg-gray-50">
                  {new Date().toLocaleString()}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">车牌号</label>
                <LicensePlateInput
                  value={arrivalVehicleNo}
                  onChange={setArrivalVehicleNo}
                  className="w-full"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">到货明细</label>
              <table className="min-w-full border divide-y">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs">商品</th>
                    <th className="px-3 py-2 text-left text-xs">规格/包装</th>
                    <th className="px-3 py-2 text-center text-xs">计划数</th>
                    <th className="px-3 py-2 text-center text-xs">到货数</th>
                    <th className="px-3 py-2 text-center text-xs">供应商</th>
                    <th className="px-3 py-2 text-center text-xs">批次号</th>
                    {arrivalItems.some(i => i.type === 'PRODUCT') && (
                      <th className="px-3 py-2 text-center text-xs">有效期</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {arrivalItems.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2 text-sm">{item.productName}</td>
                      <td className="px-3 py-2 text-sm text-gray-500">
                        {item.spec || '-'}{item.packaging ? ` / ${item.packaging}` : ''}
                      </td>
                      <td className="px-3 py-2 text-sm text-center">{item.expectedQuantity}</td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="number"
                          min="0"
                          value={item.arrivalQuantity}
                          onChange={(e) => {
                            const newItems = [...arrivalItems];
                            newItems[idx].arrivalQuantity = parseInt(e.target.value) || 0;
                            setArrivalItems(newItems);
                          }}
                          className="w-16 border rounded px-2 py-1 text-center"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <select
                          value={item.supplierId || ''}
                          onChange={(e) => {
                            const newItems = [...arrivalItems];
                            newItems[idx].supplierId = e.target.value;
                            setArrivalItems(newItems);
                          }}
                          className="border rounded px-2 py-1 text-sm"
                        >
                          <option value="">选择供应商</option>
                          {suppliers.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex flex-col gap-1">
                          <select
                            value={item.batchNo || ''}
                            onChange={(e) => {
                              const newItems = [...arrivalItems];
                              newItems[idx].batchNo = e.target.value;
                              if (e.target.value && item.availableBatches?.length) {
                                const selected = item.availableBatches.find(b => b.batchNo === e.target.value);
                                if (selected) {
                                  if (selected.expiryDate) {
                                    newItems[idx].expiryDate = selected.expiryDate.split('T')[0];
                                  }
                                  if (selected.supplierId) {
                                    newItems[idx].supplierId = selected.supplierId;
                                  }
                                }
                              }
                              setArrivalItems(newItems);
                            }}
                            className="border rounded px-2 py-1 text-sm font-mono"
                          >
                            <option value="">选择批次/新建</option>
                            {item.availableBatches?.map((b, bi) => (
                              <option key={bi} value={b.batchNo}>
                                {b.batchNo} {b.expiryDate ? `(${b.expiryDate.split('T')[0]})` : ''}
                              </option>
                            ))}
                            {item.batchNo && !item.availableBatches?.some(b => b.batchNo === item.batchNo) && (
                              <option value={item.batchNo}>★ {item.batchNo}</option>
                            )}
                          </select>
                          {item.batchNo && !item.availableBatches?.some(b => b.batchNo === item.batchNo) && (
                            <span className="text-xs text-green-600">新批次</span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                              const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
                              const newItems = [...arrivalItems];
                              newItems[idx].batchNo = `${dateStr}${randomStr}`;
                              setArrivalItems(newItems);
                            }}
                            className="px-1 py-1 text-xs bg-gray-100 hover:bg-gray-200 border rounded"
                            title="自动生成新批次"
                          >
                            生成
                          </button>
                        </div>
                      </td>
                      {item.type === 'PRODUCT' && (
                      <td className="px-3 py-2 text-center">
                        <input
                          type="date"
                          value={item.expiryDate || ''}
                          onChange={(e) => {
                            const newItems = [...arrivalItems];
                            newItems[idx].expiryDate = e.target.value;
                            setArrivalItems(newItems);
                          }}
                          className="border rounded px-2 py-1 text-sm"
                        />
                      </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowArrivalModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleArrivalSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                确认到货
              </button>
            </div>
          </div>
        </div>
      )}

      {showReceivingModal && selectedReceivingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">验收收货 - {selectedReceivingOrder.inboundNo}</h2>
              <button onClick={() => setShowReceivingModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">扫描商品条码</label>
              <input
                type="text"
                value={receivingBarcode}
                onChange={(e) => setReceivingBarcode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && receivingBarcode) {
                    handleBarcodeScan(receivingBarcode);
                  }
                }}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="扫描或输入商品条码后按回车"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">验收明细</label>
              <table className="min-w-full border divide-y">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs">商品</th>
                    <th className="px-3 py-2 text-left text-xs">规格/包装</th>
                    <th className="px-3 py-2 text-center text-xs">计划</th>
                    <th className="px-3 py-2 text-center text-xs">实收</th>
                    <th className="px-3 py-2 text-center text-xs">批次</th>
                    <th className="px-3 py-2 text-center text-xs">有效期</th>
                    <th className="px-3 py-2 text-center text-xs">验收</th>
                    <th className="px-3 py-2 text-left text-xs">备注</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {receivingItems.map((item, idx) => (
                    <tr key={item.id} className={item.inspectionResult !== 'PENDING' ? 'bg-green-50' : ''}>
                      <td className="px-3 py-2 text-sm">{item.productName}</td>
                      <td className="px-3 py-2 text-sm text-gray-500">
                        {item.spec || '-'}{item.packaging ? ` / ${item.packaging}` : ''}
                      </td>
                      <td className="px-3 py-2 text-sm text-center">{item.expectedQuantity}</td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (item.receivedQuantity > 0) {
                                const newItems = [...receivingItems];
                                newItems[idx].receivedQuantity -= 1;
                                setReceivingItems(newItems);
                              }
                            }}
                            className="w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                          >
                            -
                          </button>
                          <span className="w-12 text-center">{item.receivedQuantity}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const expectedQty = item.expectedQuantity || 0;
                              if ((item.receivedQuantity || 0) < expectedQty) {
                                const newItems = [...receivingItems];
                                newItems[idx].receivedQuantity += 1;
                                setReceivingItems(newItems);
                              }
                            }}
                            className="w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-sm text-center">
                        <input
                          type="text"
                          value={item.batchNo || ''}
                          onChange={(e) => {
                            const newItems = [...receivingItems];
                            newItems[idx].batchNo = e.target.value;
                            setReceivingItems(newItems);
                          }}
                          className="w-32 border rounded px-1 py-0.5 text-sm"
                          placeholder="批次号"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="date"
                          value={item.expiryDate || ''}
                          onChange={(e) => {
                            const newItems = [...receivingItems];
                            newItems[idx].expiryDate = e.target.value;
                            setReceivingItems(newItems);
                          }}
                          className="border rounded px-1 py-0.5 text-sm"
                          disabled={item.type === 'BUNDLE'}
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <select
                          value={item.inspectionResult}
                          onChange={(e) => {
                            const newItems = [...receivingItems];
                            newItems[idx].inspectionResult = e.target.value as any;
                            setReceivingItems(newItems);
                          }}
                          className="border rounded px-2 py-1 text-sm"
                        >
                          <option value="PENDING">待验收</option>
                          <option value="OK">合格</option>
                          <option value="SHORT">短缺</option>
                          <option value="DAMAGED">破损</option>
                        </select>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="text"
                          value={item.inspectionNote}
                          onChange={(e) => {
                            const newItems = [...receivingItems];
                            newItems[idx].inspectionNote = e.target.value;
                            setReceivingItems(newItems);
                          }}
                          className="w-24 border rounded px-2 py-1 text-sm"
                          placeholder="备注"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowReceivingModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleCompleteReceivingSubmit}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                确认验收
              </button>
            </div>
          </div>
        </div>
      )}

      {showPutawayModal && selectedPutawayOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">开始上架 - {selectedPutawayOrder.inboundNo}</h2>
              <button onClick={() => setShowPutawayModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {putawayLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-2">加载库位数据...</span>
              </div>
            ) : (
              <>
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm text-blue-800">
                    <strong>推荐规则：</strong>优先推荐同批次同商品库位 → 空库位 → 任意库位
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">上架明细</label>
                  <table className="min-w-full border divide-y">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs">商品</th>
                        <th className="px-3 py-2 text-center text-xs">数量</th>
                        <th className="px-3 py-2 text-left text-xs">原预计库位</th>
                        <th className="px-3 py-2 text-center text-xs">推荐库位</th>
                        <th className="px-3 py-2 text-center text-xs">目标库位</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {putawayItems.map((item, idx) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2 text-sm">
                            <div>{item.productName}</div>
                            <div className="text-xs text-gray-500">{item.spec}/{item.packaging}</div>
                          </td>
                          <td className="px-3 py-2 text-sm text-center">{item.quantity}</td>
                          <td className="px-3 py-2 text-sm text-gray-500">{item.originalLocationCode || '-'}</td>
                          <td className="px-3 py-2 text-sm">
                            {item.recommendedLocationCode ? (
                              <span className={`px-2 py-1 rounded text-xs ${item.targetLocationCode === item.recommendedLocationCode ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                {item.recommendedLocationCode}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <select
                              value={item.targetLocationId || ''}
                              onChange={(e) => {
                                const newItems = [...putawayItems];
                                const loc = findLocationById(e.target.value);
                                newItems[idx].targetLocationId = e.target.value;
                                newItems[idx].targetLocationCode = loc?.code || '';
                                setPutawayItems(newItems);
                              }}
                              className="border rounded px-2 py-1 text-sm"
                            >
                              <option value="">选择库位</option>
                              {putawayZones.filter((z: any) => z.type === (selectedPutawayOrder.source === 'RETURN' ? 'RETURNING' : 'INBOUND')).flatMap((zone: any) =>
                                (zone.shelves || []).flatMap((shelf: any) =>
                                  (shelf.locations || []).map((loc: any) => {
                                    const code = `${zone.code}-${shelf.code}-L${loc.level}`;
                                    const isRecommended = item.recommendedLocationCode === code;
                                    const hasStock = (loc.stock && loc.stock.totalQuantity > 0) ||
                                                   (loc.bundleStock && loc.bundleStock.totalQuantity > 0);
                                    return (
                                      <option key={loc.id} value={loc.id}>
                                        {code} {isRecommended ? '【推荐】' : ''} {hasStock ? '[有货]' : '[空]'}
                                      </option>
                                    );
                                  })
                                )
                              )}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowPutawayModal(false)}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    onClick={handlePutawayConfirm}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                  >
                    确认上架
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tooltip && (
        <div
          className="fixed z-50 bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg text-sm"
          style={{ left: tooltip.x + 10, top: tooltip.y + 10 }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}
