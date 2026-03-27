import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orderApi, pickOrderApi } from '../api';
import { parseAIResponse } from '../api/ai';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Loader2, Package, CheckCircle, ClipboardList, RefreshCw, Sparkles, Info, Phone, MapPin, ShoppingCart } from 'lucide-react';
import { formatPhone, formatAddress } from '../utils/format';
import { useAuthStore } from '../stores/auth';

const pickStatusMap: Record<string, string> = {
  PENDING: '待拣货',
  PICKING: '拣货中',
  PICKED: '已拣货',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

export default function OutboundPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'pending' | 'pick' | 'review'>('pending');
  const [pickOrders, setPickOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecommendOrders, setAiRecommendOrders] = useState<{orderIds: string[], reason: string} | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: React.ReactNode } | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'pending') {
        const res = await orderApi.list({ status: 'PENDING', pageSize: 100 });
        if (res.data.success) {
          const pendingOrders = res.data.data.filter((o: any) => !o.pickOrder);
          setPickOrders(pendingOrders.map((o: any) => ({
            id: o.id,
            pickNo: o.orderNo,
            status: 'PENDING',
            order: o,
            items: o.items || [],
            stockLocks: o.stockLocks || [],
            bundleStockLocks: o.bundleStockLocks || [],
          })));
        }
      } else {
        const res = await pickOrderApi.list({});
        if (res.data.success) {
          if (activeTab === 'pick') {
            const pickOrders = res.data.data.filter((o: any) => 
              o.status === 'PICKING' || o.status === 'CANCELLED'
            );
            setPickOrders(pickOrders);
          } else if (activeTab === 'review') {
            const reviewOrders = res.data.data.filter((o: any) => o.status === 'PICKED' || o.status === 'COMPLETED');
            reviewOrders.sort((a: any, b: any) => {
              if (a.status === 'PICKED' && b.status !== 'PICKED') return -1;
              if (a.status !== 'PICKED' && b.status === 'PICKED') return 1;
              return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            });
            setPickOrders(reviewOrders);
          }
        }
      }
    } catch (error) {
      console.error('Fetch data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAICreatePickOrders = async () => {
    const pendingOrders = pickOrders.filter((o: any) => !o.order?.pickOrder);
    if (pendingOrders.length === 0) {
      toast.error('没有待拣货订单');
      return;
    }

    setAiLoading(true);
    try {
      const orderList = pendingOrders.map((o: any) => {
        const itemLocations = o.items?.map((item: any) => {
          const lock = item.skuId
            ? o.order?.stockLocks?.find((l: any) => l.skuId === item.skuId)
            : o.order?.bundleStockLocks?.find((l: any) => l.bundleId === item.bundleId);
          const loc = lock?.location;
          const zone = loc?.shelf?.zone;
          const locationStr = loc
            ? `${o.order?.warehouse?.name || '仓库'}-${zone?.code || '?'}-${loc.shelf?.code || '?'}-L${loc.level}`
            : '';
          return `${item.bundleId ? '[套装] ' : '[商品] '}${item.productName} ${item.spec || ''} ${item.packaging || ''} x${item.quantity}${locationStr ? ` 库位: ${locationStr}` : ''}`;
        }) || [];
        return {
          id: o.order?.id,
          orderNo: o.order?.orderNo,
          warehouse: o.order?.warehouse?.name || '未知仓库',
          warehouseId: o.order?.warehouseId,
          createdAt: o.order?.createdAt,
          items: itemLocations,
        };
      });

      if (orderList.length === 0) {
        toast.error('没有待拣货订单');
        setAiLoading(false);
        return;
      }

      const prompt = `你是一个物流拣货助手。我有${orderList.length}个待拣货的订单，请帮我分析并将可以一次性合并拣货的订单推荐为一组或多组。

重要规则：
1. 同一仓库的订单可以合并拣货
2. 不同仓库的订单必须分开
3. 同一仓库内，优先选择商品存放位置相近的订单（比如同一货架或相邻货架）
4. 下单时间相近的订单可以一起拣货

商品库位格式：【仓库-库区-货架-库位】

订单列表：
${orderList.map(o => `订单号: ${o.orderNo}, 仓库: ${o.warehouse}, 下单时间: ${new Date(o.createdAt).toLocaleString()}\n  商品: ${o.items.join('\n  ')}`).join('\n\n')}

请返回JSON格式的推荐分组，每个分组内的订单必须在同一仓库：
{
  "groups": [
    {
      "reason": "推荐理由，如：这两个订单都在城城通1号仓，商品都在RV-R001货架，可以一次性拣完",
      "orderIds": ["ORD202603226332"]
    }
  ]
}

请只返回JSON，不要其他文字。`;

      console.log('=== AI 提示词 ===');
      console.log(prompt);
      const result = await parseAIResponse<{groups: Array<{reason: string, orderIds: string[]}>}>(prompt);
      console.log('=== AI 响应 ===');
      console.log(result);
      
      if (result && result.groups && result.groups.length > 0) {
        const bestGroup = result.groups[0];
        if (bestGroup.orderIds && bestGroup.orderIds.length > 0) {
          setAiRecommendOrders({ orderIds: bestGroup.orderIds, reason: bestGroup.reason });
        } else {
          toast.error('AI未推荐有效订单组');
        }
      } else {
        toast.error('AI返回格式不正确或无有效分组');
      }
    } catch (error) {
      console.error('AI error:', error);
      toast.error('AI分析失败');
    } finally {
      setAiLoading(false);
    }
  };

  const handlePickComplete = async (pickOrderId: string) => {
    try {
      await pickOrderApi.updateStatus(pickOrderId, 'PICKED', user?.id);
      toast.success('拣货完成');
      fetchData();
    } catch (error) {
      toast.error('操作失败');
    }
  };

  const handleOutboundReview = async (pickOrderId: string, approved: boolean) => {
    try {
      const pickOrder = pickOrders.find(p => p.id === pickOrderId);
      if (pickOrder && pickOrder.orders && pickOrder.orders.length > 0) {
        const orderIds = pickOrder.orders.map((o: any) => o.id);
        if (approved) {
          for (const orderId of orderIds) {
            await orderApi.updateStatus(orderId, 'DISPATCHING');
          }
          await pickOrderApi.updateStatus(pickOrderId, 'COMPLETED', user?.id);
          toast.success('审核通过');
        } else {
          for (const orderId of orderIds) {
            await orderApi.updateStatus(orderId, 'PICKING');
          }
          await pickOrderApi.updateStatus(pickOrderId, 'PICKING');
          toast.success('审核不通过，请重新拣货');
        }
        fetchData();
      }
    } catch (error) {
      toast.error('操作失败');
    }
  };

  return (
    <div className="space-y-6">
      <ToastContainer />
      
      {aiRecommendOrders && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">AI推荐拣货单</h3>
            <p className="text-gray-600 mb-4">
              关联订单：{aiRecommendOrders.orderIds.map(orderNo => {
                const order = pickOrders.find((o: any) => o.order?.orderNo === orderNo);
                return order?.order?.orderNo;
              }).filter(Boolean).join('、')}
            </p>
            <p className="text-gray-600 mb-4">
              {aiRecommendOrders.reason}
            </p>
            <p className="text-gray-600 mb-4">
              是否一次性创建拣货单？
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setAiRecommendOrders(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={async () => {
                  try {
                    const orderIds = aiRecommendOrders.orderIds.map(orderNo => {
                      const order = pickOrders.find((o: any) => o.order?.orderNo === orderNo);
                      return order?.order?.id;
                    }).filter(Boolean);
                    await pickOrderApi.create({ orderIds });
                    toast.success(`已生成 1 个合并拣货单`);
                    setAiRecommendOrders(null);
                    setSelectedOrders([]);
                    fetchData();
                  } catch (error: any) {
                    toast.error(error.response?.data?.message || '批量生成失败');
                  }
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                确认创建
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800">发货管理</h1>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <RefreshCw className="w-4 h-4" />
          刷新
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border">
        <div className="border-b">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-6 py-4 text-base font-medium border-b-2 transition-colors ${
                activeTab === 'pending'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                待拣货订单
              </div>
            </button>
            <button
              onClick={() => setActiveTab('pick')}
              className={`px-6 py-4 text-base font-medium border-b-2 transition-colors ${
                activeTab === 'pick'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5" />
                波次拣货单
              </div>
            </button>
            <button
              onClick={() => setActiveTab('review')}
              className={`px-6 py-4 text-base font-medium border-b-2 transition-colors ${
                activeTab === 'review'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                出库审核
              </div>
            </button>
          </nav>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
          ) : pickOrders.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              暂无数据
            </div>
          ) : activeTab === 'pending' ? (
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-600">已选择 {selectedOrders.length} 个订单</span>
                <div className="flex gap-2">
                  <button
                    onClick={handleAICreatePickOrders}
                    disabled={aiLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    AI波次拣货单
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await pickOrderApi.create({ orderIds: selectedOrders });
                        toast.success(`已生成 1 个合并拣货单`);
                        setSelectedOrders([]);
                        fetchData();
                      } catch (error: any) {
                        toast.error(error.response?.data?.message || '批量生成失败');
                      }
                    }}
                    disabled={selectedOrders.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    生成波次拣货单
                  </button>
                </div>
              </div>
              <div className="overflow-x-visible">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-500 text-sm border-b">
                    <th className="pb-3 w-10">
                      <input
                        type="checkbox"
                        checked={selectedOrders.length === pickOrders.filter((o: any) => !o.order?.pickOrder).length && selectedOrders.length > 0}
                        onChange={(e) => {
                          const availableOrders = pickOrders.filter((o: any) => !o.order?.pickOrder);
                          if (e.target.checked) {
                            setSelectedOrders(availableOrders.map((o: any) => o.order?.id));
                          } else {
                            setSelectedOrders([]);
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </th>
                    <th className="pb-3">订单号</th>
                    <th className="pb-3">下单时间</th>
                    <th className="pb-3">货主</th>
                    <th className="pb-3">仓库</th>
                    <th className="pb-3">商品[库位]</th>
                    <th className="pb-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {pickOrders.filter((o: any) => !o.order?.pickOrder).map(order => (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="py-3">
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(order.order?.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedOrders([...selectedOrders, order.order?.id]);
                            } else {
                              setSelectedOrders(selectedOrders.filter(id => id !== order.order?.id));
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                      </td>
                      <td className="py-3 font-medium">
                        {order.order?.id ? (
                          <Link to={`/orders/${order.order.id}`} className="text-primary-600 hover:text-primary-800 hover:underline">
                            {order.order?.orderNo}
                          </Link>
                        ) : order.order?.orderNo}
                      </td>
                      <td className="py-3 text-gray-500 text-sm">{order.order?.createdAt ? new Date(order.order.createdAt).toLocaleString() : '-'}</td>
                      <td className="py-3">{order.order?.owner?.name}</td>
                      <td className="py-3 text-blue-600">{order.order?.warehouse?.name}</td>
                      <td className="py-3">
                        {order.items?.flatMap((item: any) => {
                          const locks = item.bundleId
                            ? order.bundleStockLocks?.filter((l: any) => l.bundleId === item.bundleId)
                            : order.stockLocks?.filter((l: any) => l.skuId === item.skuId);
                          if (!locks || locks.length === 0) {
                            return [
                              <div key={item.id} className="text-sm mb-1 flex items-center">
                                <span className={item.bundleId ? 'text-purple-600' : 'text-blue-600'}>
                                  {item.bundleId ? <span className="text-purple-500">[套装]</span> : <span className="text-blue-500">[商品]</span>}
                                  {item.productName}
                                  {item.spec && `(${item.spec})`}
                                </span>
                                <span className="text-gray-500 ml-1">{item.packaging && `${item.packaging} `}x{item.quantity}</span>
                              </div>
                            ];
                          }
                          return locks.map((lock: any, idx: number) => {
                            const locationStr = lock?.location ? `${lock.location.shelf?.zone?.code}-${lock.location.shelf?.code}-L${lock.location.level}` : '';
                            const showInfo = item.bundleId && item.bundle?.items?.length > 0;
                            return (
                              <div key={`${item.id}-${idx}`} className="text-sm mb-1 flex items-center">
                                <span className={item.bundleId ? 'text-purple-600' : 'text-blue-600'}>
                                  {item.bundleId ? <span className="text-purple-500">[套装]</span> : <span className="text-blue-500">[商品]</span>}
                                  {item.productName}
                                  {item.spec && `(${item.spec})`}
                                  {showInfo && idx === 0 && (
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
                                <span className="text-gray-500 ml-1">{item.packaging && `${item.packaging} `}x{lock.quantity}</span>
                                {locationStr && (
                                  <span className="ml-1 text-orange-500 text-sm">
                                    [{locationStr}]
                                  </span>
                                )}
                                {lock.batchNo && (
                                  <span className="ml-1 text-purple-500 text-xs">
                                    批:{lock.batchNo}
                                  </span>
                                )}
                              </div>
                            );
                          });
                        })}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={async () => {
                            try {
                              await pickOrderApi.create({ orderId: order.order?.id });
                              toast.success('拣货单已生成');
                              fetchData();
                            } catch (error) {
                              toast.error('生成拣货单失败');
                            }
                          }}
                          className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700"
                        >
                          生成拣货单
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
           ) : (
            <div className="space-y-4">
              {pickOrders.map(pickOrder => (
                <div key={pickOrder.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="font-medium text-gray-900">{pickOrder.pickNo}</span>
                      <span className="text-sm text-gray-500">订单: {pickOrder.orders?.map((o: any) => {
                        const orderId = o?.id;
                        const orderNo = o?.orderNo;
                        if (!orderId || !orderNo) return null;
                        return (
                          <Link key={orderId} to={`/orders/${orderId}`} className="text-primary-600 hover:text-primary-800 hover:underline mx-0.5">
                            {orderNo}
                          </Link>
                        );
                      })}</span>
                      <span className="text-sm text-gray-500">{pickOrder.orders?.[0]?.owner?.name}</span>
                      <span className="text-sm text-blue-600">{pickOrder.orders?.[0]?.warehouse?.name}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        pickOrder.status === 'PENDING' ? 'bg-yellow-500 text-white' :
                        pickOrder.status === 'PICKING' ? 'bg-blue-600 text-white' :
                        'bg-green-600 text-white'
                      }`}>
                        {pickStatusMap[pickOrder.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {pickOrder.status === 'PICKING' && !pickOrder.orders?.some((o: any) => o.status === 'CANCELLED') && (
                        <>
                          <button
                            onClick={() => handlePickComplete(pickOrder.id)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4" />
                            拣货完成
                          </button>
                        </>
                      )}
                      {pickOrder.status === 'PICKING' && pickOrder.orders?.some((o: any) => o.status === 'CANCELLED') && (
                        <span className="text-sm text-red-500">订单已取消</span>
                      )}
                      {pickOrder.status === 'PICKED' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOutboundReview(pickOrder.id, true)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                          >
                            审核通过
                          </button>
                          <button
                            onClick={() => handleOutboundReview(pickOrder.id, false)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                          >
                            审核不通过
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="overflow-x-visible bg-gray-50 rounded-lg p-3">
                    <table className="w-full table-fixed">
                      <thead>
                        <tr className="text-xs text-gray-500">
                          <th className="text-left py-1 w-1/4">商品</th>
                          <th className="text-left py-1 w-1/4">包装/规格</th>
                          <th className="text-left py-1 w-12">数量</th>
                          <th className="text-left py-1 w-1/4">库位(货位)</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {(pickOrder.items || []).map((item: any) => (
                          <tr key={item.id} className="border-t border-gray-200">
                            <td className="py-2 align-top">
                              <div className="flex items-center gap-1">
                                {item.bundleId ? <span className="text-purple-600 font-medium">[套装]</span> : <span className="text-blue-600 font-medium">[商品]</span>}
                                <span className={item.bundleId ? 'text-purple-600 font-medium' : 'font-medium text-blue-600'}>{item.productName}</span>
                                {item.bundleId && item.bundle?.items?.length > 0 && (
                                  <button
                                    type="button"
                                    onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, content: <div><div className="font-semibold mb-2 text-blue-400">套装包含：</div>{item.bundle.items.map((bi: any) => (<div key={bi.id} className="text-gray-200 py-1"><span className="text-blue-400">{bi.sku?.product?.name}</span><span className="text-gray-400"> · {bi.sku?.spec}/{bi.sku?.packaging}</span><span className="text-yellow-400 ml-1">×{bi.quantity}</span></div>))}</div> })}
                                    onMouseLeave={() => setTooltip(null)}
                                    onMouseMove={(e) => setTooltip({ x: e.clientX, y: e.clientY, content: <div><div className="font-semibold mb-2 text-blue-400">套装包含：</div>{item.bundle.items.map((bi: any) => (<div key={bi.id} className="text-gray-200 py-1"><span className="text-blue-400">{bi.sku?.product?.name}</span><span className="text-gray-400"> · {bi.sku?.spec}/{bi.sku?.packaging}</span><span className="text-yellow-400 ml-1">×{bi.quantity}</span></div>))}</div> })}
                                    className="p-0.5 hover:bg-gray-100 rounded"
                                  >
                                    <Info className="w-3 h-3 text-purple-500 cursor-help" />
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-2 align-top text-gray-500">{item.packaging} · {item.spec}</td>
                            <td className="py-2 align-top">{item.quantity}</td>
                            <td className="py-2 align-top text-gray-500">
                              {item.stockLock?.location ? `${item.stockLock.location.shelf?.zone?.code}-${item.stockLock.location.shelf?.code}-L${item.stockLock.location.level}` :
                               item.bundleStockLock?.location ? `${item.bundleStockLock.location.shelf?.zone?.code}-${item.bundleStockLock.location.shelf?.code}-L${item.bundleStockLock.location.level}` :
                               item.warehouseLocation ? `${item.warehouseLocation}${pickOrder.status === 'CANCELLED' ? '' : ' (已出库)'}` : '-'}
                              {(item.batchNo || item.stockLock?.batchNo || item.bundleStockLock?.batchNo) && (
                                <span className="text-purple-500 ml-1">
                                  批:{item.batchNo || item.stockLock?.batchNo || item.bundleStockLock?.batchNo}
                                </span>
                              )}
                              {pickOrder.orders?.some((o: any) => o.status === 'CANCELLED') && ' (已退回)'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {pickOrder.orders && pickOrder.orders.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {pickOrder.orders.map((o: any) => (
                        <div key={o.id} className="text-sm border-l-2 border-primary-300 pl-2 space-y-1">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Phone className="w-4 h-4" />
                            <span>{o.receiver}</span>
                            <span className="text-gray-400">{formatPhone(o.phone)}</span>
                          </div>
                          <div className="flex items-start gap-2 text-gray-600">
                            <MapPin className="w-4 h-4 mt-0.5" />
                            <span>{formatAddress(o.province, o.city, o.address)}</span>
                          </div>
                          <div className="flex items-start gap-2 text-gray-600">
                            <ShoppingCart className="w-4 h-4 mt-0.5" />
                            <div>
                              {o.items?.map((item: any) => (
                                <span key={item.id} className="mr-2 inline-flex items-center">
                                  {item.bundleId ? <span className="text-purple-600">[套装]</span> : <span className="text-blue-600">[商品]</span>}
                                  <span className={item.bundleId ? 'text-purple-600' : 'text-blue-600'}>{item.productName}</span> {item.spec} {item.packaging}
                                  {item.bundleId && item.bundle?.items?.length > 0 && (
                                    <button
                                      type="button"
                                      onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, content: <div><div className="font-semibold mb-2 text-blue-400">套装包含：</div>{item.bundle.items.map((bi: any) => (<div key={bi.id} className="text-gray-200 py-1"><span className="text-blue-400">{bi.sku?.product?.name}</span><span className="text-gray-400"> · {bi.sku?.spec}/{bi.sku?.packaging}</span><span className="text-yellow-400 ml-1">×{bi.quantity}</span></div>))}</div> })}
                                      onMouseLeave={() => setTooltip(null)}
                                      onMouseMove={(e) => setTooltip({ x: e.clientX, y: e.clientY, content: <div><div className="font-semibold mb-2 text-blue-400">套装包含：</div>{item.bundle.items.map((bi: any) => (<div key={bi.id} className="text-gray-200 py-1"><span className="text-blue-400">{bi.sku?.product?.name}</span><span className="text-gray-400"> · {bi.sku?.spec}/{bi.sku?.packaging}</span><span className="text-yellow-400 ml-1">×{bi.quantity}</span></div>))}</div> })}
                                      className="p-0.5 hover:bg-gray-100 rounded mx-1"
                                    >
                                      <Info className="w-3 h-3 text-purple-500 cursor-help" />
                                    </button>
                                  )}
                                  x{item.quantity}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {(pickOrder.picker || pickOrder.approver) && (
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200 justify-end">
                      {pickOrder.picker && <span>拣货人: {pickOrder.picker.name}</span>}
                      {pickOrder.approver && <span>审核人: {pickOrder.approver.name}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
