import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { orderApi, ownerApi, productApi, warehouseApi, geocodeApi, bundleApi } from '../api';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Plus, Pencil, Trash2, X, Loader2, Filter, ShoppingCart, Package, Truck, CheckCircle, Upload, Download, Ban, PackageCheck } from 'lucide-react';
import RegionPicker from '../components/RegionPicker';


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
  OUTBOUND_REVIEW: '出库审核中',
  DISPATCHING: '待运力调度',
  DISPATCHED: '已调度',
  IN_TRANSIT: '运输中',
  DELIVERED: '已送达',
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
  { value: 'CANCELLED', label: '已取消' },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ orderNo: '', ownerId: '', status: '', startDate: '', endDate: '' });
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
  });
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedSku, setSelectedSku] = useState('');
  const [selectedBundle, setSelectedBundle] = useState('');
  const [itemType, setItemType] = useState<'product' | 'bundle'>('product');
  const [bundles, setBundles] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const exportData: any[] = [];
    
    orders.forEach(order => {
      order.items.forEach((item, idx) => {
        exportData.push({
          '订单编号': order.orderNo,
          '货主': order.owner.name,
          '收货人': order.receiver,
          '手机号': order.phone,
          '收货地址': `${order.province || ''}${order.city || ''}${order.address}`,
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

        let successCount = 0;
        let errorCount = 0;

        for (const { orderNo, rows } of ordersToImport) {
          const firstRow = rows[0];

          const owner = owners.find(o => o.name === firstRow['货主']);
          if (!owner) {
            errorCount++;
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
            const res = await productApi.list({ name: item.productName });
            const products = res.data.data || [];
            for (const product of products) {
              const sku = product.skus?.find((s: any) => s.packaging === item.packaging && s.spec === item.spec);
              if (sku) {
                return {
                  skuId: sku.id,
                  productName: item.productName,
                  packaging: item.packaging,
                  spec: item.spec,
                  price: item.price,
                  quantity: item.quantity,
                };
              }
            }
            return null;
          });

          const skuItems = await Promise.all(skuPromises);
          const validItems = skuItems.filter(item => item !== null);

          if (validItems.length === 0) {
            errorCount++;
            continue;
          }

          try {
            const statusText = firstRow['状态'];
            const statusMapReverse: Record<string, string> = {
              '待拣货': 'PENDING',
              '拣货中': 'PICKING',
              '出库审核中': 'OUTBOUND_REVIEW',
              '待运力调度': 'DISPATCHING',
              '已调度': 'DISPATCHED',
              '运输中': 'IN_TRANSIT',
              '已送达': 'DELIVERED',
              '已取消': 'CANCELLED',
            };
            const status = statusMapReverse[statusText] || 'PENDING';

            await orderApi.create({
              orderNo: orderNo || undefined,
              ownerId: owner.id,
              receiver: firstRow['收货人'],
              phone: firstRow['手机号'],
              address: firstRow['收货地址'],
              items: validItems,
              status,
            });
            successCount++;
          } catch (err) {
            errorCount++;
          }
        }

        if (successCount > 0) {
          fetchOrders();
        }
        
        toast.success(`导入完成：成功 ${successCount} 条，失败 ${errorCount} 条`);
      } catch (error) {
        toast.error('导入失败，请检查文件格式');
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
    if (!formData.ownerId || !formData.warehouseId || !formData.receiver || !formData.phone || !formData.province || !formData.city || !formData.address || formData.items.length === 0) {
      toast.error('请填写完整信息');
      return;
    }

    try {
      const data = {
        ...formData,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
      };
      await orderApi.create(data);
      toast.success('订单创建成功');
      setShowModal(false);
      resetForm();
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
    if (!confirm('确定要删除该订单吗？')) return;
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
      ownerId: '',
      warehouseId: '',
      receiver: '',
      phone: '',
      province: '',
      city: '',
      address: '',
      latitude: '',
      longitude: '',
      items: [],
    });
    setSelectedProduct('');
    setSelectedSku('');
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
              <label className="block text-sm font-medium text-gray-700 mb-1">货主</label>
              <select
                value={filters.ownerId}
                onChange={(e) => setFilters({ ...filters, ownerId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">全部</option>
                {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
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
                onClick={() => { setFilters({ orderNo: '', ownerId: '', status: '', startDate: '', endDate: '' }); fetchOrders(); }}
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
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">订单编号</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">下单时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">货主</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">收货人</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">收货地址</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">商品总数</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">总金额</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link to={`/orders/${order.id}`} className="text-primary-600 hover:text-primary-800 hover:underline">
                      {order.orderNo}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.owner.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.receiver} {order.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.province}{order.city}{order.address}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-600 font-medium">¥{Number(order.totalAmount).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'PICKING' ? 'bg-orange-100 text-orange-800' :
                      (order.status === 'OUTBOUND_REVIEW') ? 'bg-purple-100 text-purple-800' :
                      order.status === 'DISPATCHING' ? 'bg-indigo-100 text-indigo-800' :
                      order.status === 'DISPATCHED' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'IN_TRANSIT' ? 'bg-purple-100 text-purple-800' :
                      order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {statusMap[order.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    {order.status === 'PENDING' && (
                      <button
                        onClick={() => handleStatusChange(order.id, getNextStatus(order.status)!)}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg mr-2"
                        title={getStatusButtonText(order.status)}
                      >
                        <PackageCheck className="w-4 h-4" />
                      </button>
                    )}
                    {(order.status === 'DISPATCHING' || order.status === 'DISPATCHED') && (
                      <button
                        onClick={() => handleStatusChange(order.id, getNextStatus(order.status)!)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg mr-2"
                        title={getStatusButtonText(order.status)}
                      >
                        <Truck className="w-4 h-4" />
                      </button>
                    )}
                    {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && 
                     order.status !== 'DISPATCHING' && order.status !== 'DISPATCHED' && 
                     order.status !== 'IN_TRANSIT' && order.status !== 'DELIVERED' && (
                      <button
                        onClick={() => handleStatusChange(order.id, 'CANCELLED')}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                        title="取消"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    )}
                    {order.status === 'CANCELLED' && (
                      <button
                        onClick={() => handleDelete(order.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
              <h2 className="text-lg font-bold">新建订单</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 hover:bg-gray-200 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex h-[calc(90vh-60px)]">
              {/* 左侧 - 商品选择 */}
              <div className="w-1/2 border-r flex flex-col">
                <div className="p-4 border-b bg-gray-50">
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={formData.ownerId}
                      onChange={(e) => {
                        setFormData({ ...formData, ownerId: e.target.value, warehouseId: '', items: [] });
                      }}
                      className="px-3 py-2 border rounded-lg text-sm"
                      required
                    >
                      <option value="">选择货主</option>
                      {owners.filter(o => o.status !== 'STOPPED').map(o => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                    <select
                      value={formData.warehouseId}
                      onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value, items: [] })}
                      className="px-3 py-2 border rounded-lg text-sm"
                      required
                    >
                      <option value="">选择仓库</option>
                      {(formData.ownerId ? (owners.find(o => o.id === formData.ownerId)?.warehouses || []) : warehouses).map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {formData.warehouseId && (
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

                <div className="flex-1 overflow-y-auto p-3">
                  {formData.warehouseId ? (
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
                    <div className="text-center text-gray-400 py-10">请先选择货主和仓库</div>
                  )}
                </div>
              </div>

              {/* 右侧 - 订单信息 */}
              <div className="w-1/2 flex flex-col">
                <div className="p-4 border-b bg-gray-50">
                  <div className="text-sm font-medium text-gray-700 mb-3">收货人信息</div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <input
                      type="text"
                      value={formData.receiver}
                      onChange={(e) => setFormData({ ...formData, receiver: e.target.value })}
                      placeholder="收货人"
                      className="px-3 py-2 border rounded-lg text-sm"
                      required
                    />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="手机号"
                      className="px-3 py-2 border rounded-lg text-sm"
                      required
                    />
                  </div>
                  <div className="mb-3 flex gap-2">
                    <div className="w-1/3">
                      <RegionPicker
                        value={{ province: formData.province, city: formData.city }}
                        onChange={(val) => setFormData({ 
                          ...formData, 
                          province: val.province || '', 
                          city: val.city || '' 
                        })}
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="详细地址"
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        required
                      />
                      {formData.latitude && formData.longitude && (
                        <p className="text-xs text-green-600 mt-1">已获取: {formData.latitude}, {formData.longitude}</p>
                      )}
                    </div>
                  </div>
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
                              const qty = parseInt(e.target.value) || 1;
                              const newItems = [...formData.items];
                              newItems[idx].quantity = qty;
                              setFormData({ ...formData, items: newItems });
                            }}
                            className="w-16 px-2 py-1 border rounded text-sm text-center"
                          />
                          <div className="w-20 text-right text-sm font-medium">¥{item.price * item.quantity}</div>
                          <button
                            type="button"
                            onClick={() => {
                              const newItems = formData.items.filter((_, i) => i !== idx);
                              setFormData({ ...formData, items: newItems });
                            }}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
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
                      <span className="text-sm text-gray-600">总金额: </span>
                      <span className="text-xl font-bold text-primary-600">¥{formData.items.reduce((sum, item) => sum + item.price * item.quantity, 0).toLocaleString()}</span>
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


    </div>
  );
}
