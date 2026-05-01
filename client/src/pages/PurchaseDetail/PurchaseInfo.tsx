import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface PurchaseInfoProps {
  order: any;
}

export default function PurchaseInfo({ order }: PurchaseInfoProps) {
  const { t } = useTranslation();

  return (
    <div className="px-8 py-6 border-b border-gray-100 print:border-gray-200">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-50 rounded-lg p-4 print:bg-white print:border print:border-gray-200">
          <p className="text-xs text-gray-500 mb-1">{t('purchase.supplierLabel')}</p>
          <p className="font-semibold text-gray-800">{order.supplier?.name || '-'}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 print:bg-white print:border print:border-gray-200">
          <p className="text-xs text-gray-500 mb-1">{t('purchase.orderDateLabel')}</p>
          <p className="font-semibold text-gray-800">{format(new Date(order.orderDate), 'yyyy-MM-dd')}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 print:bg-white print:border print:border-gray-200">
          <p className="text-xs text-gray-500 mb-1">{t('purchase.expectedDateLabel')}</p>
          <p className="font-semibold text-gray-800">{order.expectedDate ? format(new Date(order.expectedDate), 'yyyy-MM-dd') : '-'}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 print:bg-white print:border print:border-gray-200">
          <p className="text-xs text-gray-500 mb-1">{t('purchase.creatorLabel')}</p>
          <p className="font-semibold text-gray-800">{order.owner?.name || '-'}</p>
        </div>
      </div>
    </div>
  );
}
