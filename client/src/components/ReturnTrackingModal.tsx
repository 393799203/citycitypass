import React, { useState } from 'react';
import LogisticsInput from './LogisticsInput';
import { X } from 'lucide-react';

interface ReturnTrackingModalProps {
  open: boolean;
  returnId?: string;
  returnNo: string;
  initialCompany?: string;
  initialTrackingNo?: string;
  onClose: () => void;
  onSave: (data: { returnId?: string; logisticsCompany: string; trackingNo: string }, apiData: { logisticsCompany: string; trackingNo: string }) => Promise<void>;
}

export default function ReturnTrackingModal({
  open,
  returnId,
  returnNo,
  initialCompany = '',
  initialTrackingNo = '',
  onClose,
  onSave,
}: ReturnTrackingModalProps) {
  const [company, setCompany] = useState(initialCompany);
  const [trackingNo, setTrackingNo] = useState(initialTrackingNo);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (open) {
      setCompany(initialCompany);
      setTrackingNo(initialTrackingNo);
    }
  }, [open, initialCompany, initialTrackingNo]);

  if (!open) return null;

  const handleSave = async () => {
    if (!company.trim() || !trackingNo.trim()) {
      return;
    }
    setSaving(true);
    try {
      await onSave({ returnId, logisticsCompany: company, trackingNo: trackingNo }, { logisticsCompany: company, trackingNo: trackingNo });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">填写快递单号</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">退货单号</label>
            <div className="w-full border rounded-lg px-3 py-2 bg-gray-50">
              {returnNo}
            </div>
          </div>
          <LogisticsInput
            company={company}
            trackingNo={trackingNo}
            onCompanyChange={setCompany}
            onTrackingNoChange={setTrackingNo}
          />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !company.trim() || !trackingNo.trim()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
