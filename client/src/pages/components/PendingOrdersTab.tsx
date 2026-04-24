import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Sparkles, Info } from 'lucide-react';
import { Order } from '../types';

interface PendingOrdersTabProps {
  orders: Order[];
  selectedOrders: string[];
  aiLoading: boolean;
  onSelectOrder: (orderId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onCreatePickOrder: (orderId: string) => void;
  onAICreatePickOrders: () => void;
  onCreateBatchPickOrders: () => void;
  onTooltip: (tooltip: { x: number; y: number; content: React.ReactNode } | null) => void;
}

export default function PendingOrdersTab({
  orders,
  selectedOrders,
  aiLoading,
  onSelectOrder,
  onSelectAll,
  onCreatePickOrder,
  onAICreatePickOrders,
  onCreateBatchPickOrders,
  onTooltip
}: PendingOrdersTabProps) {
  const availableOrders = orders.filter(o => !o.pickOrder);
  const allSelected = selectedOrders.length === availableOrders.length && selectedOrders.length > 0;

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
        <span className="text-gray-600 text-sm">已选 {selectedOrders.length}/{availableOrders.length} 单</span>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={onAICreatePickOrders}
            disabled={aiLoading || availableOrders.length === 0}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span className="sm:hidden">AI拣货</span>
            <span className="hidden sm:inline">AI波次拣货单</span>
          </button>
          <button
            onClick={onCreateBatchPickOrders}
            disabled={selectedOrders.length === 0}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <span className="sm:hidden">生成拣货单</span>
            <span className="hidden sm:inline">生成波次拣货单</span>
          </button>
        </div>
      </div>
      <div className="hidden sm:block overflow-x-visible">
        <table className="w-full">
          <thead>
            <tr className="text-center text-gray-500 text-sm border-b">
              <th className="pb-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
              </th>
              <th className="pb-3 text-center">订单号</th>
              <th className="pb-3 text-center">下单时间</th>
              <th className="pb-3 text-center">主体</th>
              <th className="pb-3 text-center">仓库</th>
              <th className="pb-3 text-center">商品[库位]</th>
              <th className="pb-3 text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            {availableOrders.map(order => (
              <tr key={order.id} className="border-b hover:bg-gray-50">
                <td className="py-3">
                  <input
                    type="checkbox"
                    checked={selectedOrders.includes(order.id)}
                    onChange={(e) => onSelectOrder(order.id, e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                </td>
                <td className="py-3 text-center">
                  {order.id ? (
                    <Link to={`/orders/${order.id}`} className="text-primary-600 hover:text-primary-800 hover:underline">
                      {order.orderNo}
                    </Link>
                  ) : order.orderNo}
                </td>
                <td className="py-3 text-gray-500 text-sm text-center">{order.createdAt ? new Date(order.createdAt).toLocaleString() : '-'}</td>
                <td className="py-3 text-center">{order.owner?.name}</td>
                <td className="py-3 text-center text-blue-600">{order.warehouse?.name}</td>
                <td className="py-3 text-center">
                  {order.items?.flatMap((item) => {
                    const locks = item.bundleId
                      ? order.bundleStockLocks?.filter((l) => l.bundleId === item.bundleId)
                      : order.stockLocks?.filter((l) => l.skuId === item.skuId);
                    if (!locks || locks.length === 0) {
                      return [
                        <div key={item.id} className="text-sm mb-1 flex items-center justify-center">
                          <span className={item.bundleId ? 'text-purple-600' : 'text-blue-600'}>
                            {item.bundleId ? <span className="text-purple-500">[套装]</span> : <span className="text-blue-500">[商品]</span>}
                            {item.productName}
                            {item.spec && `(${item.spec})`}
                          </span>
                          <span className="text-gray-500 ml-1">{item.packaging && `${item.packaging} `}x{item.quantity}</span>
                        </div>
                      ];
                    }
                    return locks.map((lock, idx) => {
                      const locationStr = lock?.location ? `${lock.location.shelf?.zone?.code}-${lock.location.shelf?.code}-L${lock.location.level}` : '';
                      const bundle = lock as any;
                      const showInfo = item.bundleId && bundle?.bundle?.items?.length > 0;
                      return (
                        <div key={`${item.id}-${idx}`} className="text-sm mb-1 flex items-center justify-center">
                          <span className={item.bundleId ? 'text-purple-600' : 'text-blue-600'}>
                            {item.bundleId ? <span className="text-purple-500">[套装]</span> : <span className="text-blue-500">[商品]</span>}
                            {item.productName}
                            {item.spec && `(${item.spec})`}
                            {showInfo && idx === 0 && (
                              <button
                                type="button"
                                onMouseEnter={(e) => onTooltip({ x: e.clientX, y: e.clientY, content: <div><div className="font-semibold mb-2 text-blue-400">套装包含：</div>{bundle?.bundle?.items?.map((bi: any) => (<div key={bi.id} className="text-gray-200 py-1"><span className="text-blue-400">{bi.sku?.product?.name}</span><span className="text-gray-400"> · {bi.sku?.spec}/{bi.sku?.packaging}</span><span className="text-yellow-400 ml-1">×{bi.quantity}</span></div>))}</div> })}
                                onMouseLeave={() => onTooltip(null)}
                                onMouseMove={(e) => onTooltip({ x: e.clientX, y: e.clientY, content: <div><div className="font-semibold mb-2 text-blue-400">套装包含：</div>{bundle?.bundle?.items?.map((bi: any) => (<div key={bi.id} className="text-gray-200 py-1"><span className="text-blue-400">{bi.sku?.product?.name}</span><span className="text-gray-400"> · {bi.sku?.spec}/{bi.sku?.packaging}</span><span className="text-yellow-400 ml-1">×{bi.quantity}</span></div>))}</div> })}
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
                          {(lock as any).skuBatch?.batchNo || (lock as any).bundleBatch?.batchNo ? (
                            <span className="ml-1 text-purple-500 text-xs">
                              批:{(lock as any).skuBatch?.batchNo || (lock as any).bundleBatch?.batchNo}
                            </span>
                          ) : null}
                        </div>
                      );
                    });
                  })}
                </td>
                <td className="py-3 text-center">
                  <button
                    onClick={() => onCreatePickOrder(order.id)}
                    className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700"
                  >
                    生成拣货单
                  </button>
                </td>
              </tr>
            ))}
            {availableOrders.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-gray-500">
                  暂无待拣货订单
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="sm:hidden space-y-2">
        {availableOrders.map(order => (
          <div
            key={order.id}
            className={`bg-white border rounded-lg p-3 ${selectedOrders.includes(order.id) ? 'border-primary-500 bg-primary-50' : ''}`}
            onClick={() => onSelectOrder(order.id, !selectedOrders.includes(order.id))}
          >
            <div className="flex items-start justify-between mb-2">
              <Link to={`/orders/${order.id}`} className="text-primary-600 font-medium" onClick={e => e.stopPropagation()}>
                {order.orderNo}
              </Link>
              <span className="text-xs text-gray-400">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '-'}</span>
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span className="text-blue-600">{order.warehouse?.name}</span>
                <span>{order.items?.length || 0}件商品</span>
              </div>
            </div>
          </div>
        ))}
        {availableOrders.length === 0 && (
          <div className="text-center py-8 text-gray-500">暂无待拣货订单</div>
        )}
      </div>
    </div>
  );
}
