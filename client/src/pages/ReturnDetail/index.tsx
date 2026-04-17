import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { returnApi } from '../../api';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ReturnTrackingModal from '../../components/ReturnTrackingModal';
import InboundOrderModal from '../../components/InboundOrderModal';
import { useConfirm } from '../../components/ConfirmProvider';
import ReturnFlow from './ReturnFlow';
import ReturnInfo from './ReturnInfo';
import ReturnItems from './ReturnItems';
import ReturnActions from './ReturnActions';
import ReturnLogs from './ReturnLogs';

export default function ReturnDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const [returnOrder, setReturnOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [returnTrackingModal, setReturnTrackingModal] = useState<{ show: boolean; returnId: string; returnNo: string } | null>(null);
  const [returnTrackingNo, setReturnTrackingNo] = useState('');
  const [returnLogisticsCompany, setReturnLogisticsCompany] = useState('');

  const [qualifyItems, setQualifyItems] = useState<any[]>([]);
  const [showQualifyModal, setShowQualifyModal] = useState(false);
  const [showStockInModal, setShowStockInModal] = useState(false);
  const [refundModal, setRefundModal] = useState<{ show: boolean; refundAmount: number } | null>(null);

  const fetchReturn = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await returnApi.get(id);
      if (res.data.success) {
        setReturnOrder(res.data.data);
        setQualifyItems(res.data.data.items?.map((item: any) => ({
          ...item,
          qualifiedQuantity: item.qualifiedQuantity ?? 0,
          rejectedQuantity: item.rejectedQuantity ?? 0,
        })) || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturn();
  }, [id]);

  const handleReceive = async () => {
    if (!returnOrder) return;
    try {
      await returnApi.receive(returnOrder.id, {
        trackingNo: returnTrackingNo,
        logisticsCompany: returnLogisticsCompany,
      });
      toast.success('快递单号已保存');
      setReturnTrackingModal(null);
      fetchReturn();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '保存失败');
    }
  };

  const openQualifyModal = async (ret: any) => {
    const res = await returnApi.get(returnOrder.id);
    if (res.data.success) {
      setQualifyItems(res.data.data.items?.map((item: any) => ({
        ...item,
        qualifiedQuantity: (item.stockOutQuantity || item.quantity),
        rejectedQuantity: 0,
      })) || []);
    }
    setShowQualifyModal(true);
  };

  const handleQualify = async () => {
    if (!returnOrder) return;
    const totalRejected = qualifyItems.reduce((sum, item) => sum + (item.rejectedQuantity || 0), 0);
    if (totalRejected > 0) {
      const ok = await confirm({ message: `有 ${totalRejected} 件商品验收不合格，确认继续吗？` });
      if (!ok) {
        return;
      }
    }
    try {
      await returnApi.qualify(returnOrder.id, { items: qualifyItems });
      toast.success('验收确认成功');
      setShowQualifyModal(false);
      fetchReturn();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '验收失败');
    }
  };

  const openStockInModal = async () => {
    const res = await returnApi.get(returnOrder.id);
    if (res.data.success) {
      setQualifyItems(res.data.data.items?.map((item: any) => ({
        ...item,
        qualifiedQuantity: item.qualifiedQuantity ?? 0,
      })) || []);
    }
    setShowStockInModal(true);
  };

  const handleRefund = async () => {
    if (!returnOrder || !refundModal) return;
    try {
      await returnApi.refund(returnOrder.id, { refundAmount: refundModal.refundAmount });
      toast.success('退款确认成功');
      setRefundModal(null);
      fetchReturn();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  const handleOpenTrackingModal = () => {
    if (!returnOrder) return;
    setReturnTrackingModal({ show: true, returnId: returnOrder.id, returnNo: returnOrder.returnNo });
    setReturnTrackingNo('');
    setReturnLogisticsCompany('');
  };

  const handleOpenRefundModal = () => {
    if (!returnOrder) return;
    const discount = returnOrder.order?.contractDiscount ?? 1;
    const totalRefund = (returnOrder.items || [])
      .filter((item: any) => (item.qualifiedQuantity ?? 0) > 0)
      .reduce((sum: number, item: any) => sum + (item.unitPrice || 0) * (item.qualifiedQuantity ?? 0) * discount, 0);
    setRefundModal({ show: true, refundAmount: totalRefund });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!returnOrder) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">退货单不存在</div>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-6">
      <ToastContainer />

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">退货单详情</h1>
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-gray-500">退货单号: {returnOrder.returnNo}</p>
                  <span className={`px-3 py-1.5 text-sm rounded-full ${
                    returnOrder.status === 'RETURN_REQUESTED' ? 'bg-yellow-50 text-yellow-600' :
                    returnOrder.status === 'RETURN_SHIPPED' ? 'bg-blue-50 text-blue-600' :
                    returnOrder.status === 'RETURN_RECEIVING' ? 'bg-purple-50 text-purple-600' :
                    returnOrder.status === 'RETURN_QUALIFIED' ? 'bg-green-50 text-green-600' :
                    returnOrder.status === 'RETURN_PARTIAL_QUALIFIED' ? 'bg-orange-50 text-orange-600' :
                    returnOrder.status === 'RETURN_REJECTED' ? 'bg-red-50 text-red-600' :
                    returnOrder.status === 'RETURN_STOCK_IN' ? 'bg-indigo-50 text-indigo-600' :
                    returnOrder.status === 'REFUNDED' ? 'bg-pink-50 text-pink-600' :
                    'bg-gray-50 text-gray-600'
                  }`}>
                    {{
                      RETURN_REQUESTED: '待发货',
                      RETURN_SHIPPED: '已发货',
                      RETURN_RECEIVING: '收货中',
                      RETURN_QUALIFIED: '已验收(全合格)',
                      RETURN_PARTIAL_QUALIFIED: '已验收(部分)',
                      RETURN_REJECTED: '已拒收',
                      RETURN_STOCK_IN: '已入库',
                      REFUNDED: '已退款',
                      CANCELLED: '已取消'
                    }[returnOrder.status] || returnOrder.status}
                  </span>
                </div>
              </div>
            </div>

            <ReturnFlow status={returnOrder.status} items={returnOrder.items} />

            <ReturnInfo returnOrder={returnOrder} />

            <div className="mb-6 mt-6">
              <div className="text-sm text-gray-500 mb-1">退货原因</div>
              <div className="text-base">{returnOrder.reason}</div>
            </div>

            <ReturnItems items={returnOrder.items} />
          </div>
        </div>

        <div className="space-y-6">
          <ReturnActions 
            returnOrder={returnOrder}
            onOpenTrackingModal={handleOpenTrackingModal}
            onReceive={handleReceive}
            onOpenQualifyModal={() => openQualifyModal(returnOrder)}
            onOpenStockInModal={openStockInModal}
            onOpenRefundModal={handleOpenRefundModal}
          />

          <ReturnLogs logs={returnOrder.logs} />
        </div>
      </div>

      {returnTrackingModal?.show && (
        <ReturnTrackingModal
          open={true}
          returnId={returnTrackingModal.returnId}
          returnNo={returnTrackingModal.returnNo}
          initialCompany={returnLogisticsCompany}
          initialTrackingNo={returnTrackingNo}
          onClose={() => setReturnTrackingModal(null)}
          onSave={async (data, apiData) => {
            if (!returnOrder) return;
            await returnApi.receive(returnOrder.id, apiData);
            toast.success('快递单号已保存');
            fetchReturn();
          }}
        />
      )}

      {showQualifyModal && !['RETURN_REQUESTED', 'RETURN_SHIPPED', 'CANCELLED', 'REFUNDED'].includes(returnOrder.status) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">验收确认</h3>
            <table className="w-full mb-4">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs">商品</th>
                  <th className="px-4 py-2 text-left text-xs">批次/有效期</th>
                  <th className="px-4 py-2 text-right text-xs">出库数</th>
                  <th className="px-4 py-2 text-right text-xs">合格数</th>
                  <th className="px-4 py-2 text-right text-xs">拒收数</th>
                </tr>
              </thead>
              <tbody>
                {qualifyItems.map((item, idx) => (
                  <tr key={item.stockOutId ? `${item.id}_${item.stockOutId}` : item.id}>
                    <td className="px-4 py-2 text-sm">{item.productName}</td>
                    <td className="px-4 py-2">
                       <div className="text-purple-600">{item.skuBatch?.batchNo || item.bundleBatch?.batchNo || '-'}</div>
                       <div className="text-orange-500 text-xs">{item.skuBatch?.expiryDate ? `效期:${new Date(item.skuBatch.expiryDate).toLocaleDateString()}` : ''}</div>
                     </td>
                    <td className="px-4 py-2 text-sm text-right">{item.stockOutQuantity || item.quantity}</td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        max={item.stockOutQuantity || item.quantity}
                        value={item.qualifiedQuantity}
                        onChange={(e) => {
                          const newItems = [...qualifyItems];
                          newItems[idx].qualifiedQuantity = parseInt(e.target.value) || 0;
                          newItems[idx].rejectedQuantity = (newItems[idx].stockOutQuantity || newItems[idx].quantity) - newItems[idx].qualifiedQuantity;
                          setQualifyItems(newItems);
                        }}
                        className="w-20 border rounded px-2 py-1 text-right"
                      />
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-red-500">{item.rejectedQuantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowQualifyModal(false)} className="px-4 py-2 border rounded-lg">取消</button>
              <button onClick={handleQualify} className="px-4 py-2 bg-green-600 text-white rounded-lg">确认验收</button>
            </div>
          </div>
        </div>
      )}

      {showStockInModal && returnOrder && (
        <InboundOrderModal
          open={true}
          warehouseId={returnOrder.warehouseId}
          source="RETURN"
          returnOrderId={returnOrder.id}
          orderNo={returnOrder.order?.orderNo}
          returnNo={returnOrder.returnNo}
          defaultItems={qualifyItems.map(item => ({
              type: item.skuId ? 'PRODUCT' : 'BUNDLE',
              skuId: item.skuId,
              bundleId: item.bundleId,
              productName: item.productName,
              packaging: item.packaging,
              spec: item.spec,
              quantity: item.qualifiedQuantity ?? 0,
              skuBatchId: item.skuBatch?.id,
              bundleBatchId: item.bundleBatch?.id,
              skuBatch: item.skuBatch,
              bundleBatch: item.bundleBatch,
            }))}
          onClose={() => setShowStockInModal(false)}
          onSuccess={fetchReturn}
        />
      )}

      {refundModal?.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">确认退款</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-2">退款金额</div>
                <div className="text-2xl font-bold text-green-600">¥{refundModal.refundAmount.toFixed(2)}</div>
              </div>
              <div className="text-sm text-gray-600">
                仅退款通过验收的商品
              </div>
              <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                {(returnOrder.items || [])
                  .filter((item: any) => item.qualifiedQuantity > 0)
                  .map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center px-3 py-2">
                      <div>
                        <div className="text-sm">{item.productName}</div>
                        <div className="text-xs text-gray-500">×{item.qualifiedQuantity}</div>
                      </div>
                      <div className="text-sm text-green-600">¥{((item.unitPrice || 0) * item.qualifiedQuantity).toFixed(2)}</div>
                    </div>
                  ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setRefundModal(null)} className="px-4 py-2 border rounded-lg">取消</button>
              <button onClick={handleRefund} className="px-4 py-2 bg-yellow-600 text-white rounded-lg">确认退款</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}