import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { orderApi, pickOrderApi, returnApi } from '../api';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ArrowLeft, Truck, Package, CheckCircle, Loader2, MapPin, User, Phone, Calendar, Building2, ClipboardList, Pencil, Trash2, Ban, RotateCcw, XCircle } from 'lucide-react';
import ReturnTrackingModal from '../components/ReturnTrackingModal';
import { formatPhone, formatAddress } from '../utils/format';
import { useConfirm } from '../components/ConfirmProvider';

const statusFlow = [
  { key: 'PENDING', label: '待拣货', description: '订单已创建，等待仓库拣货' },
  { key: 'PICKING', label: '拣货中', description: '仓库正在拣货中' },
  { key: 'OUTBOUND_REVIEW', label: '出库审核中', description: '等待出库审核' },
  { key: 'DISPATCHING', label: '待运力调度', description: '审核通过，等待调度运力' },
  { key: 'DISPATCHED', label: '已调度', description: '已分配运力' },
  { key: 'IN_TRANSIT', label: '运输中', description: '货物运输中' },
  { key: 'DELIVERED', label: '已送达', description: '货物已送达' },
  { key: 'COMPLETED', label: '已收货', description: '客户已确认收货' },
];

const returnStatusFlow = [
  { key: 'RETURN_REQUESTED', label: '申请退货' },
  { key: 'RETURN_SHIPPED', label: '买家发货' },
  { key: 'RETURN_RECEIVING', label: '仓库收货' },
  { key: 'RETURN_QUALIFIED', label: '验收' },
  { key: 'RETURN_STOCK_IN', label: '入库' },
  { key: 'REFUNDED', label: '退款完成' },
];

