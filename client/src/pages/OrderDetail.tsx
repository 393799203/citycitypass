import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { orderApi, pickOrderApi, returnApi } from '../api';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ArrowLeft, Truck, Package, CheckCircle, Loader2, MapPin, User, Phone, Calendar, Building2, ClipboardList, Pencil, Trash2, Ban, RotateCcw, XCircle } from 'lucide-react';
import ReturnTrackingModal from '../components/ReturnTrackingModal';
import { formatPhone, formatAddress } from '../utils/format';
import { useConfirm } from '../components/ConfirmProvider';
import { usePermission } from '../hooks/usePermission';

const getStatusFlow = (t: any) => [
  { key: 'PENDING', label: t('order.pendingPick'), mobileLabel: t('order.pendingShort'), description: t('order.pendingPickDesc') },
  { key: 'PICKING', label: t('order.picking'), mobileLabel: t('order.pickingShort'), description: t('order.pickingDesc') },
  { key: 'OUTBOUND_REVIEW', label: t('order.outboundReview'), mobileLabel: t('order.outboundShort'), description: t('order.outboundReviewDesc') },
  { key: 'DISPATCHING', label: t('order.dispatching'), mobileLabel: t('order.dispatchShort'), description: t('order.dispatchingDesc') },
  { key: 'DISPATCHED', label: t('order.dispatched'), mobileLabel: t('order.dispatchedShort'), description: t('order.dispatchedDesc') },
  { key: 'IN_TRANSIT', label: t('order.inTransit'), mobileLabel: t('order.transitShort'), description: t('order.inTransitDesc') },
  { key: 'DELIVERED', label: t('order.delivered'), mobileLabel: t('order.deliveredShort'), description: t('order.deliveredDesc') },
  { key: 'COMPLETED', label: t('order.completed'), mobileLabel: t('order.completedShort'), description: t('order.completedDesc') },
];

const getReturnStatusFlow = (t: any) => [
  { key: 'RETURN_REQUESTED', label: t('order.returnRequested') },
  { key: 'RETURN_SHIPPED', label: t('order.buyerShipped') },
  { key: 'RETURN_RECEIVING', label: t('order.warehouseReceiving') },
  { key: 'RETURN_QUALIFIED', label: t('order.qualified') },
  { key: 'RETURN_STOCK_IN', label: t('order.stockIn') },
  { key: 'REFUNDED', label: t('order.refundCompleted') },
];

const getStatusMap = (t: any): Record<string, string> => ({
  PENDING: t('order.pendingPick'),
  PICKING: t('order.picking'),
  OUTBOUND_REVIEW: t('order.outboundReviewing'),
  DISPATCHING: t('order.dispatching'),
  DISPATCHED: t('order.dispatched'),
  IN_TRANSIT: t('order.inTransit'),
  DELIVERED: t('order.delivered'),
  COMPLETED: t('order.completed'),
  RETURNING: t('order.returning'),
  RETURNED: t('order.returnedRefunded'),
  CANCELLED: t('order.orderCancelled'),
});

