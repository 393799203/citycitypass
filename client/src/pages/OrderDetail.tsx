import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { orderApi, pickOrderApi } from '../api';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ArrowLeft, Truck, Package, CheckCircle, Loader2, MapPin, User, Phone, Calendar, Building2, PackageCheck, ClipboardList } from 'lucide-react';
import { formatPhone, formatAddress } from '../utils/format';

const statusFlow = [
  { key: 'PENDING', label: '待拣货', description: '订单已创建，等待仓库拣货' },
  { key: 'PICKING', label: '拣货中', description: '仓库正在拣货中' },
  { key: 'OUTBOUND_REVIEW', label: '出库审核中', description: '等待出库审核' },
  { key: 'DISPATCHING', label: '待运力调度', description: '审核通过，等待调度运力' },
  { key: 'DISPATCHED', label: '已调度', description: '已分配运力' },
  { key: 'IN_TRANSIT', label: '运输中', description: '货物运输中' },
  { key: 'DELIVERED', label: '已送达', description: '货物已送达' },
];

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

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
    if (order.status === 'COMPLETED' || order.status === 'DELIVERED') {
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
            <p className="text-gray-500 mt-1">订单号: {order.orderNo}</p>
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
            {(order.status === 'PENDING') && getNextStatus(order.status) && (
              <button
                onClick={() => handleStatusChange(getNextStatus(order.status)!)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <PackageCheck className="w-4 h-4" />
                {getStatusButtonText(order.status)}
              </button>
            )}
            {(order.status === 'OUTBOUND_REVIEW' || order.status === 'DISPATCHING' || order.status === 'DISPATCHED') && getNextStatus(order.status) && (
              <button
                onClick={() => handleStatusChange(getNextStatus(order.status)!)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Truck className="w-4 h-4" />
                {getStatusButtonText(order.status)}
              </button>
            )}
            {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && 
             order.status !== 'DISPATCHING' && order.status !== 'DISPATCHED' && 
             order.status !== 'IN_TRANSIT' && order.status !== 'DELIVERED' && (
              <button
                onClick={() => {
                  if (confirm('确定要取消该订单吗？')) {
                    handleStatusChange('CANCELLED');
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-50 ml-2"
              >
                取消订单
              </button>
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
                <span>{order.receiver}</span>
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
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">物流信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          <span className="font-medium text-blue-600">{item.productName}</span>
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
