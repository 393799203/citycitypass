import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { orderApi, ownerApi, productApi, warehouseApi, geocodeApi, bundleApi, stockApi, returnApi, customerApi } from '../api';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Plus, Pencil, Trash2, X, Loader2, Filter, ShoppingCart, Package, Truck, CheckCircle, Upload, Download, Ban, PackageCheck, RotateCcw, MapPin, Phone, XCircle } from 'lucide-react';
import PhoneInput from '../components/PhoneInput';
import AddressInput from '../components/AddressInput';
import ReturnTrackingModal from '../components/ReturnTrackingModal';
import ImportPreviewModal from '../components/ImportPreviewModal';
import { formatPhone, formatAddress } from '../utils/format';
import { useConfirm } from '../components/ConfirmProvider';
import { useOwnerStore } from '../stores/owner';


interface Order {
  id: string;
  orderNo: string;
  ownerId: string;
  owner: { id: string; name: string };
  receiver: string;
  phone: string;
  province?: string;
  city?: string;
  address: string;
  totalAmount: string;
  status: string;
  items: OrderItem[];
  createdAt: string;
  warehouse?: { id: string; name: string };
  latitude?: number;
  longitude?: number;
}

interface OrderItem {
  id: string;
  skuId: string;
  sku: { id: string; name: string; packaging: string; spec: string; price: string };
  productName: string;
  packaging: string;
  spec: string;
  price: string;
  quantity: number;
  subtotal: string;
}

interface Owner {
  id: string;
  name: string;
  productTags?: string[];
  status?: string;
  province?: string;
  city?: string;
  warehouses?: { id: string; name: string }[];
}

interface Product {
  id: string;
  name: string;
  brand: { name: string };
  skus: SKU[];
}

interface SKU {
  id: string;
  name: string;
  packaging: string;
  spec: string;
  price: string;
  stock: number;
}

interface OrderFormItem {
  skuId: string | null;
  bundleId: string | null;
  productName: string;
  packaging: string;
  spec: string;
  price: number;
  quantity: number;
}

const statusMap: Record<string, string> = {
  PENDING: '待拣货',
  PICKING: '拣货中',
  OUTBOUND_REVIEW: '出库审核',
  DISPATCHING: '运力调度',
  DISPATCHED: '已调度',
  IN_TRANSIT: '运输中',
  DELIVERED: '已送达',
  COMPLETED: '已完成',
  RETURNING: '退货中',
  RETURNED: '已退款',
  CANCELLED: '已取消',
};

const statusOptions = [
  { value: 'PENDING', label: '待拣货' },
  { value: 'PICKING', label: '拣货中' },
  { value: 'OUTBOUND_REVIEW', label: '出库审核中' },
  { value: 'DISPATCHING', label: '待运力调度' },
  { value: 'DISPATCHED', label: '已调度' },
  { value: 'IN_TRANSIT', label: '运输中' },
  { value: 'DELIVERED', label: '已送达' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'RETURNING', label: '退货中' },
  { value: 'CANCELLED', label: '已取消' },
];