export default function OrderDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const { canWrite } = usePermission('business', 'orders');
  const statusFlow = getStatusFlow(t);
  const returnStatusFlow = getReturnStatusFlow(t);
  const statusMap = getStatusMap(t);
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
      toast.error(t('order.getOrderDetailFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      if (newStatus === 'PICKING') {
        const res = await pickOrderApi.create({ orderId: order.id });
        if (res.data.success) {
          toast.success(t('order.pickListGenerated'));
        } else {
          toast.error(res.data.message || t('order.pickListFailed'));
          return;
        }
      } else {
        await orderApi.updateStatus(order.id, newStatus);
      }
      toast.success(t('order.statusUpdated'));
      fetchOrder();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('order.operationFailed'));
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
        {t('order.orderNotExist')}
      </div>
    );
  }

  return (
    <div className="p-2 space-y-6">
      

      {returnModal?.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">{t('order.applyReturn')}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('order.returnOrder')}</label>
                <div className="w-full border rounded-lg px-3 py-2 bg-gray-50">{returnModal.orderNo}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('order.returnReasonLabel')}</label>
                <textarea
                  value={returnReason}
                  onChange={e => setReturnReason(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={3}
                  placeholder={t('order.pleaseEnterReturnReason')}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setReturnModal(null)} className="flex-1 px-4 py-2 border rounded-lg">{t('common.cancel')}</button>
              <button
                onClick={async () => {
                  if (!returnReason.trim()) {
                    toast.error(t('order.pleaseEnterReturnReason'));
                    return;
                  }
                  try {
                    await returnApi.create({
                      orderId: returnModal.orderId,
                      reason: returnReason,
                    });
                    toast.success(t('order.returnSubmitted'));
                    setReturnModal(null);
                    fetchOrder();
                  } catch (error: any) {
                    toast.error(error.response?.data?.message || t('order.submitFailed'));
                  }
                }}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg"
              >
                {t('common.submit')}
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
            toast.success(t('order.trackingSaved'));
            fetchOrder();
          }}
        />
      )}

      <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-6 pb-20 lg:pb-6">
        <div className="mb-4 sm:mb-6">
          <h1 className="hidden sm:block text-2xl font-bold text-gray-800">{t('order.orderDetail')}</h1>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <p className="text-sm sm:text-base text-gray-500">{t('order.orderNo')}: {order.orderNo}</p>
            <span className={`px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm rounded-full ${
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
            {(order as any).returnOrders?.[0] && (
              <p className="text-orange-500 text-xs sm:text-sm">{t('order.returnOrderNo')}: {(order as any).returnOrders[0].returnNo}</p>
            )}
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 sm:mb-6">{t('order.orderFlow')}</h2>
          <div className="sm:hidden">
            <div className="flex items-start justify-between">
              {statusFlow.map((step, index) => {
                const stepStatus = getStepStatus(step.key);
                return (
                  <div key={step.key} className="flex flex-col items-center flex-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      stepStatus === 'completed' ? 'bg-green-500 text-white' :
                      stepStatus === 'current' ? 'bg-primary-600 text-white' :
                      stepStatus === 'cancelled' ? 'bg-red-500 text-white' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {stepStatus === 'completed' ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : stepStatus === 'current' ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <span className="text-[10px] font-medium">{index + 1}</span>
                      )}
                    </div>
                    <div className="mt-1 text-center">
                      <div className={`text-[10px] font-medium ${
                        stepStatus === 'completed' || stepStatus === 'current' ? 'text-gray-800' : 'text-gray-400'
                      }`}>
                        {step.mobileLabel}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="hidden sm:block overflow-x-auto pb-2">
            <div className="flex items-center min-w-0">
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
        </div>

        {(order as any).returnOrders?.[0] && (order as any).returnOrders[0].status !== 'CANCELLED' && (
          <div className="mb-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 sm:mb-6">{t('order.returnFlow')}</h2>
            <div className="sm:hidden">
              <div className="flex items-start justify-between">
                {returnStatusFlow.map((step, index) => {
                  const stepStatus = getReturnStepStatus((order as any).returnOrders[0], step.key);
                  return (
                    <div key={step.key} className="flex flex-col items-center flex-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        stepStatus === 'completed' ? 'bg-green-500 text-white' :
                        stepStatus === 'current' ? 'bg-orange-500 text-white' :
                        'bg-gray-100 text-gray-400'
                      }`}>
                        {stepStatus === 'completed' ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : stepStatus === 'current' ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <span className="text-[10px] font-medium">{index + 1}</span>
                        )}
                      </div>
                      <div className="mt-1 text-center">
                        <div className={`text-[10px] font-medium ${
                          stepStatus === 'completed' || stepStatus === 'current' ? 'text-gray-800' : 'text-gray-400'
                        }`}>
                          {step.label}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="hidden sm:block overflow-x-auto pb-2">
              <div className="flex items-center min-w-0">
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
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:gap-6 mt-6 sm:mt-8 border-t pt-4 sm:pt-6">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">{t('order.receiverInfo')}</h3>
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center gap-2 sm:gap-3 text-gray-600 text-sm sm:text-base">
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                <span>{order.owner?.name}</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 text-gray-600 text-sm sm:text-base">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                {(order as any).customerId && (order as any).customer ? (
                  <div className="flex items-center gap-2 flex-wrap">
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
              <div className="flex items-center gap-2 sm:gap-3 text-gray-600 text-sm sm:text-base">
                <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                <span>{formatPhone(order.phone)}</span>
              </div>
              <div className="flex items-start gap-2 sm:gap-3 text-gray-600 text-sm sm:text-base">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <span>{formatAddress(order.province, order.city, order.address)}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">{t('order.orderInfo')}</h3>
            <div className="space-y-2 sm:space-y-3">
              {order.warehouse && (
                <div className="flex items-center gap-2 sm:gap-3 text-gray-600 text-sm sm:text-base">
                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                  <span>{t('order.shippingWarehouse')}: {order.warehouse.name}</span>
                </div>
              )}
              <div className="flex items-center gap-2 sm:gap-3 text-gray-600 text-sm sm:text-base">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                <span>{t('order.createTime')}: {new Date(order.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 text-gray-600 text-sm sm:text-base">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                <span>{t('order.productCount')}: {order.items?.length || 0} {t('order.types')}</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg font-medium text-primary-600">
                <span>{t('order.orderAmount')}: ¥{Number(order.totalAmount).toLocaleString()}</span>
                {(order as any).customerId && (order as any).contractDiscount && (
                  <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">{t('order.corporateContractPrice')}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-4 sm:pt-6 mt-4 sm:mt-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">{t('order.relatedInfo')}</h3>
            <div className={`grid grid-cols-1 ${(order as any).returnOrders?.filter((ret: any) => ret.status !== 'CANCELLED')?.[0] ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3 sm:gap-4`}>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-5 h-5 text-primary-600" />
                  <span className="font-medium">{t('order.pickingInfo')}</span>
                </div>
                {order.picking ? (
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('order.pickNo')}:</span>
                      <span className="font-medium">{order.picking.pickNo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('order.status')}:</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        order.picking.status === 'PENDING' ? 'bg-yellow-500 text-white' :
                        order.picking.status === 'PICKING' ? 'bg-blue-600 text-white' :
                        'bg-green-600 text-white'
                      }`}>
                        {order.picking.status === 'PENDING' ? t('order.pendingPick') :
                         order.picking.status === 'PICKING' ? t('order.picking') : t('order.completed')}
                      </span>
                    </div>
                    {order.picking.picker && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t('order.picker')}:</span>
                        <span className="font-medium">{order.picking.picker.name}</span>
                      </div>
                    )}
                    {order.picking.approver && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t('order.approver')}:</span>
                        <span className="font-medium">{order.picking.approver.name}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400">{t('order.noPickingInfo')}</div>
                )}
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">{t('order.dispatchInfo')}</span>
                </div>
                {order.dispatch ? (
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('order.dispatchNo')}:</span>
                      <div className="flex items-center gap-1">
                        {order.dispatch.vehicleSource === 'CARRIER' && (
                          <span className="px-1.5 py-0.5 bg-orange-500 text-white text-xs rounded">{t('order.carrier')}</span>
                        )}
                        <Link to={`/dispatch/${order.dispatch.id}`} className="font-medium text-primary-600 hover:underline">
                          {order.dispatch.dispatchNo}
                        </Link>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('order.status')}:</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        order.dispatch.status === 'PENDING' ? 'bg-yellow-500 text-white' :
                        order.dispatch.status === 'IN_TRANSIT' ? 'bg-blue-600 text-white' :
                        'bg-green-600 text-white'
                      }`}>
                        {order.dispatch.status === 'PENDING' ? t('order.pendingDispatch') :
                         order.dispatch.status === 'IN_TRANSIT' ? t('order.dispatching') : t('order.completed')}
                      </span>
                    </div>
                    {order.dispatch.driver && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">{t('order.driver')}:</span>
                        <span className="font-medium flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {order.dispatch.driver.name} {order.dispatch.driver.phone}
                        </span>
                      </div>
                    )}
                    {order.dispatch.completedTime && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t('order.arrivalTime')}:</span>
                        <span className="font-medium">{new Date(order.dispatch.completedTime).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400">{t('order.noDispatchInfo')}</div>
                )}
              </div>
              {(order as any).returnOrders?.filter((ret: any) => ret.status !== 'CANCELLED')?.[0] && (
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <div className="flex items-center gap-2 mb-2">
                    <RotateCcw className="w-5 h-5 text-orange-600" />
                    <span className="font-medium text-orange-700">{t('order.returnInfo')}</span>
                  </div>
                  {(order as any).returnOrders
                    .filter((ret: any) => ret.status !== 'CANCELLED')
                    .map((ret: any) => (
                    <div key={ret.id} className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t('order.returnNo')}:</span>
                        <Link to={`/returns/${ret.id}`} className="font-medium text-orange-600 hover:underline">
                          {ret.returnNo}
                        </Link>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t('order.status')}:</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          ret.status === 'RETURN_REQUESTED' ? 'bg-yellow-500 text-white' :
                          ret.status === 'RETURN_SHIPPED' ? 'bg-blue-500 text-white' :
                          ret.status === 'RETURN_RECEIVING' ? 'bg-purple-500 text-white' :
                          ret.status === 'RETURN_QUALIFIED' ? 'bg-green-500 text-white' :
                          ret.status === 'RETURN_STOCK_IN' ? 'bg-indigo-500 text-white' :
                          ret.status === 'REFUNDED' ? 'bg-pink-500 text-white' :
                          'bg-gray-500 text-white'
                        }`}>
                          {ret.status === 'RETURN_REQUESTED' ? t('returns.statusPending') :
                           ret.status === 'RETURN_SHIPPED' ? t('returns.statusShipped') :
                           ret.status === 'RETURN_RECEIVING' ? t('returns.statusReceiving') :
                           ret.status === 'RETURN_QUALIFIED' ? t('returns.statusQualified') :
                           ret.status === 'RETURN_STOCK_IN' ? t('returns.statusStockIn') :
                           ret.status === 'REFUNDED' ? t('returns.statusRefunded') :
                           ret.status === 'CANCELLED' ? t('returns.statusCancelled') : ret.status}
                        </span>
                      </div>
                      {ret.trackingNo && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">{t('order.express')}:</span>
                          <span className="text-gray-700">{ret.logisticsCompany}</span>
                        </div>
                      )}
                      {ret.trackingNo && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">{t('order.trackingNo')}:</span>
                          <span className="text-gray-700">{ret.trackingNo}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        <div className="border-t pt-4 sm:pt-6 mt-4 sm:mt-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">{t('order.orderItems')}</h3>
          
          <div className="sm:hidden space-y-3">
            {order.items?.map((item: any) => (
              <div key={item.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Package className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    {item.bundleId ? (
                      <div>
                        <span className="text-purple-600 text-sm font-medium">[{t('order.bundle')}] {item.productName}</span>
                        <div className="text-xs text-purple-600 mt-1">
                          {t('order.includes')}: {item.bundle?.items?.map((bi: any) => `${bi.sku?.product?.name || ''} ${bi.sku?.spec || ''}/${bi.sku?.packaging || ''}×${bi.quantity}`).join(', ')}
                        </div>
                      </div>
                    ) : (
                      <span className="font-medium text-blue-600 text-sm">[{t('order.product')}] {item.productName}</span>
                    )}
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>{t('order.packaging')}: {item.packaging}</div>
                  <div>{t('order.spec')}: {item.spec}</div>
                  <div>{t('order.unitPrice')}: ¥{Number(item.price).toLocaleString()}</div>
                  <div>{t('order.quantity')}: {item.quantity}</div>
                </div>
                <div className="mt-2 text-right text-sm font-medium text-primary-600">
                  {t('order.subtotal')}: ¥{Number(item.subtotal).toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="text-center">
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t('order.product')}</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t('order.packaging')}</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t('order.spec')}</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t('order.unitPrice')}</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t('order.quantity')}</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t('order.subtotal')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {order.items?.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Package className="w-5 h-5 text-gray-400" />
                        {item.bundleId ? (
                          <div>
                            <span className="text-purple-600 text-sm font-medium">[{t('order.bundle')}] {item.productName}</span>
                            <div className="text-xs text-purple-600 mt-1">
                              {t('order.includes')}: {item.bundle?.items?.map((bi: any) => `${bi.sku?.product?.name || ''} ${bi.sku?.spec || ''}/${bi.sku?.packaging || ''}×${bi.quantity}`).join(', ')}
                            </div>
                          </div>
                        ) : (
                          <span className="font-medium text-blue-600">[{t('order.product')}] {item.productName}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-center">{item.packaging}</td>
                    <td className="px-4 py-3 text-gray-600 text-center">{item.spec}</td>
                    <td className="px-4 py-3 text-gray-600 text-center">¥{Number(item.price).toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600 text-center">{item.quantity}</td>
                    <td className="px-4 py-3 font-medium text-primary-600 text-center">¥{Number(item.subtotal).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="hidden lg:flex border-t pt-4 mt-4 justify-end gap-3">
          {(order.status === 'PENDING' || order.status === 'PICKING' || order.status === 'OUTBOUND_REVIEW') && (
            <>
              {(order as any).customerId ? null : canWrite && (
                <button
                  onClick={() => navigate('/orders', { state: { editingOrder: order } })}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg"
                >
                  <Pencil className="w-4 h-4" />
                  {t('common.edit')}
                </button>
              )}
              {canWrite && (
                <button
                  onClick={async () => {
                    const ok = await confirm({ message: t('order.confirmCancelOrder') });
                    if (ok) handleStatusChange('CANCELLED');
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg"
                >
                  <Ban className="w-4 h-4" />
                  {t('common.cancel')}
                </button>
              )}
            </>
          )}
          {order.status === 'CANCELLED' && canWrite && (
            <button
              onClick={async () => {
                const ok = await confirm({ message: t('order.confirmDeleteOrder') });
                if (ok) {
                  orderApi.delete(order.id).then(() => {
                    toast.success(t('order.orderDeleted'));
                    navigate('/orders');
                  });
                }
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg"
            >
              <Trash2 className="w-4 h-4" />
              {t('common.delete')}
            </button>
          )}
          {order.status === 'DELIVERED' && (
            <>
              <button
                onClick={async () => {
                  const ok = await confirm({ message: t('order.confirmReceiveGoods') });
                  if (ok) handleStatusChange('COMPLETED');
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm text-green-600 bg-green-50 hover:bg-green-100 rounded-lg"
              >
                <CheckCircle className="w-4 h-4" />
                {t('order.confirmReceive')}
              </button>
              <button
                onClick={() => {
                  setReturnModal({ show: true, orderId: order.id, orderNo: order.orderNo });
                  setReturnReason('');
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg"
              >
                <RotateCcw className="w-4 h-4" />
                {t('order.applyReturn')}
              </button>
            </>
          )}
          {order.status === 'COMPLETED' && (
            <button
              onClick={() => {
                setReturnModal({ show: true, orderId: order.id, orderNo: order.orderNo });
                setReturnReason('');
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg"
            >
              <RotateCcw className="w-4 h-4" />
              {t('order.applyReturn')}
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
                        className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg"
                      >
                        <Pencil className="w-4 h-4" />
                        {t('returns.fillTracking')}
                      </button>
                      <button
                        onClick={async () => {
                          const ok = await confirm({ message: t('order.confirmCancelReturnWarning') });
                          if (ok) {
                            returnApi.cancel(returnOrder.id).then(() => {
                              toast.success(t('returns.returnCancelled'));
                              fetchOrder();
                            }).catch((err: any) => {
                              toast.error(err.response?.data?.message || t('order.operationFailed'));
                            });
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg"
                      >
                        <XCircle className="w-4 h-4" />
                        {t('returns.cancelReturn')}
                      </button>
                    </>
                  )}
                </>
              );
            })()
          )}
        </div>
      </div>

      {(() => {
        const hasButtons = 
          (order.status === 'PENDING' || order.status === 'PICKING' || order.status === 'OUTBOUND_REVIEW') && 
          ((!(order as any).customerId && canWrite) || canWrite) ||
          (order.status === 'CANCELLED' && canWrite) ||
          order.status === 'DELIVERED' ||
          order.status === 'COMPLETED' ||
          (order.status === 'RETURNING' && (order as any).returnOrders?.some((r: any) => r.status === 'RETURN_REQUESTED'));
        
        if (!hasButtons) return null;
        
        return (
          <div className="lg:hidden fixed bottom-14 left-0 right-0 bg-white border-t border-gray-200 p-3 z-40">
            <div className="flex items-center gap-2">
              {(order.status === 'PENDING' || order.status === 'PICKING' || order.status === 'OUTBOUND_REVIEW') && (
                <>
                  {(order as any).customerId ? null : canWrite && (
                    <button
                      onClick={() => navigate('/orders', { state: { editingOrder: order } })}
                      className="flex-1 py-2.5 text-sm text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg text-center"
                    >
                      {t('common.edit')}
                    </button>
                  )}
                  {canWrite && (
                    <button
                      onClick={async () => {
                        const ok = await confirm({ message: t('order.confirmCancelOrder') });
                        if (ok) handleStatusChange('CANCELLED');
                      }}
                      className="flex-1 py-2.5 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-center"
                    >
                      {t('common.cancel')}
                    </button>
                  )}
                </>
              )}
              {order.status === 'CANCELLED' && canWrite && (
                <button
                  onClick={async () => {
                    const ok = await confirm({ message: t('order.confirmDeleteOrder') });
                    if (ok) {
                      orderApi.delete(order.id).then(() => {
                        toast.success(t('order.orderDeleted'));
                        navigate('/orders');
                      });
                    }
                  }}
                  className="flex-1 py-2.5 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-center"
                >
                  {t('common.delete')}
                </button>
              )}
              {order.status === 'DELIVERED' && (
                <>
                  <button
                    onClick={async () => {
                      const ok = await confirm({ message: t('order.confirmReceiveGoods') });
                      if (ok) handleStatusChange('COMPLETED');
                    }}
                    className="flex-1 py-2.5 text-sm text-green-600 bg-green-50 hover:bg-green-100 rounded-lg text-center"
                  >
                    {t('order.confirmReceive')}
                  </button>
                  <button
                    onClick={() => {
                      setReturnModal({ show: true, orderId: order.id, orderNo: order.orderNo });
                      setReturnReason('');
                    }}
                    className="flex-1 py-2.5 text-sm text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg text-center"
                  >
                    {t('order.applyReturn')}
                  </button>
                </>
              )}
              {order.status === 'COMPLETED' && (
                <button
                  onClick={() => {
                    setReturnModal({ show: true, orderId: order.id, orderNo: order.orderNo });
                    setReturnReason('');
                  }}
                  className="flex-1 py-2.5 text-sm text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg text-center"
                >
                  {t('order.applyReturn')}
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
                            className="flex-1 py-2.5 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg text-center"
                          >
                            {t('returns.fillTracking')}
                          </button>
                          <button
                            onClick={async () => {
                              const ok = await confirm({ message: t('order.confirmCancelReturnWarning') });
                              if (ok) {
                                returnApi.cancel(returnOrder.id).then(() => {
                                  toast.success(t('returns.returnCancelled'));
                                  fetchOrder();
                                }).catch((err: any) => {
                                  toast.error(err.response?.data?.message || t('order.operationFailed'));
                                });
                              }
                            }}
                            className="flex-1 py-2.5 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-center"
                          >
                            {t('returns.cancelReturn')}
                          </button>
                        </>
                      )}
                    </>
                  );
                })()
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
