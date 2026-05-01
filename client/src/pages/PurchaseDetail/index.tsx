import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { purchaseOrderApi } from '../../api';
import { Loader2 } from 'lucide-react';
import InboundOrderModal from '../../components/InboundOrderModal';
import PurchaseHeader from './PurchaseHeader';
import PurchaseInfo from './PurchaseInfo';
import PurchaseItems from './PurchaseItems';

export default function PurchaseDetail(): React.ReactNode {
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

  const handleOpenInboundModal = () => {
    setShowInboundModal(true);
  };

  const handlePrint = () => {
    window.print();
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
        <p>订单不存在</p>
        <button
          onClick={() => navigate('/purchases')}
          className="mt-4 px-4 py-2 text-blue-600 hover:underline"
        >
          返回列表
        </button>
      </div>
    );
  }

  const hasInboundOrder = viewingOrder.inboundOrders?.some((io: any) => io.status !== 'CANCELLED');
  const inboundNo = hasInboundOrder ? viewingOrder.inboundOrders.find((io: any) => io.status !== 'CANCELLED').inboundNo : '';

  return (
    <>
      <div className="bg-white rounded-lg shadow" id="purchase-order-print">
        <PurchaseHeader 
          orderNo={viewingOrder.orderNo}
          status={viewingOrder.status}
          hasInboundOrder={hasInboundOrder}
          inboundNo={inboundNo}
          onOpenInboundModal={handleOpenInboundModal}
          onPrint={handlePrint}
        />

        <PurchaseInfo 
          supplierName={viewingOrder.supplier?.name || ''}
          orderDate={viewingOrder.orderDate}
          expectedDate={viewingOrder.expectedDate}
          ownerName={viewingOrder.owner?.name || ''}
        />

        <div className="px-8 py-6">
          <PurchaseItems 
            items={viewingOrder.items}
            totalAmount={viewingOrder.totalAmount || 0}
          />

          {viewingOrder.remark && (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-lg">
              <p className="text-sm font-medium text-amber-800">备注：{viewingOrder.remark}</p>
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