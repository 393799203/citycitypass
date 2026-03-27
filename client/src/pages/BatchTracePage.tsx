import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { stockApi } from '../api';
import { Package, MapPin, ShoppingCart, ArrowRight, RefreshCw, Search } from 'lucide-react';
import { toast } from 'react-toastify';

interface TraceData {
  batchNo: string;
  totalInStock: number;
  totalInWarehouse: number;
  totalLocked: number;
  totalSold: number;
  stockIns: Array<{
    type: string;
    productName?: string;
    bundleName?: string;
    quantity: number;
    warehouse: string;
    locationCode: string;
    createdAt: string;
  }>;
  bundleStockIns: Array<{
    type: string;
    productName?: string;
    bundleName?: string;
    quantity: number;
    warehouse: string;
    locationCode: string;
    createdAt: string;
  }>;
  locations: Array<{
    type: string;
    locationCode: string;
    quantity: number;
    availableQuantity: number;
    lockedQuantity: number;
    warehouse: string;
  }>;
  soldOrders: Array<{
    type: string;
    orderNo: string;
    orderId: string;
    customer: string;
    customerPhone: string;
    quantity: number;
    productName?: string;
    bundleName?: string;
    warehouse: string;
    createdAt: string;
  }>;
  transferRecords: Array<{
    type: string;
    transferNo: string;
    fromLocation: string;
    toLocation: string;
    quantity: number;
    status: string;
    executedAt: string;
  }>;
}

