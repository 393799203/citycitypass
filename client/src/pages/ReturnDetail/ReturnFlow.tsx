import React from 'react';
import { MapPin, User, Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ReturnFlowProps {
  returnOrder: any;
}

export default function ReturnFlow({ returnOrder }: ReturnFlowProps) {
  const { t } = useTranslation();

  const steps = [
    { key: 'RETURN_REQUESTED', label: t('returnDetail.applyReturn'), status: returnOrder.status },
    { key: 'RETURN_SHIPPED', label: t('returnDetail.buyerShip'), status: returnOrder.status },
    { key: 'RETURN_RECEIVING', label: t('returnDetail.warehouseReceive'), status: returnOrder.status },
    { key: 'RETURN_QUALIFIED', label: t('returnDetail.inspectAll'), status: returnOrder.status },
    { key: 'RETURN_STOCK_IN', label: t('returnDetail.stockIn'), status: returnOrder.status },
    { key: 'REFUNDED', label: t('returnDetail.refundComplete'), status: returnOrder.status },
  ];

  const statusIndex = steps.findIndex(s => s.key === returnOrder.status);
  const isPartial = returnOrder.status === 'RETURN_PARTIAL_QUALIFIED';
  const isRejected = returnOrder.status === 'RETURN_REJECTED';
  const isCancelled = returnOrder.status === 'CANCELLED';

  const getStatusLabel = (status: string): string => {
    const statusMap: Record<string, string> = {
      'RETURN_REQUESTED': t('returnDetail.pendingShip'),
      'RETURN_SHIPPED': t('returnDetail.shipped'),
      'RETURN_RECEIVING': t('returnDetail.receiving'),
      'RETURN_QUALIFIED': t('returnDetail.qualified'),
      'RETURN_PARTIAL_QUALIFIED': t('returnDetail.partialQualified'),
      'RETURN_REJECTED': t('returnDetail.rejected'),
      'RETURN_STOCK_IN': t('returnDetail.stockedIn'),
      'REFUNDED': t('returnDetail.refunded'),
      'CANCELLED': t('returnDetail.cancelled'),
    };
    return statusMap[status] || status;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-6">
      <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">{t('returnDetail.returnFlow')}</h3>
      
      <div className="flex items-center justify-between mb-6 overflow-x-auto pb-2">
        {steps.map((step, idx) => {
          const isActive = idx <= statusIndex;
          const isCurrent = idx === statusIndex;
          return (
            <div key={step.key} className="flex items-center flex-shrink-0">
              <div className="flex flex-col items-center">
                <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  isCurrent ? 'bg-blue-600 text-white' :
                  isActive ? 'bg-green-500 text-white' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {idx + 1}
                </div>
                <span className={`text-[10px] sm:text-xs mt-1 text-center whitespace-nowrap ${
                  isCurrent ? 'text-blue-600 font-medium' : 'text-gray-500'
                }`}>
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className={`w-6 sm:w-12 h-0.5 mx-1 ${
                  idx < statusIndex ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {isPartial && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
          <span className="text-orange-700 text-sm">{t('return.partialQualifiedNote')}</span>
        </div>
      )}
      {isRejected && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <span className="text-red-700 text-sm">{t('return.rejectedNote')}</span>
        </div>
      )}
      {isCancelled && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
          <span className="text-gray-700 text-sm">{t('return.cancelledNote')}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">{t('returnDetail.returnPerson')}</span>
          </div>
          <div className="text-sm text-gray-600">{returnOrder.customerName}</div>
          <div className="text-xs text-gray-500 mt-1">{returnOrder.customerPhone}</div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">{t('returnDetail.returnPersonAddress')}</span>
          </div>
          <div className="text-sm text-gray-600">{returnOrder.returnAddress}</div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">{t('returnDetail.receivingWarehouse')}</span>
          </div>
          <div className="text-sm text-gray-600">{returnOrder.warehouse?.name}</div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">{t('returnDetail.warehouseAddress')}</span>
          </div>
          <div className="text-sm text-gray-600">{returnOrder.warehouse?.address}</div>
        </div>

        {returnOrder.trackingNo && (
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 sm:col-span-2">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-700">{t('returnDetail.returnExpress')}</span>
            </div>
            <div className="text-sm text-gray-600">
              {returnOrder.expressCompany} - {t('returnDetail.expressNo')}: {returnOrder.trackingNo}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
