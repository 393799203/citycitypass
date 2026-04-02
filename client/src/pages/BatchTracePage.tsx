import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { stockApi } from '../api';
import { Package, MapPin, ShoppingCart, ArrowLeft, ArrowRight, RefreshCw, Search } from 'lucide-react';
import { toast } from 'react-toastify';

interface TraceData {
  batchNo: string;
  batchInfo?: {
    id: string;
    batchNo: string;
    expiryDate?: string;
    productionDate?: string;
    supplierId?: string;
    supplierName?: string;
    productName?: string;
    spec?: string;
    packaging?: string;
    type: 'PRODUCT' | 'BUNDLE';
  };
  summary?: {
    totalInbound: number;
    totalOutbound: number;
    totalInWarehouse: number;
    totalLocked: number;
    totalReturned: number;
  };
  stockIns: Array<{
    type: string;
    productName?: string;
    bundleName?: string;
    quantity: number;
    expiryDate?: string;
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
  stockOuts: Array<{
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
    isReturned: boolean;
  }>;
  returns: Array<{
    type: string;
    returnNo: string;
    quantity: number;
    createdAt: string;
  }>;
  transfers: Array<{
    type: string;
    transferNo: string;
    fromLocation: string;
    toLocation: string;
    quantity: number;
    status: string;
    executedAt: string;
  }>;
}

interface BatchInfo {
  id: string;
  batchNo: string;
  expiryDate?: string;
  productionDate?: string;
  supplierId?: string;
  supplierName?: string;
  productName?: string;
  spec?: string;
  packaging?: string;
  sku?: {
    product?: {
      name?: string;
    };
  };
  type: 'PRODUCT' | 'BUNDLE';
  totalQuantity?: number;
}

export default function BatchTracePage() {
  const { batchNo } = useParams<{ batchNo: string }>();
  const navigate = useNavigate();
  const [inputBatchNo, setInputBatchNo] = useState('');
  const [batchList, setBatchList] = useState<BatchInfo[]>([]);
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
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">批次列表</h1>

        {loading && (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        )}

        {!loading && batchList.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <p className="text-gray-500">暂无批次数据</p>
          </div>
        )}