export default function BatchTracePage() {
  const { batchNo } = useParams<{ batchNo: string }>();
  const navigate = useNavigate();
  const [inputBatchNo, setInputBatchNo] = useState('');
  const [batchList, setBatchList] = useState<string[]>([]);
  const [traceData, setTraceData] = useState<TraceData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBatchList();
    if (batchNo) {
      loadTraceData(batchNo);
    }
  }, [batchNo]);

  const loadBatchList = async () => {
    try {
      const res = await stockApi.batchList();
      if (res.data.success) {
        setBatchList(res.data.data);
      }
    } catch (error) {
      console.error('Failed to load batch list', error);
    }
  };

  const loadTraceData = async (batch: string) => {
    if (!batch.trim()) {
      toast.error('请输入批次号');
      return;
    }
    setLoading(true);
    try {
      const res = await stockApi.batchTrace(batch);
      if (res.data.success) {
        setTraceData(res.data.data);
      } else {
        toast.error(res.data.message || '加载失败');
        setTraceData(null);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '加载失败');
      setTraceData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (inputBatchNo.trim()) {
      navigate(`/batch-trace/${inputBatchNo.trim()}`);
    }
  };

  if (!batchNo) {
    return (
      <div className="min-h-[calc(100vh-120px)] bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex flex-col items-center justify-center p-8">
        <h1 className="text-5xl font-bold text-white mb-3 tracking-tight drop-shadow-lg">批次追踪</h1>
        <p className="text-white/80 mb-10 text-lg">输入批次号追踪货物流向</p>

        <div className="w-full max-w-2xl bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
          <div className="flex gap-4 mb-8">
            <input
              type="text"
              value={inputBatchNo}
              onChange={(e) => setInputBatchNo(e.target.value)}
              placeholder="请输入批次号"
              className="flex-1 px-6 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            />
            <button
              onClick={handleSearch}
              disabled={!inputBatchNo.trim()}
              className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 flex items-center gap-2 text-lg font-medium shadow-lg hover:shadow-xl transition-all"
            >
              <Search className="w-6 h-6" />
              查询
            </button>
          </div>

          {loading && (
            <div className="mt-4 text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
              <p className="mt-2 text-gray-500">加载中...</p>
            </div>
          )}

          {!loading && batchList.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">最近批次</h3>
              <div className="flex flex-wrap gap-3">
                {batchList.slice(0, 30).map((batch) => (
                  <button
                    key={batch}
                    onClick={() => navigate(`/batch-trace/${batch}`)}
                    className="px-5 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 rounded-xl text-base font-mono text-gray-700 border border-indigo-100 hover:border-indigo-300 hover:shadow-md transition-all"
                  >
                    {batch}
                  </button>
                ))}
              </div>
              {batchList.length > 30 && (
                <p className="text-sm text-gray-400 mt-4">还有 {batchList.length - 30} 个批次...</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500" />
          <p className="mt-2 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!traceData) {
    return (
      <div className="p-6">
        <div className="max-w-xl mx-auto mt-20">
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <p className="text-red-600 mb-4">未找到该批次的数据</p>
            <button
              onClick={() => navigate('/batch-trace')}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              返回查询
            </button>
          </div>
        </div>
      </div>
    );
  }

  const allStockIns = [...(traceData.stockIns || []), ...(traceData.bundleStockIns || [])];
  const totalInbound = allStockIns.reduce((sum: number, s: any) => sum + s.quantity, 0);
  const totalInWarehouse = traceData.locations.reduce((sum: number, l: any) => sum + l.quantity, 0);
  const totalSold = traceData.soldOrders.reduce((sum: number, o: any) => sum + o.quantity, 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">批次追踪</h1>
          <p className="text-sm text-gray-500 mt-1">批次号: <span className="font-mono text-blue-600">{batchNo}</span></p>
        </div>
        <button
          onClick={() => loadTraceData(batchNo)}
          className="p-2 hover:bg-gray-100 rounded-lg"
          title="刷新"
        >
          <RefreshCw className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{totalInbound}</div>
          <div className="text-sm text-gray-600 mt-1">总入库</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{totalInWarehouse}</div>
          <div className="text-sm text-gray-600 mt-1">当前在库</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{totalSold}</div>
          <div className="text-sm text-gray-600 mt-1">已售出</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{totalInbound - totalInWarehouse - totalSold}</div>
          <div className="text-sm text-gray-600 mt-1">其他状态</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-500" />
          物流流向图
        </h3>

        <div className="flex flex-col items-center gap-6">
          <div className="relative flex items-center gap-8">
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex flex-col items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer">
                <span className="text-3xl font-bold text-white">{totalInbound}</span>
                <span className="text-xs text-green-100">入库</span>
              </div>
              <div className="text-xs text-gray-500 mt-2">总入库量</div>
            </div>

            <div className="relative h-6 w-[90px]">
              <div className="w-[80px] h-[3px] bg-green-500 absolute top-1/2 -translate-y-1/2 left-0"></div>
              <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[10px] border-l-green-500 absolute top-1/2 -translate-y-1/2 right-0"></div>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex flex-col items-center justify-center shadow-xl hover:scale-105 transition-transform border-4 border-white">
                <span className="text-sm text-indigo-100">批次号</span>
                <span className="text-sm font-bold text-white font-mono mt-1">{batchNo}</span>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <svg width="80" height="40" className="overflow-visible">
                <path d="M 0 20 L 80 20" stroke="#eab308" strokeWidth="3" fill="none" />
                <polygon points="75,15 85,20 75,25" fill="#eab308" />
              </svg>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex flex-col items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer">
                <span className="text-3xl font-bold text-white">{totalSold}</span>
                <span className="text-xs text-orange-100">已售</span>
              </div>
              <div className="text-xs text-gray-500 mt-2">总售出量</div>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <svg width="40" height="50" className="overflow-visible">
              <path d="M 20 0 L 20 50" stroke="#3b82f6" strokeWidth="3" fill="none" />
              <polygon points="15,45 20,55 25,45" fill="#3b82f6" />
            </svg>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex flex-col items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer">
              <span className="text-3xl font-bold text-white">{totalInWarehouse}</span>
              <span className="text-xs text-blue-100">在库</span>
            </div>
            <div className="text-xs text-gray-500 mt-2">当前库存</div>
          </div>
        </div>

        <div className="mt-8 border-t pt-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                库位分布 ({traceData.locations.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {traceData.locations.map((loc, idx) => (
                  <div key={idx} className="px-3 py-2 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors">
                    <span className="font-mono text-sm text-blue-700">{loc.locationCode}</span>
                    <span className="ml-2 text-blue-600 font-bold">{loc.quantity}</span>
                  </div>
                ))}
                {traceData.locations.length === 0 && <span className="text-gray-400 text-sm">暂无数据</span>}
              </div>
            </div>

            <div className="w-px bg-gray-200 mx-6 h-20"></div>

            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                订单列表 ({traceData.soldOrders.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {traceData.soldOrders.map((order, idx) => (
                  <Link
                    key={idx}
                    to={`/orders/${order.orderId}`}
                    className="px-3 py-2 bg-yellow-50 rounded-lg border border-yellow-200 hover:bg-yellow-100 transition-colors inline-flex items-center gap-2"
                  >
                    <span className="font-mono text-sm text-yellow-700">{order.orderNo}</span>
                    <span className="text-yellow-600 font-bold">-{order.quantity}</span>
                    <ArrowRight className="w-3 h-3 text-yellow-500" />
                  </Link>
                ))}
                {traceData.soldOrders.length === 0 && <span className="text-gray-400 text-sm">暂无数据</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-green-500" />
            入库记录
          </h3>
          {allStockIns.length === 0 ? (
            <p className="text-gray-400 text-center py-4">暂无入库记录</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {allStockIns.map((item, idx) => (
                <div key={idx} className="bg-green-50 rounded-lg p-3 text-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        item.type === 'BUNDLE' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {item.type === 'BUNDLE' ? '套装' : '商品'}
                      </span>
                      <span className="ml-2 font-medium">
                        {item.productName || item.bundleName}
                      </span>
                    </div>
                    <span className="text-green-600 font-bold">+{item.quantity}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {item.locationCode || '无库位'}
                    </span>
                    <span>{item.warehouse}</span>
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-500" />
            当前库位分布
          </h3>
          {traceData.locations.length === 0 ? (
            <p className="text-gray-400 text-center py-4">暂无在库数据</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {traceData.locations.map((loc, idx) => (
                <div key={idx} className="bg-blue-50 rounded-lg p-3 text-sm">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        loc.type === 'BUNDLE' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {loc.type === 'BUNDLE' ? '套装' : '商品'}
                      </span>
                      <span className="font-mono text-gray-700">{loc.locationCode}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-blue-600 font-bold">{loc.quantity}</span>
                      <span className="text-gray-400 text-xs"> / {loc.availableQuantity}可用</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <span>{loc.warehouse}</span>
                    {loc.lockedQuantity > 0 && (
                      <span className="text-yellow-600">锁定: {loc.lockedQuantity}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-yellow-500" />
            已售订单
          </h3>
          {traceData.soldOrders.length === 0 ? (
            <p className="text-gray-400 text-center py-4">暂无售出记录</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {traceData.soldOrders.map((order, idx) => (
                <Link
                  key={idx}
                  to={`/orders/${order.orderId}`}
                  className="block bg-yellow-50 rounded-lg p-3 text-sm hover:bg-yellow-100 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-blue-600 hover:underline">{order.orderNo}</span>
                      <span className="ml-2 text-gray-500">{order.customer}</span>
                      {order.customerPhone && (
                        <span className="ml-2 text-gray-400">{order.customerPhone}</span>
                      )}
                    </div>
                    <span className="text-yellow-600 font-bold">-{order.quantity}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      order.type === 'BUNDLE' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {order.type === 'BUNDLE' ? '套装' : '商品'}
                    </span>
                    <span>{order.productName || order.bundleName}</span>
                    <ArrowRight className="w-3 h-3 ml-auto text-yellow-500" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-purple-500" />
            移库记录
          </h3>
          {traceData.transferRecords.length === 0 ? (
            <p className="text-gray-400 text-center py-4">暂无移库记录</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {traceData.transferRecords.map((transfer, idx) => (
                <div key={idx} className="bg-purple-50 rounded-lg p-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-gray-700">{transfer.transferNo}</span>
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      transfer.status === 'COMPLETED' ? 'bg-green-100 text-green-600' :
                      transfer.status === 'PENDING' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {transfer.status === 'COMPLETED' ? '已完成' : transfer.status === 'PENDING' ? '待执行' : '已取消'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <span className="text-gray-500">{transfer.fromLocation}</span>
                    <ArrowRight className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-700">{transfer.toLocation}</span>
                    <span className="ml-auto text-purple-600 font-medium">{transfer.quantity}件</span>
                  </div>
                  {transfer.executedAt && (
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(transfer.executedAt).toLocaleDateString()}
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
