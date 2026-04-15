import React from 'react';
import { Package, MapPin, ShoppingCart, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TraceData } from '../../types/batchTrace';

interface BatchFlowChartProps {
  traceData: TraceData;
  batchNo: string;
  totalInbound: number;
  totalInWarehouse: number;
  totalSold: number;
  totalReturned: number;
}

export default function BatchFlowChart({ 
  traceData, 
  batchNo, 
  totalInbound, 
  totalInWarehouse, 
  totalSold, 
  totalReturned 
}: BatchFlowChartProps) {
  return (
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
  );
}
