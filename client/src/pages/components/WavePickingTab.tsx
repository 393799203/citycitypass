import React from 'react';
import { ClipboardList } from 'lucide-react';
import { PickOrder } from '../types';
import PickOrderCard from './PickOrderCard';

interface WavePickingTabProps {
  pickOrders: PickOrder[];
  onPickComplete: (pickOrderId: string) => void;
  onOutboundReview: (pickOrderId: string, approved: boolean) => void;
  onTooltip: (tooltip: { x: number; y: number; content: React.ReactNode } | null) => void;
}

export default function WavePickingTab({ pickOrders, onPickComplete, onOutboundReview, onTooltip }: WavePickingTabProps) {
  return (
    <div className="space-y-4">
      {pickOrders.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <ClipboardList className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>暂无波次拣货单</p>
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
          />
        ))
      )}
    </div>
  );
}