const statusMap: Record<string, string> = {
  PENDING: '待拣货',
  PICKING: '拣货中',
  OUTBOUND_REVIEW: '出库审核中',
  DISPATCHING: '待运力调度',
  DISPATCHED: '已调度',
  IN_TRANSIT: '运输中',
  DELIVERED: '已送达',
  COMPLETED: '已完成',
  RETURNING: '退货中',
  RETURNED: '已退货退款',
  CANCELLED: '已取消',
};

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [returnModal, setReturnModal] = useState<{ show: boolean; orderId: string; orderNo: string } | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnTrackingModal, setReturnTrackingModal] = useState<{ show: boolean; returnId: string; returnNo: string } | null>(null);
  const [returnTrackingNo, setReturnTrackingNo] = useState('');
  const [returnLogisticsCompany, setReturnLogisticsCompany] = useState('');

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      const res = await orderApi.get(id!);
      if (res.data.success) {
        setOrder(res.data.data);
      }
    } catch (error) {
      toast.error('获取订单详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      if (newStatus === 'PICKING') {
        const res = await pickOrderApi.create({ orderId: order.id });
        if (res.data.success) {
          toast.success('拣货单已生成');
        } else {
          toast.error(res.data.message || '生成拣货单失败');
          return;
        }
      } else {
        await orderApi.updateStatus(order.id, newStatus);
      }
      toast.success('状态已更新');
      fetchOrder();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  const getStepStatus = (stepKey: string) => {
    if (order.status === 'CANCELLED') return 'cancelled';
    if (order.status === 'COMPLETED' || order.status === 'RETURNED') {
      const stepIndex = statusFlow.findIndex(s => s.key === stepKey);
      const completedIndex = statusFlow.findIndex(s => s.key === 'COMPLETED');
      if (stepIndex <= completedIndex) return 'completed';
      return 'pending';
    }
    if (order.status === 'DELIVERED' || order.status === 'RETURNING') {
      const stepIndex = statusFlow.findIndex(s => s.key === stepKey);
      const deliveredIndex = statusFlow.findIndex(s => s.key === 'DELIVERED');
      if (stepIndex <= deliveredIndex) return 'completed';
      return 'pending';
    }
    const currentIndex = statusFlow.findIndex(s => s.key === order.status);
    const stepIndex = statusFlow.findIndex(s => s.key === stepKey);
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  const getReturnStepStatus = (returnOrder: any, stepKey: string) => {
    const returnStatus = returnOrder?.status;
    if (!returnStatus) return 'pending';
    if (returnStatus === 'CANCELLED') return 'cancelled';
    if (returnStatus === 'REFUNDED') {
      const stepIndex = returnStatusFlow.findIndex(s => s.key === stepKey);
      const refundedIndex = returnStatusFlow.findIndex(s => s.key === 'REFUNDED');
      if (stepIndex <= refundedIndex) return 'completed';
      return 'pending';
    }
    const currentIndex = returnStatusFlow.findIndex(s => s.key === returnStatus);
    const stepIndex = returnStatusFlow.findIndex(s => s.key === stepKey);
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12 text-gray-500">
        订单不存在
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ToastContainer />

      {returnModal?.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">申请退货</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">退货订单</label>
                <div className="w-full border rounded-lg px-3 py-2 bg-gray-50">{returnModal.orderNo}</div>
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
                    await returnApi.create({
                      orderId: returnModal.orderId,
                      reason: returnReason,
                    });
                    toast.success('退货申请已提交');
                    setReturnModal(null);
                    fetchOrder();
                  } catch (error: any) {
                    toast.error(error.response?.data?.message || '提交失败');
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
          onClose={() => setReturnTrackingModal(null)}
          onSave={async (data, apiData) => {
            if (!data.returnId) return;
            await returnApi.receive(data.returnId, apiData);
            toast.success('快递单号已保存');
            fetchOrder();
          }}
        />
      )}

      <div className="flex items-center gap-4">
        <Link
          to="/orders"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-5 h-5" />
          返回订单列表
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">订单详情</h1>
            <div className="flex items-center gap-4 mt-1">
              <p className="text-gray-500">订单号: {order.orderNo}</p>
              {(order as any).returnOrders?.[0] && (
                <p className="text-orange-500 text-sm">退货单号: {(order as any).returnOrders[0].returnNo}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 text-sm rounded-full ${
              order.status === 'PENDING' ? 'bg-yellow-500 text-white' :
              order.status === 'PICKING' ? 'bg-orange-600 text-white' :
              (order.status === 'OUTBOUND_REVIEW') ? 'bg-purple-600 text-white' :
              order.status === 'DISPATCHING' ? 'bg-indigo-600 text-white' :
              order.status === 'DISPATCHED' ? 'bg-blue-600 text-white' :
              order.status === 'IN_TRANSIT' ? 'bg-purple-600 text-white' :
              order.status === 'DELIVERED' ? 'bg-green-600 text-white' :
              'bg-red-600 text-white'
            }`}>
              {statusMap[order.status]}
            </span>
            {(order.status === 'PENDING' || order.status === 'PICKING' || order.status === 'OUTBOUND_REVIEW') && (
              <>
                {(order as any).customerId ? null : (
                  <button
                    onClick={() => navigate('/orders', { state: { editingOrder: order } })}
                    className="flex items-center gap-2 px-3 py-1.5 text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg"
                  >
                    <Pencil className="w-4 h-4" />
                    修改
                  </button>
                )}
                <button
                  onClick={async () => {
                    const ok = await confirm({ message: '确定要取消该订单吗？' });
                    if (ok) {
                      handleStatusChange('CANCELLED');
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg"
                >
                  <Ban className="w-4 h-4" />
                  取消
                </button>
              </>
            )}
            {order.status === 'CANCELLED' && (
              <button
                onClick={async () => {
                  const ok = await confirm({ message: '确定要删除该订单吗？' });
                  if (ok) {
                    orderApi.delete(order.id).then(() => {
                      toast.success('订单已删除');
                      navigate('/orders');
                    });
                  }
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
                删除
              </button>
            )}
            {order.status === 'DELIVERED' && (
              <>
                <button
                  onClick={async () => {
                    const ok = await confirm({ message: '确认已收到货？' });
                    if (ok) {
                      handleStatusChange('COMPLETED');
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg"
                >
                  <CheckCircle className="w-4 h-4" />
                  确认收货
                </button>
                <button
                  onClick={() => {
                    setReturnModal({ show: true, orderId: order.id, orderNo: order.orderNo });
                    setReturnReason('');
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg"
                >
                  <RotateCcw className="w-4 h-4" />
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
                className="flex items-center gap-2 px-3 py-1.5 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg"
              >
                <RotateCcw className="w-4 h-4" />
                申请退货
              </button>
            )}
            {order.status === 'RETURNING' && (order as any).returnOrders?.[0] && (
              (() => {
                const returnOrder = (order as any).returnOrders.find((r: any) => r.status !== 'CANCELLED');
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
                          className="flex items-center gap-2 px-3 py-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg"
                        >
                          <Pencil className="w-4 h-4" />
                          填写快递单号
                        </button>
                        <button
                          onClick={async () => {
                            const ok = await confirm({ message: '确认取消退货？取消退货将自动确认收货，订单状态转为已完成！' });
                            if (ok) {
                              returnApi.cancel(returnOrder.id).then(() => {
                                toast.success('已取消退货');
                                fetchOrder();
                              }).catch((err: any) => {
                                toast.error(err.response?.data?.message || '取消失败');
                              });
                            }
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg"
                        >
                          <XCircle className="w-4 h-4" />
                          取消退货
                        </button>
                      </>
                    )}
                  </>
                );
              })()
            )}
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">订单流程</h2>
          <div className="flex items-center">
            {statusFlow.map((step, index) => {
              const stepStatus = getStepStatus(step.key);
              const isLast = index === statusFlow.length - 1;
              return (
                <div key={step.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      stepStatus === 'completed' ? 'bg-green-500 text-white' :
                      stepStatus === 'current' ? 'bg-primary-600 text-white' :
                      stepStatus === 'cancelled' ? 'bg-red-500 text-white' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {stepStatus === 'completed' ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : stepStatus === 'current' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <span className="text-xs font-medium">{index + 1}</span>
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <div className={`text-xs font-medium ${
                        stepStatus === 'completed' || stepStatus === 'current' ? 'text-gray-800' : 'text-gray-400'
                      }`}>
                        {step.label}
                      </div>
                    </div>
                  </div>
                  {!isLast && (
                    <div className={`flex-1 h-0.5 mx-1 -mt-4 ${
                      stepStatus === 'completed' ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {(order as any).returnOrders?.[0] && (order as any).returnOrders[0].status !== 'CANCELLED' && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-6">退货流程</h2>
            <div className="flex items-center">
              {returnStatusFlow.map((step, index) => {
                const stepStatus = getReturnStepStatus((order as any).returnOrders[0], step.key);
                const isLast = index === returnStatusFlow.length - 1;
                return (
                  <div key={step.key} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        stepStatus === 'completed' ? 'bg-green-500 text-white' :
                        stepStatus === 'current' ? 'bg-orange-500 text-white' :
                        'bg-gray-100 text-gray-400'
                      }`}>
                        {stepStatus === 'completed' ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : stepStatus === 'current' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <span className="text-xs font-medium">{index + 1}</span>
                        )}
                      </div>
                      <div className="mt-2 text-center">
                        <div className={`text-xs font-medium ${
                          stepStatus === 'completed' || stepStatus === 'current' ? 'text-gray-800' : 'text-gray-400'
                        }`}>
                          {step.label}
                        </div>
                      </div>
                    </div>
                    {!isLast && (
                      <div className={`flex-1 h-0.5 mx-1 -mt-4 ${
                        stepStatus === 'completed' ? 'bg-green-500' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(order.status === 'PICKING' || order.status === 'OUTBOUND_REVIEW') && order.pickOrder && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ClipboardList className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">关联拣货单: {order.pickOrder.pickNo}</span>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  order.pickOrder.status === 'PENDING' ? 'bg-yellow-500 text-white' :
                  order.pickOrder.status === 'PICKING' ? 'bg-blue-600 text-white' :
                  'bg-green-600 text-white'
                }`}>
                  {order.pickOrder.status === 'PENDING' ? '待拣货' : 
                   order.pickOrder.status === 'PICKING' ? '拣货中' : '已拣货'}
                </span>
              </div>
              <Link
                to="/outbound"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                查看详情 →
              </Link>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 border-t pt-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">收货信息</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-gray-600">
                <Building2 className="w-5 h-5 text-gray-400" />
                <span>{order.owner?.name}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <User className="w-5 h-5 text-gray-400" />
                {(order as any).customerId && (order as any).customer ? (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{(order as any).customer.name}</span>
                    {((order as any).customer.level === 'VIP' || (order as any).customer.level === 'vip') && (
                      <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">VIP</span>
                    )}
                    <span className="text-gray-400">（{order.receiver}）</span>
                  </div>
                ) : (
                  <span>{order.receiver}</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <Phone className="w-5 h-5 text-gray-400" />
                <span>{formatPhone(order.phone)}</span>
              </div>
              <div className="flex items-start gap-3 text-gray-600">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <span>{formatAddress(order.province, order.city, order.address)}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">订单信息</h3>
            <div className="space-y-3">
              {order.warehouse && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Building2 className="w-5 h-5 text-gray-400" />
                  <span>发货仓库: {order.warehouse.name}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-gray-600">
                <Calendar className="w-5 h-5 text-gray-400" />
                <span>创建时间: {new Date(order.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <Package className="w-5 h-5 text-gray-400" />
                <span>商品数量: {order.items?.length || 0} 种</span>
              </div>
              <div className="flex items-center gap-3 text-lg font-medium text-primary-600">
                <span>订单金额: ¥{Number(order.totalAmount).toLocaleString()}</span>
                {(order as any).customerId && (order as any).contractDiscount && (
                  <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">大客户协议价</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">关联信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-5 h-5 text-primary-600" />
                  <span className="font-medium">拣货信息</span>
                </div>
                {order.picking ? (
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">拣货单号:</span>
                      <span className="font-medium">{order.picking.pickingNo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">状态:</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        order.picking.status === 'PENDING' ? 'bg-yellow-500 text-white' :
                        order.picking.status === 'PICKING' ? 'bg-blue-600 text-white' :
                        'bg-green-600 text-white'
                      }`}>
                        {order.picking.status === 'PENDING' ? '待拣货' :
                         order.picking.status === 'PICKING' ? '拣货中' : '已完成'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-400">暂无拣货信息</div>
                )}
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">配送信息</span>
                </div>
                {order.dispatch ? (
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">配送单号:</span>
                      <Link to={`/dispatch/${order.dispatch.id}`} className="font-medium text-primary-600 hover:underline">
                        {order.dispatch.dispatchNo}
                      </Link>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">状态:</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        order.dispatch.status === 'PENDING' ? 'bg-yellow-500 text-white' :
                        order.dispatch.status === 'IN_TRANSIT' ? 'bg-blue-600 text-white' :
                        'bg-green-600 text-white'
                      }`}>
                        {order.dispatch.status === 'PENDING' ? '待发运' :
                         order.dispatch.status === 'IN_TRANSIT' ? '配送中' : '已完成'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-400">暂无配送信息</div>
                )}
              </div>
              {(order as any).returnOrders?.filter((ret: any) => ret.status !== 'CANCELLED')?.[0] && (
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <div className="flex items-center gap-2 mb-2">
                    <RotateCcw className="w-5 h-5 text-orange-600" />
                    <span className="font-medium text-orange-700">退货信息</span>
                  </div>
                  {(order as any).returnOrders
                    .filter((ret: any) => ret.status !== 'CANCELLED')
                    .map((ret: any) => (
                    <div key={ret.id} className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">退货单号:</span>
                        <Link to={`/returns/${ret.id}`} className="font-medium text-orange-600 hover:underline">
                          {ret.returnNo}
                        </Link>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">状态:</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          ret.status === 'RETURN_REQUESTED' ? 'bg-yellow-500 text-white' :
                          ret.status === 'RETURN_SHIPPED' ? 'bg-blue-500 text-white' :
                          ret.status === 'RETURN_RECEIVING' ? 'bg-purple-500 text-white' :
                          ret.status === 'RETURN_QUALIFIED' ? 'bg-green-500 text-white' :
                          ret.status === 'RETURN_STOCK_IN' ? 'bg-indigo-500 text-white' :
                          ret.status === 'REFUNDED' ? 'bg-pink-500 text-white' :
                          'bg-gray-500 text-white'
                        }`}>
                          {ret.status === 'RETURN_REQUESTED' ? '待发货' :
                           ret.status === 'RETURN_SHIPPED' ? '已发货' :
                           ret.status === 'RETURN_RECEIVING' ? '收货中' :
                           ret.status === 'RETURN_QUALIFIED' ? '已验收' :
                           ret.status === 'RETURN_STOCK_IN' ? '已入库' :
                           ret.status === 'REFUNDED' ? '已退款' :
                           ret.status === 'CANCELLED' ? '已取消' : ret.status}
                        </span>
                      </div>
                      {ret.trackingNo && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">快递:</span>
                          <span className="text-gray-700">{ret.logisticsCompany}</span>
                        </div>
                      )}
                      {ret.trackingNo && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">单号:</span>
                          <span className="text-gray-700">{ret.trackingNo}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        <div className="border-t pt-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">商品明细</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">商品</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">包装</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">规格</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">单价</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">数量</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">小计</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {order.items?.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-gray-400" />
                        {item.bundleId ? (
                          <div>
                            <span className="text-purple-600 text-sm font-medium">[套装] {item.productName}</span>
                            <div className="text-xs text-purple-600 mt-1">
                              包含: {item.bundle?.items?.map((bi: any) => `${bi.sku?.product?.name || ''} ${bi.sku?.spec || ''}/${bi.sku?.packaging || ''}×${bi.quantity}`).join(', ')}
                            </div>
                          </div>
                        ) : (
                          <span className="font-medium text-blue-600">[商品] {item.productName}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.packaging}</td>
                    <td className="px-4 py-3 text-gray-600">{item.spec}</td>
                    <td className="px-4 py-3 text-right text-gray-600">¥{Number(item.price).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{item.quantity}</td>
                    <td className="px-4 py-3 text-right font-medium text-primary-600">¥{Number(item.subtotal).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
