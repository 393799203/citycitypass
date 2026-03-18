import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { orderApi, ownerApi, productApi, warehouseApi, geocodeApi } from '../api';
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
  skuId: string;
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
      fetch(`/api/products?warehouseId=${formData.warehouseId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setProducts(data.data);
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">新建订单</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    货主 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.ownerId}
                    onChange={(e) => {
                      setFormData({ ...formData, ownerId: e.target.value, warehouseId: '', items: [] });
                    }}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    <option value="">请选择货主</option>
                    {owners.filter(o => o.status !== 'STOPPED').map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    发货仓库 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.warehouseId}
                    onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value, items: [] })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    <option value="">请选择仓库</option>
                    {(formData.ownerId ? (owners.find(o => o.id === formData.ownerId)?.warehouses || []) : warehouses).map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                {formData.warehouseId && products.length > 0 && (
                    <div className="col-span-2 bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Package className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="w-full">
                          <div className="text-sm font-medium text-gray-700 mb-2">仓库可售商品</div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead className="bg-blue-100">
                                <tr>
                                  <th className="px-2 py-1 text-left">商品</th>
                                  <th className="px-2 py-1 text-left">规格</th>
                                  <th className="px-2 py-1 text-left">包装</th>
                                  <th className="px-2 py-1 text-right">可售库存</th>
                                </tr>
                              </thead>
                              <tbody>
                                {products.slice(0, 8).map((p: any) => (
                                  p.skus?.filter((s: any) => (s.stock || 0) > 0).map((s: any) => (
                                    <tr key={s.id} className="border-t border-blue-200">
                                      <td className="px-2 py-1">{p.name}</td>
                                      <td className="px-2 py-1">{s.spec || '-'}</td>
                                      <td className="px-2 py-1">{s.packaging || '-'}</td>
                                      <td className="px-2 py-1 text-right">{s.stock || 0}</td>
                                    </tr>
                                  ))
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {products.length > 8 && (
                            <div className="mt-2 text-xs text-gray-500">+{products.length - 8} 更多商品</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
              </div>

              <div className="border-t pt-4">
                  <h3 className="font-medium text-gray-800 mb-3">收货人信息</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        收货人 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.receiver}
                        onChange={(e) => setFormData({ ...formData, receiver: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="请输入收货人姓名"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        手机号 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="请输入手机号"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        省市区 <span className="text-red-500">*</span>
                      </label>
                      <RegionPicker
                        value={{ province: formData.province, city: formData.city }}
                        onChange={(val) => setFormData({ 
                          ...formData, 
                          province: val.province || '', 
                          city: val.city || '' 
                        })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        详细地址 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        onBlur={async () => {
                          if (formData.address && formData.city) {
                            try {
                              const fullAddress = `${formData.province}${formData.city}${formData.address}`;
                              const res = await geocodeApi.geocode(fullAddress);
                              if (res.data.success) {
                                setFormData(prev => ({
                                  ...prev,
                                  latitude: res.data.data.latitude.toString(),
                                  longitude: res.data.data.longitude.toString(),
                                }));
                              }
                            } catch (e) {
                              // ignore
                            }
                          }
                        }}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="请输入详细地址，如：xxx街道xxx号"
                        required
                      />
                      {formData.latitude && formData.longitude && (
                        <p className="text-xs text-green-600 mt-1">
                          已获取经纬度: {formData.latitude}, {formData.longitude}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium text-gray-800 mb-3">商品清单</h3>
                  <div className="flex gap-4 mb-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">选择商品</label>
                    <select
                      value={selectedProduct}
                      onChange={(e) => { setSelectedProduct(e.target.value); setSelectedSku(''); }}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">请选择商品</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.brand.name})</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">选择规格</label>
                    <select
                      value={selectedSku}
                      onChange={(e) => setSelectedSku(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                      disabled={!selectedProduct}
                    >
                      <option value="">请选择规格</option>
                      {selectedProductSkus.map(sku => (
                        <option key={sku.id} value={sku.id}>
                          {sku.packaging} {sku.spec} - ¥{sku.price}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={addItem}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                      添加
                    </button>
                  </div>
                </div>

                {formData.items.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">商品</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">规格</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">单价</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">数量</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">小计</th>
                          <th className="px-4 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {formData.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-sm">{item.productName}</td>
                            <td className="px-4 py-2 text-sm">{item.packaging} {item.spec}</td>
                            <td className="px-4 py-2 text-sm">¥{item.price}</td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateQuantity(idx, parseInt(e.target.value) || 1)}
                                className="w-20 px-2 py-1 border rounded text-sm"
                              />
                            </td>
                            <td className="px-4 py-2 text-sm text-primary-600 font-medium">
                              ¥{item.price * item.quantity}
                            </td>
                            <td className="px-4 py-2">
                              <button
                                type="button"
                                onClick={() => removeItem(idx)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="bg-gray-50 px-4 py-3 text-right">
                      <span className="text-lg font-medium">总金额: </span>
                      <span className="text-xl font-bold text-primary-600">¥{getTotalAmount().toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  创建订单
                </button>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
}
