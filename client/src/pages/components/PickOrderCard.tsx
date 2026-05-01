import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Phone, MapPin, ShoppingCart, Info } from 'lucide-react';
import { formatPhone, formatAddress } from '../../utils/format';
import { PickOrder } from '../types';

interface PickOrderCardProps {
  pickOrder: PickOrder;
  onPickComplete: (pickOrderId: string) => void;
  onOutboundReview: (pickOrderId: string, approved: boolean) => void;
  onTooltip: (tooltip: { x: number; y: number; content: React.ReactNode } | null) => void;
}

const getPickStatusMap = (t: any): Record<string, string> => ({
  PENDING: t('outbound.pickStatusPending'),
  PICKING: t('outbound.pickStatusPicking'),
  PICKED: t('outbound.pickStatusPicked'),
  COMPLETED: t('outbound.pickStatusCompleted'),
  CANCELLED: t('outbound.pickStatusCancelled'),
});

export default function PickOrderCard({ pickOrder, onPickComplete, onOutboundReview, onTooltip }: PickOrderCardProps) {
  const { t } = useTranslation();
  const pickStatusMap = getPickStatusMap(t);
  
  return (
    <div className="border rounded-lg p-3 sm:p-4">
      <div className="hidden sm:flex items-center justify-between mb-4">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-medium text-gray-900">{pickOrder.pickNo}</span>
          <span className="text-sm text-gray-500">
            {t('outbound.order')}: {pickOrder.orders?.map((o) => (
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
          {pickOrder.status === 'PICKING' && !pickOrder.orders?.some((o) => o.status === 'CANCELLED') && (
            <>
              <button
                onClick={() => onPickComplete(pickOrder.id)}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4" />
                {t('outbound.pickComplete')}
              </button>
            </>
          )}
          {pickOrder.status === 'PICKING' && pickOrder.orders?.some((o) => o.status === 'CANCELLED') && (
            <span className="text-sm text-red-500">{t('outbound.orderCancelled')}</span>
          )}
          {pickOrder.status === 'PICKED' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOutboundReview(pickOrder.id, true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
              >
                {t('outbound.reviewApprove')}
              </button>
              <button
                onClick={() => onOutboundReview(pickOrder.id, false)}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
              >
                {t('outbound.reviewReject')}
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
              <th className="py-1 w-1/4">{t('outbound.product')}</th>
              <th className="py-1 w-1/4">{t('outbound.packagingSpec')}</th>
              <th className="py-1 w-12">{t('outbound.quantity')}</th>
              <th className="py-1 w-1/4">{t('outbound.locationBatch')}</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {(pickOrder.items || []).map((item) => (
              <tr key={item.id} className="border-t border-gray-200">
                <td className="py-2 align-top text-center">
                  <div className="flex items-center justify-center gap-1">
                    {item.bundleId ? <span className="text-purple-600 font-medium">[{t('outbound.bundle')}]</span> : <span className="text-blue-600 font-medium">[{t('outbound.productTag')}]</span>}
                    <span className={item.bundleId ? 'text-purple-600 font-medium' : 'font-medium text-blue-600'}>{item.productName}</span>
                    {item.bundleId && (item.bundle as any)?.items?.length > 0 && (
                      <button
                        type="button"
                        onMouseEnter={(e) => onTooltip({ x: e.clientX, y: e.clientY, content: <div><div className="font-semibold mb-2 text-blue-400">{t('outbound.bundleContains')}:</div>{(item.bundle as any)?.items?.map((bi: any) => (<div key={bi.id} className="text-gray-200 py-1"><span className="text-blue-400">{bi.sku?.product?.name}</span><span className="text-gray-400"> · {bi.sku?.spec}/{bi.sku?.packaging}</span><span className="text-yellow-400 ml-1">×{bi.quantity}</span></div>))}</div> })}
                        onMouseLeave={() => onTooltip(null)}
                        onMouseMove={(e) => onTooltip({ x: e.clientX, y: e.clientY, content: <div><div className="font-semibold mb-2 text-blue-400">{t('outbound.bundleContains')}:</div>{(item.bundle as any)?.items?.map((bi: any) => (<div key={bi.id} className="text-gray-200 py-1"><span className="text-blue-400">{bi.sku?.product?.name}</span><span className="text-gray-400"> · {bi.sku?.spec}/{bi.sku?.packaging}</span><span className="text-yellow-400 ml-1">×{bi.quantity}</span></div>))}</div> })}
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
                    const statusSuffix = isCompleted ? ` (${t('outbound.shipped')})` : (pickOrder.status === 'CANCELLED' ? ` (${t('outbound.shipped')})` : '');
                    return `${locCode}${batchSuffix}${statusSuffix}`;
                  })()}
                  {pickOrder.orders?.some((o) => o.status === 'CANCELLED') && ` (${t('outbound.returned')})`}
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
            <div key={item.id} className="bg-gray-50 rounded-lg p-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {item.bundleId ? <span className="text-purple-600 font-medium">[{t('outbound.bundle')}]</span> : <span className="text-blue-600 font-medium">[{t('outbound.productTag')}]</span>}
                  <span className={item.bundleId ? 'text-purple-600 font-medium' : 'font-medium text-blue-600'}>{item.productName}</span>
                </div>
                <span className="font-medium">x{item.quantity}</span>
              </div>
              <div className="flex items-center justify-between text-gray-500 mt-1">
                <span>{item.packaging} · {item.spec}</span>
                <span className="text-orange-500">{locCode}{batchNo ? ` (${batchNo})` : ''}</span>
              </div>
            </div>
          );
        })}
      </div>
      {pickOrder.orders && pickOrder.orders.length > 0 && (
        <div className="mt-2 space-y-2">
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
                        {item.bundleId ? <span className="text-purple-600">[{t('outbound.bundle')}]</span> : <span className="text-blue-600">[{t('outbound.productTag')}]</span>}
                        <span className={item.bundleId ? 'text-purple-600' : 'text-blue-600'}>{item.productName}</span> {item.spec} {item.packaging}
                        {batchNo && <span className="text-orange-500 ml-1">({batchNo})</span>}
                        {item.bundleId && (item.bundle as any)?.items?.length > 0 && (
                          <button
                            type="button"
                            onMouseEnter={(e) => onTooltip({ x: e.clientX, y: e.clientY, content: <div><div className="font-semibold mb-2 text-blue-400">{t('outbound.bundleContains')}:</div>{(item.bundle as any)?.items?.map((bi: any) => (<div key={bi.id} className="text-gray-200 py-1"><span className="text-blue-400">{bi.sku?.product?.name}</span><span className="text-gray-400"> · {bi.sku?.spec}/{bi.sku?.packaging}</span><span className="text-yellow-400 ml-1">×{bi.quantity}</span></div>))}</div> })}
                            onMouseLeave={() => onTooltip(null)}
                            onMouseMove={(e) => onTooltip({ x: e.clientX, y: e.clientY, content: <div><div className="font-semibold mb-2 text-blue-400">{t('outbound.bundleContains')}:</div>{(item.bundle as any)?.items?.map((bi: any) => (<div key={bi.id} className="text-gray-200 py-1"><span className="text-blue-400">{bi.sku?.product?.name}</span><span className="text-gray-400"> · {bi.sku?.spec}/{bi.sku?.packaging}</span><span className="text-yellow-400 ml-1">×{bi.quantity}</span></div>))}</div> })}
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
          {pickOrder.picker && <span>{t('outbound.picker')}: {pickOrder.picker.name}</span>}
          {pickOrder.approver && <span>{t('outbound.approver')}: {pickOrder.approver.name}</span>}
        </div>
      )}

      <div className="sm:hidden mt-3 pt-3 border-t border-gray-200">
        {pickOrder.status === 'PICKING' && !pickOrder.orders?.some((o) => o.status === 'CANCELLED') && (
          <button
            onClick={() => onPickComplete(pickOrder.id)}
            className="w-full py-2 bg-green-600 text-white text-sm rounded-lg"
          >
            {t('outbound.pickComplete')}
          </button>
        )}
        {pickOrder.status === 'PICKED' && (
          <div className="flex gap-2">
            <button
              onClick={() => onOutboundReview(pickOrder.id, true)}
              className="flex-1 py-2 bg-green-600 text-white text-sm rounded-lg"
            >
              {t('outbound.reviewApprove')}
            </button>
            <button
              onClick={() => onOutboundReview(pickOrder.id, false)}
              className="flex-1 py-2 bg-red-600 text-white text-sm rounded-lg"
            >
              {t('outbound.reviewReject')}
            </button>
          </div>
        )}
        {(pickOrder.picker || pickOrder.approver) && (
          <div className="flex items-center gap-4 text-xs text-gray-500 mt-2 justify-center">
            {pickOrder.picker && <span>{t('outbound.picker')}: {pickOrder.picker.name}</span>}
            {pickOrder.approver && <span>{t('outbound.approver')}: {pickOrder.approver.name}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
