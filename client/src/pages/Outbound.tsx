import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orderApi, pickOrderApi } from '../api';
import { parseAIResponse } from '../api/ai';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Loader2, Package, CheckCircle, ClipboardList, Truck, RefreshCw, Sparkles, Info } from 'lucide-react';

const pickStatusMap: Record<string, string> = {
  PENDING: '待拣货',
  PICKING: '拣货中',
  PICKED: '已拣货',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

export default function OutboundPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'pick' | 'review'>('pending');
  const [pickOrders, setPickOrders] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [pickCount, setPickCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecommendOrders, setAiRecommendOrders] = useState<{orderIds: string[], reason: string} | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  useEffect(() => {
    orderApi.list({ status: 'PENDING', pageSize: 1 }).then(res => {
      if (res.data.success) {
        const count = res.data.data.filter((o: any) => !o.pickOrder).length;
        setPendingCount(count);
      }
    });
    
    pickOrderApi.list({ status: 'PICKING', pageSize: 1 }).then(res => {
      if (res.data.success) {
        setPickCount(res.data.total || 0);
      }
    });
  }, []);

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
            setPickCount(pickOrders.length);
          } else if (activeTab === 'review') {
            const reviewOrders = res.data.data.filter((o: any) => o.status === 'PICKED' || o.status === 'COMPLETED');
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
      const orderList = pendingOrders.map((o: any) => ({
        id: o.order?.id,
        orderNo: o.order?.orderNo,
        warehouse: o.order?.warehouse?.name,
        warehouseId: o.order?.warehouseId,
        createdAt: o.order?.createdAt,
        items: o.items?.map((item: any) => `${item.bundleId ? '[套装] ' : ''}${item.productName} ${item.spec || ''} ${item.packaging || ''} x${item.quantity}`) || [],
      }));

      const prompt = `你是一个物流拣货助手。我有${orderList.length}个待拣货的订单，请帮我分析并将可以一次性合并拣货的订单推荐为一组。

推荐规则（按优先级排序）：
1. 优先选择同一仓库的订单
2. 同一仓库内，优先选择下单时间相近的订单（比如同一天或相近几小时内）
3. 优先选择订单数量最多的仓库

订单列表（包含下单时间）：
${orderList.map(o => `ID: ${o.id}, 订单号: ${o.orderNo}, 仓库: ${o.warehouse}, 下单时间: ${new Date(o.createdAt).toLocaleString()}, 商品: ${o.items.join(', ')}`).join('\n')}

请返回JSON格式的推荐分组，格式如下：
{
  "groups": [
    {
      "reason": "推荐理由，如：这些订单都在杭州分仓，下单时间相近，共X单",
      "orderIds": ["订单ID1", "订单ID2"]
    }
  ]
}

请只返回JSON，不要其他文字。`;

      const result = await parseAIResponse<{groups: Array<{reason: string, orderIds: string[]}>}>(prompt);
      
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
      await pickOrderApi.updateStatus(pickOrderId, 'PICKED');
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
          await pickOrderApi.updateStatus(pickOrderId, 'COMPLETED');
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
              关联订单：{aiRecommendOrders.orderIds.map(id => {
                const order = pickOrders.find((o: any) => o.order?.id === id);
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
                    await pickOrderApi.create({ orderIds: aiRecommendOrders.orderIds });
                    toast.success(`已生成 1 个合并拣货单`);
                    setAiRecommendOrders(null);
                    setSelectedOrders([]);
                    fetchData();
                    orderApi.list({ status: 'PENDING', pageSize: 1 }).then(res => {
                      if (res.data.success) {
                        setPendingCount(res.data.data.filter((o: any) => !o.pickOrder).length);
                      }
                    });
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
                待拣货 ({pendingCount})
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
                拣货单 ({pickCount})
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
                    disabled={aiLoading || pendingCount === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    AI生成拣货单
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await pickOrderApi.create({ orderIds: selectedOrders });
                        toast.success(`已生成 1 个合并拣货单`);
                        setSelectedOrders([]);
                        fetchData();
                        orderApi.list({ status: 'PENDING', pageSize: 1 }).then(res => {
                          if (res.data.success) {
                            setPendingCount(res.data.data.filter((o: any) => !o.pickOrder).length);
                          }
                        });
                      } catch (error: any) {
                        toast.error(error.response?.data?.message || '批量生成失败');
                      }
                    }}
                    disabled={selectedOrders.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    批量生成拣货单
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
                    <th className="pb-3">商品</th>
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
                      <td className="py-3 font-medium">{order.order?.orderNo}</td>
                      <td className="py-3 text-gray-500 text-sm">{order.order?.createdAt ? new Date(order.order.createdAt).toLocaleString() : '-'}</td>
                      <td className="py-3">{order.order?.owner?.name}</td>
                      <td className="py-3 text-blue-600">{order.order?.warehouse?.name}</td>
                      <td className="py-3">
                        {order.items?.map((item: any) => (
                          <span key={item.id} className="inline-block mr-2 text-sm">
                            {item.bundleId && <span className="text-purple-600">[套装]</span>}
                            <span className={item.bundleId ? 'text-purple-600' : 'text-blue-600'}>{item.productName}</span> {item.spec && `(${item.spec})`} {item.packaging && `· ${item.packaging}`} x{item.quantity}
                          </span>
                        ))}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={async () => {
                            try {
                              await pickOrderApi.create({ orderId: order.order?.id });
                              toast.success('拣货单已生成');
                              fetchData();
                              orderApi.list({ status: 'PENDING', pageSize: 1 }).then(res => {
                                if (res.data.success) {
                                  setPendingCount(res.data.data.filter((o: any) => !o.pickOrder).length);
                                }
                              });
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
                      <span className="text-sm text-gray-500">订单: {pickOrder.orders?.map((o: any) => o.orderNo).join(', ')}</span>
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
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-gray-500">
                          <th className="text-left py-1">商品</th>
                          <th className="text-left py-1">包装/规格</th>
                          <th className="text-left py-1">数量</th>
                          <th className="text-left py-1">库位(货架)</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {(pickOrder.items || []).map((item: any) => (
                          <tr key={item.id} className="border-t border-gray-200">
                            <td className="py-2">
                              {item.bundleId ? (
                                <div className="flex items-center p-1 gap-1">
                                  <span className="text-purple-600 font-medium">[套装] {item.productName}</span>
                                  {item.bundle?.items?.length > 0 && (
                                    <div className="relative group">
                                      <Info className="w-3 h-3 text-gray-400 cursor-help" />
                                      <div className="absolute left-0 top-5 z-10 hidden group-hover:block bg-gray-800 text-white text-xs rounded p-2 min-w-[180px]">
                                        <div className="font-medium mb-1">套装包含：</div>
                                        {item.bundle.items.map((bi: any) => (
                                          <div key={bi.id} className="text-gray-300">
                                            {bi.sku?.product?.name} - {bi.sku?.spec}/{bi.sku?.packaging} × {bi.quantity}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="rounded-lg p-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-blue-600">{item.productName}</span>
                                    {item.categoryName && (
                                      <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded">
                                        {item.categoryName}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="py-2 text-gray-500">{item.packaging} · {item.spec}</td>
                            <td className="py-2 text-left">{item.quantity}</td>
                            <td className="py-2 text-gray-500">
                              {item.stockLock?.shelf?.code || item.warehouseLocation || '-'}
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
                        <div key={o.id} className="text-sm border-l-2 border-primary-300 pl-2">
                          <div className="text-gray-500">收货人: {o.receiver} | {o.phone} | {o.address}</div>
                          <div className="ml-2 mt-1 text-xs text-gray-400">
                            {o.items?.map((item: any) => (
                              <span key={item.id} className="mr-2">
                                {item.bundleId && <span className="text-purple-600">[套装]</span>}
                                <span className={item.bundleId ? 'text-purple-600' : 'text-blue-600'}>{item.productName}</span> {item.spec} {item.packaging} x{item.quantity}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
