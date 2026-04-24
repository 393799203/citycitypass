import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Phone, MapPin, ShoppingCart, Info } from 'lucide-react';
import { formatPhone, formatAddress } from '../../utils/format';
import { PickOrder } from '../../types/outbound';

interface PickOrderCardProps {
  pickOrder: PickOrder;
  onPickComplete: (pickOrderId: string) => void;
  onOutboundReview: (pickOrderId: string, approved: boolean) => void;
  onTooltip: (tooltip: { x: number; y: number; content: React.ReactNode } | null) => void;
  canWrite?: boolean;
}

const pickStatusMap: Record<string, string> = {
  PENDING: '待拣货',
  PICKING: '拣货中',
  PICKED: '已拣货',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

export default function PickOrderCard({ pickOrder, onPickComplete, onOutboundReview, onTooltip, canWrite = false }: PickOrderCardProps) {
  return (
    <div className="border rounded-lg p-3 sm:p-4">
      <div className="hidden sm:flex items-center justify-between mb-4">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-medium text-gray-900">{pickOrder.pickNo}</span>
          <span className="text-sm text-gray-500">
            订单: {pickOrder.orders?.map((o) => (
              <Link key={o.id} to={`/orders/${o.id}`} className="text-primary-600 hover:text-primary-800 hover:underline mx-0.5">
                {o.orderNo}
              </Link>
            ))}
          </span>
          <span className="text-sm text-gray-500">{pickOrder.orders?.[0]?.owner?.name}</span>
          <span className="text-sm text-blue-600">{pickOrder.orders?.[0]?.warehouse?.name}</span>
          <span className={`px-2 py-0.5 text-xs rounded-full ${
            pickOrder.status === 'PENDING' ? 'bg-yellow-500 text-white' :
            pickOrder.status === 'PICKING' ? 'bg-blue-600 text-white' :
            pickOrder.status === 'CANCELLED' ? 'bg-gray-500 text-white' :
            'bg-green-600 text-white'
          }`}>
            {pickStatusMap[pickOrder.status]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {pickOrder.status === 'PICKING' && !pickOrder.orders?.some((o) => o.status === 'CANCELLED') && canWrite && (
            <>
              <button
                onClick={() => onPickComplete(pickOrder.id)}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4" />
                拣货完成
              </button>
            </>
          )}
          {pickOrder.status === 'PICKING' && pickOrder.orders?.some((o) => o.status === 'CANCELLED') && (
            <span className="text-sm text-red-500">订单已取消</span>
          )}
          {pickOrder.status === 'PICKED' && canWrite && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOutboundReview(pickOrder.id, true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
              >
                审核通过
              </button>
              <button
                onClick={() => onOutboundReview(pickOrder.id, false)}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
              >
                审核不通过
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="sm:hidden flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{pickOrder.pickNo}</span>
          <span className={`px-2 py-0.5 text-xs rounded-full ${
            pickOrder.status === 'PENDING' ? 'bg-yellow-500 text-white' :
            pickOrder.status === 'PICKING' ? 'bg-blue-600 text-white' :
            pickOrder.status === 'CANCELLED' ? 'bg-gray-500 text-white' :
            'bg-green-600 text-white'
          }`}>
            {pickStatusMap[pickOrder.status]}
          </span>
        </div>
        <span className="text-xs text-blue-600">{pickOrder.orders?.[0]?.warehouse?.name}</span>
      </div>

      <div className="hidden sm:block overflow-x-visible bg-gray-50 rounded-lg p-3">
        <table className="w-full table-fixed">
          <thead>
            <tr className="text-xs text-gray-500 text-center">
              <th className="py-1 w-1/4">商品</th>
              <th className="py-1 w-1/4">包装/规格</th>
              <th className="py-1 w-12">数量</th>
              <th className="py-1 w-1/4">库位(货位)-批号</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {(pickOrder.items || []).map((item) => (
              <tr key={item.id} className="border-t border-gray-200">
                <td className="py-2 align-top text-center">
                  <div className="flex items-center justify-center gap-1">
                    {item.bundleId ? <span className="text-purple-600 font-medium">[套装]</span> : <span className="text-blue-600 font-medium">[商品]</span>}
                    <span className={item.bundleId ? 'text-purple-600 font-medium' : 'font-medium text-blue-600'}>{item.productName}</span>
                    {item.bundleId && (item.bundle as any)?.items?.length > 0 && (
                      <button
                        type="button"
                        onMouseEnter={(e) => onTooltip({ x: e.clientX, y: e.clientY, content: <div><div className="font-semibold mb-2 text-blue-400">套装包含：</div>{(item.bundle as any)?.items?.map((bi: any) => (<div key={bi.id} className="text-gray-200 py-1"><span className="text-blue-400">{bi.sku?.product?.name}</span><span className="text-gray-400"> · {bi.sku?.spec}/{bi.sku?.packaging}</span><span className="text-yellow-400 ml-1">×{bi.quantity}</span></div>))}</div> })}
                        onMouseLeave={() => onTooltip(null)}
                        onMouseMove={(e) => onTooltip({ x: e.clientX, y: e.clientY, content: <div><div className="font-semibold mb-2 text-blue-400">套装包含：</div>{(item.bundle as any)?.items?.map((bi: any) => (<div key={bi.id} className="text-gray-200 py-1"><span className="text-blue-400">{bi.sku?.product?.name}</span><span className="text-gray-400"> · {bi.sku?.spec}/{bi.sku?.packaging}</span><span className="text-yellow-400 ml-1">×{bi.quantity}</span></div>))}</div> })}
                        className="p-0.5 hover:bg-gray-100 rounded"
                      >
                        <Info className="w-3 h-3 text-purple-500 cursor-help" />
                      </button>
                    )}
                  </div>
                </td>
                <td className="py-2 align-top text-gray-500 text-center">{item.packaging} · {item.spec}</td>
                <td className="py-2 align-top text-center">{item.quantity}</td>
                <td className="py-2 align-top text-gray-500 text-center">
                  {(() => {
                    const loc = item.stockLock?.location || item.bundleStockLock?.location;
                    const locCode = loc ? `${loc.shelf?.zone?.code}-${loc.shelf?.code}-L${loc.level}` : (item.warehouseLocation || '-');
                    const batchNo = item.stockLock?.skuBatch?.batchNo || item.skuBatch?.batchNo || item.bundleStockLock?.bundleBatch?.batchNo || item.bundleBatch?.batchNo;
                    const batchSuffix = batchNo ? `(${batchNo})` : '';
                    const isCompleted = pickOrder.status === 'COMPLETED' || pickOrder.orders?.some((o) => o.status === 'DELIVERED' || o.status === 'IN_TRANSIT');
                    const statusSuffix = isCompleted ? ' (已出库)' : (pickOrder.status === 'CANCELLED' ? ' (已出库)' : '');
                    return `${locCode}${batchSuffix}${statusSuffix}`;
                  })()}
                  {pickOrder.orders?.some((o) => o.status === 'CANCELLED') && ' (已退回)'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sm:hidden space-y-2 mb-3">
        {(pickOrder.items || []).map((item) => {
          const loc = item.stockLock?.location || item.bundleStockLock?.location;
          const locCode = loc ? `${loc.shelf?.zone?.code}-${loc.shelf?.code}-L${loc.level}` : (item.warehouseLocation || '-');
          const batchNo = item.stockLock?.skuBatch?.batchNo || item.skuBatch?.batchNo || item.bundleStockLock?.bundleBatch?.batchNo || item.bundleBatch?.batchNo;
          return (
            <div key={item.id} className="bg-gray-50 rounded-lg p-2.5 text-xs">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-white text-[10px] ${item.bundleId ? 'bg-purple-500' : 'bg-blue-500'}`}>
                    {item.bundleId ? '套装' : '商品'}
                  </span>
                  <span className="font-medium text-gray-800">{item.productName}</span>
                </div>
                <span className="font-bold text-gray-700">×{item.quantity}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-gray-400">{item.spec} · {item.packaging}</span>
                <div className="flex items-center gap-2">
                  <span className="bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">{locCode}</span>
                  {batchNo && <span className="bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">批:{batchNo}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {pickOrder.orders && pickOrder.orders.length > 0 && (
        <div className="sm:hidden mt-3 space-y-2">
          {pickOrder.orders.map((o) => (
            <div key={o.id} className="bg-gray-50 rounded-lg p-3 text-xs">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center">
                    <Phone className="w-3.5 h-3.5 text-primary-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">{o.receiver}</div>
                    <div className="text-gray-400">{formatPhone(o.phone)}</div>
                  </div>
                </div>
                <Link to={`/orders/${o.id}`} className="text-primary-600 font-medium" onClick={e => e.stopPropagation()}>
                  {o.orderNo}
                </Link>
              </div>
              <div className="flex items-start gap-2 mb-2 text-gray-600">
                <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-600">{formatAddress(o.province, o.city, o.address)}</span>
              </div>
              <div className="pt-2 border-t border-gray-200">
                <div className="flex items-center gap-1 mb-1.5">
                  <ShoppingCart className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-gray-500">商品清单</span>
                </div>
                <div className="space-y-1">
                  {o.items?.map((item) => {
                    const pickItem = pickOrder.items?.find((pi) =>
                      (item.skuId && pi.skuId === item.skuId) || (item.bundleId && pi.bundleId === item.bundleId)
                    );
                    const batchNo = pickItem?.skuBatch?.batchNo || pickItem?.bundleBatch?.batchNo;
                    return (
                      <div key={item.id} className="flex items-center justify-between bg-white rounded px-2 py-1">
                        <div className="flex items-center gap-1">
                          <span className={`text-[10px] px-1 py-0.5 rounded ${item.bundleId ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                            {item.bundleId ? '套装' : '商品'}
                          </span>
                          <span className="text-gray-700">{item.productName}</span>
                          <span className="text-gray-400">{item.spec}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {batchNo && <span className="text-purple-500 text-[10px]">({batchNo})</span>}
                          <span className="text-gray-500">×{item.quantity}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pickOrder.orders && pickOrder.orders.length > 0 && (
        <div className="hidden sm:block mt-2 space-y-2">
          {pickOrder.orders.map((o) => (
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
                  {o.items?.map((item) => {
                    const pickItem = pickOrder.items?.find((pi) =>
                      (item.skuId && pi.skuId === item.skuId) || (item.bundleId && pi.bundleId === item.bundleId)
                    );
                    const batchNo = pickItem?.skuBatch?.batchNo || pickItem?.bundleBatch?.batchNo;
                    return (
                      <span key={item.id} className="mr-2 inline-flex items-center">
                        {item.bundleId ? <span className="text-purple-600">[套装]</span> : <span className="text-blue-600">[商品]</span>}
                        <span className={item.bundleId ? 'text-purple-600' : 'text-blue-600'}>{item.productName}</span> {item.spec} {item.packaging}
                        {batchNo && <span className="text-orange-500 ml-1">({batchNo})</span>}
                        {item.bundleId && (item.bundle as any)?.items?.length > 0 && (
                          <button
                            type="button"
                            onMouseEnter={(e) => onTooltip({ x: e.clientX, y: e.clientY, content: <div><div className="font-semibold mb-2 text-blue-400">套装包含：</div>{(item.bundle as any)?.items?.map((bi: any) => (<div key={bi.id} className="text-gray-200 py-1"><span className="text-blue-400">{bi.sku?.product?.name}</span><span className="text-gray-400"> · {bi.sku?.spec}/{bi.sku?.packaging}</span><span className="text-yellow-400 ml-1">×{bi.quantity}</span></div>))}</div> })}
                            onMouseLeave={() => onTooltip(null)}
                            onMouseMove={(e) => onTooltip({ x: e.clientX, y: e.clientY, content: <div><div className="font-semibold mb-2 text-blue-400">套装包含：</div>{(item.bundle as any)?.items?.map((bi: any) => (<div key={bi.id} className="text-gray-200 py-1"><span className="text-blue-400">{bi.sku?.product?.name}</span><span className="text-gray-400"> · {bi.sku?.spec}/{bi.sku?.packaging}</span><span className="text-yellow-400 ml-1">×{bi.quantity}</span></div>))}</div> })}
                            className="p-0.5 hover:bg-gray-100 rounded mx-1"
                          >
                            <Info className="w-3 h-3 text-purple-500 cursor-help" />
                          </button>
                        )}
                        x{item.quantity}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(pickOrder.picker || pickOrder.approver) && (
        <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200 justify-end">
          {pickOrder.picker && <span>拣货人: {pickOrder.picker.name}</span>}
          {pickOrder.approver && <span>审核人: {pickOrder.approver.name}</span>}
        </div>
      )}

      <div className="sm:hidden mt-3 pt-3 border-t border-gray-200">
        {pickOrder.status === 'PICKING' && !pickOrder.orders?.some((o) => o.status === 'CANCELLED') && canWrite && (
          <button
            onClick={() => onPickComplete(pickOrder.id)}
            className="w-full py-2 bg-green-600 text-white text-sm rounded-lg"
          >
            拣货完成
          </button>
        )}
        {pickOrder.status === 'PICKED' && canWrite && (
          <div className="flex gap-2">
            <button
              onClick={() => onOutboundReview(pickOrder.id, true)}
              className="flex-1 py-2 bg-green-600 text-white text-sm rounded-lg"
            >
              审核通过
            </button>
            <button
              onClick={() => onOutboundReview(pickOrder.id, false)}
              className="flex-1 py-2 bg-red-600 text-white text-sm rounded-lg"
            >
              不通过
            </button>
          </div>
        )}
        {(pickOrder.picker || pickOrder.approver) && (
          <div className="flex items-center gap-4 text-xs text-gray-500 mt-2 justify-center">
            {pickOrder.picker && <span>拣货人: {pickOrder.picker.name}</span>}
            {pickOrder.approver && <span>审核人: {pickOrder.approver.name}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
