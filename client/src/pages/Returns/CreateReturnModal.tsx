import React from 'react';
import { X } from 'lucide-react';
import { CreateReturnForm } from '../../types/returns';

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <h2 className="text-lg font-bold mb-4">申请退货</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">订单</label>
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
                <option value="">请选择已完成订单</option>
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
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => {
            onClose();
          }} className="px-4 py-2 border rounded-lg">取消</button>
          <button onClick={onSubmit} className="px-4 py-2 bg-primary-600 text-white rounded-lg">提交</button>
        </div>
      </div>
    </div>
  );
}
