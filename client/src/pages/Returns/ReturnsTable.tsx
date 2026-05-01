import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Phone } from 'lucide-react';
import { ReturnOrder } from '../../types/returns';
import { formatPhone } from '../../utils/format';

const getStatusConfig = (t: any): Record<string, { label: string; color: string; bgColor: string }> => ({
  RETURN_REQUESTED: { label: t('returns.statusPending'), color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  RETURN_SHIPPED: { label: t('returns.statusShipped'), color: 'text-blue-600', bgColor: 'bg-blue-50' },
  RETURN_RECEIVING: { label: t('returns.statusReceiving'), color: 'text-purple-600', bgColor: 'bg-purple-50' },
  RETURN_QUALIFIED: { label: t('returns.statusQualified'), color: 'text-green-600', bgColor: 'bg-green-50' },
  RETURN_PARTIAL_QUALIFIED: { label: t('returns.statusPartialQualified'), color: 'text-orange-600', bgColor: 'bg-orange-50' },
  RETURN_REJECTED: { label: t('returns.statusRejected'), color: 'text-red-600', bgColor: 'bg-red-50' },
  RETURN_STOCK_IN: { label: t('returns.statusStockIn'), color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  REFUNDED: { label: t('returns.statusRefunded'), color: 'text-pink-600', bgColor: 'bg-pink-50' },
  CANCELLED: { label: t('returns.statusCancelled'), color: 'text-gray-600', bgColor: 'bg-gray-50' },
});

interface ReturnsTableProps {
  returns: ReturnOrder[];
  onOpenTrackingModal: (ret: ReturnOrder) => void;
  onReceive: (ret: ReturnOrder) => void;
  onOpenQualifyModal: (ret: ReturnOrder) => void;
  onOpenStockInModal: (ret: ReturnOrder) => void;
  onOpenRefundModal: (ret: ReturnOrder) => void;
}

export default function ReturnsTable({
  returns,
  onOpenTrackingModal,
  onReceive,
  onOpenQualifyModal,
  onOpenStockInModal,
  onOpenRefundModal
}: ReturnsTableProps) {
  const { t } = useTranslation();
  const STATUS_CONFIG = getStatusConfig(t);
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="hidden sm:block">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="text-center">
              <th className="px-6 py-3 text-sm font-medium text-gray-600">{t('returns.returnNo')}/{t('returns.orderNo')}</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-600">{t('returns.returnPerson')}</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-600">{t('returns.warehouse')}</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-600">{t('returns.itemCount')}</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-600">{t('returns.amount')}</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-600">{t('returns.status')}</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-600">{t('returns.reason')}</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-600">{t('returns.time')}</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-600">{t('returns.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {returns.map(ret => (
              <tr key={ret.id} className="border-t hover:bg-gray-50">
                <td className="px-6 py-4 text-base text-center">
                  <Link to={`/returns/${ret.id}`} className="text-primary-600 hover:underline font-medium">
                    {ret.returnNo}
                  </Link>
                  <div className="flex items-center justify-center gap-1 text-gray-400 text-sm mt-0.5">
                    <span className="text-xs">{t('returns.orderNo')}:</span>
                    <Link to={`/orders/${ret.orderId}`} className="text-gray-500 hover:underline">{ret.order?.orderNo}</Link>
                  </div>
                </td>
                <td className="px-6 py-4 text-base text-center">
                  <div>{ret.receiverName}</div>
                  <div className="flex items-center justify-center gap-1 text-gray-400 text-sm mt-0.5">
                    <Phone className="w-4 h-4" />
                    {formatPhone(ret.receiverPhone || '')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-base text-center">{ret.warehouse?.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-base">{ret.items?.reduce((sum: number, item) => sum + item.quantity, 0)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-base text-primary-600 font-medium">¥{Number(ret.order?.totalAmount || 0).toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`px-2 py-1 text-sm rounded-full ${STATUS_CONFIG[ret.status]?.bgColor} ${STATUS_CONFIG[ret.status]?.color}`}>
                    {STATUS_CONFIG[ret.status]?.label}
                  </span>
                </td>
                <td className="px-6 py-4 text-base text-gray-600 max-w-xs truncate text-center">{ret.reason}</td>
                <td className="px-6 py-4 whitespace-nowrap text-base text-gray-500 text-center">{new Date(ret.createdAt).toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex flex-col gap-1 items-center">
                    {ret.status === 'RETURN_REQUESTED' && (
                      <button
                        onClick={() => onOpenTrackingModal(ret)}
                        className="px-2 py-1 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded"
                      >
                        {t('returns.fillTracking')}
                      </button>
                    )}
                    {ret.status === 'RETURN_SHIPPED' && (
                      <button
                        onClick={() => onReceive(ret)}
                        className="px-2 py-1 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded"
                      >
                        {t('returns.confirmReceive')}
                      </button>
                    )}
                    {ret.status === 'RETURN_RECEIVING' && (
                      <button
                        onClick={() => onOpenQualifyModal(ret)}
                        className="px-2 py-1 text-xs text-white bg-green-600 hover:bg-green-700 rounded"
                      >
                        {t('returns.qualifyCheck')}
                      </button>
                    )}
                    {(ret.status === 'RETURN_QUALIFIED' || ret.status === 'RETURN_PARTIAL_QUALIFIED') && (
                      <button
                        onClick={() => onOpenStockInModal(ret)}
                        className="px-2 py-1 text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded"
                      >
                        {t('returns.stockIn')}
                      </button>
                    )}
                    {['RETURN_STOCK_IN', 'RETURN_REJECTED'].includes(ret.status) && ret.refundStatus !== 'COMPLETED' && (
                      <button
                        onClick={() => onOpenRefundModal(ret)}
                        className="px-2 py-1 text-xs text-white bg-yellow-600 hover:bg-yellow-700 rounded"
                      >
                        {t('returns.confirmRefund')}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {returns.length === 0 && (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-gray-500">{t('returns.noData')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="sm:hidden space-y-2 p-2">
        {returns.map(ret => (
          <div key={ret.id} className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <Link to={`/returns/${ret.id}`} className="text-primary-600 font-medium">
                {ret.returnNo}
              </Link>
              <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_CONFIG[ret.status]?.bgColor} ${STATUS_CONFIG[ret.status]?.color}`}>
                {STATUS_CONFIG[ret.status]?.label}
              </span>
            </div>
            <div className="text-xs text-gray-600 space-y-1 mb-2">
              <div className="flex justify-between">
                <span className="text-gray-400">{t('returns.orderNo')}: <Link to={`/orders/${ret.orderId}`} className="text-gray-500">{ret.order?.orderNo}</Link></span>
                <span className="text-primary-600 font-medium">¥{Number(ret.order?.totalAmount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {ret.receiverName} {formatPhone(ret.receiverPhone || '')}
                </span>
                <span>{ret.items?.reduce((sum: number, item) => sum + item.quantity, 0)}{t('returns.items')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600">{ret.warehouse?.name}</span>
                <span className="text-gray-400">{new Date(ret.createdAt).toLocaleDateString()}</span>
              </div>
              {ret.reason && (
                <div className="text-gray-400 truncate">{t('returns.reason')}: {ret.reason}</div>
              )}
            </div>
            <div className="pt-2 border-t border-gray-200">
              {ret.status === 'RETURN_REQUESTED' && (
                <button
                  onClick={() => onOpenTrackingModal(ret)}
                  className="w-full py-1.5 text-xs text-white bg-blue-600 rounded-lg"
                >
                  {t('returns.fillTracking')}
                </button>
              )}
              {ret.status === 'RETURN_SHIPPED' && (
                <button
                  onClick={() => onReceive(ret)}
                  className="w-full py-1.5 text-xs text-white bg-blue-600 rounded-lg"
                >
                  {t('returns.confirmReceive')}
                </button>
              )}
              {ret.status === 'RETURN_RECEIVING' && (
                <button
                  onClick={() => onOpenQualifyModal(ret)}
                  className="w-full py-1.5 text-xs text-white bg-green-600 rounded-lg"
                >
                  {t('returns.qualifyCheck')}
                </button>
              )}
              {(ret.status === 'RETURN_QUALIFIED' || ret.status === 'RETURN_PARTIAL_QUALIFIED') && (
                <button
                  onClick={() => onOpenStockInModal(ret)}
                  className="w-full py-1.5 text-xs text-white bg-indigo-600 rounded-lg"
                >
                  {t('returns.stockIn')}
                </button>
              )}
              {['RETURN_STOCK_IN', 'RETURN_REJECTED'].includes(ret.status) && ret.refundStatus !== 'COMPLETED' && (
                <button
                  onClick={() => onOpenRefundModal(ret)}
                  className="w-full py-1.5 text-xs text-white bg-yellow-600 rounded-lg"
                >
                  {t('returns.confirmRefund')}
                </button>
              )}
            </div>
          </div>
        ))}
        {returns.length === 0 && (
          <div className="text-center py-8 text-gray-500">{t('returns.noData')}</div>
        )}
      </div>
    </div>
  );
}
