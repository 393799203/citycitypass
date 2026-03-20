import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Truck, Package, MapPin, Clock, CheckCircle, X, Plus, RefreshCw, Sparkles, Loader2 } from 'lucide-react';
import { orderApi, vehicleApi, driverApi, dispatchApi, warehouseApi } from '../api';
import { parseAIResponse } from '../api/ai';

const orderStatusMap: Record<string, string> = {
  PENDING: '待拣货',
  PICKING: '拣货中',
  OUTBOUND_REVIEW: '出库审核中',
  DISPATCHING: '待运力调度',
  DISPATCHED: '已调度',
  IN_TRANSIT: '运输中',
  DELIVERED: '已送达',
  CANCELLED: '已取消',
};

const dispatchStatusMap: Record<string, string> = {
  PENDING: '待发运',
  IN_TRANSIT: '配送中',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

export default function DispatchCenterPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'dispatches'>('pending');
  const [orders, setOrders] = useState<any[]>([]);
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecommendOrders, setAiRecommendOrders] = useState<{orderIds: string[], reason: string, vehicleId?: string, driverId?: string} | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    orderIds: [] as string[],
    vehicleId: '',
    driverId: '',
    scheduledTime: '',
    remark: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [orderRes, dispatchRes, vehicleRes, driverRes, warehouseRes] = await Promise.all([
        orderApi.list({ status: 'DISPATCHING' }),
        dispatchApi.list({}),
        vehicleApi.list({ status: 'AVAILABLE' }),
        driverApi.list({ status: 'AVAILABLE' }),
        warehouseApi.list({}),
      ]);

      if (orderRes.data.success) {
        setOrders(orderRes.data.data);
      }
      if (dispatchRes.data.success) {
        setDispatches(dispatchRes.data.data);
      }
      if (vehicleRes.data.success) {
        setVehicles(vehicleRes.data.data);
      }
      if (driverRes.data.success) {
        setDrivers(driverRes.data.data);
      }
      if (warehouseRes.data.success) {
        setWarehouses(warehouseRes.data.data);
      }
    } catch (error) {
      console.error('Fetch data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleAICreateDispatch = async () => {
    if (orders.length === 0) {
      toast.error('没有待调度订单');
      return;
    }

    setAiLoading(true);
    try {
      const orderList = orders.map(o => ({
        id: o.id,
        orderNo: o.orderNo,
        city: o.city,
        province: o.province,
        address: o.address,
        receiver: o.receiver,
        phone: o.phone,
        warehouseId: o.warehouseId,
        warehouseName: o.warehouse?.name,
        warehouseLatitude: o.warehouse?.latitude,
        warehouseLongitude: o.warehouse?.longitude,
      }));

      const warehouseInfo = orderList[0]?.warehouseId ? warehouses.find(w => w.id === orderList[0].warehouseId) : null;
      
      let recommendedVehicle = null;
      let recommendedDriver = null;
      let vehicleReason = '';
      let driverReason = '';

      if (warehouseInfo?.latitude && warehouseInfo?.longitude) {
        const availableVehicles = vehicles.filter(v => v.status === 'AVAILABLE' && v.latitude && v.longitude);
        if (availableVehicles.length > 0) {
          const sortedVehicles = availableVehicles.map(v => ({
            ...v,
            distance: Math.sqrt(
              Math.pow((v.latitude - warehouseInfo.latitude), 2) + 
              Math.pow((v.longitude - warehouseInfo.longitude), 2)
            )
          })).sort((a, b) => a.distance - b.distance);
          
          recommendedVehicle = sortedVehicles[0];
          vehicleReason = `距离仓库最近：${recommendedVehicle.address || recommendedVehicle.location || '未知位置'} (${recommendedVehicle.distance?.toFixed(4)})`;
        }

        const availableDrivers = drivers.filter(d => d.status === 'AVAILABLE' && d.latitude && d.longitude);
        if (availableDrivers.length > 0) {
          const sortedDrivers = availableDrivers.map(d => ({
            ...d,
            distance: Math.sqrt(
              Math.pow((d.latitude - warehouseInfo.latitude), 2) + 
              Math.pow((d.longitude - warehouseInfo.longitude), 2)
            )
          })).sort((a, b) => a.distance - b.distance);
          
          recommendedDriver = sortedDrivers[0];
          driverReason = `距离仓库最近：${recommendedDriver.address || recommendedDriver.location || '未知位置'} (${recommendedDriver.distance?.toFixed(4)})`;
        }
      }

      const prompt = `你是一个物流调度助手。我有${orderList.length}个待调度的订单，请帮我分析并将同一仓库、目的地同一城市（或相近区域）的订单推荐为一组。

重要规则：
1. 必须优先选择同一仓库的订单
2. 同一仓库中优先选择订单数量最多的城市/区域
3. 跨仓库的订单不建议归在一起

订单列表：
${orderList.map(o => `订单ID: ${o.id}, 仓库: ${o.warehouseName || '未知'}, 城市: ${o.province}${o.city}, 地址: ${o.address}`).join('\n')}

请返回JSON格式的推荐分组：
{
  "groups": [
    {
      "reason": "推荐理由",
      "orderIds": ["订单ID1", "订单ID2"]
    }
  ]
}

请只返回JSON，不要其他文字。`;

      const result = await parseAIResponse<{groups: Array<{reason: string, orderIds: string[]}>}>(prompt);
      
      if (result && result.groups && result.groups.length > 0) {
        const bestGroup = result.groups[0];
        if (bestGroup.orderIds && bestGroup.orderIds.length > 0) {
          const finalVehicle = recommendedVehicle;
          const finalDriver = recommendedDriver;
          
          let fullReason = bestGroup.reason;
          if (finalVehicle) {
            fullReason += `；推荐车辆：${finalVehicle.licensePlate} (${vehicleReason})`;
          }
          if (finalDriver) {
            fullReason += `；推荐司机：${finalDriver.name} - ${finalDriver.phone} (${driverReason})`;
          }
          setAiRecommendOrders({ 
            orderIds: bestGroup.orderIds, 
            reason: fullReason,
            vehicleId: finalVehicle?.id,
            driverId: finalDriver?.id,
          });
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

  const handleCreateDispatch = async () => {
    if (!createForm.vehicleId || !createForm.driverId || selectedOrders.length === 0) {
      toast.error('请选择车辆、司机和订单');
      return;
    }

    try {
      await dispatchApi.create({
        vehicleId: createForm.vehicleId,
        driverId: createForm.driverId,
        warehouseId: orders[0]?.warehouseId,
        orderIds: selectedOrders,
        remark: createForm.remark,
      });
      toast.success('配送单创建成功');
      setShowCreateModal(false);
      setSelectedOrders([]);
      setCreateForm({ orderIds: [], vehicleId: '', driverId: '', scheduledTime: '', remark: '' });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '创建失败');
    }
  };

  const handleDispatchStatus = async (dispatchId: string, status: string) => {
    try {
      await dispatchApi.updateStatus(dispatchId, status);
      toast.success('状态更新成功');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  const selectedOrderDetails = orders.filter(o => selectedOrders.includes(o.id));

  return (
    <div className="p-6">
      <ToastContainer />
      
      {aiRecommendOrders && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">AI推荐调度</h3>
            <p className="text-gray-600 mb-4">
              关联订单：{aiRecommendOrders.orderIds.map(id => {
                const order = orders.find((o: any) => o.id === id);
                return order?.orderNo;
              }).filter(Boolean).join('、')}
            </p>
            <p className="text-gray-600 mb-4">
              {aiRecommendOrders.reason}
            </p>
            <p className="text-gray-600 mb-4">
              是否一键创建调度单？
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
                    const order = orders.find((o: any) => aiRecommendOrders.orderIds.includes(o.id));
                    if (!order) {
                      toast.error('订单不存在');
                      return;
                    }
                    setCreateForm({
                      orderIds: aiRecommendOrders.orderIds,
                      vehicleId: aiRecommendOrders.vehicleId || '',
                      driverId: aiRecommendOrders.driverId || '',
                      scheduledTime: new Date().toISOString().slice(0, 16),
                      remark: '',
                    });
                    setSelectedOrders(aiRecommendOrders.orderIds);
                    setShowCreateModal(true);
                    setAiRecommendOrders(null);
                  } catch (error) {
                    toast.error('创建失败');
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

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Truck className="w-6 h-6" />
          运力调度
        </h1>
        <button
          onClick={() => fetchData()}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          刷新
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'pending'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Package className="w-4 h-4 inline mr-2" />
            待调度订单 ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('dispatches')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'dispatches'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Truck className="w-4 h-4 inline mr-2" />
            配送单管理
          </button>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : activeTab === 'pending' ? (
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-600">已选择 {selectedOrders.length} 个订单</span>
                <div className="flex gap-2">
                  <button
                    onClick={handleAICreateDispatch}
                    disabled={aiLoading || orders.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    AI调度
                  </button>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    disabled={selectedOrders.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    创建配送单
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-500 text-sm border-b">
                      <th className="pb-3 w-10"></th>
                      <th className="pb-3">订单号</th>
                      <th className="pb-3">发货仓库</th>
                      <th className="pb-3">发货地址</th>
                      <th className="pb-3">收货人</th>
                      <th className="pb-3">联系电话</th>
                      <th className="pb-3">收货地址</th>
                      <th className="pb-3">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr key={order.id} className="border-b hover:bg-gray-50">
                        <td className="py-3">
                          <input
                            type="checkbox"
                            checked={selectedOrders.includes(order.id)}
                            onChange={() => toggleOrderSelection(order.id)}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                        </td>
                        <td className="py-3 font-medium">{order.orderNo}</td>
                        <td className="py-3">{order.warehouse?.name || '-'}</td>
                        <td className="py-3 text-gray-500 text-sm">{order.warehouse?.address || '-'}</td>
                        <td className="py-3">{order.receiver}</td>
                        <td className="py-3">{order.phone}</td>
                        <td className="py-3">{order.province}{order.city}{order.address}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            order.status === 'PENDING' ? 'bg-yellow-600 text-white' :
                            order.status === 'APPROVED' ? 'bg-blue-600 text-white' :
                            order.status === 'PICKING' ? 'bg-indigo-600 text-white' :
                            order.status === 'OUTBOUND_REVIEW' ? 'bg-purple-600 text-white' :
                            order.status === 'DISPATCHING' ? 'bg-cyan-600 text-white' :
                            order.status === 'DISPATCHED' ? 'bg-cyan-600 text-white' :
                            order.status === 'IN_TRANSIT' ? 'bg-purple-600 text-white' :
                            order.status === 'DELIVERED' ? 'bg-green-600 text-white' :
                            'bg-red-600 text-white'
                          }`}>
                            {orderStatusMap[order.status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-500">
                          暂无待调度订单
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-500 text-sm border-b">
                    <th className="pb-3">配送单号</th>
                    <th className="pb-3">目的城市</th>
                    <th className="pb-3">车辆</th>
                    <th className="pb-3">司机</th>
                    <th className="pb-3">订单数</th>
                    <th className="pb-3">总重量</th>
                    <th className="pb-3">距离</th>
                    <th className="pb-3">状态</th>
                    <th className="pb-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {dispatches.map(dispatch => (
                    <tr key={dispatch.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 font-medium">
                        <Link to={`/dispatch/${dispatch.id}`} className="text-primary-600 hover:underline">
                          {dispatch.dispatchNo}
                        </Link>
                      </td>
                      <td className="py-3">
                          {dispatch.orders?.[0]?.order?.city || '-'}
                        </td>
                        <td className="py-3">
                          {dispatch.vehicle?.licensePlate}
                        </td>
                      <td className="py-3">{dispatch.driver?.name}</td>
                      <td className="py-3">{dispatch.orderCount}</td>
                      <td className="py-3">{dispatch.totalWeight}吨</td>
                      <td className="py-3">{dispatch.totalDistance ? dispatch.totalDistance.toFixed(1) + 'km' : '-'}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          dispatch.status === 'PENDING' ? 'bg-yellow-600 text-white' :
                          dispatch.status === 'DISPATCHING' ? 'bg-blue-600 text-white' :
                          dispatch.status === 'COMPLETED' ? 'bg-green-600 text-white' :
                          'bg-gray-600 text-white'
                        }`}>
                          {dispatchStatusMap[dispatch.status]}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {dispatch.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleDispatchStatus(dispatch.id, 'IN_TRANSIT')}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 mr-2"
                            >
                              发车
                            </button>
                            <button
                              onClick={() => handleDispatchStatus(dispatch.id, 'CANCELLED')}
                              className="px-3 py-1 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700"
                            >
                              取消
                            </button>
                          </>
                        )}
                        {(dispatch.status === 'CANCELLED') && (
                          <button
                            onClick={async () => {
                              if (confirm('确定要删除此配送单吗？')) {
                                try {
                                  await dispatchApi.delete(dispatch.id);
                                  toast.success('删除成功');
                                  fetchData();
                                } catch (error: any) {
                                  toast.error(error.response?.data?.message || '删除失败');
                                }
                              }
                            }}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                          >
                            删除
                          </button>
                        )}
                        {dispatch.status === 'IN_TRANSIT' && (
                          <button
                            onClick={() => handleDispatchStatus(dispatch.id, 'COMPLETED')}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                          >
                            完成配送
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {dispatches.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-500">
                        暂无配送单
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">创建配送单</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">选择订单</label>
                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
                  {selectedOrderDetails.map(order => (
                    <div key={order.id} className="flex items-center gap-2 py-1 text-sm">
                      <input type="checkbox" checked disabled className="w-4 h-4" />
                      <span>{order.orderNo} - {order.province}{order.city}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">选择车辆</label>
                <select
                  value={createForm.vehicleId}
                  onChange={e => setCreateForm({ ...createForm, vehicleId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">请选择车辆</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.licensePlate} ({v.vehicleType} - {v.capacity}吨) - {v.address || '未设置位置'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">选择司机</label>
                <select
                  value={createForm.driverId}
                  onChange={e => setCreateForm({ ...createForm, driverId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">请选择司机</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} - {d.phone} - {d.address || '未设置位置'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <textarea
                  value={createForm.remark}
                  onChange={e => setCreateForm({ ...createForm, remark: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                  placeholder="可选"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleCreateDispatch}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
