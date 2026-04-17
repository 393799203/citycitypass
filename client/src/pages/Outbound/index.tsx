import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { orderApi, pickOrderApi } from '../../api';
import { aiApi } from '../../api/ai';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Loader2, Package, CheckCircle, ClipboardList, RefreshCw, Sparkles } from 'lucide-react';
import { formatPhone, formatAddress } from '../../utils/format';
import { useAuthStore } from '../../stores/auth';
import { Order, AISuggestion } from '../../types/orders';
import { PickOrder, TooltipContent } from '../../types/outbound';
import PendingOrdersTab from './PendingOrdersTab';
import WavePickingTab from './WavePickingTab';
import OutboundReviewTab from './OutboundReviewTab';
import { usePermission } from '../../hooks/usePermission';

const pickStatusMap: Record<string, string> = {
  PENDING: '待拣货',
  PICKING: '拣货中',
  PICKED: '已拣货',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

export default function OutboundPage() {
  const { user } = useAuthStore();
  const { canWrite } = usePermission('business', 'outbound');
  const [activeTab, setActiveTab] = useState<'pending' | 'pick' | 'review'>('pending');
  const [pickOrders, setPickOrders] = useState<PickOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecommendOrders, setAiRecommendOrders] = useState<AISuggestion | null>(null);
  const [tooltip, setTooltip] = useState<TooltipContent | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'pending') {
        const res = await orderApi.list({ status: 'PENDING', pageSize: 100 });
        if (res.data.success) {
          const pendingOrders = res.data.data.filter((o: Order) => !o.pickOrder);
          setPickOrders(pendingOrders.map((o: Order) => ({
            id: o.id,
            pickNo: o.orderNo,
            status: 'PENDING',
            orders: [o],
            items: o.items || [],
            stockLocks: o.stockLocks || [],
            bundleStockLocks: o.bundleStockLocks || [],
          })));
        }
      } else {
        const res = await pickOrderApi.list({});
        if (res.data.success) {
          if (activeTab === 'pick') {
            const pickOrders = res.data.data.filter((o: PickOrder) => 
              o.status === 'PICKING' || o.status === 'CANCELLED'
            );
            setPickOrders(pickOrders);
          } else if (activeTab === 'review') {
            const reviewOrders = res.data.data.filter((o: PickOrder) => o.status === 'PICKED' || o.status === 'COMPLETED');
            reviewOrders.sort((a: PickOrder, b: PickOrder) => {
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
  }, [activeTab]);

  const handleAICreatePickOrders = async () => {
    const pendingOrders = pickOrders.filter((o: PickOrder) => !o.orders?.[0]?.pickOrder);
    if (pendingOrders.length === 0) {
      toast.error('没有待拣货订单');
      return;
    }

    setAiLoading(true);
    try {
      const orderList = pendingOrders.map((o: PickOrder) => {
        const itemLocations = o.items?.map((item) => {
          const order = o.orders?.[0];
          const lock = item.skuId
            ? order?.stockLocks?.find((l) => l.skuId === item.skuId)
            : order?.bundleStockLocks?.find((l) => l.bundleId === item.bundleId);
          const loc = lock?.location;
          const zone = loc?.shelf?.zone;
          const locationStr = loc
            ? `${order?.warehouse?.name || '仓库'}-${zone?.code || '?'}-${loc.shelf?.code || '?'}-L${loc.level}`
            : '';
          return `${item.bundleId ? '[套装] ' : '[商品] '}${item.productName} ${item.spec || ''} ${item.packaging || ''} x${item.quantity}${locationStr ? ` 库位: ${locationStr}` : ''}`;
        }) || [];
        const order = o.orders?.[0];
        return {
          id: order?.id,
          orderNo: order?.orderNo,
          warehouse: order?.warehouse?.name || '未知仓库',
          warehouseId: order?.warehouseId,
          createdAt: order?.createdAt,
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
      "reason": "推荐理由，如：这两个订单都在智链云仓1号仓，商品都在RV-R001货架，可以一次性拣完",
      "orderIds": ["ORD202603226332"]
    }
  ]
}

请只返回JSON，不要其他文字。`;

      console.log('=== AI 提示词 ===');
      console.log(prompt);
      const result = await aiApi.parseAIResponse<{groups: Array<{reason: string, orderIds: string[]}>}>(prompt);
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
        const orderIds = pickOrder.orders.map((o) => o.id);
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

  const handleSelectOrder = (orderId: string, selected: boolean) => {
    if (selected) {
      setSelectedOrders([...selectedOrders, orderId]);
    } else {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    const availableOrders = pickOrders.filter((o: PickOrder) => !o.orders?.[0]?.pickOrder);
    if (selected) {
      setSelectedOrders(availableOrders.map((o: PickOrder) => o.orders?.[0]?.id || ''));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleCreatePickOrder = async (orderId: string) => {
    try {
      await pickOrderApi.create({ orderId });
      toast.success('拣货单已生成');
      fetchData();
    } catch (error) {
      toast.error('生成拣货单失败');
    }
  };

  const handleCreateBatchPickOrders = async () => {
    try {
      await pickOrderApi.create({ orderIds: selectedOrders });
      toast.success(`已生成 1 个合并拣货单`);
      setSelectedOrders([]);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '批量生成失败');
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
                const order = pickOrders.find((o: PickOrder) => o.orders?.[0]?.orderNo === orderNo);
                return order?.orders?.[0]?.orderNo;
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
                      const order = pickOrders.find((o: PickOrder) => o.orders?.[0]?.orderNo === orderNo);
                      return order?.orders?.[0]?.id;
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
                拣货调度中心(待拣货订单)
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
          ) : activeTab === 'pending' ? (
            <PendingOrdersTab
              orders={pickOrders.map((o) => o.orders?.[0]).filter(Boolean) as Order[]}
              selectedOrders={selectedOrders}
              aiLoading={aiLoading}
              onSelectOrder={handleSelectOrder}
              onSelectAll={handleSelectAll}
              onCreatePickOrder={handleCreatePickOrder}
              onAICreatePickOrders={handleAICreatePickOrders}
              onCreateBatchPickOrders={handleCreateBatchPickOrders}
              onTooltip={setTooltip}
              canWrite={canWrite}
            />
           ) : activeTab === 'pick' ? (
            <WavePickingTab
              pickOrders={pickOrders}
              onPickComplete={handlePickComplete}
              onOutboundReview={handleOutboundReview}
              onTooltip={setTooltip}
              canWrite={canWrite}
            />
          ) : (
            <OutboundReviewTab
              pickOrders={pickOrders}
              onPickComplete={handlePickComplete}
              onOutboundReview={handleOutboundReview}
              onTooltip={setTooltip}
              canWrite={canWrite}
            />
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
