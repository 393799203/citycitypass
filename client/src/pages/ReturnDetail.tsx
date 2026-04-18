import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { returnApi } from '../api';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ArrowLeft, Package, Truck, CheckCircle, Warehouse, DollarSign, Phone, FileText, Clock, Pencil, Info } from 'lucide-react';
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

const returnStatusFlow = [
  { key: 'RETURN_REQUESTED', label: '申请退货' },
  { key: 'RETURN_SHIPPED', label: '买家发货' },
  { key: 'RETURN_RECEIVING', label: '仓库收货' },
  { key: 'RETURN_QUALIFIED', label: '验收(全)' },
  { key: 'RETURN_PARTIAL_QUALIFIED', label: '验收(部分)' },
  { key: 'RETURN_STOCK_IN', label: '入库' },
  { key: 'REFUNDED', label: '退款完成' },
];

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
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: React.ReactNode } | null>(null);

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

  const getReturnStepStatus = (stepKey: string) => {
    if (!effectiveStatus) return 'pending';
    if (effectiveStatus === 'CANCELLED') return 'cancelled';
    
    // 检查是否所有商品都合格
    const allItemsQualified = returnOrder.items?.every((item: any) => item.qualifiedQuantity === item.quantity) || false;
    // 检查是否有商品合格
    const hasQualifiedItems = returnOrder.items?.some((item: any) => item.qualifiedQuantity > 0) || false;
    
    // 特殊处理验收步骤
    if (stepKey === 'RETURN_QUALIFIED') {
      // 当所有商品都合格时，显示为 completed 或 current
      if (allItemsQualified) {
        if (effectiveStatus === 'RETURN_QUALIFIED' || effectiveStatus === 'RETURN_STOCK_IN' || effectiveStatus === 'REFUNDED') {
          return 'completed';
        } else if (effectiveStatus === 'RETURN_RECEIVING') {
          return 'current';
        } else {
          return 'pending';
        }
      } else if (effectiveStatus === 'RETURN_RECEIVING') {
        // 当状态是 RETURN_RECEIVING 时，显示为 current
        return 'current';
      } else {
        return 'pending';
      }
    }
    
    if (stepKey === 'RETURN_PARTIAL_QUALIFIED') {
      // 当有商品合格但不是所有商品都合格时，显示为 completed 或 current
      if (hasQualifiedItems && !allItemsQualified) {
        if (effectiveStatus === 'RETURN_PARTIAL_QUALIFIED' || effectiveStatus === 'RETURN_STOCK_IN' || effectiveStatus === 'REFUNDED') {
          return 'completed';
        } else if (effectiveStatus === 'RETURN_RECEIVING') {
          return 'current';
        } else {
          return 'pending';
        }
      } else if (effectiveStatus === 'RETURN_RECEIVING') {
        // 当状态是 RETURN_RECEIVING 时，显示为 current
        return 'current';
      } else {
        return 'pending';
      }
    }
    
    // 特殊处理入库步骤
    if (stepKey === 'RETURN_STOCK_IN') {
      if (effectiveStatus === 'RETURN_QUALIFIED' || effectiveStatus === 'RETURN_PARTIAL_QUALIFIED') {
        return 'current';
      } else if (effectiveStatus === 'RETURN_STOCK_IN' || effectiveStatus === 'REFUNDED') {
        return 'completed';
      } else {
        return 'pending';
      }
    }
    
    // 特殊处理退款完成步骤
    if (stepKey === 'REFUNDED') {
      if (effectiveStatus === 'REFUNDED') {
        return 'completed';
      } else if (effectiveStatus === 'RETURN_STOCK_IN') {
        return 'current';
      } else {
        return 'pending';
      }
    }
    
    // 其他步骤的处理
    const currentIndex = returnStatusFlow.findIndex(s => s.key === effectiveStatus);
    const stepIndex = returnStatusFlow.findIndex(s => s.key === stepKey);
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'completed';
    if (stepIndex === currentIndex + 1) return 'current';
    return 'pending';
  };

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

  // 检查是否有商品验收不合格
  const hasRejectedItems = returnOrder.items?.some((item: any) => (item.rejectedQuantity || 0) > 0) || false;
  // 如果有不合格商品，即使状态是 RETURN_QUALIFIED，也显示为部分合格
  const effectiveStatus = hasRejectedItems && returnOrder.status === 'RETURN_QUALIFIED' ? 'RETURN_PARTIAL_QUALIFIED' : returnOrder.status;
  const statusConfig = STATUS_CONFIG[effectiveStatus] || { label: effectiveStatus, color: 'text-gray-600', bgColor: 'bg-gray-50' };

  return (
    <div className="p-2 space-y-6">
      

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">退货单详情</h1>
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-gray-500">退货单号: {returnOrder.returnNo}</p>
                  <span className={`px-3 py-1.5 text-sm rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}>
                    {statusConfig.label}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-6">退货流程</h2>
              <div className="relative">
                {/* 节点 */}
                {/* 连接线 */}
                <svg className="absolute top-4 left-0 w-full h-32 pointer-events-none" viewBox="0 0 100 32">
                  {/* 申请退货到买家发货 */}
                  <line 
                    x1="-28" y1="11" x2="-8" y2="11" 
                    stroke={getReturnStepStatus('RETURN_SHIPPED') === 'completed' || getReturnStepStatus('RETURN_SHIPPED') === 'current' ? '#10B981' : '#E5E7EB'} 
                    strokeWidth="0.5"
                  />
                  
                  {/* 买家发货到仓库收货 */}
                  <line 
                    x1="6" y1="11" x2="26" y2="11" 
                    stroke={getReturnStepStatus('RETURN_RECEIVING') === 'completed' || getReturnStepStatus('RETURN_RECEIVING') === 'current' ? '#10B981' : '#E5E7EB'} 
                    strokeWidth="0.5"
                  />
                  
                  {/* 仓库收货到验收全部 */}
                  <line 
                    x1="40" y1="11" x2="40" y2="0" 
                    stroke={getReturnStepStatus('RETURN_QUALIFIED') === 'completed' || getReturnStepStatus('RETURN_QUALIFIED') === 'current' ? '#10B981' : '#E5E7EB'} 
                    strokeWidth="0.5"
                  />
                  <line 
                    x1="40" y1="0" x2="60" y2="0" 
                    stroke={getReturnStepStatus('RETURN_QUALIFIED') === 'completed' || getReturnStepStatus('RETURN_QUALIFIED') === 'current' ? '#10B981' : '#E5E7EB'} 
                    strokeWidth="0.5"
                  />
                  
                  {/* 仓库收货到验收部分 */}
                  <line 
                    x1="40" y1="11" x2="40" y2="22" 
                    stroke={getReturnStepStatus('RETURN_PARTIAL_QUALIFIED') === 'completed' || getReturnStepStatus('RETURN_PARTIAL_QUALIFIED') === 'current' ? '#10B981' : '#E5E7EB'} 
                    strokeWidth="0.5"
                  />
                  <line 
                    x1="40" y1="22" x2="60" y2="22" 
                    stroke={getReturnStepStatus('RETURN_PARTIAL_QUALIFIED') === 'completed' || getReturnStepStatus('RETURN_PARTIAL_QUALIFIED') === 'current' ? '#10B981' : '#E5E7EB'} 
                    strokeWidth="0.5"
                  />
                  
                  {/* 验收全部到入库 */}
                  <line 
                    x1="74" y1="0" x2="94" y2="0" 
                    stroke={(getReturnStepStatus('RETURN_QUALIFIED') === 'completed' && (getReturnStepStatus('RETURN_STOCK_IN') === 'completed' || getReturnStepStatus('RETURN_STOCK_IN') === 'current')) ? '#10B981' : '#E5E7EB'} 
                    strokeWidth="0.5"
                  />
                  <line 
                    x1="94" y1="0" x2="94" y2="11" 
                    stroke={(getReturnStepStatus('RETURN_QUALIFIED') === 'completed' && (getReturnStepStatus('RETURN_STOCK_IN') === 'completed' || getReturnStepStatus('RETURN_STOCK_IN') === 'current')) ? '#10B981' : '#E5E7EB'} 
                    strokeWidth="0.5"
                  />
                  
                  {/* 验收部分到入库 */}
                  <line 
                    x1="74" y1="22" x2="94" y2="22" 
                    stroke={(getReturnStepStatus('RETURN_PARTIAL_QUALIFIED') === 'completed' && (getReturnStepStatus('RETURN_STOCK_IN') === 'completed' || getReturnStepStatus('RETURN_STOCK_IN') === 'current')) ? '#10B981' : '#E5E7EB'} 
                    strokeWidth="0.5"
                  />
                  <line 
                    x1="94" y1="22" x2="94" y2="11" 
                    stroke={(getReturnStepStatus('RETURN_PARTIAL_QUALIFIED') === 'completed' && (getReturnStepStatus('RETURN_STOCK_IN') === 'completed' || getReturnStepStatus('RETURN_STOCK_IN') === 'current')) ? '#10B981' : '#E5E7EB'} 
                    strokeWidth="0.5"
                  />
                  
                  {/* 入库到退款完成 */}
                  <line 
                    x1="108" y1="11" x2="128" y2="11" 
                    stroke={getReturnStepStatus('REFUNDED') === 'completed' || getReturnStepStatus('REFUNDED') === 'current' ? '#10B981' : '#E5E7EB'} 
                    strokeWidth="0.5"
                  />
                </svg>
                
                {/* 节点 */}
                <div className="flex items-center justify-between">
                  {/* 显示到仓库收货步骤 */}
                  {returnStatusFlow.slice(0, 3).map((step, index) => {
                    const stepStatus = getReturnStepStatus(step.key);
                    return (
                      <div key={step.key} className="flex flex-col items-center w-1/5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          stepStatus === 'completed' ? 'bg-green-500 text-white' :
                          stepStatus === 'current' ? 'bg-orange-500 text-white' :
                          'bg-gray-100 text-gray-400'
                        }`}>
                          {stepStatus === 'completed' ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : stepStatus === 'current' ? (
                            <div className="w-4 h-4 border-2 border-white rounded-full animate-pulse" />
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
                    );
                  })}
                  
                  {/* 显示验收步骤（垂直排列） */}
                  <div className="flex flex-col items-center w-1/5">
                    {/* 验收全部 */}
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        getReturnStepStatus('RETURN_QUALIFIED') === 'completed' ? 'bg-green-500 text-white' :
                        getReturnStepStatus('RETURN_QUALIFIED') === 'current' ? 'bg-orange-500 text-white' :
                        'bg-gray-100 text-gray-400'
                      }`}>
                        {getReturnStepStatus('RETURN_QUALIFIED') === 'completed' ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : getReturnStepStatus('RETURN_QUALIFIED') === 'current' ? (
                          <div className="w-4 h-4 border-2 border-white rounded-full animate-pulse" />
                        ) : (
                          <span className="text-xs font-medium">4</span>
                        )}
                      </div>
                      <div className="mt-2 text-center">
                        <div className={`text-xs font-medium ${
                          getReturnStepStatus('RETURN_QUALIFIED') === 'completed' || getReturnStepStatus('RETURN_QUALIFIED') === 'current' ? 'text-gray-800' : 'text-gray-400'
                        }`}>
                          验收(全)
                        </div>
                      </div>
                  </div>
                  
                  {/* 垂直间距 */}
                  <div className="h-8" />
                  
                  {/* 验收部分 */}
                  <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        getReturnStepStatus('RETURN_PARTIAL_QUALIFIED') === 'completed' ? 'bg-green-500 text-white' :
                        getReturnStepStatus('RETURN_PARTIAL_QUALIFIED') === 'current' ? 'bg-orange-500 text-white' :
                        'bg-gray-100 text-gray-400'
                      }`}>
                        {getReturnStepStatus('RETURN_PARTIAL_QUALIFIED') === 'completed' ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : getReturnStepStatus('RETURN_PARTIAL_QUALIFIED') === 'current' ? (
                          <div className="w-4 h-4 border-2 border-white rounded-full animate-pulse" />
                        ) : (
                          <span className="text-xs font-medium">5</span>
                        )}
                      </div>
                      <div className="mt-2 text-center">
                        <div className={`text-xs font-medium ${
                          getReturnStepStatus('RETURN_PARTIAL_QUALIFIED') === 'completed' || getReturnStepStatus('RETURN_PARTIAL_QUALIFIED') === 'current' ? 'text-gray-800' : 'text-gray-400'
                        }`}>
                          验收(部分)
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 显示入库和退款完成步骤 */}
                  {returnStatusFlow.slice(5).map((step, index) => {
                    const stepStatus = getReturnStepStatus(step.key);
                    return (
                      <div key={step.key} className="flex flex-col items-center w-1/5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          stepStatus === 'completed' ? 'bg-green-500 text-white' :
                          stepStatus === 'current' ? 'bg-orange-500 text-white' :
                          'bg-gray-100 text-gray-400'
                        }`}>
                          {stepStatus === 'completed' ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : stepStatus === 'current' ? (
                            <div className="w-4 h-4 border-2 border-white rounded-full animate-pulse" />
                          ) : (
                            <span className="text-xs font-medium">{index + 6}</span>
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
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className={`grid ${(returnOrder.trackingNo || returnOrder.logisticsCompany) ? 'grid-cols-3' : 'grid-cols-2'} gap-6`}>
                <div>
                  <div className="text-sm text-gray-500 mb-1">退货人</div>
                  <div className="flex items-center gap-2">
                    <div className="text-base">{returnOrder.receiverName}</div>
                    <div className="flex items-center gap-1 text-gray-500 text-sm">
                      <Phone className="w-4 h-4" />
                      {returnOrder.receiverPhone}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 mt-2 mb-1">退货人地址</div>
                  <div className="text-base">{returnOrder.receiverAddress}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">收货仓</div>
                  <div className="text-base">{returnOrder.warehouse?.name}</div>
                  <div className="text-sm text-gray-500 mt-2 mb-1">收货仓地址</div>
                  <div className="text-base">{returnOrder.warehouse?.address}</div>
                </div>
                {(returnOrder.trackingNo || returnOrder.logisticsCompany) && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">退货快递</div>
                    <div className="text-base">{returnOrder.logisticsCompany || '-'}</div>
                    <div className="text-sm text-gray-500 mt-2 mb-1">快递单号</div>
                    <div className="flex items-center gap-2">
                      <span className="text-base text-gray-600">{returnOrder.trackingNo || '-'}</span>
                      {returnOrder.trackingNo && returnOrder.logisticsCompany && (
                        <a
                          href={`https://www.kuaidi100.com/chaxun?com=${encodeURIComponent(returnOrder.logisticsCompany)}&nu=${returnOrder.trackingNo}`}
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

            <div className="mb-6 mt-6">
              <div className="text-sm text-gray-500 mb-1">退货原因</div>
              <div className="text-base">{returnOrder.reason}</div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">退货商品</h3>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">商品</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">包装</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">规格</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">退货数量</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">合格数量</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">拒收数量</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {returnOrder.items?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className={item.bundleId ? 'text-purple-600' : 'text-blue-600'}>
                            {item.bundleId ? <span className="text-purple-500">[套装]</span> : <span className="text-blue-500">[商品]</span>}
                            {item.productName}
                            {item.bundleId && item.bundle?.items?.length > 0 && (
                              <button
                                type="button"
                                onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, content: <div><div className="font-semibold mb-2 text-blue-400">套装包含：</div>{item.bundle.items.map((bi: any) => (<div key={bi.id} className="text-gray-200 py-1"><span className="text-blue-400">{bi.sku?.product?.name}</span><span className="text-gray-400"> · {bi.sku?.spec}/{bi.sku?.packaging}</span><span className="text-yellow-400 ml-1">×{bi.quantity}</span></div>))}</div> })}
                                onMouseLeave={() => setTooltip(null)}
                                onMouseMove={(e) => setTooltip({ x: e.clientX, y: e.clientY, content: <div><div className="font-semibold mb-2 text-blue-400">套装包含：</div>{item.bundle.items.map((bi: any) => (<div key={bi.id} className="text-gray-200 py-1"><span className="text-blue-400">{bi.sku?.product?.name}</span><span className="text-gray-400"> · {bi.sku?.spec}/{bi.sku?.packaging}</span><span className="text-yellow-400 ml-1">×{bi.quantity}</span></div>))}</div> })}
                                className="hover:bg-gray-100 rounded ml-1"
                              >
                                <Info className="w-3 h-3 text-purple-500 cursor-help inline" />
                              </button>
                            )}
                          </span>
                        </div>
                        {item.bundleId ? (
                          <>
                            {item.bundleBatch?.batchNo && <div className="text-purple-500 text-xs">批:{item.bundleBatch.batchNo}</div>}
                            {item.bundleBatch?.expiryDate && <div className="text-orange-500 text-xs">效期:{new Date(item.bundleBatch.expiryDate).toLocaleDateString()}</div>}
                          </>
                        ) : (
                          <>
                            {item.skuBatch?.batchNo && <div className="text-purple-500 text-xs">批:{item.skuBatch.batchNo}</div>}
                            {item.skuBatch?.expiryDate && <div className="text-orange-500 text-xs">效期:{new Date(item.skuBatch.expiryDate).toLocaleDateString()}</div>}
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 text-base text-gray-500 text-center">{item.packaging}</td>
                      <td className="px-4 py-3 text-base text-gray-500 text-center">{item.spec}</td>
                      <td className="px-4 py-3 text-base text-center">{item.quantity}</td>
                      <td className="px-4 py-3 text-base text-green-600 text-center">{item.qualifiedQuantity !== undefined ? item.qualifiedQuantity : '-'}</td>
                      <td className="px-4 py-3 text-base text-red-600 text-center">{item.rejectedQuantity !== undefined ? item.rejectedQuantity : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {!['REFUNDED', 'CANCELLED'].includes(returnOrder.status) && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">操作</h3>
              <div className="space-y-3">
                {returnOrder.status === 'RETURN_REQUESTED' && (
                  <button
                    onClick={() => {
                      setReturnTrackingModal({ show: true, returnId: returnOrder.id, returnNo: returnOrder.returnNo });
                      setReturnTrackingNo('');
                      setReturnLogisticsCompany('');
                    }}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center justify-center gap-2"
                  >
                    <Pencil className="w-4 h-4" /> 填写快递单号
                  </button>
                )}
                {returnOrder.status === 'RETURN_SHIPPED' && (
                  <button onClick={handleReceive} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" /> 确认收到退货
                  </button>
                )}
                {returnOrder.status === 'RETURN_RECEIVING' && (
                  <button
                    onClick={() => openQualifyModal(returnOrder)}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" /> 验收确认
                  </button>
                )}
                {(returnOrder.status === 'RETURN_QUALIFIED' || returnOrder.status === 'RETURN_PARTIAL_QUALIFIED') && (
                  <button
                    onClick={() => openStockInModal()}
                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center justify-center gap-2"
                  >
                    <Warehouse className="w-4 h-4" /> 退货入库
                  </button>
                )}
                {['RETURN_STOCK_IN', 'RETURN_REJECTED'].includes(returnOrder.status) && returnOrder.refundStatus !== 'COMPLETED' && (
                  <button
                    onClick={() => {
                      const discount = returnOrder.order?.contractDiscount ?? 1;
                      const totalRefund = (returnOrder.items || [])
                        .filter((item: any) => (item.qualifiedQuantity ?? 0) > 0)
                        .reduce((sum: number, item: any) => sum + (item.unitPrice || 0) * (item.qualifiedQuantity ?? 0) * discount, 0);
                      setRefundModal({ show: true, refundAmount: totalRefund });
                    }}
                    className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg flex items-center justify-center gap-2"
                  >
                    <DollarSign className="w-4 h-4" /> 确认退款
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-800">操作日志</h3>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {returnOrder.logs?.map((log: any) => (
                <div key={log.id} className="flex gap-3">
                  <div className="w-16 text-xs text-gray-400 flex-shrink-0 pt-1">
                    {new Date(log.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-700 text-sm">{ACTION_LABELS[log.action] || log.action}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{log.remark}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
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

      {tooltip && (
        <div
          className="fixed z-50 bg-gray-800 text-white rounded-lg shadow-xl p-3 max-w-xs"
          style={{ left: tooltip.x + 10, top: tooltip.y + 10 }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}
