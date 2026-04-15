import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, ShoppingCart } from 'lucide-react';
import { TraceData } from '../../types/batchTrace';

interface BatchRecordCardsProps {
  traceData: TraceData;
}

export default function BatchRecordCards({ traceData }: BatchRecordCardsProps) {
  const allStockIns = traceData.stockIns || [];

  return (
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      item.type === 'BUNDLE' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {item.type === 'BUNDLE' ? '套装' : '商品'}
                    </span>
                    <span className="font-medium">
                      {item.productName || item.bundleName}
                    </span>
                    {item.spec && <span className="text-gray-500">{item.spec}</span>}
                    {item.packaging && <span className="text-gray-500">{item.packaging}</span>}
                    {item.inboundNo && <span className="text-green-600 font-mono text-xs">入库单: {item.inboundNo}</span>}
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
            {(traceData.stockOuts || []).map((order, idx) => (
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
            {(traceData.transfers || []).map((transfer, idx) => (
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
  );
}
