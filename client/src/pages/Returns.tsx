import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { returnApi } from '../api/returns';
import { orderApi } from '../api';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Truck, CheckCircle, Warehouse, DollarSign, Clock, Search, Phone, X, Info, Pencil } from 'lucide-react';
import ReturnTrackingModal from '../components/ReturnTrackingModal';
import InboundOrderModal from '../components/InboundOrderModal';
import { useConfirm } from '../components/ConfirmProvider';

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  RETURN_REQUESTED: { label: '待发货', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  RETURN_SHIPPED: { label: '已发货', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  RETURN_RECEIVING: { label: '收货中', color: 'text-purple-600', bgColor: 'bg-purple-50' },
  RETURN_QUALIFIED: { label: '已验收(全合格)', color: 'text-green-600', bgColor: 'bg-green-50' },
  RETURN_PARTIAL_QUALIFIED: { label: '已验收(部分)', color: 'text-orange-600', bgColor: 'bg-orange-50' },
  RETURN_REJECTED: { label: '已拒收', color: 'text-red-600', bgColor: 'bg-red-50' },
  RETURN_STOCK_IN: { label: '已入库', color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  REFUNDED: { label: '已退款', color: 'text-pink-600', bgColor: 'bg-pink-50' },
  CANCELLED: { label: '已取消', color: 'text-gray-600', bgColor: 'bg-gray-50' },
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: '创建退货',
  SHIPPED: '客户发货',
  RECEIVE: '仓库收货',
  QUALIFY: '验收合格',
  REJECT: '验收拒收',
  STOCK_IN: '退货入库',
  REFUND: '退款完成',
  CANCEL: '取消',
};

export default function Returns() {
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [selectedReturn, setSelectedReturn] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [returnTrackingModal, setReturnTrackingModal] = useState<{ show: boolean; returnId: string; returnNo: string } | null>(null);
  const [returnTrackingNo, setReturnTrackingNo] = useState('');
  const [returnLogisticsCompany, setReturnLogisticsCompany] = useState('');
  const [actionModal, setActionModal] = useState<{ type: string; data?: any } | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: React.ReactNode } | null>(null);

  const [orders, setOrders] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ orderId: '', reason: '' });

  const [qualifyItems, setQualifyItems] = useState<any[]>([]);
  const [showStockInModal, setShowStockInModal] = useState(false);
  const [stockInReturnOrder, setStockInReturnOrder] = useState<any>(null);
  const [refundModal, setRefundModal] = useState<{ show: boolean; returnOrder: any; refundAmount: number } | null>(null);

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

  const handleReceive = async () => {
    if (!selectedReturn) return;
    try {
      await returnApi.receive(selectedReturn.id, {});
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

  const openStockInModal = async (returnOrder: any) => {
    setQualifyItems(
      returnOrder.items.map((i: any) => ({
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

  const openQualifyModal = (returnOrder: any) => {
    const items = returnOrder.items?.map((i: any) => ({
      ...i,
      qualifiedQuantity: i.qualifiedQuantity ?? i.quantity,  // 验收时默认全合格
      rejectedQuantity: i.rejectedQuantity ?? 0,
    })) || [];
    setQualifyItems(items);
    setSelectedReturn(returnOrder);
    setActionModal({ type: 'qualify' });
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
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
          <span className="text-sm text-gray-500">共 {total} 条</span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">退货单/原订单</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">退货人</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">仓库</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-600">商品数</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-600">金额</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">状态</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">退货原因</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">时间</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {returns.map(ret => (
              <tr key={ret.id} className="border-t hover:bg-gray-50">
                <td className="px-6 py-4 text-base">
                  <Link to={`/returns/${ret.id}`} className="text-primary-600 hover:underline font-medium">
                    {ret.returnNo}
                  </Link>
                  <div className="flex items-center gap-1 text-gray-400 text-sm mt-0.5">
                    <span className="text-xs">原订单:</span>
                    <Link to={`/orders/${ret.orderId}`} className="text-gray-500 hover:underline">{ret.order?.orderNo}</Link>
                  </div>
                </td>
                <td className="px-6 py-4 text-base">
                  <div>{ret.receiverName}</div>
                  <div className="flex items-center gap-1 text-gray-400 text-sm mt-0.5">
                    <Phone className="w-4 h-4" />
                    {ret.receiverPhone}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-base">{ret.warehouse?.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-base">{ret.items?.reduce((sum: number, item: any) => sum + item.quantity, 0)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-base text-primary-600 font-medium">¥{Number(ret.order?.totalAmount || 0).toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-sm rounded-full ${STATUS_CONFIG[ret.status]?.bgColor} ${STATUS_CONFIG[ret.status]?.color}`}>
                    {STATUS_CONFIG[ret.status]?.label}
                  </span>
                </td>
                <td className="px-6 py-4 text-base text-gray-600 max-w-xs truncate">{ret.reason}</td>
                <td className="px-6 py-4 whitespace-nowrap text-base text-gray-500">{new Date(ret.createdAt).toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {ret.status === 'RETURN_REQUESTED' && (
                      <button
                        onClick={() => {
                          setSelectedReturn(ret);
                          setReturnTrackingModal({ show: true, returnId: ret.id, returnNo: ret.returnNo });
                          setReturnTrackingNo(ret.trackingNo || '');
                          setReturnLogisticsCompany(ret.logisticsCompany || '');
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="填写快递单号"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {ret.status === 'RETURN_SHIPPED' && (
                      <button
                        onClick={async () => {
                          const ok = await confirm({ message: '确认收货？' });
                          if (ok) {
                            try {
                              await returnApi.receive(ret.id, {});
                              toast.success('收货确认成功');
                              fetchReturns();
                            } catch (error: any) {
                              toast.error(error.response?.data?.message || '操作失败');
                            }
                          }
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="确认收货"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    {ret.status === 'RETURN_RECEIVING' && (
                      <button
                        onClick={() => openQualifyModal(ret)}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                        title="验收确认"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    {(ret.status === 'RETURN_QUALIFIED' || ret.status === 'RETURN_PARTIAL_QUALIFIED') && (
                      <button
                        onClick={() => {
                          setQualifyItems(ret.items?.map((i: any) => ({
                            ...i,
                            qualifiedQuantity: i.qualifiedQuantity ?? 0,
                          })) || []);
                          setStockInReturnOrder(ret);
                          setShowStockInModal(true);
                        }}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                        title="退货入库"
                      >
                        <Warehouse className="w-4 h-4" />
                      </button>
                    )}
                    {['RETURN_STOCK_IN', 'RETURN_REJECTED'].includes(ret.status) && ret.refundStatus !== 'COMPLETED' && (
                      <button
                        onClick={() => {
                          const discount = ret.order?.contractDiscount ?? 1;
                          const totalRefund = (ret.items || [])
                            .filter((item: any) => (item.qualifiedQuantity ?? 0) > 0)
                            .reduce((sum: number, item: any) => sum + (item.unitPrice || 0) * (item.qualifiedQuantity ?? 0) * discount, 0);
                          setRefundModal({ show: true, returnOrder: ret, refundAmount: totalRefund });
                        }}
                        className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-lg"
                        title="确认退款"
                      >
                        <DollarSign className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {returns.length === 0 && (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-gray-500">暂无数据</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">申请退货</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">订单</label>
                {createForm.orderId ? (
                  <div className="w-full border rounded-lg px-3 py-2 bg-gray-50">
                    {orders.find(o => o.id === createForm.orderId)?.orderNo} -{' '}
                    {orders.find(o => o.id === createForm.orderId)?.receiver} - ¥
                    {orders.find(o => o.id === createForm.orderId)?.totalAmount}
                  </div>
                ) : (
                  <select
                    value={createForm.orderId}
                    onChange={e => setCreateForm({ ...createForm, orderId: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">请选择已完成订单</option>
                    {orders.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.orderNo} - {o.receiver} - ¥{o.totalAmount}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">退货原因</label>
                <textarea
                  value={createForm.reason}
                  onChange={e => setCreateForm({ ...createForm, reason: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="请输入退货原因"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => {
                setShowCreateModal(false);
                setCreateForm({ orderId: '', reason: '' });
              }} className="px-4 py-2 border rounded-lg">取消</button>
              <button onClick={handleCreate} className="px-4 py-2 bg-primary-600 text-white rounded-lg">提交</button>
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

      {showDetailModal && selectedReturn && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b bg-gray-50">
              <h2 className="text-lg font-bold">退货详情</h2>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-200 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-4 gap-6">
                <div className="col-span-3 space-y-6">
                  <div className="grid grid-cols-10 gap-6">
                    <div className="col-span-4 flex items-center gap-3">
                      <div className="text-sm text-gray-500">退货单号</div>
                      <div className="font-medium truncate">{selectedReturn.returnNo}</div>
                    </div>
                    <div className="col-span-4 flex items-center gap-3">
                      <div className="text-sm text-gray-500">原订单</div>
                      <Link to={`/orders/${selectedReturn.orderId}`} className="font-medium text-primary-600 hover:underline truncate">
                        {selectedReturn.order?.orderNo}
                      </Link>
                    </div>
                    <div className="col-span-2 flex items-center gap-3">
                      <div className="text-sm text-gray-500">状态</div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        selectedReturn.status === 'RETURN_REQUESTED' ? 'bg-yellow-500 text-white' :
                        selectedReturn.status === 'RETURN_SHIPPED' ? 'bg-blue-500 text-white' :
                        selectedReturn.status === 'RETURN_RECEIVING' ? 'bg-purple-500 text-white' :
                        selectedReturn.status === 'RETURN_QUALIFIED' ? 'bg-green-500 text-white' :
                        selectedReturn.status === 'RETURN_PARTIAL_QUALIFIED' ? 'bg-orange-500 text-white' :
                        selectedReturn.status === 'RETURN_REJECTED' ? 'bg-red-500 text-white' :
                        selectedReturn.status === 'RETURN_STOCK_IN' ? 'bg-indigo-500 text-white' :
                        selectedReturn.status === 'CANCELLED' ? 'bg-gray-500 text-white' :
                        'bg-gray-500 text-white'
                      }`}>
                        {STATUS_CONFIG[selectedReturn.status]?.label}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className={`grid ${(selectedReturn.trackingNo || selectedReturn.logisticsCompany) ? 'grid-cols-3' : 'grid-cols-2'} gap-6`}>
                      <div>
                        <div className="text-sm text-gray-500 mb-1">退货人</div>
                        <div className="flex items-center gap-2">
                          <div className="text-base">{selectedReturn.receiverName}</div>
                          <div className="flex items-center gap-1 text-gray-500 text-sm">
                            <Phone className="w-4 h-4" />
                            {selectedReturn.receiverPhone}
                          </div>
                        </div>
                        <div className="text-sm text-gray-500 mt-2 mb-1">退货人地址</div>
                        <div className="text-base">{selectedReturn.receiverAddress}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 mb-1">收货仓</div>
                        <div className="text-base">{selectedReturn.warehouse?.name}</div>
                        <div className="text-sm text-gray-500 mt-2 mb-1">收货仓地址</div>
                        <div className="text-base">{selectedReturn.warehouse?.address}</div>
                      </div>
                      {(selectedReturn.trackingNo || selectedReturn.logisticsCompany) && (
                        <div>
                          <div className="text-sm text-gray-500 mb-1">退货快递</div>
                            <div className="text-base">{selectedReturn.logisticsCompany || '-'}</div>
                            <div className="text-sm text-gray-500 mt-2 mb-1">快递单号</div>
                            <div className="flex items-center gap-2">
                              <span className="text-base text-gray-600">{selectedReturn.trackingNo || '-'}</span>
                              {selectedReturn.trackingNo && selectedReturn.logisticsCompany && (
                                <a
                                  href={`https://www.kuaidi100.com/chaxun?com=${encodeURIComponent(selectedReturn.logisticsCompany)}&nu=${selectedReturn.trackingNo}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline"
                                >
                                  查询
                                </a>
                              )}
                            </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-500 mb-2">退货原因</div>
                    <div className="text-base bg-gray-50 rounded-lg p-4">{selectedReturn.reason}</div>
                  </div>

                  <div>
                    <h3 className="text-base font-medium mb-3">退货商品</h3>
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">商品</th>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">规格</th>
                          <th className="px-6 py-3 text-center text-sm font-medium text-gray-600">退货数</th>
                          <th className="px-6 py-3 text-center text-sm font-medium text-gray-600">合格数</th>
                          <th className="px-6 py-3 text-center text-sm font-medium text-gray-600">拒收数</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedReturn.items?.map((item: any) => (
                            <tr key={item.id} className="border-t">
                              <td className="px-6 py-4">
                                {item.bundleId ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-purple-600 font-medium">[套装] {item.productName}</span>
                                    <button
                                      type="button"
                                      onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, content: <div><div className="font-semibold mb-2 text-blue-400">套装包含：</div>{item.bundle.items.map((bi: any) => (<div key={bi.id} className="text-gray-200 py-1"><span className="text-blue-400">{bi.sku?.product?.name}</span><span className="text-gray-400"> · {bi.sku?.spec}/{bi.sku?.packaging}</span><span className="text-yellow-400 ml-1">×{bi.quantity}</span></div>))}</div> })}
                                      onMouseLeave={() => setTooltip(null)}
                                      onMouseMove={(e) => setTooltip({ x: e.clientX, y: e.clientY, content: <div><div className="font-semibold mb-2 text-blue-400">套装包含：</div>{item.bundle.items.map((bi: any) => (<div key={bi.id} className="text-gray-200 py-1"><span className="text-blue-400">{bi.sku?.product?.name}</span><span className="text-gray-400"> · {bi.sku?.spec}/{bi.sku?.packaging}</span><span className="text-yellow-400 ml-1">×{bi.quantity}</span></div>))}</div> })}
                                      className="p-0.5 hover:bg-purple-50 rounded"
                                    >
                                      <Info className="w-4 h-4 text-purple-500 cursor-help" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-blue-600">[商品] {item.productName || item.sku?.product?.name || '-'}</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-base text-gray-500">{item.packaging} · {item.spec}</td>
                              <td className="px-6 py-4 text-center text-base">{item.quantity}</td>
                              <td className="px-6 py-4 text-center text-base text-green-600">{item.qualifiedQuantity}</td>
                              <td className="px-6 py-4 text-center text-base text-red-600">{item.rejectedQuantity}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-base font-medium">操作日志</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3 max-h-96 overflow-y-auto">
                    {selectedReturn.logs?.map((log: any) => (
                      <div key={log.id} className="flex items-start gap-3 text-sm">
                        <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-medium">{ACTION_LABELS[log.action] || log.action}</div>
                          {log.remark && <div className="text-gray-500 text-xs mt-0.5">{log.remark}</div>}
                          <div className="text-gray-400 text-xs mt-0.5">
                            {log.operatorName && `${log.operatorName} `}{new Date(log.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                {selectedReturn.status === 'RETURN_SHIPPED' && (
                  <button onClick={handleReceive} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2">
                    <Truck className="w-4 h-4" /> 确认收货
                  </button>
                )}
                {selectedReturn.status === 'RETURN_RECEIVING' && (
                  <button onClick={() => openQualifyModal(selectedReturn)} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> 验收确认
                  </button>
                )}
                {(selectedReturn.status === 'RETURN_QUALIFIED' || selectedReturn.status === 'RETURN_PARTIAL_QUALIFIED') && (
                  <button onClick={() => openStockInModal(selectedReturn)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2">
                    <Warehouse className="w-4 h-4" /> 退货入库
                  </button>
                )}
                {['RETURN_STOCK_IN', 'RETURN_REJECTED'].includes(selectedReturn.status) && selectedReturn.refundStatus !== 'COMPLETED' && (
                  <button onClick={() => {
                    const discount = selectedReturn.order?.contractDiscount ?? 1;
                    const totalRefund = (selectedReturn.items || [])
                      .filter((item: any) => (item.qualifiedQuantity ?? 0) > 0)
                      .reduce((sum: number, item: any) => sum + (item.unitPrice || 0) * (item.qualifiedQuantity ?? 0) * discount, 0);
                    setRefundModal({ show: true, returnOrder: selectedReturn, refundAmount: totalRefund });
                  }} className="px-4 py-2 bg-yellow-600 text-white rounded-lg flex items-center gap-2">
                    <DollarSign className="w-4 h-4" /> 确认退款
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {actionModal?.type === 'qualify' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">验收确认</h3>
            <table className="w-full mb-4">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs">商品</th>
                  <th className="px-4 py-2 text-right text-xs">退货数</th>
                  <th className="px-4 py-2 text-right text-xs">合格数</th>
                  <th className="px-4 py-2 text-right text-xs">拒收数</th>
                </tr>
              </thead>
              <tbody>
                {qualifyItems.map((item: any, idx: number) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2 text-sm">{item.productName}</td>
                    <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        max={item.quantity}
                        value={item.qualifiedQuantity}
                        onChange={(e) => {
                          const newItems = [...qualifyItems];
                          newItems[idx].qualifiedQuantity = parseInt(e.target.value) || 0;
                          newItems[idx].rejectedQuantity = item.quantity - newItems[idx].qualifiedQuantity;
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
              <button onClick={() => setActionModal(null)} className="px-4 py-2 border rounded-lg">取消</button>
              <button onClick={handleQualify} className="px-4 py-2 bg-green-600 text-white rounded-lg">确认验收</button>
            </div>
          </div>
        </div>
      )}

      {showStockInModal && stockInReturnOrder && (
        <InboundOrderModal
          open={true}
          warehouseId={stockInReturnOrder.warehouseId}
          source="RETURN"
          returnOrderId={stockInReturnOrder.id}
          orderNo={stockInReturnOrder.order?.orderNo}
          returnNo={stockInReturnOrder.returnNo}
          defaultItems={qualifyItems
            .filter(item => (item.qualifiedQuantity ?? 0) > 0)
            .map(item => ({
              type: item.skuId ? 'PRODUCT' : 'BUNDLE',
              skuId: item.skuId,
              bundleId: item.bundleId,
              productName: item.productName,
              packaging: item.packaging,
              spec: item.spec,
              quantity: item.qualifiedQuantity ?? 0,
              batchNo: item.stockBatchNo,
            }))}
          onClose={() => setShowStockInModal(false)}
          onSuccess={fetchReturns}
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
                {refundModal.returnOrder.order?.contractDiscount && refundModal.returnOrder.order.contractDiscount < 1 && (
                  <div className="text-xs text-gray-500 mt-1">
                    客户折扣: {((refundModal.returnOrder.order.contractDiscount || 1) * 10).toFixed(1)}折
                  </div>
                )}
              </div>
              <div className="text-sm text-gray-600">
                仅退款通过验收的商品
              </div>
              <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                {(refundModal.returnOrder.items || [])
                  .filter((item: any) => (item.qualifiedQuantity ?? 0) > 0)
                  .map((item: any) => {
                    const discount = refundModal.returnOrder.order?.contractDiscount ?? 1;
                    const originalPrice = (item.unitPrice || 0) * (item.qualifiedQuantity || 0);
                    const discountedPrice = originalPrice * discount;
                    return (
                      <div key={item.id} className="flex justify-between items-center px-3 py-2">
                        <div>
                          <div className="text-sm">{item.productName}</div>
                          <div className="text-xs text-gray-500">×{item.qualifiedQuantity}</div>
                        </div>
                        <div className="text-right">
                          {discount < 1 ? (
                            <>
                              <div className="text-xs text-gray-400 line-through">¥{originalPrice.toFixed(2)}</div>
                              <div className="text-sm text-green-600">¥{discountedPrice.toFixed(2)}</div>
                            </>
                          ) : (
                            <div className="text-sm text-green-600">¥{originalPrice.toFixed(2)}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setRefundModal(null)} className="px-4 py-2 border rounded-lg">取消</button>
              <button onClick={handleRefund} className="px-4 py-2 bg-yellow-600 text-white rounded-lg">确认退款</button>
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
