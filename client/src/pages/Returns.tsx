import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { returnApi } from '../api';
import { orderApi } from '../api';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Search } from 'lucide-react';
import ReturnTrackingModal from '../components/ReturnTrackingModal';
import InboundOrderModal from '../components/InboundOrderModal';
import { useConfirm } from '../components/ConfirmProvider';
import { ReturnOrder, CreateReturnForm, QualifyItem, RefundModalData, ReturnTrackingModalData } from './types';
import ReturnsTable from './components/ReturnsTable';
import CreateReturnModal from './components/CreateReturnModal';
import ReturnDetailModal from './components/ReturnDetailModal';
import QualifyModal from './components/QualifyModal';
import RefundModal from './components/RefundModal';

export default function Returns() {
  const [returns, setReturns] = useState<ReturnOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [selectedReturn, setSelectedReturn] = useState<ReturnOrder | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [returnTrackingModal, setReturnTrackingModal] = useState<ReturnTrackingModalData | null>(null);
  const [returnTrackingNo, setReturnTrackingNo] = useState('');
  const [returnLogisticsCompany, setReturnLogisticsCompany] = useState('');
  const [actionModal, setActionModal] = useState<{ type: string; data?: any } | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: React.ReactNode } | null>(null);

  const [orders, setOrders] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateReturnForm>({ orderId: '', reason: '' });

  const [qualifyItems, setQualifyItems] = useState<QualifyItem[]>([]);
  const [showStockInModal, setShowStockInModal] = useState(false);
  const [stockInReturnOrder, setStockInReturnOrder] = useState<ReturnOrder | null>(null);
  const [refundModal, setRefundModal] = useState<RefundModalData | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { confirm } = useConfirm();

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const res = await returnApi.list({ status: statusFilter || undefined, page, pageSize });
      if (res.data.success) {
        const result = res.data.data || {};
        setReturns(result.data || []);
        setTotal(result.total || 0);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await orderApi.list({ status: 'COMPLETED', pageSize: 100 });
      if (res.data.success) {
        setOrders(res.data.data || []);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchReturns();
    fetchOrders();
    if (location.state?.orderId) {
      setCreateForm({ orderId: location.state.orderId, reason: '' });
      setShowCreateModal(true);
    }
  }, [location.state?.orderId]);

  useEffect(() => {
    fetchReturns();
  }, [page, statusFilter]);

  const handleCreate = async () => {
    if (!createForm.orderId || !createForm.reason) {
      toast.error('请填写订单和原因');
      return;
    }
    try {
      await returnApi.create(createForm);
      toast.success('退货申请已提交');
      setShowCreateModal(false);
      setCreateForm({ orderId: '', reason: '' });
      fetchReturns();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '创建失败');
    }
  };

  const handleReceive = async (ret?: ReturnOrder) => {
    const returnOrder = ret || selectedReturn;
    if (!returnOrder) return;
    
    const ok = await confirm({ message: '确认收到退货？' });
    if (!ok) return;
    
    try {
      await returnApi.receive(returnOrder.id, {});
      toast.success('收货确认成功');
      setActionModal(null);
      fetchReturns();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  const handleQualify = async () => {
    if (!selectedReturn) return;
    try {
      await returnApi.qualify(selectedReturn.id, { items: qualifyItems });
      toast.success('验收确认成功');
      setActionModal(null);
      fetchReturns();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  const openStockInModal = async (returnOrder: ReturnOrder) => {
    setQualifyItems(
      returnOrder.items.map((i) => ({
        ...i,
        qualifiedQuantity: i.qualifiedQuantity ?? 0,
      }))
    );
    setStockInReturnOrder(returnOrder);
    setShowStockInModal(true);
  };

  const handleRefund = async () => {
    if (!refundModal) return;
    try {
      await returnApi.refund(refundModal.returnOrder.id, { refundAmount: refundModal.refundAmount });
      toast.success('退款确认成功');
      setRefundModal(null);
      fetchReturns();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  const openQualifyModal = (returnOrder: ReturnOrder) => { debugger;
    const items = returnOrder.items?.map((i) => ({
      ...i,
      qualifiedQuantity: i.qualifiedQuantity || i.quantity,
      rejectedQuantity: i.rejectedQuantity ?? 0,
    })) || [];
    setQualifyItems(items);
    setSelectedReturn(returnOrder);
    setActionModal({ type: 'qualify' });
  };

  const handleOpenTrackingModal = (ret: ReturnOrder) => {
    setSelectedReturn(ret);
    setReturnTrackingModal({ show: true, returnId: ret.id, returnNo: ret.returnNo });
    setReturnTrackingNo(ret.trackingNo || '');
    setReturnLogisticsCompany(ret.logisticsCompany || '');
  };

  const handleOpenRefundModal = (ret: ReturnOrder) => {
    const discount = ret.order?.contractDiscount ?? 1;
    const totalRefund = (ret.items || [])
      .filter((item) => (item.qualifiedQuantity ?? 0) > 0)
      .reduce((sum: number, item) => sum + (item.unitPrice || 0) * (item.qualifiedQuantity ?? 0) * discount, 0);
    setRefundModal({ show: true, returnOrder: ret, refundAmount: totalRefund });
  };

  const handleFormChange = (key: keyof CreateReturnForm, value: string) => {
    setCreateForm({ ...createForm, [key]: value });
  };

  const handleItemChange = (index: number, qualifiedQuantity: number) => {
    const newItems = [...qualifyItems];
    newItems[index].qualifiedQuantity = qualifiedQuantity;
    newItems[index].rejectedQuantity = newItems[index].quantity - qualifiedQuantity;
    setQualifyItems(newItems);
  };

  return (
    <div className="p-6">
      <ToastContainer />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">退货管理</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">全部状态</option>
              <option value="RETURN_REQUESTED">待发货</option>
              <option value="RETURN_SHIPPED">已发货</option>
              <option value="RETURN_RECEIVING">收货中</option>
              <option value="RETURN_QUALIFIED">已验收(全合格)</option>
              <option value="RETURN_PARTIAL_QUALIFIED">已验收(部分)</option>
              <option value="RETURN_REJECTED">已拒收</option>
              <option value="RETURN_STOCK_IN">已入库</option>
              <option value="REFUNDED">已退款</option>
              <option value="CANCELLED">已取消</option>
            </select>
          </div>
          <span className="text-sm text-gray-500">共 {total} 条</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">加载中...</div>
      ) : (
        <ReturnsTable
          returns={returns}
          onOpenTrackingModal={handleOpenTrackingModal}
          onReceive={handleReceive}
          onOpenQualifyModal={openQualifyModal}
          onOpenStockInModal={openStockInModal}
          onOpenRefundModal={handleOpenRefundModal}
        />
      )}

      {total > pageSize && (
        <div className="flex justify-center mt-4 gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            上一页
          </button>
          <span className="px-3 py-1">{page} / {Math.ceil(total / pageSize)}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page * pageSize >= total}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      )}

      <CreateReturnModal
        isOpen={showCreateModal}
        form={createForm}
        orders={orders}
        onClose={() => {
          setShowCreateModal(false);
          setCreateForm({ orderId: '', reason: '' });
        }}
        onSubmit={handleCreate}
        onFormChange={handleFormChange}
      />

      {returnTrackingModal?.show && (
        <ReturnTrackingModal
          open={true}
          returnId={returnTrackingModal.returnId}
          returnNo={returnTrackingModal.returnNo}
          initialCompany={returnLogisticsCompany}
          initialTrackingNo={returnTrackingNo}
          onClose={() => {
            setReturnTrackingModal(null);
            setReturnTrackingNo('');
            setReturnLogisticsCompany('');
          }}
          onSave={async (data, apiData) => {
            await returnApi.receive(data.returnId!, apiData);
            toast.success('快递信息已更新');
            fetchReturns();
          }}
        />
      )}

      <ReturnDetailModal
        isOpen={showDetailModal}
        returnOrder={selectedReturn}
        onClose={() => setShowDetailModal(false)}
        onReceive={() => handleReceive()}
        onOpenQualifyModal={() => openQualifyModal(selectedReturn!)}
        onOpenStockInModal={() => openStockInModal(selectedReturn!)}
        onOpenRefundModal={() => handleOpenRefundModal(selectedReturn!)}
      />

      <QualifyModal
        isOpen={actionModal?.type === 'qualify'}
        items={qualifyItems}
        onClose={() => setActionModal(null)}
        onSubmit={handleQualify}
        onItemChange={handleItemChange}
      />

      {showStockInModal && stockInReturnOrder && (
        <InboundOrderModal
          open={true}
          warehouseId={stockInReturnOrder.warehouseId}
          source="RETURN"
          returnOrderId={stockInReturnOrder.id}
          orderNo={stockInReturnOrder.order?.orderNo}
          returnNo={stockInReturnOrder.returnNo}
          defaultItems={qualifyItems.map(item => ({
              type: item.skuId ? 'PRODUCT' : 'BUNDLE',
              skuId: item.skuId,
              bundleId: item.bundleId,
              productName: item.productName,
              packaging: item.packaging,
              spec: item.spec,
              quantity: item.qualifiedQuantity ?? 0,
              skuBatchId: item.skuBatchId,
              bundleBatchId: item.bundleBatchId,
              skuBatch: item.skuBatch,
              bundleBatch: item.bundleBatch,
            }))}
          onClose={() => setShowStockInModal(false)}
          onSuccess={fetchReturns}
        />
      )}

      <RefundModal
        isOpen={refundModal?.show}
        returnOrder={refundModal?.returnOrder || null}
        refundAmount={refundModal?.refundAmount || 0}
        onClose={() => setRefundModal(null)}
        onSubmit={handleRefund}
      />

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
