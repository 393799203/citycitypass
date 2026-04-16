import React from 'react';
import { CheckCircle } from 'lucide-react';
import { PickOrder } from '../../types/outbound';
import PickOrderCard from './PickOrderCard';

interface OutboundReviewTabProps {
  pickOrders: PickOrder[];
  onPickComplete: (pickOrderId: string) => void;
  onOutboundReview: (pickOrderId: string, approved: boolean) => void;
  onTooltip: (tooltip: { x: number; y: number; content: React.ReactNode } | null) => void;
  canWrite?: boolean;
}

export default function OutboundReviewTab({ pickOrders, onPickComplete, onOutboundReview, onTooltip, canWrite = false }: OutboundReviewTabProps) {
  return (
    <div className="space-y-4">
      {pickOrders.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>暂无出库审核单</p>
          </div>
        </div>
      ) : (
        pickOrders.map(pickOrder => (
          <PickOrderCard
            key={pickOrder.id}
            pickOrder={pickOrder}
            onPickComplete={onPickComplete}
            onOutboundReview={onOutboundReview}
            onTooltip={onTooltip}
            canWrite={canWrite}
          />
        ))
      )}
    </div>
  );
}
