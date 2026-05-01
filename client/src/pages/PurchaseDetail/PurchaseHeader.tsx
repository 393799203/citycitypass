import { Printer, Truck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const getStatusMap = (t: any): Record<string, { label: string; color: string }> => ({
  PENDING: { label: t('purchase.statusPending'), color: 'bg-yellow-100 text-yellow-700' },
  CONFIRMED: { label: t('purchase.statusConfirmed'), color: 'bg-blue-100 text-blue-700' },
  PARTIAL: { label: t('purchase.statusPartial'), color: 'bg-orange-100 text-orange-700' },
  ARRIVED: { label: t('purchase.statusArrived'), color: 'bg-green-100 text-green-700' },
  CANCELLED: { label: t('purchase.statusCancelled'), color: 'bg-gray-100 text-gray-500' },
  COMPLETED: { label: t('purchase.statusCompleted'), color: 'bg-purple-100 text-purple-700' },
});

interface PurchaseHeaderProps {
  order: any;
  onCreateInbound: () => void;
}

export default function PurchaseHeader({ order, onCreateInbound }: PurchaseHeaderProps) {
  const { t } = useTranslation();
  const STATUS_MAP = getStatusMap(t);

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-6 rounded-t-lg print:bg-white print:text-black print:border-b">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">{t('purchase.title')}</h2>
          <p className="text-blue-100 text-sm mt-1 print:text-gray-500">{t('purchase.purchaseOrderNo')}：{order.orderNo}</p>
        </div>
        <div className="flex items-center gap-4 print:hidden">
          {order.inboundOrders?.find((io: any) => io.status !== 'CANCELLED') ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg">
              <span className="text-sm font-medium">{t('purchase.relatedInbound')}</span>
              <span className="text-xs">{t('purchase.inboundNo')}：{order.inboundOrders.find((io: any) => io.status !== 'CANCELLED').inboundNo}</span>
            </div>
          ) : order.status === 'CONFIRMED' && (
            <button
              onClick={onCreateInbound}
              className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-medium"
            >
              <Truck className="w-4 h-4" />
              {t('purchase.createInbound')}
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-medium"
          >
            <Printer className="w-4 h-4" />
            {t('purchase.printBtn')}
          </button>
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${STATUS_MAP[order.status]?.color}`}>
            {STATUS_MAP[order.status]?.label}
          </span>
        </div>
        <div className="hidden print:block">
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${STATUS_MAP[order.status]?.color}`}>
            {STATUS_MAP[order.status]?.label}
          </span>
        </div>
      </div>
    </div>
  );
}
