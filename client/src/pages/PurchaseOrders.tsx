import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useOwnerStore } from '../stores/owner';
import { purchaseOrderApi, supplierApi, warehouseApi, productApi, bundleApi, supplierProductApi, supplierMaterialApi } from '../api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Plus, Search, X, Package, Truck, Check, Eye, Trash2, Edit2, Loader2, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { useConfirm } from '../components/ConfirmProvider';
import InboundOrderModal from '../components/InboundOrderModal';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: '待确认', color: 'bg-yellow-100 text-yellow-700' },
  CONFIRMED: { label: '已确认', color: 'bg-blue-100 text-blue-700' },
  PARTIAL: { label: '部分到货', color: 'bg-orange-100 text-orange-700' },
  ARRIVED: { label: '已到货', color: 'bg-green-100 text-green-700' },
  CANCELLED: { label: '已取消', color: 'bg-gray-100 text-gray-500' },
};

interface PurchaseItem {
  id?: string;
  itemType: 'PRODUCT' | 'BUNDLE' | 'MATERIAL' | 'OTHER';
  skuId?: string;
  bundleId?: string;
  quantity: number;
  price?: number;
  amount?: number;
  sku?: any;
  bundle?: any;
  productName?: string;
  bundleName?: string;
  spec?: string;
  packaging?: string;
  name?: string;
  unit?: string;
  supplierMaterialId?: string;
  supplierMaterial?: {
    id: string;
    name: string;
    unit?: string;
    price?: number;
    category: string;
  };
}

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentOwnerId } = useOwnerStore();
  const { confirm } = useConfirm();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewingOrder, setViewingOrder] = useState<any>(null);

  const [showModal, setShowModal] = useState(false);
  const [showInboundModal, setShowInboundModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    supplierId: '',
    orderDate: format(new Date(), 'yyyy-MM-dd'),
    expectedDate: '',
    remark: '',
  });
  const [formItems, setFormItems] = useState<PurchaseItem[]>([]);
  const [saving, setSaving] = useState(false);

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [bundles, setBundles] = useState<any[]>([]);
  const [customItems, setCustomItems] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [filteredBundles, setFilteredBundles] = useState<any[]>([]);
  const [productType, setProductType] = useState<'SKU' | 'BUNDLE' | 'MATERIAL' | 'OTHER'>('SKU');
  const [selectedSkuId, setSelectedSkuId] = useState('');
  const [selectedBundleId, setSelectedBundleId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [listKeyword, setListKeyword] = useState('');

  useEffect(() => {
    fetchOrders();
  }, [page, currentOwnerId, filterStatus]);

  useEffect(() => {
    if (id) {
      loadOrderDetail(id);
    } else {
      setViewingOrder(null);
    }
  }, [id]);

  useEffect(() => {
    loadSuppliers();
  }, [currentOwnerId]);

  useEffect(() => {
    if (formData.supplierId) {
      loadProducts(formData.supplierId);
    } else {
      setProducts([]);
      setBundles([]);
      setFilteredProducts([]);
      setFilteredBundles([]);
    }
  }, [formData.supplierId, suppliers]);

  useEffect(() => {
    if (productType === 'SKU') {
      const kw = searchKeyword.toLowerCase();
      if (kw) {
        setFilteredProducts(products.filter((p: any) =>
          p.productName?.toLowerCase().includes(kw) ||
          p.spec?.toLowerCase().includes(kw) ||
          p.packaging?.toLowerCase().includes(kw) ||
          p.skuCode?.toLowerCase().includes(kw)
        ));
      } else {
        setFilteredProducts(products);
      }
    } else {
      const kw = searchKeyword.toLowerCase();
      if (kw) {
        setFilteredBundles(bundles.filter((b: any) =>
          b.bundleName?.toLowerCase().includes(kw) ||
          b.spec?.toLowerCase().includes(kw) ||
          b.packaging?.toLowerCase().includes(kw)
        ));
      } else {
        setFilteredBundles(bundles);
      }
    }
  }, [searchKeyword, products, bundles, productType]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await purchaseOrderApi.list({
        page,
        pageSize: 20,
        ownerId: currentOwnerId || undefined,
        status: filterStatus || undefined,
      });
      if (res.data.success) {
        setOrders(res.data.data.data);
        setTotalPages(res.data.data.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrderDetail = async (id: string) => {
    try {
      const res = await purchaseOrderApi.get(id);
      if (res.data.success) {
        setViewingOrder(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch order detail:', error);
    }
  };

  const loadSuppliers = async () => {
    try {
      const res = await supplierApi.list();
      if (res.data.success) {
        setSuppliers(res.data.data.filter((s: any) => s.status !== 'STOPPED'));
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  };

  const loadProducts = async (supplierId: string) => {
    try {
      const [productRes, materialRes] = await Promise.all([
        supplierProductApi.getBySupplier(supplierId),
        supplierMaterialApi.getBySupplier(supplierId),
      ]);
      const products = productRes.data.data || [];
      const materials = materialRes.data.data || [];

      const productItems: any[] = [];
      const bundleItems: any[] = [];
      const customItemsData: any[] = [];
      let hasProduct = false;
      let hasBundle = false;
      let hasMaterial = false;
      let hasOther = false;

      products.forEach((p: any) => {
        if (p.itemType === 'PRODUCT' && p.sku) {
          hasProduct = true;
          productItems.push({
            type: 'product' as const,
            skuId: p.skuId,
            skuCode: p.sku.skuCode,
            productId: p.sku.productId,
            productName: p.sku.product?.name,
            bundleName: undefined,
            spec: p.sku.spec,
            packaging: p.sku.packaging,
            price: p.price,
            minQty: p.minQty,
            leadDays: p.leadDays,
          });
        } else if (p.itemType === 'BUNDLE' && p.bundle) {
          hasBundle = true;
          bundleItems.push({
            type: 'bundle' as const,
            bundleId: p.bundleId,
            skuCode: p.bundle.skuCode,
            productName: undefined,
            bundleName: p.bundle.name,
            price: p.price,
            spec: p.bundle.spec,
            packaging: p.bundle.packaging,
            minQty: p.minQty,
            leadDays: p.leadDays,
            items: (p.bundle.items || []).map((item: any) => ({
              productName: item.sku?.product?.name || '',
              spec: item.sku?.spec || '',
              packaging: item.sku?.packaging || '',
              quantity: item.quantity || 1,
            })),
          });
        }
      });

      materials.forEach((m: any) => {
        if (m.category === 'MATERIAL') {
          hasMaterial = true;
          customItemsData.push({
            type: 'MATERIAL' as const,
            supplierMaterialId: m.id,
            name: m.name,
            unit: m.unit || '',
            price: m.price,
            quantity: 1,
          });
        } else if (m.category === 'OTHER') {
          hasOther = true;
          customItemsData.push({
            type: 'OTHER' as const,
            supplierMaterialId: m.id,
            name: m.name,
            unit: m.unit || '',
            price: m.price,
            quantity: 1,
          });
        }
      });

      setProducts(productItems);
      setBundles(bundleItems);
      setCustomItems(customItemsData);
      setFilteredProducts(productItems);
      setFilteredBundles(bundleItems);

      const types: Array<'SKU' | 'BUNDLE' | 'MATERIAL' | 'OTHER'> = [];
      if (hasProduct) types.push('SKU');
      if (hasBundle) types.push('BUNDLE');
      if (hasMaterial) types.push('MATERIAL');
      if (hasOther) types.push('OTHER');
      if (types.length > 0) {
        setProductType(types[0]);
      }
    } catch (error) {
      console.error('Failed to fetch supplier products:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      supplierId: '',
      orderDate: format(new Date(), 'yyyy-MM-dd'),
      expectedDate: '',
      remark: '',
    });
    setFormItems([]);
    setSelectedSkuId('');
    setSelectedBundleId('');
    setQuantity(1);
    setSearchKeyword('');
    setProductType('SKU');
    setFilteredProducts(products);
    setFilteredBundles(bundles);
    setEditingId(null);
  };

  const handleOpenModal = (order?: any) => {
    if (order) {
      setEditingId(order.id);
      setFormData({
        supplierId: order.supplierId,
        orderDate: format(new Date(order.orderDate), 'yyyy-MM-dd'),
        expectedDate: order.expectedDate ? format(new Date(order.expectedDate), 'yyyy-MM-dd') : '',
        remark: order.remark || '',
      });
      setFormItems(order.items.map((item: any) => ({
        id: item.id,
        itemType: item.itemType,
        skuId: item.skuId,
        bundleId: item.bundleId,
        supplierMaterialId: item.supplierMaterialId,
        quantity: item.quantity,
        price: item.price,
        sku: item.sku,
        bundle: item.bundle,
        supplierMaterial: item.supplierMaterial,
        productName: item.sku?.product?.name || item.bundle?.name || item.supplierMaterial?.name,
        bundleName: item.bundle?.name,
        spec: item.sku?.spec || item.bundle?.spec,
        packaging: item.sku?.packaging || item.bundle?.packaging,
        unit: item.supplierMaterial?.unit,
      })));
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleAddItem = () => {
    const selected = productType === 'SKU'
      ? products.find(p => p.skuId === selectedSkuId)
      : bundles.find(b => b.bundleId === selectedBundleId);

    if (!selected) return;

    const existing = formItems.find(item =>
      item.skuId === selected.skuId && item.bundleId === selected.bundleId
    );
    if (existing) {
      toast.error('该商品已在清单中');
      return;
    }

    setFormItems([...formItems, {
      itemType: productType === 'SKU' ? 'PRODUCT' : 'BUNDLE',
      skuId: selected.skuId,
      bundleId: selected.bundleId,
      quantity,
      price: selected.price,
      sku: selected.sku,
      bundle: selected.bundle,
      productName: selected.productName || selected.bundleName,
      bundleName: selected.bundleName,
      spec: selected.spec,
      packaging: selected.packaging,
    }]);
    setSelectedSkuId('');
    setSelectedBundleId('');
    setQuantity(1);
    setSearchKeyword('');
  };

  const handleRemoveItem = (index: number) => {
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  const handleUpdateItemQuantity = (index: number, qty: number) => {
    setFormItems(formItems.map((item, i) => {
      if (i !== index) return item;
      return { ...item, quantity: qty, amount: (item.price || 0) * qty };
    }));
  };

  const handleSubmit = async () => {
    if (!formData.supplierId) {
      toast.error('请选择供应商');
      return;
    }
    if (formItems.length === 0) {
      toast.error('请添加采购商品');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        items: formItems.map(item => ({
          itemType: item.itemType,
          skuId: item.skuId,
          bundleId: item.bundleId,
          supplierMaterialId: item.supplierMaterialId,
          quantity: item.quantity,
          price: item.price,
        })),
      };

      if (editingId) {
        await purchaseOrderApi.update(editingId, payload);
        toast.success('采购单已更新');
      } else {
        await purchaseOrderApi.create(payload);
        toast.success('采购单已创建');
      }
      handleCloseModal();
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async (id: string) => {
    const ok = await confirm({ message: '确定要确认此采购单吗？' });
    if (!ok) return;
    try {
      await purchaseOrderApi.confirm(id);
      toast.success('采购单已确认');
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  const handleCancel = async (id: string) => {
    const ok = await confirm({ message: '确定要取消此采购单吗？' });
    if (!ok) return;
    try {
      await purchaseOrderApi.cancel(id);
      toast.success('采购单已取消');
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ message: '确定要删除此采购单吗？' });
    if (!ok) return;
    try {
      await purchaseOrderApi.delete(id);
      toast.success('采购单已删除');
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  const filteredOrders = orders.filter(order =>
    order.orderNo.toLowerCase().includes(listKeyword.toLowerCase()) ||
    order.supplier?.name?.toLowerCase().includes(listKeyword.toLowerCase())
  );

  const productGroups = filteredProducts.reduce<Record<string, any[]>>((acc, s) => {
    const name = s.productName || '';
    if (!acc[name]) acc[name] = [];
    acc[name].push(s);
    return acc;
  }, {});

  return (
    <div className="p-6">
      <ToastContainer />

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Truck className="w-7 h-7" />
          采购单 {id ? `- ${viewingOrder?.orderNo || '加载中...'}` : '管理'}
        </h1>
        {!id && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus className="w-4 h-4" />
            新建采购单
          </button>
        )}
      </div>
      <>
        <div className="flex gap-4 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={listKeyword}
                onChange={(e) => setListKeyword(e.target.value)}
                placeholder="搜索采购单号、供应商..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">全部状态</option>
              {Object.entries(STATUS_MAP).map(([value, { label }]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr className="text-center">
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">采购单号</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">供应商</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">商品数</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">总金额</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">下单日期</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">期望到货</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">状态</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      暂无采购记录
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono text-center">
                        <button
                          onClick={() => navigate(`/purchases/${order.id}`)}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {order.orderNo}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-center">{order.supplier?.name}</td>
                      <td className="px-4 py-3 text-sm text-center">{order.items?.length || 0}</td>
                      <td className="px-4 py-3 text-sm text-center">¥{order.totalAmount || 0}</td>
                      <td className="px-4 py-3 text-sm text-center">{format(new Date(order.orderDate), 'yyyy-MM-dd')}</td>
                      <td className="px-4 py-3 text-sm text-center">{order.expectedDate ? format(new Date(order.expectedDate), 'yyyy-MM-dd') : '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 text-xs rounded-full ${STATUS_MAP[order.status]?.color}`}>
                          {STATUS_MAP[order.status]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {order.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleOpenModal(order)}
                                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                              >
                                编辑
                              </button>
                              <button
                                onClick={() => handleConfirm(order.id)}
                                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                              >
                                确认
                              </button>
                              <button
                                onClick={() => handleDelete(order.id)}
                                className="px-2 py-1 text-xs text-red-600 hover:underline"
                              >
                                删除
                              </button>
                            </>
                          )}
                          {order.status === 'CONFIRMED' && (
                            <>
                              {order.inboundOrders?.find((io: any) => io.status !== 'CANCELLED') ? (
                                <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                                  已关联入库单
                                </span>
                              ) : (
                                <>
                                  <button
                                    onClick={async () => {
                                      try {
                                        const res = await purchaseOrderApi.get(order.id);
                                        if (res.data.success) {
                                          setViewingOrder(res.data.data);
                                          setShowInboundModal(true);
                                        }
                                      } catch (error) {
                                        toast.error('加载采购单详情失败');
                                      }
                                    }}
                                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                  >
                                    采购入库
                                  </button>
                                  <button
                                    onClick={() => handleCancel(order.id)}
                                    className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
                                  >
                                    取消
                                  </button>
                                </>
                              )}
                            </>
                          )}
                          {(order.status === 'PARTIAL' || order.status === 'ARRIVED') && order.inboundOrders?.find((io: any) => io.status !== 'CANCELLED') && (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                              已关联入库单
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                上一页
              </button>
              <span className="text-sm text-gray-500">
                第 {page} / {totalPages} 页
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                下一页
              </button>
            </div>
          )}
        </>
        {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{editingId ? '编辑采购单' : '新建采购单'}</h2>
              <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form className="flex">
              <div className="w-1/2 border-r flex flex-col max-h-[70vh]">
                <div className="p-4 border-b bg-gray-50">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1 px-1">供应商</label>
                      <select
                        value={formData.supplierId}
                        onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                        required
                        disabled={!!editingId}
                      >
                        <option value="">选择供应商</option>
                        {suppliers.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1 px-1">期望到货日期</label>
                      <input
                        type="date"
                        value={formData.expectedDate}
                        onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex border-b bg-gray-50">
                  {products.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { setProductType('SKU'); setSelectedBundleId(''); setFilteredProducts(products); }}
                      className={`flex-1 py-2.5 text-sm font-medium border-b-2 ${
                        productType === 'SKU' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'
                      }`}
                    >
                      商品
                    </button>
                  )}
                  {bundles.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { setProductType('BUNDLE'); setSelectedSkuId(''); setFilteredBundles(bundles); }}
                      className={`flex-1 py-2.5 text-sm font-medium border-b-2 ${
                        productType === 'BUNDLE' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500'
                      }`}
                    >
                      套装
                    </button>
                  )}
                  {customItems.filter(c => c.type === 'MATERIAL').length > 0 && (
                    <button
                      type="button"
                      onClick={() => setProductType('MATERIAL')}
                      className={`flex-1 py-2.5 text-sm font-medium border-b-2 ${
                        productType === 'MATERIAL' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500'
                      }`}
                    >
                      原材料
                    </button>
                  )}
                  {customItems.filter(c => c.type === 'OTHER').length > 0 && (
                    <button
                      type="button"
                      onClick={() => setProductType('OTHER')}
                      className={`flex-1 py-2.5 text-sm font-medium border-b-2 ${
                        productType === 'OTHER' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500'
                      }`}
                    >
                      其他
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 px-4 py-2 border-b bg-gray-50">
                  <Search className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={productType === 'SKU' ? "搜索商品..." : productType === 'BUNDLE' ? "搜索套装..." : "搜索..."}
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                  />
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                  {productType === 'SKU' && (
                    <>
                      {Object.entries(productGroups).length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm">
                          {formData.supplierId ? '暂无商品' : '请先选择供应商'}
                        </div>
                      ) : (
                        Object.entries(productGroups).map(([productName, skus]) => (
                          <div key={productName} className="mb-3">
                            <div className="text-xs font-medium text-gray-500 mb-1.5 px-1">{productName}</div>
                            <div className="grid grid-cols-2 gap-1.5">
                              {skus.map((sku: any) => (
                                <div
                                  key={sku.skuId}
                                  onClick={() => {
                                    const newItem = {
                                      itemType: 'PRODUCT' as const,
                                      skuId: sku.skuId,
                                      bundleId: undefined,
                                      quantity: 1,
                                      price: sku.price,
                                      productName: sku.productName,
                                      spec: sku.spec,
                                      packaging: sku.packaging,
                                    };
                                    const existing = formItems.find(item => item.skuId === sku.skuId);
                                    if (!existing) {
                                      setFormItems([...formItems, newItem]);
                                    }
                                  }}
                                  className="p-2 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all text-xs bg-white"
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0">
                                      <div className="text-gray-700 truncate">{sku.spec}</div>
                                      <div className="text-gray-400 text-xs">{sku.packaging}</div>
                                    </div>
                                    {sku.price && (
                                      <div className="text-green-600 font-medium ml-1 shrink-0">¥{sku.price}</div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </>
                  )}

                  {productType === 'BUNDLE' && (
                    <>
                      {(filteredBundles || []).length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm">
                          {formData.supplierId ? '暂无套装' : '请先选择供应商'}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-1.5">
                          {filteredBundles.map((bundle: any) => (
                            <div
                              key={bundle.bundleId}
                              onClick={() => {
                                const newItem = {
                                  itemType: 'BUNDLE' as const,
                                  skuId: undefined,
                                  bundleId: bundle.bundleId,
                                  quantity: 1,
                                  price: bundle.price,
                                  productName: bundle.bundleName,
                                  bundleName: bundle.bundleName,
                                  spec: bundle.spec,
                                  packaging: bundle.packaging,
                                };
                                const existing = formItems.find(item => item.bundleId === bundle.bundleId);
                                if (!existing) {
                                  setFormItems([...formItems, newItem]);
                                }
                              }}
                              className="p-2 border border-purple-200 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-all text-xs bg-white"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-purple-600 truncate">{bundle.bundleName}</div>
                                  {bundle.spec && <div className="text-gray-400 text-xs truncate">{bundle.spec} {bundle.packaging && `/ ${bundle.packaging}`}</div>}
                                </div>
                                {bundle.price && (
                                  <div className="text-green-600 font-medium ml-1 shrink-0">¥{bundle.price}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {(productType === 'MATERIAL' || productType === 'OTHER') && (
                    <>
                      {customItems.filter(c => c.type === productType && (!searchKeyword || c.name.toLowerCase().includes(searchKeyword.toLowerCase()))).length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm">
                          {searchKeyword ? '无匹配结果' : '暂无可选项目'}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-1.5">
                          {customItems.filter(c => c.type === productType && (!searchKeyword || c.name.toLowerCase().includes(searchKeyword.toLowerCase()))).map((item: any, idx: number) => (
                            <div
                              key={idx}
                              onClick={() => {
                                const newItem = {
                                  itemType: productType as 'MATERIAL' | 'OTHER',
                                  skuId: undefined,
                                  bundleId: undefined,
                                  supplierMaterialId: item.supplierMaterialId,
                                  quantity: 1,
                                  price: item.price,
                                  name: item.name,
                                  unit: item.unit,
                                };
                                const existing = formItems.find(i => i.supplierMaterialId === item.supplierMaterialId && i.itemType === newItem.itemType);
                                if (!existing) {
                                  setFormItems([...formItems, newItem]);
                                }
                              }}
                              className={`p-2 border rounded-lg cursor-pointer transition-all text-xs bg-white ${
                                productType === 'MATERIAL'
                                  ? 'border-green-200 hover:border-green-500 hover:bg-green-50'
                                  : 'border-orange-200 hover:border-orange-500 hover:bg-orange-50'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                  <div className={`font-medium truncate ${
                                    productType === 'MATERIAL' ? 'text-green-600' : 'text-orange-600'
                                  }`}>{item.name}</div>
                                  {item.unit && <div className="text-gray-400 text-xs">({item.unit})</div>}
                                </div>
                                {item.price && (
                                  <div className="text-green-600 font-medium ml-1 shrink-0">¥{item.price}/{item.unit || '单位'}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>


              </div>

              <div className="w-1/2 flex flex-col max-h-[70vh]">
                <div className="p-4 border-b bg-gray-50">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">采购清单</span>
                    <span className="text-xs text-gray-500">
                      {formItems.length} 个商品
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {formItems.length === 0 ? (
                    <div className="text-center text-gray-400 py-8 bg-gray-50 rounded-lg">
                      暂无商品，请从左侧添加
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {formItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`px-1.5 py-0.5 text-xs rounded font-medium ${
                                item.itemType === 'BUNDLE' ? 'bg-purple-100 text-purple-600' :
                                item.itemType === 'MATERIAL' ? 'bg-green-100 text-green-600' :
                                item.itemType === 'OTHER' ? 'bg-orange-100 text-orange-600' :
                                'bg-blue-100 text-blue-600'
                              }`}>
                                {item.itemType === 'BUNDLE' ? '套装' : item.itemType === 'MATERIAL' ? '原材料' : item.itemType === 'OTHER' ? '其他' : '商品'}
                              </span>
                              <span className="font-medium truncate max-w-32">
                                {item.itemType === 'BUNDLE' ? item.bundleName :
                                 item.itemType === 'MATERIAL' || item.itemType === 'OTHER' ? (item.supplierMaterial?.name || item.name) :
                                 item.productName}
                              </span>
                              {item.itemType === 'MATERIAL' || item.itemType === 'OTHER' ? (
                                <span className="text-xs text-gray-500">({item.supplierMaterial?.unit || item.unit || '-'})</span>
                              ) : (
                                <span className="text-xs text-gray-500 whitespace-nowrap">
                                  {item.spec}{item.spec && item.packaging ? '/' : ''}{item.packaging}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleUpdateItemQuantity(idx, Math.max(1, item.quantity - 1)); }}
                                className="w-6 h-6 flex items-center justify-center border rounded hover:bg-gray-100"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => { e.stopPropagation(); handleUpdateItemQuantity(idx, parseInt(e.target.value) || 1); }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-14 px-1 py-1 border rounded text-center text-sm"
                              />
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleUpdateItemQuantity(idx, item.quantity + 1); }}
                                className="w-6 h-6 flex items-center justify-center border rounded hover:bg-gray-100"
                              >
                                +
                              </button>
                            </div>
                            {item.price && (
                              <span className="text-green-600 text-xs whitespace-nowrap text-right">
                                ¥{(item.price * item.quantity).toFixed(0)}
                              </span>
                            )}
                            <button type="button" onClick={(e) => { e.stopPropagation(); handleRemoveItem(idx); }} className="text-red-500 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 border-t bg-gray-50">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-medium">总计</span>
                    <span className="text-lg text-green-600 font-bold">
                      ¥{formItems.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0).toFixed(2)}
                    </span>
                  </div>
                  <textarea
                    value={formData.remark}
                    onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    rows={2}
                    placeholder="添加备注..."
                  />
                </div>
              </div>
            </form>

            <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || formItems.length === 0}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showInboundModal && viewingOrder && (
        <InboundOrderModal
          open={showInboundModal}
          source="PURCHASE"
          purchaseOrderId={viewingOrder.id}
          orderNo={viewingOrder.orderNo}
          defaultItems={(viewingOrder.items || []).map((item: any) => ({
            type: item.itemType,
            skuId: item.skuId,
            bundleId: item.bundleId,
            productName: item.sku?.product?.name || item.bundle?.name || '',
            spec: item.sku?.spec || item.bundle?.spec || '',
            packaging: item.sku?.packaging || item.bundle?.packaging || '',
            quantity: item.quantity,
          }))}
          onClose={() => {
            setShowInboundModal(false);
            setViewingOrder(null);
          }}
          onSuccess={() => {
            toast.success('入库单创建成功');
            setShowInboundModal(false);
            setViewingOrder(null);
            navigate('/inbound');
          }}
        />
      )}
    </div>
  );
}
