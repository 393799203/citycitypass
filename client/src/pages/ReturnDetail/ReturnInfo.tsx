import React from 'react';
import { useTranslation } from 'react-i18next';

interface ReturnInfoProps {
  order: any;
}

export default function ReturnInfo({ order }: ReturnInfoProps) {
  const { t } = useTranslation();

  const getStatusLabel = (status: string): string => {
    const statusMap: Record<string, string> = {
      'RETURN_REQUESTED': t('return.statusRequested'),
      'RETURN_SHIPPED': t('return.statusShipped'),
      'RETURN_RECEIVING': t('return.statusReceiving'),
      'RETURN_QUALIFIED': t('return.statusQualified'),
      'RETURN_PARTIAL_QUALIFIED': t('return.statusPartialQualified'),
      'RETURN_REJECTED': t('return.statusRejected'),
      'RETURN_STOCK_IN': t('return.statusStockIn'),
      'REFUNDED': t('return.statusRefunded'),
      'CANCELLED': t('return.statusCancelled'),
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string): string => {
    const colorMap: Record<string, string> = {
      'RETURN_REQUESTED': 'bg-yellow-100 text-yellow-700',
      'RETURN_SHIPPED': 'bg-blue-100 text-blue-700',
      'RETURN_RECEIVING': 'bg-purple-100 text-purple-700',
      'RETURN_QUALIFIED': 'bg-green-100 text-green-700',
      'RETURN_PARTIAL_QUALIFIED': 'bg-orange-100 text-orange-700',
      'RETURN_REJECTED': 'bg-red-100 text-red-700',
      'RETURN_STOCK_IN': 'bg-indigo-100 text-indigo-700',
      'REFUNDED': 'bg-gray-100 text-gray-700',
      'CANCELLED': 'bg-gray-100 text-gray-500',
    };
    return colorMap[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-gray-800">{t('return.returnInfo')}</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
          {getStatusLabel(order.status)}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div>
          <span className="text-xs text-gray-500">{t('return.returnNo')}</span>
          <div className="text-sm font-medium text-gray-800">{order.returnNo}</div>
        </div>
        <div>
          <span className="text-xs text-gray-500">{t('return.orderNo')}</span>
          <div className="text-sm font-medium text-gray-800">{order.order?.orderNo || '-'}</div>
        </div>
        <div>
          <span className="text-xs text-gray-500">{t('return.returnReason')}</span>
          <div className="text-sm font-medium text-gray-800">{order.reason || '-'}</div>
        </div>
        <div>
          <span className="text-xs text-gray-500">{t('return.createdAt')}</span>
          <div className="text-sm font-medium text-gray-800">
            {new Date(order.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>

      {order.remark && (
        <div className="mt-4 pt-4 border-t">
          <span className="text-xs text-gray-500">{t('return.remark')}</span>
          <div className="text-sm text-gray-700 mt-1">{order.remark}</div>
        </div>
      )}
    </div>
  );
}