        {!loading && batchList.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-center text-base font-medium text-gray-700">批次号</th>
                  <th className="px-4 py-3 text-center text-base font-medium text-gray-700">类别</th>
                  <th className="px-4 py-3 text-center text-base font-medium text-gray-700">关联商品</th>
                  <th className="px-4 py-3 text-center text-base font-medium text-gray-700">供应商</th>
                  <th className="px-4 py-3 text-center text-base font-medium text-gray-700">有效期</th>
                  <th className="px-4 py-3 text-center text-base font-medium text-gray-700">剩余库存</th>
                  <th className="px-4 py-3 text-center text-base font-medium text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {batchList.map((batch: any) => (
                  <tr key={batch.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-center text-base font-mono">{batch.batchNo}</td>
                    <td className="px-4 py-3 text-center text-base">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${batch.type === 'PRODUCT' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {batch.type === 'PRODUCT' ? '商品' : '套装'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-base text-gray-500">
                      {batch.productName || batch.sku?.product?.name || '-'}
                      {batch.spec && ` ${batch.spec}`}
                      {batch.packaging && ` ${batch.packaging}`}
                    </td>
                    <td className="px-4 py-3 text-center text-base text-gray-500">
                      {batch.supplierName || '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-base text-gray-500">
                      {batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-base text-gray-500">
                      {batch.totalQuantity > 0 ? (
                        <span className="text-green-600 font-medium">{batch.totalQuantity}</span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => navigate(`/batch-trace/${batch.batchNo}`)}
                        className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                      >
                        追踪
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

  const allStockIns = traceData.stockIns || [];
  const totalInbound = allStockIns.reduce((sum: number, s: any) => sum + s.quantity, 0);
  const totalInWarehouse = (traceData.locations || []).reduce((sum: number, l: any) => sum + (l.totalQuantity || l.quantity || 0), 0);
  const totalSold = (traceData.stockOuts || []).reduce((sum: number, o: any) => sum + o.quantity, 0);
  const totalReturned = (traceData.returns || []).reduce((sum: number, r: any) => sum + r.quantity, 0);

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">批次追踪</h1>
          <p className="text-sm text-gray-500 mt-1">批次号: <span className="font-mono text-blue-600">{batchNo}</span></p>
        </div>
        <button
          onClick={() => loadTraceData(batchNo)}
          className="p-2 hover:bg-gray-100 rounded-lg ml-auto"
          title="刷新"
        >
          <RefreshCw className="w-5 h-5 text-gray-600" />
        </button>
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
                <span className="text-[10px] text-indigo-200">批次号</span>
                <span className="text-xs font-bold text-white font-mono mt-0.5">{batchNo}</span>
                <div className="w-24 h-[1px] bg-indigo-300 my-1"></div>
                <span className="text-[10px] text-indigo-200">有效期</span>
                <span className="text-xs font-bold text-white mt-0.5">
                  {traceData?.batchInfo?.expiryDate
                    ? new Date(traceData.batchInfo.expiryDate).toLocaleDateString()
                    : '-'}
                </span>
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
            <div className="flex flex-col items-center">
              <svg width="80" height="40" className="overflow-visible">
                <path d="M 0 20 L 80 20" stroke="#ef4444" strokeWidth="3" fill="none" />
                <polygon points="75,15 85,20 75,25" fill="#ef4444" />
              </svg>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex flex-col items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer">
                <span className="text-3xl font-bold text-white">{totalReturned}</span>
                <span className="text-xs text-red-100">已退货</span>
              </div>
              <div className="text-xs text-gray-500 mt-2">总退货量</div>
            </div>
          </div>

          <div className="flex flex-col items-center" style={{ transform: 'translateX(-280%)' }}>
            <svg width="40" height="50" className="overflow-visible">
              <path d="M 20 0 L 20 50" stroke="#3b82f6" strokeWidth="3" fill="none" />
              <polygon points="15,45 20,55 25,45" fill="#3b82f6" />
            </svg>
          </div>

          <div className="flex flex-col items-center" style={{ transform: 'translateX(-115%)' }}>
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
                订单列表 ({(traceData.stockOuts || []).length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {(traceData.stockOuts || []).map((order, idx) => (
                  <Link
                    key={idx}
                    to={`/orders/${order.orderId}`}
                    className={`px-3 py-2 rounded-lg border hover:bg-opacity-80 transition-colors inline-flex items-center gap-2 ${
                      order.isReturned
                        ? 'bg-red-50 border-red-200 hover:bg-red-100'
                        : 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
                    }`}
                  >
                    <span className={`font-mono text-sm ${order.isReturned ? 'text-red-700' : 'text-yellow-700'}`}>{order.orderNo}</span>
                    {order.isReturned && <span className="px-1 py-0.5 text-xs bg-red-100 text-red-600 rounded">已退货</span>}
                    <span className={`font-bold ${order.isReturned ? 'text-red-600' : 'text-yellow-600'}`}>-{order.quantity}</span>
                    <ArrowRight className={`w-3 h-3 ${order.isReturned ? 'text-red-500' : 'text-yellow-500'}`} />
                  </Link>
                ))}
                {(traceData.stockOuts || []).length === 0 && <span className="text-gray-400 text-sm">暂无数据</span>}
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
          {(traceData.stockOuts || []).length === 0 ? (
            <p className="text-gray-400 text-center py-4">暂无售出记录</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(traceData.stockOuts || []).map((order: any, idx: number) => (
                <Link
                  key={idx}
                  to={`/orders/${order.orderId}`}
                  className={`block rounded-lg p-3 text-sm transition-colors ${
                    order.isReturned
                      ? 'bg-red-50 hover:bg-red-100 border border-red-200'
                      : 'bg-yellow-50 hover:bg-yellow-100 border border-yellow-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`font-mono hover:underline ${order.isReturned ? 'text-red-600' : 'text-blue-600'}`}>{order.orderNo}</span>
                      {order.isReturned && <span className="ml-2 px-1 py-0.5 text-xs bg-red-100 text-red-600 rounded">已退货</span>}
                      <span className="ml-2 text-gray-500">{order.customer}</span>
                      {order.customerPhone && (
                        <span className="ml-2 text-gray-400">{order.customerPhone}</span>
                      )}
                    </div>
                    <span className={`font-bold ${order.isReturned ? 'text-red-600' : 'text-yellow-600'}`}>-{order.quantity}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      order.type === 'BUNDLE' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {order.type === 'BUNDLE' ? '套装' : '商品'}
                    </span>
                    <span>{order.productName || order.bundleName}</span>
                    <ArrowRight className={`w-3 h-3 ml-auto ${order.isReturned ? 'text-red-500' : 'text-yellow-500'}`} />
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
          {(traceData.transfers || []).length === 0 ? (
            <p className="text-gray-400 text-center py-4">暂无移库记录</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(traceData.transfers || []).map((transfer: any, idx: number) => (
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
