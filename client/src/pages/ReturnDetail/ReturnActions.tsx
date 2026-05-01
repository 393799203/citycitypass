import React from 'react';
import { Pencil, CheckCircle, Warehouse, DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ReturnActionsProps {
  returnOrder: any;
  onOpenTrackingModal: () => void;
  onReceive: () => void;
  onOpenQualifyModal: () => void;
  onOpenStockInModal: () => void;
  onOpenRefundModal: () => void;
}

export default function ReturnActions({ 
  returnOrder, 
  onOpenTrackingModal, 
  onReceive, 
  onOpenQualifyModal, 
  onOpenStockInModal, 
  onOpenRefundModal 
}: ReturnActionsProps) {
  const { t } = useTranslation();

  if (['REFUNDED', 'CANCELLED'].includes(returnOrder.status)) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-6">
      <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">{t('common.actions')}</h3>
      <div className="space-y-2 sm:space-y-3">
        {returnOrder.status === 'RETURN_REQUESTED' && (
          <button
            onClick={onOpenTrackingModal}
            className="w-full px-3 sm:px-4 py-2 bg-blue-600 text-white text-sm rounded-lg flex items-center justify-center gap-2"
          >
            <Pencil className="w-4 h-4" /> {t('return.fillTrackingNo')}
          </button>
        )}
        {returnOrder.status === 'RETURN_SHIPPED' && (
          <button onClick={onReceive} className="w-full px-3 sm:px-4 py-2 bg-blue-600 text-white text-sm rounded-lg flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4" /> {t('return.confirmReceive')}
          </button>
        )}
        {returnOrder.status === 'RETURN_RECEIVING' && (
          <button
            onClick={onOpenQualifyModal}
            className="w-full px-3 sm:px-4 py-2 bg-green-600 text-white text-sm rounded-lg flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" /> {t('return.inspectConfirm')}
          </button>
        )}
        {(returnOrder.status === 'RETURN_QUALIFIED' || returnOrder.status === 'RETURN_PARTIAL_QUALIFIED') && (
          <button
            onClick={onOpenStockInModal}
            className="w-full px-3 sm:px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg flex items-center justify-center gap-2"
          >
            <Warehouse className="w-4 h-4" /> {t('return.returnStockIn')}
          </button>
        )}
        {['RETURN_STOCK_IN', 'RETURN_REJECTED'].includes(returnOrder.status) && returnOrder.refundStatus !== 'COMPLETED' && (
          <button
            onClick={onOpenRefundModal}
            className="w-full px-3 sm:px-4 py-2 bg-yellow-600 text-white text-sm rounded-lg flex items-center justify-center gap-2"
          >
            <DollarSign className="w-4 h-4" /> {t('return.confirmRefund')}
          </button>
        )}
      </div>
    </div>
  );
}
