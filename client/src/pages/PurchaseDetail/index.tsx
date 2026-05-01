import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { purchaseOrderApi } from '../../api';
import { Loader2 } from 'lucide-react';
import InboundOrderModal from '../../components/InboundOrderModal';
import PurchaseHeader from './PurchaseHeader';
import PurchaseInfo from './PurchaseInfo';
import PurchaseItems from './PurchaseItems';
import { useTranslation } from 'react-i18next';

export default function PurchaseDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [viewingOrder, setViewingOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showInboundModal, setShowInboundModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadOrder();
    }
  }, [id]);

  const loadOrder = async () => {
    setLoading(true);
    try {
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
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
    <div className="bg-white rounded-lg shadow-sm print:shadow-none">
      <PurchaseHeader
        order={viewingOrder}
        onCreateInbound={() => setShowInboundModal(true)}
      />

      <PurchaseInfo order={viewingOrder} />

      <PurchaseItems order={viewingOrder} />

      {viewingOrder.remark && (
        <div className="px-8 py-4 border-t border-gray-100">
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg">
            <p className="text-sm font-medium text-amber-800">{t('purchase.remarkLabel')}：{viewingOrder.remark}</p>
          </div>
        </div>
      )}

      {showInboundModal && (
        <InboundOrderModal
          isOpen={showInboundModal}
          onClose={() => setShowInboundModal(false)}
          purchaseOrder={viewingOrder}
          onSuccess={() => {
            setShowInboundModal(false);
            loadOrder();
          }}
        />
      )}
    </div>
  );
}
