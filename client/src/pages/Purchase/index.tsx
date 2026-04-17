import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useOwnerStore } from '../../stores/owner';
import { purchaseOrderApi, supplierApi, supplierProductApi, supplierMaterialApi } from '../../api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Plus, Truck, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useConfirm } from '../../components/ConfirmProvider';
import InboundOrderModal from '../../components/InboundOrderModal';
import PurchaseOrderList from './PurchaseOrderList';
import PurchaseOrderFilter from './PurchaseOrderFilter';
import PurchaseOrderModal from './PurchaseOrderModal';
import { PurchaseOrder, PurchaseItem, SupplierProduct, CustomItem } from '../../types/purchase';
import { usePermission } from '../../hooks/usePermission';

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentOwnerId } = useOwnerStore();
  const { confirm } = useConfirm();
  const { canWrite } = usePermission('business', 'purchases');

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
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
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [bundles, setBundles] = useState<SupplierProduct[]>([]);
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
  const [productType, setProductType] = useState<'SKU' | 'BUNDLE' | 'MATERIAL' | 'OTHER'>('SKU');
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
      setCustomItems([]);
    }
  }, [formData.supplierId, suppliers]);

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

      const productItems: SupplierProduct[] = [];
      const bundleItems: SupplierProduct[] = [];
      const customItemsData: CustomItem[] = [];
      let hasProduct = false;
      let hasBundle = false;
      let hasMaterial = false;
      let hasOther = false;

      products.forEach((p: any) => {
        if (p.itemType === 'PRODUCT' && p.sku) {
          hasProduct = true;
          productItems.push({
            type: 'product',
            skuId: p.skuId,
            skuCode: p.sku.skuCode,
            productId: p.sku.productId,
            productName: p.sku.product?.name,
            spec: p.sku.spec,
            packaging: p.sku.packaging,
            price: p.price,
            minQty: p.minQty,
            leadDays: p.leadDays,
          });
        } else if (p.itemType === 'BUNDLE' && p.bundle) {
          hasBundle = true;
          bundleItems.push({
            type: 'bundle',
            bundleId: p.bundleId,
            skuCode: p.bundle.skuCode,
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
            type: 'MATERIAL',
            supplierMaterialId: m.id,
            name: m.name,
            unit: m.unit || '',
            price: m.price,
            quantity: 1,
          });
        } else if (m.category === 'OTHER') {
          hasOther = true;
          customItemsData.push({
            type: 'OTHER',
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
    setSearchKeyword('');
    setProductType('SKU');
    setEditingId(null);
  };

  const handleOpenModal = (order?: PurchaseOrder) => {
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

  const handlePurchaseInbound = async (order: PurchaseOrder) => {
    try {
      const res = await purchaseOrderApi.get(order.id);
      if (res.data.success) {
        setViewingOrder(res.data.data);
        setShowInboundModal(true);
      }
    } catch (error) {
      toast.error('加载采购单详情失败');
    }
  };

  return (
    <div className="p-2 space-y-6">
      <ToastContainer />

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">
          采购单 {id ? `- ${viewingOrder?.orderNo || '加载中...'}` : '管理'}
        </h1>
        {!id && (
          <div className="flex items-center gap-3">
            <PurchaseOrderFilter
              listKeyword={listKeyword}
              filterStatus={filterStatus}
              onListKeywordChange={setListKeyword}
              onFilterStatusChange={setFilterStatus}
            />
            <button
              onClick={() => fetchOrders()}
              className="flex items-center gap-2 px-3 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleOpenModal()}
              disabled={!currentOwnerId || !canWrite}
              title={!currentOwnerId ? '请先选择主体' : !canWrite ? '无操作权限' : ''}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                currentOwnerId && canWrite
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Plus className="w-4 h-4" />
              新建采购单
            </button>
          </div>
        )}
      </div>

      <PurchaseOrderList
        orders={orders}
        loading={loading}
        listKeyword={listKeyword}
        filterStatus={filterStatus}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        onDelete={handleDelete}
        onEdit={handleOpenModal}
        onPurchaseInbound={handlePurchaseInbound}
        canWrite={canWrite}
      />

      <PurchaseOrderModal
        isOpen={showModal}
        onClose={handleCloseModal}
        editingId={editingId}
        formData={formData}
        formItems={formItems}
        suppliers={suppliers}
        products={products}
        bundles={bundles}
        customItems={customItems}
        productType={productType}
        searchKeyword={searchKeyword}
        saving={saving}
        onFormDataChange={setFormData}
        onFormItemsChange={setFormItems}
        onProductTypeChange={setProductType}
        onSearchKeywordChange={setSearchKeyword}
        onAddItem={() => {}}
        onRemoveItem={(index) => setFormItems(formItems.filter((_, i) => i !== index))}
        onUpdateItemQuantity={handleUpdateItemQuantity}
        onSubmit={handleSubmit}
      />

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
