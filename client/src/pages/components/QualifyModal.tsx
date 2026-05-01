import React from 'react';
import { useTranslation } from 'react-i18next';
import { QualifyItem } from '../types';

interface QualifyModalProps {
  isOpen: boolean;
  items: QualifyItem[];
  onClose: () => void;
  onSubmit: () => void;
  onItemChange: (index: number, qualifiedQuantity: number) => void;
}

export default function QualifyModal({
  isOpen,
  items,
  onClose,
  onSubmit,
  onItemChange
}: QualifyModalProps) {
  const { t } = useTranslation();
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg">
        <h3 className="text-lg font-semibold mb-4">{t('returns.qualifyCheck')}</h3>
        <table className="w-full mb-4">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs">{t('returns.product')}</th>
              <th className="px-4 py-2 text-left text-xs">{t('returns.batchExpiry')}</th>
              <th className="px-4 py-2 text-right text-xs">{t('returns.returnQty')}</th>
              <th className="px-4 py-2 text-right text-xs">{t('returns.qualifiedQty')}</th>
              <th className="px-4 py-2 text-right text-xs">{t('returns.rejectedQty')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id}>
                <td className="px-4 py-2 text-sm">{item.productName}</td>
                <td className="px-4 py-2">
                  <div className="text-purple-600">{item.skuBatch?.batchNo || item.bundleBatch?.batchNo || '-'}</div>
                  <div className="text-orange-500 text-xs">{item.skuBatch?.expiryDate ? `${t('returns.expiryDate')}:${new Date(item.skuBatch.expiryDate).toLocaleDateString()}` : ''}</div>
                </td>
                <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
                <td className="px-4 py-2 text-right">
                  <input
                    type="number"
                    min="0"
                    max={item.quantity}
                    value={item.qualifiedQuantity}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      onItemChange(idx, value);
                    }}
                    className="w-20 border rounded px-2 py-1 text-right"
                  />
                </td>
                <td className="px-4 py-2 text-sm text-right text-red-500">{item.rejectedQuantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg">取消</button>
          <button onClick={onSubmit} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg">确认验收</button>
        </div>
      </div>
    </div>
  );
}
