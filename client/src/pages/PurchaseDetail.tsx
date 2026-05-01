import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { purchaseOrderApi } from '../api';
import { Loader2, Printer, Truck } from 'lucide-react';
import { format } from 'date-fns';
import InboundOrderModal from '../components/InboundOrderModal';
import { useTranslation } from 'react-i18next';

const getStatusMap = (t: any): Record<string, { label: string; color: string }> => ({
  PENDING: { label: t('purchase.statusPending'), color: 'bg-yellow-100 text-yellow-700' },
  CONFIRMED: { label: t('purchase.statusConfirmed'), color: 'bg-blue-100 text-blue-700' },
  PARTIAL: { label: t('purchase.statusPartial'), color: 'bg-orange-100 text-orange-700' },
  ARRIVED: { label: t('purchase.statusArrived'), color: 'bg-green-100 text-green-700' },
  CANCELLED: { label: t('purchase.statusCancelled'), color: 'bg-gray-100 text-gray-500' },
  COMPLETED: { label: t('purchase.statusCompleted'), color: 'bg-purple-100 text-purple-700' },
});

export default function PurchaseDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [viewingOrder, setViewingOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showInboundModal, setShowInboundModal] = useState(false);
  const STATUS_MAP = getStatusMap(t);

  useEffect(() => {
    if (id) {
      loadOrder();
    }
  }, [id]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const res = await purchaseOrderApi.get(id!);
      if (res.data.success) {
        setViewingOrder(res.data.data);
      }
    } catch (error) {
      console.error('Failed to load order:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!viewingOrder) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>{t('purchase.orderNotExist')}</p>
        <button
          onClick={() => navigate('/purchases')}
          className="mt-4 px-4 py-2 text-blue-600 hover:underline"
        >
          {t('purchase.backToList')}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow" id="purchase-order-print">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{t('purchase.title')}</h2>
                <p className="text-blue-100 text-sm">{t('purchase.purchaseOrderNo')}：{viewingOrder.orderNo}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {viewingOrder.inboundOrders?.find((io: any) => io.status !== 'CANCELLED') ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg">
                  <span className="text-sm font-medium">{t('purchase.relatedInbound')}</span>
                  <span className="text-xs">{t('purchase.inboundNo')}：{viewingOrder.inboundOrders.find((io: any) => io.status !== 'CANCELLED').inboundNo}</span>
                </div>
              ) : viewingOrder.status === 'CONFIRMED' && (
                <button
                  onClick={() => setShowInboundModal(true)}
                  className="px-3 py-1.5 bg-white text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-medium"
                >
                  {t('purchase.createInbound')}
                </button>
              )}
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1 px-3 py-1.5 bg-white text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-medium"
              >
                <Printer className="w-4 h-4" />
                {t('purchase.printBtn')}
              </button>
              <span className={`px-4 py-1.5 text-sm font-medium rounded-full bg-white ${
                viewingOrder.status === 'PENDING' ? 'text-yellow-600' :
                viewingOrder.status === 'CONFIRMED' ? 'text-blue-600' :
                viewingOrder.status === 'PARTIAL' ? 'text-orange-600' :
                viewingOrder.status === 'ARRIVED' ? 'text-green-600' :
                viewingOrder.status === 'CANCELLED' ? 'text-gray-600' : 'text-purple-600'
              }`}>
                {STATUS_MAP[viewingOrder.status]?.label}
              </span>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 border-b border-gray-100">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">{t('purchase.supplierLabel')}</p>
              <p className="font-semibold text-gray-800">{viewingOrder.supplier?.name || '-'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">{t('purchase.orderDateLabel')}</p>
              <p className="font-semibold text-gray-800">{format(new Date(viewingOrder.orderDate), 'yyyy-MM-dd')}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">{t('purchase.expectedDateLabel')}</p>
              <p className="font-semibold text-gray-800">{viewingOrder.expectedDate ? format(new Date(viewingOrder.expectedDate), 'yyyy-MM-dd') : '-'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">{t('purchase.creatorLabel')}</p>
              <p className="font-semibold text-gray-800">{viewingOrder.owner?.name || '-'}</p>
            </div>
          </div>
        </div>

        <div className="px-8 py-6">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t('purchase.productLabel')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">{t('purchase.specUnitLabel')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-24">{t('purchase.quantityLabel')}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase w-32">{t('purchase.priceLabel')}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase w-32">{t('purchase.amountLabel')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(viewingOrder.items || []).map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                          item.itemType === 'BUNDLE' ? 'bg-purple-100 text-purple-700' :
                          item.itemType === 'MATERIAL' ? 'bg-green-100 text-green-700' :
                          item.itemType === 'OTHER' ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {item.itemType === 'BUNDLE' ? t('purchase.productTypeBundle') : item.itemType === 'MATERIAL' ? t('purchase.productTypeMaterial') : item.itemType === 'OTHER' ? t('purchase.productTypeOther') : t('purchase.productTypeProduct')}
                        </span>
                        <span className="font-medium text-gray-800">
                          {item.itemType === 'BUNDLE' ? item.bundle?.name :
                           item.itemType === 'MATERIAL' || item.itemType === 'OTHER' ? item.supplierMaterial?.name :
                           item.sku?.product?.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                      {item.itemType === 'MATERIAL' || item.itemType === 'OTHER' ? (item.supplierMaterial?.unit || '-') :
                       item.itemType === 'BUNDLE' ? `${item.bundle?.spec || ''} / ${item.bundle?.packaging || ''}` :
                       `${item.sku?.spec || ''} / ${item.sku?.packaging || ''}`}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-medium">{item.quantity}</td>
                    <td className="px-4 py-3 text-right text-sm">¥{Number(item.price || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-800">¥{((Number(item.price) || 0) * item.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-right font-semibold text-gray-700 text-lg">{t('purchase.totalAmountLabel')}</td>
                  <td className="px-4 py-4 text-right font-bold text-xl text-blue-600">¥{Number(viewingOrder.totalAmount || 0).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {viewingOrder.remark && (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-lg">
              <p className="text-sm font-medium text-amber-800">{t('purchase.remarkLabel')}：{viewingOrder.remark}</p>
            </div>
          )}
        </div>
      </div>

      {showInboundModal && (
        <InboundOrderModal
          open
          purchaseOrderId={viewingOrder.id}
          onClose={() => {
            setShowInboundModal(false);
            loadOrder();
          }}
        />
      )}
    </>
  );
}
