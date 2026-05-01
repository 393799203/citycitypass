import React from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { CreateReturnForm } from '../types';

interface CreateReturnModalProps {
  isOpen: boolean;
  form: CreateReturnForm;
  orders: any[];
  onClose: () => void;
  onSubmit: () => void;
  onFormChange: (key: keyof CreateReturnForm, value: string) => void;
}

export default function CreateReturnModal({
  isOpen,
  form,
  orders,
  onClose,
  onSubmit,
  onFormChange
}: CreateReturnModalProps) {
  const { t } = useTranslation();
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <h2 className="text-lg font-bold mb-4">{t('returns.applyReturn')}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('returns.order')}</label>
            {form.orderId ? (
              <div className="w-full border rounded-lg px-3 py-2 bg-gray-50">
                {orders.find(o => o.id === form.orderId)?.orderNo} -{' '}
                {orders.find(o => o.id === form.orderId)?.receiver} - ¥
                {orders.find(o => o.id === form.orderId)?.totalAmount}
              </div>
            ) : (
              <select
                value={form.orderId}
                onChange={e => onFormChange('orderId', e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">{t('returns.selectOrder')}</option>
                {orders.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.orderNo} - {o.receiver} - ¥{o.totalAmount}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">退货原因</label>
            <textarea
              value={form.reason}
              onChange={e => onFormChange('reason', e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              rows={3}
              placeholder="请输入退货原因"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => {
            onClose();
          }} className="flex-1 px-4 py-2 border rounded-lg">取消</button>
          <button onClick={onSubmit} className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg">提交</button>
        </div>
      </div>
    </div>
  );
}
