import React from 'react';
import { ReturnOrder } from '../types';

interface RefundModalProps {
  isOpen: boolean;
  returnOrder: ReturnOrder | null;
  refundAmount: number;
  onClose: () => void;
  onSubmit: () => void;
}

export default function RefundModal({
  isOpen,
  returnOrder,
  refundAmount,
  onClose,
  onSubmit
}: RefundModalProps) {
  if (!isOpen || !returnOrder) return null;

  const qualifiedItems = (returnOrder.items || []).filter(item => (item.qualifiedQuantity ?? 0) > 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">确认退款</h3>
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-2">退款金额</div>
            <div className="text-2xl font-bold text-green-600">¥{refundAmount.toFixed(2)}</div>
            {returnOrder.order?.contractDiscount && returnOrder.order.contractDiscount < 1 && (
              <div className="text-xs text-gray-500 mt-1">
                客户折扣: {((returnOrder.order.contractDiscount || 1) * 10).toFixed(1)}折
              </div>
            )}
          </div>
          <div className="text-sm text-gray-600">
            仅退款通过验收的商品
          </div>
          <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
            {qualifiedItems.map((item) => {
              const discount = returnOrder.order?.contractDiscount ?? 1;
              const originalPrice = (item.unitPrice || 0) * (item.qualifiedQuantity || 0);
              const discountedPrice = originalPrice * discount;
              return (
                <div key={item.id} className="flex justify-between items-center px-3 py-2">
                  <div>
                    <div className="text-sm">{item.productName}</div>
                    <div className="text-xs text-gray-500">×{item.qualifiedQuantity}</div>
                  </div>
                  <div className="text-right">
                    {discount < 1 ? (
                      <>
                        <div className="text-xs text-gray-400 line-through">¥{originalPrice.toFixed(2)}</div>
                        <div className="text-sm text-green-600">¥{discountedPrice.toFixed(2)}</div>
                      </>
                    ) : (
                      <div className="text-sm text-green-600">¥{originalPrice.toFixed(2)}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg">取消</button>
          <button onClick={onSubmit} className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg">确认退款</button>
        </div>
      </div>
    </div>
  );
}