export default function OrdersPage() {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const { currentOwnerId } = useOwnerStore();
  const getLatestActiveReturn = (order: any) => {
    if (!order.returnOrders?.length) return null;
    return order.returnOrders
      .filter((r: any) => r.status !== 'CANCELLED')
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  };
  const [orders, setOrders] = useState<Order[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ orderNo: '', status: '', startDate: '', endDate: '' });
  const [formData, setFormData] = useState({
    ownerId: '',
    warehouseId: '',
    receiver: '',
    phone: '',
    province: '',
    city: '',
    address: '',
    latitude: '',
    longitude: '',
    items: [] as OrderFormItem[],
    contractDiscount: undefined as number | undefined,
  });
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedSku, setSelectedSku] = useState('');
  const [selectedBundle, setSelectedBundle] = useState('');
  const [itemType, setItemType] = useState<'product' | 'bundle'>('product');
  const [bundles, setBundles] = useState<any[]>([]);
  const [ownerStockSummary, setOwnerStockSummary] = useState<any>(null);
  const [splitPreview, setSplitPreview] = useState<{show: boolean; allocations: Record<string, any[]>} | null>(null);
  const [returnModal, setReturnModal] = useState<{ show: boolean; orderId: string; orderNo: string } | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnTrackingModal, setReturnTrackingModal] = useState<{ show: boolean; returnId: string; returnNo: string } | null>(null);
  const [returnTrackingNo, setReturnTrackingNo] = useState('');
  const [returnLogisticsCompany, setReturnLogisticsCompany] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreviewData, setImportPreviewData] = useState<{ orderNo: string; rows: any[] }[] | null>(null);
  const [customerType, setCustomerType] = useState<'RETAIL' | 'CORPORATE'>('RETAIL');
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  useEffect(() => {
    if (customerType === 'CORPORATE' && formData.ownerId) {
      customerApi.list({ status: 'ACTIVE', ownerId: formData.ownerId }).then(res => {
        if (res.data.success) {
          setCustomers(res.data.data || []);
        }
      }).catch(() => setCustomers([]));
    } else {
      setCustomers([]);
      setSelectedCustomerId('');
    }
  }, [customerType, formData.ownerId]);

  useEffect(() => {
    if (selectedCustomerId) {
      customerApi.get(selectedCustomerId).then(res => {
        if (res.data.success && res.data.data) {
          const customer = res.data.data;
          setFormData(prev => ({
            ...prev,
            receiver: customer.contact || '',
            phone: customer.phone || '',
            province: customer.province || '',
            city: customer.city || '',
            address: customer.address || '',
          }));
        }
      });

      customerApi.getContracts(selectedCustomerId).then(res => {
        if (res.data.success && res.data.data.length > 0) {
          const activeContract = res.data.data.find((c: any) => c.status === 'ACTIVE');
          if (activeContract?.discount) {
            setFormData(prev => ({ ...prev, contractDiscount: parseFloat(activeContract.discount) }));
          } else {
            setFormData(prev => ({ ...prev, contractDiscount: undefined }));
          }
        } else {
          setFormData(prev => ({ ...prev, contractDiscount: undefined }));
        }
      }).catch(() => {
        setFormData(prev => ({ ...prev, contractDiscount: undefined }));
      });
    }
  }, [selectedCustomerId]);

  useEffect(() => {
    if (formData.ownerId) {
      stockApi.getOwnerStockSummary(formData.ownerId).then(res => {
        if (res.data.success) {
          setOwnerStockSummary(res.data.data || { products: [], bundles: [] });
        } else {
          setOwnerStockSummary({ products: [], bundles: [] });
        }
      }).catch(() => {
        setOwnerStockSummary({ products: [], bundles: [] });
      });
    } else {
      setOwnerStockSummary(null);
    }
  }, [formData.ownerId]);

  const handleExport = () => {
    const exportData: any[] = [];
    
    orders.forEach(order => {
      order.items.forEach((item, idx) => {
        exportData.push({
          '订单编号': order.orderNo,
          '主体': order.owner?.name || '',
          '客户名称': (order as any).customer?.name || '',
          '折扣': idx === 0 ? ((order as any).contractDiscount ? `${((order as any).contractDiscount * 100).toFixed(0)}%` : '') : '',
          '收货人': order.receiver,
          '手机号': order.phone,
          '省份': order.province || '',
          '城市': order.city || '',
          '收货地址': order.address || '',
          '商品名称': item.productName,
          '包装': item.packaging,
          '规格': item.spec,
          '单价': Number(item.price),
          '数量': item.quantity,
          '小计': Number(item.subtotal),
          '总金额': idx === 0 ? Number(order.totalAmount) : '',
          '状态': idx === 0 ? statusMap[order.status] || order.status : '',
          '下单时间': idx === 0 ? new Date(order.createdAt).toLocaleString() : '',
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '订单');
    XLSX.writeFile(wb, `订单_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('导出成功');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet) as any[];

        console.log('Excel 列名:', Object.keys(json[0] || {}));
        console.log('Excel 第一行数据:', JSON.stringify(json[0], null, 2));
        
        const orderGroups: Record<string, any[]> = {};
        json.forEach(row => {
          const orderNo = row['订单编号'];
          if (!orderNo) return;
          if (!orderGroups[orderNo]) {
            orderGroups[orderNo] = [];
          }
          orderGroups[orderNo].push(row);
        });

        const existingOrderNos = new Set(orders.map(o => o.orderNo));
        
        const ordersToImport: { orderNo: string; rows: any[] }[] = [];
        Object.entries(orderGroups).forEach(([orderNo, rows]) => {
          if (orderNo && existingOrderNos.has(orderNo)) {
            return;
          }
          ordersToImport.push({ orderNo, rows });
        });

        if (ordersToImport.length < Object.keys(orderGroups).length) {
          const skippedCount = Object.keys(orderGroups).length - ordersToImport.length;
          toast.info(`已跳过 ${skippedCount} 个重复订单`);
        }

        if (ordersToImport.length === 0) {
          toast.warning('没有需要导入的订单');
          return;
        }

        setImportPreviewData(ordersToImport);
      } catch (error) {
        toast.error('导入失败，请检查文件格式');
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImportConfirm = async (importOrders: { orderNo?: string; rows: any[]; fixed?: Record<string, any>; '主体'?: string; '仓库'?: string; '收货人'?: string; '手机号'?: string; '省份'?: string; '城市'?: string; '收货地址'?: string; '状态'?: string; '客户Id'?: string }[]) => {
    console.log('handleImportConfirm 被调用, 数据:', JSON.stringify(importOrders, null, 2));
    setImportPreviewData(null);
    let successCount = 0;
    let errorCount = 0;
    const errorLogs: string[] = [];

    if (importOrders.length === 0) {
      console.log('没有需要导入的订单');
      toast.warning('没有需要导入的订单');
      return;
    }

    const customersRes = await customerApi.list({ status: 'ACTIVE' });
    const allCustomers = customersRes.data.data || [];

    for (const importOrder of importOrders) {
      const orderNo = importOrder.orderNo;
      const rows = importOrder.rows;
      const fixed = importOrder.fixed;
      const orderData = importOrder as any;
      console.log('处理订单:', orderNo, '行数:', rows.length, '订单数据:', JSON.stringify(orderData, null, 2));

      let customerId = orderData['客户Id'] || fixed?.customerId;
      if (!customerId && orderData['客户名称']) {
        const customer = allCustomers.find((c: any) => c.name === orderData['客户名称']);
        if (customer) {
          customerId = customer.id;
        }
      }

      const owner = owners.find(o => o.name === orderData['主体']);
      if (!owner) {
        errorCount++;
        errorLogs.push(`订单 ${orderNo || '未知'}: 未找到主体 "${orderData['主体']}"`);
        toast.error(`订单 ${orderNo}: 未找到主体 "${orderData['主体']}"`);
        continue;
      }

      const items = rows.map(row => ({
        productName: row['商品名称'],
        packaging: row['包装'],
        spec: row['规格'],
        price: Number(row['单价']),
        quantity: Number(row['数量']),
      }));

      const skuPromises = items.map(async (item) => {
        const productRes = await productApi.list({ name: item.productName, ownerId: formData.ownerId || undefined });
        const products = productRes.data.data || [];
        console.log(`搜索商品: ${item.productName}, 找到 ${products.length} 个`);

        for (const product of products) {
          if (!product.skus || product.skus.length === 0) continue;
          const sku = product.skus.find((s: any) => s.packaging === item.packaging && s.spec === item.spec);
          if (sku) {
            return {
              skuId: sku.id,
              bundleId: null,
              productName: item.productName,
              packaging: item.packaging,
              spec: item.spec,
              price: item.price,
              quantity: item.quantity,
            };
          }
        }

        if (item.packaging || item.spec) {
          return null;
        }

        const bundleRes = await bundleApi.list({ name: item.productName });
        const bundles = bundleRes.data.data || [];
        console.log(`搜索套装: ${item.productName}, 找到 ${bundles.length} 个`);

        if (bundles.length > 0) {
          const bundle = bundles.find((b: any) => b.name === item.productName);
          if (bundle) {
            return {
              skuId: null,
              bundleId: bundle.id,
              productName: item.productName,
              packaging: bundle.packaging || '',
              spec: bundle.spec || '',
              price: item.price,
              quantity: item.quantity,
            };
          }
        }

        console.warn(`商品/套装未找到: ${item.productName}`);
        toast.error(`订单 ${orderNo}，${item.productName} 在主体仓库中缺货，无法下单`);
        return null;
      });

      const skuItems = await Promise.all(skuPromises);
      const validItems = skuItems.filter(item => item !== null);

      if (validItems.length === 0) {
        errorCount++;
        const missingProducts = items.map(i => i.productName).join(', ');
        errorLogs.push(`订单 ${orderNo || '未知'}，${missingProducts} 在主体仓库中缺货，无法下单`);
        toast.error(`订单 ${orderNo}，${missingProducts} 在主体仓库中缺货，无法下单`);
        continue;
      }

      try {
        const statusText = orderData['状态'];
        const statusMapReverse: Record<string, string> = {
          '待拣货': 'PENDING',
          '拣货中': 'PICKING',
          '出库审核中': 'OUTBOUND_REVIEW',
          '待运力调度': 'DISPATCHING',
          '已调度': 'DISPATCHED',
          '运输中': 'IN_TRANSIT',
          '已送达': 'DELIVERED',
          '已完成': 'COMPLETED',
          '退货中': 'RETURNING',
          '已取消': 'CANCELLED',
        };
        const status = statusMapReverse[orderData['状态'] || ''] || 'PENDING';

        if (status === 'CANCELLED') {
          errorCount++;
          errorLogs.push(`订单 ${orderNo}: 取消状态的订单不能导入`);
          toast.warn(`订单 ${orderNo}: 取消状态的订单不能导入`);
          continue;
        }

        await orderApi.create({
          orderNo: orderNo || undefined,
          ownerId: owner.id,
          receiver: orderData['收货人'] || fixed?.receiver || '未知',
          phone: orderData['手机号'] || fixed?.phone || '13800000000',
          province: orderData['省份'] || fixed?.province || '北京市',
          city: orderData['城市'] || fixed?.city || '北京市',
          address: orderData['收货地址'] || fixed?.address || '未知地址',
          customerId,
          customerName: orderData['客户名称'] || fixed?.customerName,
          contractDiscount: orderData['折扣'] ? parseFloat(orderData['折扣'].replace('%', '')) / 100 : fixed?.discount,
          items: validItems,
          status,
        });
        successCount++;
      } catch (err: any) {
        errorCount++;
        const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message;
        console.error(`订单 ${orderNo} 导入失败:`, err.response?.data);
        errorLogs.push(`订单 ${orderNo}: ${errorMsg}`);
        toast.error(`订单 ${orderNo} 导入失败: ${errorMsg}`);
      }
    }

    if (successCount > 0) {
      fetchOrders();
    }
    if (errorCount > 0) {
      toast.error(`导入完成：成功 ${successCount} 条，失败 ${errorCount} 条`);
    } else {
      toast.success(`导入完成：成功 ${successCount} 条，失败 ${errorCount} 条`);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await orderApi.list(filters);
      if (res.data.success) {
        setOrders(res.data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOwners = async () => {
    try {
      const res = await ownerApi.list();
      if (res.data.success) {
        setOwners(res.data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await productApi.list();
      if (res.data.success) {
        setProducts(res.data.data);
      }
      const bundleRes = await bundleApi.list();
      if (bundleRes.data.success) {
        setBundles(bundleRes.data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await warehouseApi.list({ status: 'ACTIVE' });
      if (res.data.success) {
        setWarehouses(res.data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchOwners();
    fetchProducts();
    fetchWarehouses();
  }, []);

  useEffect(() => {
    if (formData.warehouseId) {
      Promise.all([
        fetch(`/api/products?warehouseId=${formData.warehouseId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }).then(res => res.json()),
        fetch(`/api/stock?warehouseId=${formData.warehouseId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }).then(res => res.json())
      ]).then(([productsData, stockData]) => {
        if (productsData.success) {
          setProducts(productsData.data);
        }
        if (stockData.success) {
          const stocks = stockData.data;
          const productStocks = stocks.productStocks || [];
          const bundleStocks = stocks.bundleStocks || [];
          setProducts((prev: any) => prev.map((p: any) => ({
            ...p,
            skus: p.skus?.map((s: any) => ({
              ...s,
              stock: productStocks.filter((ps: any) => ps.skuId === s.id).reduce((sum: number, ps: any) => sum + ps.availableQuantity, 0)
            }))
          })));
          setBundles((prev: any) => prev.map((b: any) => ({
            ...b,
            stock: bundleStocks.filter((bs: any) => bs.bundleId === b.id).reduce((sum: number, bs: any) => sum + bs.availableQuantity, 0)
          })));
        }
      });
    } else {
      setProducts([]);
    }
  }, [formData.warehouseId]);

  const handleSearch = () => {
    fetchOrders();
    setShowFilters(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ownerId || !formData.receiver || !formData.phone || !formData.province || !formData.city || !formData.address || formData.items.length === 0) {
      toast.error('请填写完整信息');
      return;
    }

    const checkSplitNeeded = () => {
      const skuItems = formData.items.filter(i => i.skuId);
      const bundleItems = formData.items.filter(i => i.bundleId);
      const skuMap = new Map<string, Map<string, number>>();
      const bundleMap = new Map<string, Map<string, number>>();

      for (const p of ownerStockSummary?.products || []) {
        for (const ws of p.warehouseSummary || []) {
          if (!skuMap.has(p.skuId)) {
            skuMap.set(p.skuId, new Map());
          }
          const existing = skuMap.get(p.skuId)!.get(ws.warehouseId) || 0;
          skuMap.get(p.skuId)!.set(ws.warehouseId, existing + ws.available);
        }
      }

      for (const b of ownerStockSummary?.bundles || []) {
        for (const ws of b.warehouseSummary || []) {
          if (!bundleMap.has(b.bundleId)) {
            bundleMap.set(b.bundleId, new Map());
          }
          const existing = bundleMap.get(b.bundleId)!.get(ws.warehouseId) || 0;
          bundleMap.get(b.bundleId)!.set(ws.warehouseId, existing + ws.available);
        }
      }

      const singleWarehouseFit = (warehouseId: string) => {
        for (const item of [...skuItems, ...bundleItems]) {
          const isSku = !!item.skuId;
          const mapToUse = isSku ? skuMap : bundleMap;
          const itemId = isSku ? item.skuId : item.bundleId;
          const warehouseStock = mapToUse.get(itemId!);
          if (!warehouseStock) return false;
          const available = warehouseStock.get(warehouseId) || 0;
          if (available < item.quantity) return false;
        }
        return true;
      };

      const warehouseIds = new Set<string>();
      for (const p of ownerStockSummary?.products || []) {
        for (const ws of p.warehouseSummary || []) {
          warehouseIds.add(ws.warehouseId);
        }
      }
      for (const b of ownerStockSummary?.bundles || []) {
        for (const ws of b.warehouseSummary || []) {
          warehouseIds.add(ws.warehouseId);
        }
      }

      for (const whId of warehouseIds) {
        if (singleWarehouseFit(whId)) {
          return null;
        }
      }

      const allocations: Record<string, any[]> = {};
      for (const item of [...skuItems, ...bundleItems]) {
        const isSku = !!item.skuId;
        const mapToUse = isSku ? skuMap : bundleMap;
        const itemId = isSku ? item.skuId : item.bundleId;
        const warehouseStock = mapToUse.get(itemId!);
        if (!warehouseStock) continue;

        let remainingQty = item.quantity;
        const sortedEntries = Array.from(warehouseStock.entries()).sort((a, b) => b[1] - a[1]);

        for (const [warehouseId, available] of sortedEntries) {
          if (remainingQty <= 0) break;
          const toAllocate = Math.min(available, remainingQty);
          if (toAllocate > 0) {
            if (!allocations[warehouseId]) {
              allocations[warehouseId] = [];
            }
            const existing = allocations[warehouseId].find((i: any) =>
              (isSku && i.skuId === item.skuId) || (!isSku && i.bundleId === item.bundleId)
            );
            if (existing) {
              existing.quantity += toAllocate;
            } else {
              allocations[warehouseId].push({ ...item, quantity: toAllocate });
            }
            warehouseStock.set(warehouseId, available - toAllocate);
            remainingQty -= toAllocate;
          }
        }
      }

      const warehouseNames = new Map<string, string>();
      for (const p of ownerStockSummary?.products || []) {
        for (const ws of p.warehouseSummary || []) {
          if (!warehouseNames.has(ws.warehouseId)) {
            warehouseNames.set(ws.warehouseId, ws.warehouseName);
          }
        }
      }
      for (const b of ownerStockSummary?.bundles || []) {
        for (const ws of b.warehouseSummary || []) {
          if (!warehouseNames.has(ws.warehouseId)) {
            warehouseNames.set(ws.warehouseId, ws.warehouseName);
          }
        }
      }

      const previewAllocations: Record<string, any[]> = {};
      for (const [whId, items] of Object.entries(allocations)) {
        previewAllocations[warehouseNames.get(whId) || whId] = items;
      }

      return previewAllocations;
    };

    const splitResult = checkSplitNeeded();

    if (splitResult && Object.keys(splitResult).length > 1) {
      setSplitPreview({ show: true, allocations: splitResult });
      return;
    }

    submitOrder();
  };

  const submitOrder = async () => {
    try {
      const data = {
        ...formData,
        warehouseId: formData.warehouseId || '',
        customerId: customerType === 'CORPORATE' ? selectedCustomerId : undefined,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
      };

      if (editingId) {
        await orderApi.update(editingId, data);
        toast.success('订单更新成功');
      } else {
        const res = await orderApi.create(data);
        toast.success(`订单创建成功${Array.isArray(res.data.data) ? `，共 ${res.data.data.length} 个订单` : ''}`);
      }
      setShowModal(false);
      resetForm();
      setEditingId(null);
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  const getNextStatus = (currentStatus: string): string | null => {
    const flow: Record<string, string> = {
      PENDING: 'PICKING',
      PICKING: 'OUTBOUND_REVIEW',
      OUTBOUND_REVIEW: 'DISPATCHING',
      DISPATCHING: 'DISPATCHED',
      DISPATCHED: 'IN_TRANSIT',
      IN_TRANSIT: 'DELIVERED',
    };
    return flow[currentStatus] || null;
  };

  const getStatusButtonText = (status: string): string => {
    const textMap: Record<string, string> = {
      PENDING: '开始拣货',
      PICKING: '拣货完成',
      OUTBOUND_REVIEW: '审核通过',
      DISPATCHING: '开始调度',
      DISPATCHED: '开始运输',
      IN_TRANSIT: '确认送达',
    };
    return textMap[status] || statusMap[status] || '';
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      if (newStatus === 'PICKING') {
        const { pickOrderApi } = await import('../api');
        const res = await pickOrderApi.create({ orderId: id });
        if (res.data.success) {
          toast.success('拣货单已生成');
        } else {
          toast.error(res.data.message || '生成拣货单失败');
          return;
        }
      } else {
        await orderApi.updateStatus(id, newStatus);
      }
      toast.success('状态已更新');
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ message: '确定要删除该订单吗？' });
    if (!ok) return;
    try {
      await orderApi.delete(id);
      toast.success('订单已删除');
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '删除失败');
    }
  };

  const resetForm = () => {
    setFormData({
      ownerId: currentOwnerId || '',
      warehouseId: '',
      receiver: '',
      phone: '',
      province: '',
      city: '',
      address: '',
      latitude: '',
      longitude: '',
      items: [],
      contractDiscount: undefined,
    });
    setSelectedProduct('');
    setSelectedSku('');
    setCustomerType('RETAIL');
    setSelectedCustomerId('');
  };

  const addItem = () => {
    if (!selectedSku) {
      toast.error('请选择商品');
      return;
    }
    const product = products.find(p => p.skus.some(s => s.id === selectedSku));
    const sku = product?.skus.find(s => s.id === selectedSku);
    if (!product || !sku) return;

    const existing = formData.items.find(item => item.skuId === selectedSku);
    if (existing) {
      toast.error('该商品已添加');
      return;
    }

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        skuId: selectedSku,
        bundleId: null,
        productName: product.name,
        packaging: sku.packaging,
        spec: sku.spec,
        price: Number(sku.price),
        quantity: 1,
      }],
    }));
    setSelectedSku('');
    setSelectedProduct('');
  };

  const updateQuantity = (index: number, quantity: number) => {
    const newItems = [...formData.items];
    newItems[index].quantity = quantity;
    setFormData({ ...formData, items: newItems });
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const getTotalAmount = () => {
    return formData.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const selectedProductSkus = selectedProduct ? products.find(p => p.id === selectedProduct)?.skus || [] : [];

  return (
    <div className="space-y-6">
      <ToastContainer />

      {returnModal?.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">申请退货</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">订单</label>
                <div className="w-full border rounded-lg px-3 py-2 bg-gray-50">
                  {returnModal.orderNo}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">退货原因</label>
                <textarea
                  value={returnReason}
                  onChange={e => setReturnReason(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="请输入退货原因"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setReturnModal(null)} className="px-4 py-2 border rounded-lg">取消</button>
              <button
                onClick={async () => {
                  if (!returnReason.trim()) {
                    toast.error('请输入退货原因');
                    return;
                  }
                  try {
                    await returnApi.create({ orderId: returnModal.orderId, reason: returnReason });
                    toast.success('退货申请已提交');
                    setReturnModal(null);
                    fetchOrders();
                  } catch (error: any) {
                    toast.error(error.response?.data?.message || '创建失败');
                  }
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg"
              >
                提交
              </button>
            </div>
          </div>
        </div>
      )}

      {returnTrackingModal?.show && (
        <ReturnTrackingModal
          open={true}
          returnId={returnTrackingModal.returnId}
          returnNo={returnTrackingModal.returnNo}
          initialCompany={returnLogisticsCompany}
          initialTrackingNo={returnTrackingNo}
          onClose={() => {
            setReturnTrackingModal(null);
            fetchOrders();
          }}
          onSave={async (data, apiData) => {
            await returnApi.receive(data.returnId!, apiData);
            toast.success('快递单号已保存');
          }}
        />
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">订单中心</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-5 h-5" />
            筛选
          </button>
          <button
            onClick={handleExport}
            disabled={orders.length === 0}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Upload className="w-5 h-5" />
            导出
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            accept=".xlsx,.xls"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-5 h-5" />
            导入
          </button>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            新建订单
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">订单编号</label>
              <input
                type="text"
                value={filters.orderNo}
                onChange={(e) => setFilters({ ...filters, orderNo: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="请输入订单编号"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">全部</option>
                {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleSearch}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                查询
              </button>
              <button
                onClick={() => { setFilters({ orderNo: '', status: '', startDate: '', endDate: '' }); fetchOrders(); }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                重置
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-gray-500">暂无数据</div>
        ) : (
          <table className="w-full table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th className="pl-4 pr-2 py-3 text-center text-base font-medium text-gray-500 uppercase w-40">订单编号</th>
                <th className="px-2 py-3 text-center text-base font-medium text-gray-500 uppercase w-24">主体</th>
                <th className="px-2 py-3 text-center text-base font-medium text-gray-500 uppercase w-32">收货人/电话</th>
                <th className="px-2 py-3 text-center text-base font-medium text-gray-500 uppercase w-48">收货地址</th>
                <th className="px-2 py-3 text-center text-base font-medium text-gray-500 uppercase w-12">总数</th>
                <th className="px-2 py-3 text-center text-base font-medium text-gray-500 uppercase w-16">金额</th>
                <th className="px-2 py-3 text-center text-base font-medium text-gray-500 uppercase w-14">状态</th>
                <th className="px-2 py-3 text-center text-base font-medium text-gray-500 uppercase w-20">下单时间</th>
                <th className="pr-4 pl-2 py-3 text-center text-base font-medium text-gray-500 uppercase w-24">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="pl-4 pr-2 py-4 whitespace-nowrap text-base font-medium w-40 text-center">
                    <Link to={`/orders/${order.id}`} className="text-primary-600 hover:text-primary-800 hover:underline">
                      {order.orderNo}
                    </Link>
                    {(() => {
                      const latestReturn = getLatestActiveReturn(order as any);
                      return latestReturn ? (
                        <div className="text-orange-500 text-sm mt-0.5">
                          退: <Link to={`/returns/${latestReturn.id}`} className="text-orange-500 hover:underline">{latestReturn.returnNo}</Link>
                        </div>
                      ) : null;
                    })()}
                  </td>
                  <td className="px-2 py-4 text-base text-gray-500 w-24 text-center">
                    <div className="truncate">{order.owner?.name}</div>
                    <div className="text-sm text-gray-400 truncate">{order.warehouse?.name}</div>
                  </td>
                  <td className="px-2 py-4 text-base w-32 text-center">
                    {(order as any).customerId && (order as any).customer ? (
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1">
                          <span className="truncate font-medium">{(order as any).customer.name}</span>
                          {((order as any).customer.level === 'VIP' || (order as any).customer.level === 'vip') && (
                            <span className="px-1 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">VIP</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-gray-400 text-sm truncate">
                          <Phone className="w-4 h-4 shrink-0" />
                          <span>{order.receiver}</span>
                          <span className="text-gray-300">|</span>
                          <span>{formatPhone(order.phone)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <div className="truncate">{order.receiver}</div>
                        <div className="flex items-center gap-1 text-gray-400 text-sm truncate">
                          <Phone className="w-4 h-4 shrink-0" />
                          {formatPhone(order.phone)}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-4 text-base w-48 text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-500">
                      <MapPin className="w-4 h-4 shrink-0 text-gray-400" />
                      <span className="whitespace-normal">{formatAddress(order.province, order.city, order.address)}</span>
                    </div>
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap text-base text-gray-500 w-12 text-center">{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                  <td className="px-2 py-4 whitespace-nowrap text-base text-primary-600 font-medium w-16 text-center">
                    <div>¥{Number(order.totalAmount).toLocaleString()}</div>
                    {(order as any).customerId && (order as any).contractDiscount && (
                      <span className="inline-block px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">大客户协议价</span>
                    )}
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap w-14 text-center">
                    <span className={`px-2 py-1 text-xs rounded border ${
                      order.status === 'PENDING' ? 'bg-yellow-50 border-yellow-500 text-yellow-700' :
                      order.status === 'APPROVED' ? 'bg-blue-50 border-blue-500 text-blue-700' :
                      order.status === 'PICKING' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' :
                      order.status === 'OUTBOUND_REVIEW' ? 'bg-purple-50 border-purple-500 text-purple-700' :
                      order.status === 'DISPATCHING' ? 'bg-cyan-50 border-cyan-500 text-cyan-700' :
                      order.status === 'DISPATCHED' ? 'bg-cyan-50 border-cyan-500 text-cyan-700' :
                      order.status === 'IN_TRANSIT' ? 'bg-purple-50 border-purple-500 text-purple-700' :
                      order.status === 'DELIVERED' ? 'bg-green-50 border-green-500 text-green-700' :
                      order.status === 'COMPLETED' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' :
                      order.status === 'RETURNING' ? 'bg-orange-50 border-orange-500 text-orange-700' :
                      order.status === 'RETURNED' ? 'bg-pink-50 border-pink-500 text-pink-700' :
                      order.status === 'CANCELLED' ? 'bg-gray-50 border-gray-500 text-gray-700' :
                      'bg-gray-50 border-gray-500 text-gray-700'
                    }`}>
                      {statusMap[order.status]}
                    </span>
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap text-base text-gray-500 w-20 text-center">
                    <div className="flex flex-col items-center">
                      <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                      <span className="text-sm text-gray-400">{new Date(order.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap text-base text-center">
                    {order.status === 'PENDING' || order.status === 'PICKING' || order.status === 'OUTBOUND_REVIEW' ? (
                        <>
                          {(order as any).customerId ? null : (
                            <button
                              onClick={() => {
                                const orderData = order as any;

                                setEditingId(order.id);
                                setCustomerType(orderData.customerId ? 'CORPORATE' : 'RETAIL');
                                setSelectedCustomerId(orderData.customerId || '');
                                setFormData({
                                  ownerId: orderData.ownerId,
                                  warehouseId: orderData.warehouseId,
                                  receiver: orderData.receiver,
                                  phone: orderData.phone,
                                  province: orderData.province,
                                  city: orderData.city,
                                  address: orderData.address,
                                  latitude: orderData.latitude?.toString() || '',
                                  longitude: orderData.longitude?.toString() || '',
                                  items: (orderData.items || []).map((item: any) => ({
                                    skuId: item.skuId,
                                    bundleId: item.bundleId,
                                    productName: item.productName,
                                    packaging: item.packaging,
                                    spec: item.spec,
                                    price: item.price,
                                    quantity: item.quantity,
                                  })),
                                  contractDiscount: orderData.contractDiscount,
                                });
                                setShowModal(true);
                              }}
                              className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 mr-1"
                            >
                              修改
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              const ok = await confirm({ message: '确定要取消该订单吗？' });
                              if (ok) {
                                handleStatusChange(order.id, 'CANCELLED');
                              }
                            }}
                            className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                          >
                            取消
                          </button>
                        </>
                      ) : null}
                      {order.status === 'CANCELLED' && (
                        <button
                          onClick={async () => {
                            const ok = await confirm({ message: '确定要删除该订单吗？' });
                            if (ok) {
                              handleDelete(order.id);
                            }
                          }}
                          className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          删除
                        </button>
                      )}
                      {order.status === 'DELIVERED' && (
                        <>
                          <button
                            onClick={async () => {
                              const ok = await confirm({ message: '确认已收到货？' });
                              if (ok) {
                                handleStatusChange(order.id, 'COMPLETED');
                              }
                            }}
                            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 mr-1"
                          >
                            确认收货
                          </button>
                          <button
                            onClick={() => {
                              setReturnModal({ show: true, orderId: order.id, orderNo: order.orderNo });
                              setReturnReason('');
                            }}
                            className="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
                          >
                            申请退货
                          </button>
                        </>
                      )}
                      {order.status === 'COMPLETED' && (
                        <button
                          onClick={() => {
                            setReturnModal({ show: true, orderId: order.id, orderNo: order.orderNo });
                            setReturnReason('');
                          }}
                          className="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
                        >
                          申请退货
                        </button>
                      )}
                      {order.status === 'RETURNING' && (
                        <>
                          {(() => {
                          const orderData = order as any;
                          const returnOrder = getLatestActiveReturn(orderData);
                          if (!returnOrder) return null;
                          return (
                            <>
                              {returnOrder.status === 'RETURN_REQUESTED' && (
                                <>
                                  <button
                                    onClick={() => {
                                      setReturnTrackingModal({ show: true, returnId: returnOrder.id, returnNo: returnOrder.returnNo });
                                      setReturnTrackingNo('');
                                      setReturnLogisticsCompany('');
                                    }}
                                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 mr-1"
                                  >
                                    填写快递
                                  </button>
                                  <button
                                    onClick={async () => {
                                      const ok = await confirm({ message: '确认取消退货？取消退货将自动确认收货，订单状态转为已完成！' });
                                      if (ok) {
                                        returnApi.cancel(returnOrder.id).then(() => {
                                          toast.success('已取消退货');
                                          fetchOrders();
                                        }).catch((err: any) => {
                                          toast.error(err.response?.data?.message || '取消失败');
                                        });
                                      }
                                    }}
                                    className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                  >
                                    取消退货
                                  </button>
                                </>
                              )}
                            </>
                          );
                        })()}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b bg-gray-50">
              <h2 className="text-lg font-bold">{editingId ? '编辑订单' : '新建订单'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); setEditingId(null); }} className="p-2 hover:bg-gray-200 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex h-[calc(90vh-60px)]">
              {/* 左侧 - 商品选择 */}
              <div className={`w-1/2 border-r flex flex-col ${editingId ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="p-4 border-b bg-gray-50">
                  <select
                    value={formData.ownerId}
                    onChange={(e) => {
                      setFormData({ ...formData, ownerId: e.target.value, warehouseId: '', items: [] });
                      setSelectedCustomerId('');
                    }}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    required
                    disabled={!!editingId || !!currentOwnerId}
                  >
                    <option value="">选择主体</option>
                    {(currentOwnerId ? owners.filter(o => o.id === currentOwnerId) : owners).filter(o => o.status !== 'STOPPED').map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>

                {(formData.ownerId && ownerStockSummary) && (
                  <div className="flex border-b">
                    <button
                      type="button"
                      onClick={() => { setItemType('product'); setSelectedBundle(''); }}
                      className={`flex-1 py-2.5 text-sm font-medium border-b-2 ${
                        itemType === 'product' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'
                      }`}
                    >
                      商品
                    </button>
                    <button
                      type="button"
                      onClick={() => { setItemType('bundle'); setSelectedProduct(''); setSelectedSku(''); }}
                      className={`flex-1 py-2.5 text-sm font-medium border-b-2 ${
                        itemType === 'bundle' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500'
                      }`}
                    >
                      套装
                    </button>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-2">
                  {formData.ownerId && ownerStockSummary && itemType === 'product' ? (
                    (() => {
                      const products = ownerStockSummary.products as any[];
                      const groupedProducts = products.reduce<Record<string, any[]>>((acc, p) => {
                        if (!acc[p.productName]) {
                          acc[p.productName] = [];
                        }
                        acc[p.productName].push(p);
                        return acc;
                      }, {} as Record<string, any[]>);
                      const filteredProducts = Object.entries(groupedProducts).filter(([_, skus]) =>
                        skus.some((sku: any) => sku.totalAvailable > 0)
                      );
                      if (filteredProducts.length === 0) {
                        return <div className="text-center text-gray-400 py-10">该主体暂无商品</div>;
                      }
                      return (
                        <div className="space-y-3">
                          {filteredProducts.map(([productName, skus]: [string, any[]]) => {
                            const firstSku = skus[0];
                            const brand = firstSku?.brand;
                            const category = firstSku?.category;
                            return (
                            <div key={productName} className="border border-blue-200 rounded-lg p-4 hover:shadow-lg transition-all bg-white">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Package className="w-5 h-5 text-blue-500" />
                                  <h3 className="font-bold text-base">{productName}</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                  {category && (
                                    <span className="px-2 py-0.5 text-xs rounded-full border border-gray-300 bg-gray-100 text-gray-700">
                                      {category.name}
                                    </span>
                                  )}
                                  {brand && (
                                    <span className="px-2 py-0.5 text-xs rounded-full border border-blue-300 bg-blue-100 text-blue-700">
                                      {brand.name}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                {skus.filter((sku: any) => sku.totalAvailable > 0).map((sku: any) => {
                                  const isAdded = formData.items.some(item => item.skuId === sku.skuId);
                                  return (
                                    <button
                                      key={sku.skuId}
                                      type="button"
                                      disabled={isAdded}
                                      onClick={() => {
                                        if (!isAdded) {
                                          setFormData(prev => ({
                                            ...prev,
                                            items: [...prev.items, {
                                              skuId: sku.skuId,
                                              bundleId: null,
                                              productName: sku.productName,
                                              packaging: sku.packaging,
                                              spec: sku.spec,
                                              price: sku.price,
                                              quantity: 1,
                                            }]
                                          }));
                                        }
                                      }}
                                      className={`p-2 rounded-lg border text-left transition-all ${
                                        isAdded
                                          ? 'bg-gray-50 border-gray-200 opacity-60'
                                          : 'bg-gray-50 border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                                      }`}
                                    >
                                      <div className="text-xs text-gray-600">{sku.spec} / {sku.packaging}</div>
                                      <div className="flex items-center justify-between mt-1">
                                        <span className="text-sm font-bold text-blue-600">¥{sku.price}</span>
                                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                                          isAdded ? 'bg-gray-200 text-gray-500' : 'bg-green-100 text-green-700'
                                        }`}>
                                          {isAdded ? '✓' : `${sku.totalAvailable}件`}
                                        </span>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                          })}
                        </div>
                      );
                    })()
                  ) : formData.ownerId && ownerStockSummary && itemType === 'bundle' ? (
                    (() => {
                      const bundles = (ownerStockSummary.bundles as any[])?.filter((b: any) => b.totalAvailable > 0) || [];
                      return bundles.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3">
                          {bundles.map((b: any) => {
                            const isAdded = formData.items.some(item => item.bundleId === b.bundleId);
                            return (
                              <div
                                key={b.bundleId}
                                className={`border border-purple-200 rounded-lg p-3 hover:shadow-lg transition-all bg-white ${
                                  isAdded ? 'opacity-60' : 'cursor-pointer'
                                }`}
                                onClick={() => {
                                  if (!isAdded) {
                                    setFormData(prev => ({
                                      ...prev,
                                      items: [...prev.items, {
                                        skuId: null,
                                        bundleId: b.bundleId,
                                        productName: b.bundleName,
                                        packaging: b.packaging || '',
                                        spec: b.spec || '',
                                        price: b.price,
                                        quantity: 1,
                                      }]
                                    }));
                                  }
                                }}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <Package className="w-4 h-4 text-purple-500" />
                                  <span className="font-bold text-sm">{b.bundleName}</span>
                                </div>
                                <div className="text-lg font-bold text-purple-600 mb-2">
                                  ¥{Number(b.price).toFixed(2)}
                                </div>
                                {b.items && b.items.length > 0 && (
                                  <div className="text-xs text-purple-700 bg-purple-50 rounded p-2 mb-2 max-h-20 overflow-y-auto">
                                    {b.items.map((item: any, idx: number) => (
                                      <div key={idx} className="flex justify-between py-0.5">
                                        <span className="truncate">{item.productName} {item.spec}/{item.packaging}</span>
                                        <span className="font-medium ml-1">×{item.quantity}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500">库存 {b.totalAvailable}</span>
                                  <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                                    isAdded ? 'bg-gray-200 text-gray-500' : 'bg-purple-100 text-purple-700'
                                  }`}>
                                    {isAdded ? '✓' : '添加'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center text-gray-400 py-10">该主体暂无套装</div>
                      );
                    })()
                  ) : formData.warehouseId ? (
                    <div className="space-y-2">
                      {itemType === 'product' ? (
                        products.filter(p => p.skus?.some(s => (s.stock || 0) > 0)).map(p => (
                          <div key={p.id} className="border rounded-lg p-3">
                            <div className="font-medium text-sm mb-2">{p.name}</div>
                            <div className="flex flex-wrap gap-1.5">
                              {p.skus?.filter(s => (s.stock || 0) > 0).map(s => {
                                const isAdded = formData.items.some(item => item.skuId === s.id);
                                return (
                                  <button
                                    key={s.id}
                                    type="button"
                                    disabled={isAdded}
                                    onClick={() => {
                                      if (!isAdded) {
                                        setFormData(prev => ({
                                          ...prev,
                                          items: [...prev.items, {
                                            skuId: s.id,
                                            bundleId: null,
                                            productName: p.name,
                                            packaging: s.packaging,
                                            spec: s.spec,
                                            price: Number(s.price),
                                            quantity: 1,
                                          }]
                                        }));
                                      }
                                    }}
                                    className={`px-2 py-1 text-xs rounded border transition-colors ${
                                      isAdded
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                                        : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                    }`}
                                  >
                                    {s.spec || '-'} / {s.packaging || '-'}  库存:{s.stock}
                                    {isAdded && ' ✓'}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))
                      ) : (
                        bundles.filter(b => (b.stock || 0) > 0).map(b => (
                          <div key={b.id} className="border rounded-lg p-3 hover:border-purple-300 transition-colors flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm">{b.name}</div>
                              <div className="text-xs text-gray-500">{b.packaging} {b.spec} 库存 {b.stock}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const existing = formData.items.find(item => item.bundleId === b.id);
                                if (!existing) {
                                  setFormData(prev => ({
                                    ...prev,
                                    items: [...prev.items, {
                                      skuId: null,
                                      bundleId: b.id,
                                      productName: b.name,
                                      packaging: b.packaging,
                                      spec: b.spec,
                                      price: Number(b.price),
                                      quantity: 1,
                                    }]
                                  }));
                                }
                              }}
                              disabled={formData.items.some(item => item.bundleId === b.id)}
                              className={`px-3 py-1 text-xs rounded ${
                                formData.items.some(item => item.bundleId === b.id)
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                              }`}
                            >
                              {formData.items.some(item => item.bundleId === b.id) ? '已添加' : '添加'}
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 py-10">请先选择主体查看可用商品</div>
                  )}
                </div>
              </div>

              {/* 右侧 - 订单信息 */}
              <div className="w-1/2 flex flex-col">
                <div className="p-4 border-b bg-gray-50">
                  <div className="text-sm font-medium text-gray-700 mb-3">收货人信息</div>
                  {!editingId && (
                    <div className="mb-3">
                      <div className="flex gap-4 mb-3">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="customerType"
                            checked={customerType === 'RETAIL'}
                            onChange={() => {
                              setCustomerType('RETAIL');
                              setSelectedCustomerId('');
                              setFormData(prev => ({ ...prev, receiver: '', phone: '', province: '', city: '', address: '', contractDiscount: undefined }));
                            }}
                          />
                          <span className="text-sm">自然人订单</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="customerType"
                            checked={customerType === 'CORPORATE'}
                            onChange={() => setCustomerType('CORPORATE')}
                          />
                          <span className="text-sm">大客户订单</span>
                        </label>
                      </div>
                      {customerType === 'CORPORATE' && (
                        <select
                          value={selectedCustomerId}
                          onChange={(e) => setSelectedCustomerId(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-100"
                          disabled={!!editingId}
                        >
                          <option value="">选择客户</option>
                          {customers.map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                  {formData.contractDiscount && (
                    <div className="mb-3 text-sm text-green-600 bg-green-50 px-3 py-2 rounded">
                      已应用客户折扣：{formData.contractDiscount * 10}折
                    </div>
                  )}
                  {customerType !== 'CORPORATE' && (
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <input
                        type="text"
                        value={formData.receiver}
                        onChange={(e) => setFormData({ ...formData, receiver: e.target.value })}
                        placeholder="收货人"
                        className="px-3 py-2 border rounded-lg text-sm"
                        required
                      />
                      <PhoneInput
                        value={formData.phone}
                        onChange={(val) => setFormData({ ...formData, phone: val })}
                        className="px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                  )}
                  {customerType !== 'CORPORATE' ? (
                    <div className="mb-3">
                      <label className="block text-sm font-medium mb-1">配送地址</label>
                      <AddressInput
                        value={{
                          province: formData.province,
                          city: formData.city,
                          address: formData.address,
                          latitude: formData.latitude,
                          longitude: formData.longitude,
                        }}
                        onChange={(val) => setFormData({
                          ...formData,
                          province: val.province || '',
                          city: val.city || '',
                          address: val.address || '',
                          latitude: val.latitude || '',
                          longitude: val.longitude || '',
                        })}
                      />
                    </div>
                  ) : selectedCustomerId ? (
                    <div className="px-3 py-1.5 bg-gray-50 rounded text-sm">
                      <span className="text-gray-500">配送至：</span>
                      <span className="font-medium text-gray-800">{formData.receiver}</span>
                      <span className="mx-2 text-gray-400">|</span>
                      <span className="text-gray-600">{formatPhone(formData.phone)}</span>
                      <span className="mx-2 text-gray-400">|</span>
                      <span className="text-gray-500">{formatAddress(formData.province, formData.city, formData.address)}</span>
                    </div>
                  ) : null}
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">已选商品 ({formData.items.length})</div>
                  {formData.items.length === 0 ? (
                    <div className="text-center text-gray-400 py-8 bg-gray-50 rounded-lg">
                      暂无商品，请从左侧添加
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {formData.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 border rounded-lg">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{item.productName}</div>
                            <div className="text-xs text-gray-500">{item.packaging} {item.spec}</div>
                          </div>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const maxStock = item.skuId
                                ? ownerStockSummary?.products?.find((p: any) => p.skuId === item.skuId)?.totalAvailable || 999
                                : ownerStockSummary?.bundles?.find((b: any) => b.bundleId === item.bundleId)?.totalAvailable || 999;
                              const qty = Math.min(Math.max(parseInt(e.target.value) || 1, 1), maxStock);
                              const newItems = [...formData.items];
                              newItems[idx].quantity = qty;
                              setFormData({ ...formData, items: newItems });
                            }}
                            className="w-16 px-2 py-1 border rounded text-sm text-center"
                            disabled={!!editingId}
                          />
                          <div className="w-20 text-right text-sm font-medium">¥{item.price * item.quantity}</div>
                          <button
                            type="button"
                            onClick={() => {
                              const newItems = formData.items.filter((_, i) => i !== idx);
                              setFormData({ ...formData, items: newItems });
                            }}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                            disabled={!!editingId}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t p-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      {formData.contractDiscount && formData.contractDiscount < 1 && (
                        <div className="text-sm text-gray-500 mb-1">
                          原价: ¥{formData.items.reduce((sum, item) => sum + item.price * item.quantity, 0).toLocaleString()} × {formData.contractDiscount * 10}折
                        </div>
                      )}
                      <span className="text-sm text-gray-600">应付: </span>
                      <span className="text-xl font-bold text-primary-600">¥{(formData.items.reduce((sum, item) => sum + item.price * item.quantity, 0) * (formData.contractDiscount || 1)).toLocaleString()}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setShowModal(false); resetForm(); }}
                        className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-100"
                      >
                        取消
                      </button>
                      <button
                        type="submit"
                        disabled={formData.items.length === 0}
                        className="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        创建订单
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}


      {splitPreview?.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">订单将拆分为多个仓库</h3>
            <div className="space-y-4 mb-6 max-h-60 overflow-y-auto">
              {Object.entries(splitPreview.allocations).map(([warehouseName, items]) => (
                <div key={warehouseName} className="border rounded-lg p-3">
                  <div className="font-medium text-blue-600 mb-2">{warehouseName}</div>
                  {items.map((item: any, idx: number) => (
                    <div key={idx} className="text-sm text-gray-600 flex justify-between">
                      <span>{item.productName} × {item.quantity}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="text-sm text-gray-500 mb-4">
              共 {Object.keys(splitPreview.allocations).length} 个仓库，{formData.items.length} 件商品
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSplitPreview(null)}
                className="flex-1 px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  setSplitPreview(null);
                  submitOrder();
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                确认创建
              </button>
            </div>
          </div>
        </div>
      )}

      {importPreviewData && (
        <ImportPreviewModal
          fileData={importPreviewData}
          owners={owners}
          warehouses={warehouses}
          customers={customers}
          onConfirm={handleImportConfirm}
          onCancel={() => setImportPreviewData(null)}
        />
      )}

    </div>
  );
}
